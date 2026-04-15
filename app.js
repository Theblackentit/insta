const STORAGE_KEY = "offline-insta-v6";
const AVATAR_SIZE = 256;
const POST_SIZE = 1080;

const state = {
  accounts: [],
  posts: [],
  dms: [],
  follows: [],
  activeAccountId: null,
  viewMode: "feed",
  selectedPostId: null,
  currentReelIndex: 0,
  searchQuery: "",
};

const accountForm = document.getElementById("account-form");
const postForm = document.getElementById("post-form");
const commentForm = document.getElementById("comment-form");
const dmForm = document.getElementById("dm-form");
const searchInput = document.getElementById("search-input");
const dmFrom = document.getElementById("dm-from");
const dmTo = document.getElementById("dm-to");
const dmThread = document.getElementById("dm-thread");
const dmPanel = document.getElementById("dm-panel");
const composeCard = document.getElementById("compose-card");
const accountList = document.getElementById("account-list");
const activeAccountEl = document.getElementById("active-account");
const profileHeader = document.getElementById("profile-header");
const viewTitleEl = document.getElementById("view-title");
const feedEl = document.getElementById("feed");
const clearButton = document.getElementById("clear-data");
const postTemplate = document.getElementById("post-template");

const viewFeedButton = document.getElementById("view-feed");
const viewExploreButton = document.getElementById("view-explore");
const viewProfileButton = document.getElementById("view-profile");
const viewReelsButton = document.getElementById("view-reels");
const viewDmButton = document.getElementById("view-dm");

const reelsOverlay = document.getElementById("reels-overlay");
const reelStage = document.getElementById("reel-stage");
const closeReelsButton = document.getElementById("close-reels");
const nextReelButton = document.getElementById("next-reel");

const postModal = document.getElementById("post-modal");
const closeModalButton = document.getElementById("close-modal");
const modalImage = document.getElementById("modal-image");
const modalAvatar = document.getElementById("modal-avatar");
const modalUser = document.getElementById("modal-user");
const modalCaption = document.getElementById("modal-caption");
const modalTime = document.getElementById("modal-time");
const modalComments = document.getElementById("modal-comments");

init();

function init() {
  hydrate();
  ensureActiveAccount();
  searchInput.value = state.searchQuery;
  renderAll();

  accountForm.addEventListener("submit", handleCreateAccount);
  postForm.addEventListener("submit", handleCreatePost);
  commentForm.addEventListener("submit", handleAddComment);
  dmForm.addEventListener("submit", handleSendDm);

  dmFrom.addEventListener("change", renderDmThread);
  dmTo.addEventListener("change", renderDmThread);

  searchInput.addEventListener("input", () => {
    state.searchQuery = searchInput.value.trim().toLowerCase();
    renderFeed();
  });

  clearButton.addEventListener("click", clearData);

  viewFeedButton.addEventListener("click", () => setViewMode("feed"));
  viewExploreButton.addEventListener("click", () => setViewMode("explore"));
  viewProfileButton.addEventListener("click", () => setViewMode("profile"));
  viewReelsButton.addEventListener("click", () => setViewMode("reels"));
  viewDmButton.addEventListener("click", () => setViewMode("dm"));

  closeReelsButton.addEventListener("click", () => setViewMode("feed"));
  nextReelButton.addEventListener("click", nextReel);

  window.addEventListener("keydown", (event) => {
    if (state.viewMode === "reels" && event.key === "ArrowDown") {
      event.preventDefault();
      nextReel();
    }
  });

  closeModalButton.addEventListener("click", closeModal);
  postModal.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.tagName === "DIALOG") {
      closeModal();
    }
  });
}

function hydrate() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    state.accounts = Array.isArray(parsed.accounts) ? parsed.accounts : [];
    state.posts = Array.isArray(parsed.posts) ? parsed.posts : [];
    state.dms = Array.isArray(parsed.dms) ? parsed.dms : [];
    state.follows = Array.isArray(parsed.follows) ? parsed.follows : [];
    state.activeAccountId = parsed.activeAccountId || null;
    state.viewMode = ["feed", "explore", "profile", "reels", "dm"].includes(parsed.viewMode)
      ? parsed.viewMode
      : "feed";
    state.searchQuery = typeof parsed.searchQuery === "string" ? parsed.searchQuery : "";
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    accounts: state.accounts,
    posts: state.posts,
    dms: state.dms,
    follows: state.follows,
    activeAccountId: state.activeAccountId,
    viewMode: state.viewMode,
    searchQuery: state.searchQuery,
  }));
}

