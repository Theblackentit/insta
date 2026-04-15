# Offline Instagram-Style Clone

A tiny, fully offline Instagram-style app built with plain HTML/CSS/JS.

## Features

- Create and switch between custom accounts.
- Add image posts with captions.
- View a chronological photo feed.
- Data is stored in browser `localStorage` (no backend required).
- Reset all saved local data with one button.

## Run

You can open `index.html` directly, or serve it locally:

```bash
python3 -m http.server 8000
```

Then go to <http://localhost:8000>.

## Notes

- This is intentionally offline and local-only.
- Large images consume localStorage quickly because they are stored as Data URLs.
