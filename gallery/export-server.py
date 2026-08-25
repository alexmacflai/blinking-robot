#!/usr/bin/env python3
"""Serve the gallery and transcode browser-recorded WebM video to MP4 locally."""

from __future__ import annotations

import argparse
import ipaddress
import json
import socket
import shutil
import subprocess
import tempfile
import threading
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
EXPORT_PATH = "/__blinking-robot/export/mp4"
SETTINGS_PATH = "/__blinking-robot/settings"
MAX_UPLOAD_BYTES = 128 * 1024 * 1024
MAX_SETTINGS_BYTES = 2 * 1024 * 1024
SNAPSHOTS_README = """# Saved settings snapshots\n\nLocal authoring snapshots for this postcard. Each JSON file is a named creative\nconfiguration saved through the loopback-only authoring server. They are never\nruntime dependencies; `../values.json` remains the postcard default.\n\nSee the repository rules in [`AGENTS.md`](../../../../AGENTS.md).\n"""


class GalleryHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPOSITORY_ROOT), **kwargs)

    def is_local_authoring_request(self):
        try:
            return ipaddress.ip_address(self.client_address[0]).is_loopback and self.headers.get("X-Blinking-Robot-Authoring") == "1"
        except ValueError:
            return False

    def send_json(self, status, value):
        body = json.dumps(value).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def settings_directory(self, postcard):
        if not isinstance(postcard, str) or not postcard or "/" in postcard or "\\" in postcard or postcard in {".", ".."}:
            raise ValueError("Invalid postcard.")
        directory = (REPOSITORY_ROOT / "gallery" / "postcards" / postcard).resolve()
        postcards = (REPOSITORY_ROOT / "gallery" / "postcards").resolve()
        if directory.parent != postcards or not (directory / "values.json").is_file():
            raise ValueError("Unknown postcard.")
        return directory

    @staticmethod
    def snapshot_filename(name):
        if not isinstance(name, str):
            raise ValueError("A snapshot name is required.")
        cleaned = "-".join("".join(char.lower() if char.isalnum() else " " for char in name).split())
        if not cleaned:
            raise ValueError("Use letters or numbers in the snapshot name.")
        return f"{cleaned[:80]}.json"

    def read_settings_request(self):
        try:
            length = int(self.headers.get("Content-Length", ""))
        except ValueError as error:
            raise ValueError("A Content-Length header is required.") from error
        if length <= 0 or length > MAX_SETTINGS_BYTES:
            raise ValueError("Settings payload is too large.")
        try:
            return json.loads(self.rfile.read(length))
        except json.JSONDecodeError as error:
            raise ValueError("Settings must be valid JSON.") from error

    def do_GET(self):
        from urllib.parse import parse_qs, urlparse
        parsed = urlparse(self.path)
        if parsed.path != SETTINGS_PATH:
            return super().do_GET()
        if not self.is_local_authoring_request():
            self.send_error(HTTPStatus.FORBIDDEN, "Settings save is available only from the local authoring server.")
            return
        try:
            postcard = parse_qs(parsed.query).get("postcard", [""])[0]
            directory = self.settings_directory(postcard)
            snapshots = directory / "snapshots"
            items = [] if not snapshots.is_dir() else [
                {"name": item.stem, "modified": item.stat().st_mtime}
                for item in snapshots.glob("*.json") if item.is_file()
            ]
            self.send_json(HTTPStatus.OK, {"snapshots": sorted(items, key=lambda item: item["modified"], reverse=True)})
        except ValueError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})

    def do_POST(self):
        if self.path == SETTINGS_PATH:
            if not self.is_local_authoring_request():
                self.send_error(HTTPStatus.FORBIDDEN, "Settings save is available only from the local authoring server.")
                return
            try:
                request = self.read_settings_request()
                directory = self.settings_directory(request.get("postcard"))
                values = request.get("values")
                if not isinstance(values, dict):
                    raise ValueError("Settings must be a JSON object.")
                if request.get("action") == "default":
                    target = directory / "values.json"
                elif request.get("action") == "snapshot":
                    snapshots = directory / "snapshots"
                    snapshots.mkdir(exist_ok=True)
                    (snapshots / "README.md").write_text(SNAPSHOTS_README, encoding="utf-8")
                    target = snapshots / self.snapshot_filename(request.get("name"))
                else:
                    raise ValueError("Unknown settings action.")
                temporary = target.with_name(f".{target.name}.tmp")
                temporary.write_text(json.dumps(values, indent=2) + "\n", encoding="utf-8")
                temporary.replace(target)
                self.send_json(HTTPStatus.OK, {"saved": target.name})
            except ValueError as error:
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
            return
        if self.path != EXPORT_PATH:
            self.send_error(HTTPStatus.NOT_FOUND, "Unknown export endpoint")
            return
        if not shutil.which("ffmpeg"):
            self.send_error(HTTPStatus.SERVICE_UNAVAILABLE, "FFmpeg is not installed")
            return

        try:
            length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            self.send_error(HTTPStatus.LENGTH_REQUIRED, "A Content-Length header is required")
            return
        if length <= 0 or length > MAX_UPLOAD_BYTES:
            self.send_error(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "Video upload is too large")
            return

        source = self.rfile.read(length)
        if len(source) != length:
            self.send_error(HTTPStatus.BAD_REQUEST, "Incomplete video upload")
            return

        with tempfile.TemporaryDirectory(prefix="blinking-robot-") as directory:
            input_path = Path(directory) / "postcard.webm"
            output_path = Path(directory) / "postcard.mp4"
            input_path.write_bytes(source)
            command = [
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                "-i", str(input_path), "-an", "-c:v", "libx264",
                "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
                "-movflags", "+faststart", str(output_path),
            ]
            result = subprocess.run(command, capture_output=True, text=True)
            if result.returncode:
                self.send_error(HTTPStatus.UNPROCESSABLE_ENTITY, result.stderr.strip() or "FFmpeg could not encode the video")
                return
            movie = output_path.read_bytes()

        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "video/mp4")
        self.send_header("Content-Disposition", 'attachment; filename="windmill-video-1080x1920-30s.mp4"')
        self.send_header("Content-Length", str(len(movie)))
        self.end_headers()
        self.wfile.write(movie)


class IPv6ThreadingHTTPServer(ThreadingHTTPServer):
    address_family = socket.AF_INET6


def main():
    parser = argparse.ArgumentParser(description="Run the Blinking Robot authoring and MP4 export server.")
    parser.add_argument("--host", default="loopback", help="loopback (default), 127.0.0.1, or ::1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    if not shutil.which("ffmpeg"):
        raise SystemExit("FFmpeg is required. Install it with: brew install ffmpeg")
    if args.host == "loopback":
        servers = [
            (ThreadingHTTPServer(("127.0.0.1", args.port), GalleryHandler), "http://127.0.0.1"),
            (IPv6ThreadingHTTPServer(("::1", args.port), GalleryHandler), "http://[::1]"),
        ]
    elif args.host == "::1":
        servers = [(IPv6ThreadingHTTPServer((args.host, args.port), GalleryHandler), f"http://[{args.host}]")]
    else:
        servers = [(ThreadingHTTPServer((args.host, args.port), GalleryHandler), f"http://{args.host}")]
    for server, _ in servers:
        threading.Thread(target=server.serve_forever, daemon=True).start()
    print(f"Blinking Robot authoring server: {servers[0][1]}:{args.port}/gallery/index.html")
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        for server, _ in servers:
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    main()
