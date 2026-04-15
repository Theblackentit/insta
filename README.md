# Offline Instagram-Style Clone

A polished, fully offline Instagram-style app built with plain HTML/CSS/JS.

## Features

- Create and switch between custom accounts.
- Upload profile pictures with manual crop controls (zoom/x/y) and auto-resize to 256x256.
- Upload posts with manual crop controls (zoom/x/y) before posting.
- Home feed for all posts.
- Explore page for discovery-style browsing.
- Search bar to filter posts by username/caption.
- Profile view styled like Instagram profile pages (avatar, stats, grid).
- Follow/unfollow + follower/following list chips.
- Like and comment buttons directly on each post.
- Fullscreen reels mode with a down-arrow button to move through posts.
- Messages are opened from the sidebar ✉ icon into a dedicated DM view.
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