function ensureActiveAccount() {
  if (!state.activeAccountId && state.accounts.length) {
    state.activeAccountId = state.accounts[0].id;
  }
}

function setViewMode(mode) {
  state.viewMode = mode;
  if (mode === "reels") {
    state.currentReelIndex = 0;
  }

  persist();
  renderAll();
}

async function handleCreateAccount(event) {
  event.preventDefault();
  const data = new FormData(accountForm);
  const username = String(data.get("username") || "").trim().toLowerCase();
  const avatarFile = data.get("avatar");

  if (!username) return;
  if (state.accounts.some((item) => item.username === username)) {
    alert("That username already exists.");
    return;
  }

  let avatarDataUrl = null;
  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (!avatarFile.type.startsWith("image/")) {
      alert("Profile picture must be an image.");
      return;
    }

    avatarDataUrl = await fileToSizedSquareDataUrl(avatarFile, AVATAR_SIZE, {
      zoom: Number(document.getElementById("avatar-zoom").value),
      offsetX: Number(document.getElementById("avatar-x").value),
      offsetY: Number(document.getElementById("avatar-y").value),
    });
  }

  state.accounts.unshift({
    id: crypto.randomUUID(),
    username,
    avatarDataUrl,
    createdAt: Date.now(),
  });
  state.activeAccountId = state.accounts[0].id;
  state.viewMode = "profile";

  persist();
  accountForm.reset();
  renderAll();
}

function setActiveAccount(accountId) {
  state.activeAccountId = accountId;
  state.viewMode = "profile";
  persist();
  renderAll();
}

async function handleCreatePost(event) {
  event.preventDefault();

  if (!state.activeAccountId) {
    alert("Create/select an account first.");
    return;
  }

  const data = new FormData(postForm);
  const photo = data.get("photo");
  const caption = String(data.get("caption") || "").trim();

  if (!(photo instanceof File) || !photo.type.startsWith("image/")) {
    alert("Please choose an image file.");
    return;
  }

  const imageDataUrl = await fileToSizedSquareDataUrl(photo, POST_SIZE, {
    zoom: Number(document.getElementById("post-zoom").value),
    offsetX: Number(document.getElementById("post-x").value),
    offsetY: Number(document.getElementById("post-y").value),
  });

  state.posts.unshift({
    id: crypto.randomUUID(),
    accountId: state.activeAccountId,
    imageDataUrl,
    caption,
    comments: [],
    likes: [],
    createdAt: Date.now(),
  });

  persist();
  postForm.reset();
  renderAll();
}

function handleAddComment(event) {
  event.preventDefault();
  if (!state.selectedPostId) return;

  const input = document.getElementById("comment-input");
  const text = input.value.trim();
  if (!text) return;

  const post = state.posts.find((item) => item.id === state.selectedPostId);
  if (!post) return;

  const active = getActiveAccount();
  post.comments.push({
    id: crypto.randomUUID(),
    from: active ? `@${active.username}` : "@guest",
    text,
    createdAt: Date.now(),
  });

  persist();
  input.value = "";
  renderPostModal(post);
  renderFeed();
}

function handleSendDm(event) {
  event.preventDefault();

  const fromId = dmFrom.value;
  const toId = dmTo.value;
  const textInput = document.getElementById("dm-text");
  const text = textInput.value.trim();

  if (!fromId || !toId || fromId === toId || !text) return;

  state.dms.push({ id: crypto.randomUUID(), fromId, toId, text, createdAt: Date.now() });

  textInput.value = "";
  persist();
  renderDmThread();
}

function clearData() {
  const confirmed = confirm("Delete all local accounts/posts/comments/likes/follows/DMs?");
  if (!confirmed) return;

  state.accounts = [];
  state.posts = [];
  state.dms = [];
  state.follows = [];
  state.activeAccountId = null;
  state.viewMode = "feed";
  state.currentReelIndex = 0;
  state.selectedPostId = null;
  state.searchQuery = "";

  localStorage.removeItem(STORAGE_KEY);
  renderAll();
  closeModal();
}

function renderAll() {
  renderNav();
  renderModeSections();
  renderAccounts();
  renderDmSelectors();
  renderDmThread();
  renderProfileHeader();
  renderFeed();
  renderReels();
}

function renderModeSections() {
  const isDm = state.viewMode === "dm";
  dmPanel.classList.toggle("hidden", !isDm);
  composeCard.classList.toggle("hidden", isDm);
  profileHeader.classList.toggle("hidden", isDm || state.viewMode !== "profile");
  feedEl.classList.toggle("hidden", isDm || state.viewMode === "reels");
}

