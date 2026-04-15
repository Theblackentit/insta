# Offline Instagram-Style Clone

A polished, fully offline Instagram-style app built with plain HTML/CSS/JS.

## Features

- Create and switch between custom accounts.
- Visual image crop dialog for avatars (always) and optional crop flow for posts.
- Avatar output normalized to `512x512`; posts can be kept uncropped or cropped to square `1080x1080`.
- Home feed and Explore collage view (image-only discover grid).
- Search accounts and captions, with account results that support follow directly.
- Clickable usernames/avatars on posts/comments to open that account profile.
- Follow/unfollow + follower/following lists.
- Like posts and like individual comments.
- Fullscreen reels mode with down-arrow navigation.
- Sidebar Messages view with fake DM threads.
- Data saved in browser `localStorage` only (no backend).

## Run

```bash
python3 -m http.server 8000
```

Then go to <http://localhost:8000>.
