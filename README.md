# Offline Instagram-Style Clone

A polished, fully offline Instagram-style app built with plain HTML/CSS/JS.

## Features

- Create and switch between custom accounts.
- Upload photo posts with captions.
- Feed view for all posts.
- Profile view to show only the selected account’s posts.
- Reels view with vertical snap-scroll browsing across all posts.
- Click any post to open a fullscreen modal.
- Add comments to posts from inside the modal.
- Data is saved locally in browser `localStorage` (no backend required).
- Reset all saved local data with one button.

## Run

You can open `index.html` directly, or serve it locally:

```bash
python3 -m http.server 8000
```

Then go to <http://localhost:8000>.

## Notes

- This is intentionally offline and local-only.
- Large image uploads consume localStorage quickly because images are stored as Data URLs.