function renderNav() {
  viewFeedButton.classList.toggle("active", state.viewMode === "feed");
  viewExploreButton.classList.toggle("active", state.viewMode === "explore");
  viewProfileButton.classList.toggle("active", state.viewMode === "profile");
  viewReelsButton.classList.toggle("active", state.viewMode === "reels");
  viewDmButton.classList.toggle("active", state.viewMode === "dm");

  if (state.viewMode === "profile") {
    const active = getActiveAccount();
    viewTitleEl.textContent = active ? `${active.username}` : "Profile";
  } else if (state.viewMode === "reels") {
    viewTitleEl.textContent = "Reels";
  } else if (state.viewMode === "dm") {
    viewTitleEl.textContent = "Messages";
  } else if (state.viewMode === "explore") {
    viewTitleEl.textContent = "Explore";
  } else {
    viewTitleEl.textContent = "Home feed";
  }
}

function renderAccounts() {
  accountList.innerHTML = "";

  for (const account of state.accounts) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = account.id === state.activeAccountId ? "active" : "";
    button.addEventListener("click", () => setActiveAccount(account.id));

    const left = document.createElement("div");
    left.className = "user-line";

    const avatar = document.createElement("img");
    avatar.className = "avatar";
    avatar.src = getAvatar(account);
    avatar.alt = `@${account.username} avatar`;

    const name = document.createElement("span");
    name.textContent = `@${account.username}`;

    left.append(avatar, name);

    const count = document.createElement("span");
    count.className = "muted small";
    count.textContent = `${countPostsByAccount(account.id)}`;

    button.append(left, count);
    li.append(button);
    accountList.append(li);
  }

  const active = getActiveAccount();
  activeAccountEl.textContent = active ? `Posting as @${active.username}` : "No account selected";
}

function renderDmSelectors() {
  const options = state.accounts
    .map((account) => `<option value="${account.id}">@${escapeHtml(account.username)}</option>`)
    .join("");

  const fromCurrent = dmFrom.value;
  const toCurrent = dmTo.value;

  dmFrom.innerHTML = `<option value="">From</option>${options}`;
  dmTo.innerHTML = `<option value="">To</option>${options}`;

  if (state.accounts.length >= 2) {
    dmFrom.value = fromCurrent && hasAccount(fromCurrent) ? fromCurrent : state.accounts[0].id;
    dmTo.value = toCurrent && hasAccount(toCurrent) ? toCurrent : state.accounts[1].id;
  }
}

function hasAccount(accountId) {
  return state.accounts.some((account) => account.id === accountId);
}

function renderDmThread() {
  dmThread.innerHTML = "";

  const fromId = dmFrom.value;
  const toId = dmTo.value;

  if (!fromId || !toId || fromId === toId) {
    dmThread.innerHTML = '<p class="muted small">Select two different accounts to view/send fake DMs.</p>';
    return;
  }

  const messages = state.dms.filter((dm) =>
    (dm.fromId === fromId && dm.toId === toId) ||
    (dm.fromId === toId && dm.toId === fromId)
  );

  if (!messages.length) {
    dmThread.innerHTML = '<p class="muted small">No messages yet between these accounts.</p>';
    return;
  }

  for (const dm of messages) {
    const sender = state.accounts.find((account) => account.id === dm.fromId);
    const msg = document.createElement("div");
    msg.className = `dm-msg ${dm.fromId === fromId ? "self" : "other"}`;
    msg.innerHTML = `<strong>${sender ? `@${escapeHtml(sender.username)}` : "@deleted"}</strong><br>${escapeHtml(dm.text)}`;
    dmThread.append(msg);
  }
}

function renderProfileHeader() {
  if (state.viewMode !== "profile") {
    return;
  }

  const account = getActiveAccount();
  if (!account) {
    profileHeader.classList.remove("hidden");
    profileHeader.innerHTML = '<p class="empty">Create/select an account to view profile.</p>';
    return;
  }

  const postsCount = countPostsByAccount(account.id);
  const followers = getFollowersCount(account.id);
  const following = getFollowingCount(account.id);
  const isFollowing = isFollowingActive(account.id);
  const followerChips = getFollowerNames(account.id);
  const followingChips = getFollowingNames(account.id);

  profileHeader.classList.remove("hidden");
  profileHeader.innerHTML = `
    <div class="profile-avatar-wrap">
      <img class="profile-avatar" src="${getAvatar(account)}" alt="@${account.username} avatar" />
    </div>
    <div class="profile-meta">
      <h2>${escapeHtml(account.username)}</h2>
      <div class="profile-stats">
        <span><strong>${postsCount}</strong> posts</span>
        <span><strong>${followers}</strong> followers</span>
        <span><strong>${following}</strong> following</span>
      </div>
      <button type="button" id="follow-btn" class="follow-btn">${isFollowing ? "Following" : "Follow"}</button>
      <div class="follow-lists small">
        <div><strong>Followers:</strong> ${followerChips || '<span class="muted">none</span>'}</div>
        <div><strong>Following:</strong> ${followingChips || '<span class="muted">none</span>'}</div>
      </div>
    </div>
  `;

  const followButton = document.getElementById("follow-btn");
  if (followButton) {
    followButton.addEventListener("click", () => toggleFollow(account.id));
  }
}

