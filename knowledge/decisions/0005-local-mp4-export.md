# 0005 — Local MP4 export

`[decision]` `[decision-record]` `[rendering]` `[video-export]`

**Status:** accepted

## Context

The postcard controls can record a WebM directly in the browser, but MP4/H.264
encoding is not consistently available there, especially in Firefox.

## Decision

The browser records a portrait WebM locally, then posts it only to the local
authoring server. That server invokes the author's installed FFmpeg to produce
an H.264 MP4 and returns it directly to the same browser for download.

## Consequences

- `python3 gallery/export-server.py` is the authoring command when MP4 export
  is needed; it requires FFmpeg.
- Preview-only work can still use `python3 -m http.server`.
- Video bytes never leave the author’s computer, but MP4 export has a local
  dependency beyond the browser.
