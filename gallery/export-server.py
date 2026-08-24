#!/usr/bin/env python3
"""Serve the gallery and transcode browser-recorded WebM video to MP4 locally."""

from __future__ import annotations

import argparse
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
MAX_UPLOAD_BYTES = 128 * 1024 * 1024


class GalleryHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPOSITORY_ROOT), **kwargs)

    def do_POST(self):
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