function renderFeed() {
  feedEl.innerHTML = "";

  if (state.viewMode === "reels" || state.viewMode === "dm") {
    return;
  }

  const posts = getVisiblePosts();
  if (!posts.length) {
    feedEl.append(createEmptyMessage());
    return;
  }

  for (const post of posts) {
    if (!Array.isArray(post.likes)) {
      post.likes = [];
    }

    const account = state.accounts.find((item) => item.id === post.accountId);
    const node = postTemplate.content.firstElementChild.cloneNode(true);

    node.querySelector(".post-user").textContent = account ? `@${account.username}` : "@deleted-account";
    node.querySelector(".post-time").textContent = formatDate(post.createdAt);
    node.querySelector(".avatar").src = getAvatar(account);

    const image = node.querySelector(".post-image");
    image.src = post.imageDataUrl;
    image.addEventListener("click", () => openPost(post.id));

    node.querySelector(".post-caption").textContent = post.caption;
    node.querySelector(".post-likes-count").textContent = `${post.likes.length} likes`;
    node.querySelector(".post-comments-count").textContent = `${post.comments.length} comments`;

    const likeButton = node.querySelector(".like-btn");
    likeButton.classList.toggle("liked", isLikedByActive(post));
    likeButton.textContent = isLikedByActive(post) ? "♥ Liked" : "♡ Like";
    likeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleLike(post.id);
    });

    node.querySelector(".comment-btn").addEventListener("click", (event) => {
      event.stopPropagation();
      openPost(post.id);
    });

    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPost(post.id);
      }
    });

    feedEl.append(node);
  }
}

function renderReels() {
  const on = state.viewMode === "reels";
  reelsOverlay.classList.toggle("hidden", !on);
  if (!on) return;

  const posts = state.posts;
  if (!posts.length) {
    reelStage.innerHTML = '<p class="empty">No reels yet. Create posts first.</p>';
    return;
  }

  if (state.currentReelIndex >= posts.length) {
    state.currentReelIndex = 0;
  }

  const post = posts[state.currentReelIndex];
  const account = state.accounts.find((item) => item.id === post.accountId);

  reelStage.innerHTML = `
    <img src="${post.imageDataUrl}" alt="Reel image" id="reel-image" />
    <div class="reel-meta">
      <div class="user-line">
        <img class="avatar" src="${getAvatar(account)}" alt="avatar" />
        <strong>${account ? `@${escapeHtml(account.username)}` : "@deleted-account"}</strong>
      </div>
      <p>${escapeHtml(post.caption || "")}</p>
      <p class="muted small">${formatDate(post.createdAt)} • ${post.likes?.length || 0} likes • ${post.comments.length} comments</p>
    </div>
  `;

  const reelImage = document.getElementById("reel-image");
  if (reelImage) {
    reelImage.addEventListener("click", () => openPost(post.id));
  }
}

function nextReel() {
  if (!state.posts.length) return;
  state.currentReelIndex = (state.currentReelIndex + 1) % state.posts.length;
  renderReels();
}

function toggleLike(postId) {
  const active = getActiveAccount();
  if (!active) {
    alert("Select an account first.");
    return;
  }

  const post = state.posts.find((item) => item.id === postId);
  if (!post) return;

  if (!Array.isArray(post.likes)) post.likes = [];

  const index = post.likes.indexOf(active.id);
  if (index === -1) post.likes.push(active.id);
  else post.likes.splice(index, 1);

  persist();
  renderFeed();
  renderReels();
}

function isLikedByActive(post) {
  const active = getActiveAccount();
  return Boolean(active && Array.isArray(post.likes) && post.likes.includes(active.id));
}

function toggleFollow(targetId) {
  const active = getActiveAccount();
  if (!active || active.id === targetId) return;

  const index = state.follows.findIndex((item) => item.followerId === active.id && item.followingId === targetId);
  if (index === -1) state.follows.push({ followerId: active.id, followingId: targetId });
  else state.follows.splice(index, 1);

  persist();
  renderProfileHeader();
}

