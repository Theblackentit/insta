# Offline Instagram-Style Clone

A polished, fully offline Instagram-style app built with plain HTML/CSS/JS.

## Features

- Create and switch between custom accounts.
- Upload profile pictures for accounts.
- Upload photo posts with captions.
- Home feed for all posts.
- Profile view styled like Instagram profile pages (avatar, stats, grid).
- Follow/unfollow button behavior on profile pages.
- Like and comment buttons directly on each post.
- Fullscreen reels mode with a down-arrow button to move through posts.
- Fake DM thread creator between any two accounts.
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
