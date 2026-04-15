const STORAGE_KEY = "offline-insta-v3";

const state = {
  accounts: [],
  posts: [],
  activeAccountId: null,
  viewMode: "feed",
  selectedPostId: null,
  currentReelIndex: 0,
};

const accountForm = document.getElementById("account-form");
const postForm = document.getElementById("post-form");
const commentForm = document.getElementById("comment-form");
const accountList = document.getElementById("account-list");
const activeAccountEl = document.getElementById("active-account");
const profileHeader = document.getElementById("profile-header");
const viewTitleEl = document.getElementById("view-title");
const feedEl = document.getElementById("feed");
const clearButton = document.getElementById("clear-data");
const postTemplate = document.getElementById("post-template");

const viewFeedButton = document.getElementById("view-feed");
const viewProfileButton = document.getElementById("view-profile");
const viewReelsButton = document.getElementById("view-reels");

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
  renderAll();

  accountForm.addEventListener("submit", handleCreateAccount);
  postForm.addEventListener("submit", handleCreatePost);
  commentForm.addEventListener("submit", handleAddComment);
  clearButton.addEventListener("click", clearData);

  viewFeedButton.addEventListener("click", () => setViewMode("feed"));
  viewProfileButton.addEventListener("click", () => setViewMode("profile"));
  viewReelsButton.addEventListener("click", () => setViewMode("reels"));

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
    state.activeAccountId = parsed.activeAccountId || null;
    state.viewMode = ["feed", "profile", "reels"].includes(parsed.viewMode)
      ? parsed.viewMode
      : "feed";
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    accounts: state.accounts,
    posts: state.posts,
    activeAccountId: state.activeAccountId,
    viewMode: state.viewMode,
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

    avatarDataUrl = await fileToDataUrl(avatarFile);
  }

  const account = {
    id: crypto.randomUUID(),
    username,
    avatarDataUrl,
    createdAt: Date.now(),
  };

  state.accounts.unshift(account);
  state.activeAccountId = account.id;
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

  const imageDataUrl = await fileToDataUrl(photo);

  state.posts.unshift({
    id: crypto.randomUUID(),
    accountId: state.activeAccountId,
    imageDataUrl,
    caption,
    comments: [],
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

function clearData() {
  const confirmed = confirm("Delete all local accounts/posts/comments?");
  if (!confirmed) return;

  state.accounts = [];
  state.posts = [];
  state.activeAccountId = null;
  state.viewMode = "feed";
  state.currentReelIndex = 0;
  state.selectedPostId = null;

  localStorage.removeItem(STORAGE_KEY);
  renderAll();
  closeModal();
}

function renderAll() {
  renderNav();
  renderAccounts();
  renderProfileHeader();
  renderFeed();
  renderReels();
}

function renderNav() {
  viewFeedButton.classList.toggle("active", state.viewMode === "feed");
  viewProfileButton.classList.toggle("active", state.viewMode === "profile");
  viewReelsButton.classList.toggle("active", state.viewMode === "reels");

  if (state.viewMode === "profile") {
    const active = getActiveAccount();
    viewTitleEl.textContent = active ? `${active.username}` : "Profile";
  } else if (state.viewMode === "reels") {
    viewTitleEl.textContent = "Reels";
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

function renderProfileHeader() {
  if (state.viewMode !== "profile") {
    profileHeader.classList.add("hidden");
    return;
  }

  const account = getActiveAccount();
  if (!account) {
    profileHeader.classList.remove("hidden");
    profileHeader.innerHTML = '<p class="empty">Create/select an account to view profile.</p>';
    return;
  }

  const postsCount = countPostsByAccount(account.id);
  const followers = 120 + postsCount * 13;
  const following = 80 + Math.floor(postsCount / 2);

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
      <p class="muted">Offline creator account • Local only</p>
    </div>
  `;
}

function renderFeed() {
  feedEl.innerHTML = "";

  if (state.viewMode === "reels") {
    feedEl.classList.add("hidden");
    return;
  }

  feedEl.classList.remove("hidden");

  const posts = getVisiblePosts();
  if (!posts.length) {
    feedEl.append(createEmptyMessage());
    return;
  }

  for (const post of posts) {
    const account = state.accounts.find((item) => item.id === post.accountId);
    const node = postTemplate.content.firstElementChild.cloneNode(true);

    node.querySelector(".post-user").textContent = account ? `@${account.username}` : "@deleted-account";
    node.querySelector(".post-time").textContent = formatDate(post.createdAt);

    const avatar = node.querySelector(".avatar");
    avatar.src = getAvatar(account);

    const image = node.querySelector(".post-image");
    image.src = post.imageDataUrl;

    node.querySelector(".post-caption").textContent = post.caption;
    node.querySelector(".post-comments-count").textContent = `${post.comments.length} comments • click to open`;

    node.addEventListener("click", () => openPost(post.id));
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
      <p class="muted small">${formatDate(post.createdAt)} • ${post.comments.length} comments</p>
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

function openPost(postId) {
  const post = state.posts.find((item) => item.id === postId);
  if (!post) return;

  state.selectedPostId = post.id;
  renderPostModal(post);

  if (!postModal.open) {
    postModal.showModal();
  }
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
  if (postModal.open) {
    postModal.close();
  }
  state.selectedPostId = null;
}

function getVisiblePosts() {
  if (state.viewMode === "profile") {
    if (!state.activeAccountId) return [];
    return state.posts.filter((post) => post.accountId === state.activeAccountId);
  }

  return state.posts;
}

function getActiveAccount() {
  return state.accounts.find((item) => item.id === state.activeAccountId) || null;
}

function countPostsByAccount(accountId) {
  return state.posts.filter((item) => item.accountId === accountId).length;
}

function getAvatar(account) {
  if (account && account.avatarDataUrl) {
    return account.avatarDataUrl;
  }

  const initial = (account?.username || "U").slice(0, 1).toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><rect width='100%' height='100%' fill='%23262626'/><text x='50%' y='56%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='34' font-family='Arial'>${initial}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function createEmptyMessage() {
  const p = document.createElement("p");
  p.className = "empty";
  p.textContent = "No posts yet. Create an account and upload your first post.";
  return p;
}

function formatDate(unixTime) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(unixTime);
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