function isFollowingActive(targetId) {
  const active = getActiveAccount();
  if (!active || active.id === targetId) return false;
  return state.follows.some((item) => item.followerId === active.id && item.followingId === targetId);
}

function getFollowersCount(accountId) {
  return 120 + state.follows.filter((item) => item.followingId === accountId).length;
}

function getFollowingCount(accountId) {
  return 80 + state.follows.filter((item) => item.followerId === accountId).length;
}

function getFollowerNames(accountId) {
  return state.follows
    .filter((item) => item.followingId === accountId)
    .map((item) => state.accounts.find((account) => account.id === item.followerId))
    .filter(Boolean)
    .map((account) => `<span class="follow-chip">@${escapeHtml(account.username)}</span>`)
    .join("");
}

function getFollowingNames(accountId) {
  return state.follows
    .filter((item) => item.followerId === accountId)
    .map((item) => state.accounts.find((account) => account.id === item.followingId))
    .filter(Boolean)
    .map((account) => `<span class="follow-chip">@${escapeHtml(account.username)}</span>`)
    .join("");
}

function openPost(postId) {
  const post = state.posts.find((item) => item.id === postId);
  if (!post) return;

  state.selectedPostId = post.id;
  renderPostModal(post);

  if (!postModal.open) postModal.showModal();
}

function renderPostModal(post) {
  const account = state.accounts.find((item) => item.id === post.accountId);

  modalImage.src = post.imageDataUrl;
  modalAvatar.src = getAvatar(account);
  modalUser.textContent = account ? `@${account.username}` : "@deleted-account";
  modalCaption.textContent = post.caption;
  modalTime.textContent = formatDate(post.createdAt);

  modalComments.innerHTML = "";
  if (!post.comments.length) {
    const empty = document.createElement("li");
    empty.className = "muted small";
    empty.textContent = "No comments yet.";
    modalComments.append(empty);
    return;
  }

  for (const comment of post.comments) {
    const li = document.createElement("li");
    li.className = "comment-item";
    li.textContent = `${comment.from}: ${comment.text}`;
    modalComments.append(li);
  }
}

function closeModal() {
  if (postModal.open) postModal.close();
  state.selectedPostId = null;
}

function getVisiblePosts() {
  let posts;
  if (state.viewMode === "profile") {
    if (!state.activeAccountId) return [];
    posts = state.posts.filter((post) => post.accountId === state.activeAccountId);
  } else if (state.viewMode === "explore") {
    posts = state.posts.filter((post) => post.accountId !== state.activeAccountId);
    if (!posts.length) posts = state.posts;
  } else {
    posts = state.posts;
  }

  return filterBySearch(posts);
}

function filterBySearch(posts) {
  if (!state.searchQuery) return posts;
  return posts.filter((post) => {
    const account = state.accounts.find((item) => item.id === post.accountId);
    const username = account?.username || "";
    const caption = post.caption || "";
    return username.toLowerCase().includes(state.searchQuery) || caption.toLowerCase().includes(state.searchQuery);
  });
}

function getActiveAccount() {
  return state.accounts.find((item) => item.id === state.activeAccountId) || null;
}

function countPostsByAccount(accountId) {
  return state.posts.filter((item) => item.accountId === accountId).length;
}

function getAvatar(account) {
  if (account?.avatarDataUrl) return account.avatarDataUrl;

  const initial = (account?.username || "U").slice(0, 1).toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%' height='100%' fill='%23262626'/><text x='50%' y='56%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='34' font-family='Arial'>${initial}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createEmptyMessage() {
  const p = document.createElement("p");
  p.className = "empty";
  p.textContent = "No posts match this view yet.";
  return p;
}

function formatDate(unixTime) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(unixTime);
}

function escapeHtml(input) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function fileToSizedSquareDataUrl(file, size, options) {
  const source = await fileToDataUrl(file);
  const image = await loadImage(source);

  const crop = computeCropRect(image.width, image.height, options);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) return source;

  context.drawImage(image, crop.x, crop.y, crop.side, crop.side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function computeCropRect(width, height, options) {
  const zoom = Math.max(1, Number(options.zoom) || 1);
  const base = Math.min(width, height);
  const side = base / zoom;
  const maxX = (width - side) / 2;
  const maxY = (height - side) / 2;

  const clampedX = Math.max(-1, Math.min(1, Number(options.offsetX) || 0));
  const clampedY = Math.max(-1, Math.min(1, Number(options.offsetY) || 0));

  return {
    x: (width - side) / 2 + maxX * clampedX,
    y: (height - side) / 2 + maxY * clampedY,
    side,
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
