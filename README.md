# Offline Instagram-Style Clone

A polished, fully offline Instagram-style app built with plain HTML/CSS/JS.

## Features

- Create and switch between custom accounts.
- Upload profile pictures for accounts.
- Upload photo posts with captions.
- Home feed for all posts.
- Profile view styled like Instagram profile pages (avatar, stats, grid).
- Fullscreen reels mode with a down-arrow button to move through posts.
- Click any post/reel to open a large post modal.
- Add comments to posts in the modal.
- Data is saved locally in browser `localStorage` (no backend required).

## Run

You can open `index.html` directly, or serve it locally:

```bash
python3 -m http.server 8000
```

Then go to <http://localhost:8000>.

## Notes

- This app is intentionally offline and local-only.
- Large image uploads consume localStorage quickly because images are stored as Data URLs.
