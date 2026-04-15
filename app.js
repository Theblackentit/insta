const STORAGE_KEY = "offline-insta-v2";

const state = {
  accounts: [],
  posts: [],
  activeAccountId: null,
  viewMode: "feed",
  selectedPostId: null,
};

const accountForm = document.getElementById("account-form");
const postForm = document.getElementById("post-form");
const commentForm = document.getElementById("comment-form");
const accountList = document.getElementById("account-list");
const activeAccountEl = document.getElementById("active-account");
const viewTitleEl = document.getElementById("view-title");
const feedEl = document.getElementById("feed");
const reelsEl = document.getElementById("reels");
const clearButton = document.getElementById("clear-data");
const postTemplate = document.getElementById("post-template");

const viewFeedButton = document.getElementById("view-feed");
const viewProfileButton = document.getElementById("view-profile");
const viewReelsButton = document.getElementById("view-reels");

const postModal = document.getElementById("post-modal");
const closeModalButton = document.getElementById("close-modal");
const modalImage = document.getElementById("modal-image");
const modalUser = document.getElementById("modal-user");
const modalCaption = document.getElementById("modal-caption");
const modalTime = document.getElementById("modal-time");
const modalComments = document.getElementById("modal-comments");

init();

function init() {
  hydrate();
  renderAll();

  accountForm.addEventListener("submit", handleCreateAccount);
  postForm.addEventListener("submit", handleCreatePost);
  commentForm.addEventListener("submit", handleAddComment);
  clearButton.addEventListener("click", clearData);

  viewFeedButton.addEventListener("click", () => setViewMode("feed"));
  viewProfileButton.addEventListener("click", () => setViewMode("profile"));
  viewReelsButton.addEventListener("click", () => setViewMode("reels"));

  closeModalButton.addEventListener("click", closeModal);
  postModal.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.tagName === "DIALOG") {
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
    state.activeAccountId = parsed.activeAccountId || state.accounts[0]?.id || null;
    state.viewMode = ["feed", "profile", "reels"].includes(parsed.viewMode)
      ? parsed.viewMode
      : "feed";
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderAll() {
  renderAccounts();
  renderViewButtons();
  renderFeed();
  renderReels();
}

function handleCreateAccount(event) {
  event.preventDefault();
  const formData = new FormData(accountForm);
  const username = String(formData.get("username") || "").trim().toLowerCase();

  if (!username) return;

  const alreadyExists = state.accounts.some((account) => account.username === username);
  if (alreadyExists) {
    alert("That username already exists.");
    return;
  }

  const account = {
    id: crypto.randomUUID(),
    username,
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

function setViewMode(mode) {
  state.viewMode = mode;
  persist();
  renderViewButtons();
  renderFeed();
  renderReels();
}

async function handleCreatePost(event) {
  event.preventDefault();

  if (!state.activeAccountId) {
    alert("Create/select an account first.");
    return;
  }

  const formData = new FormData(postForm);
  const file = formData.get("photo");
  const caption = String(formData.get("caption") || "").trim();

  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    alert("Please choose an image file.");
    return;
  }

  const imageDataUrl = await fileToDataUrl(file);

  const post = {
    id: crypto.randomUUID(),
    accountId: state.activeAccountId,
    imageDataUrl,
    caption,
    comments: [],
    createdAt: Date.now(),
  };

  state.posts.unshift(post);
  persist();
  postForm.reset();
  renderFeed();
  renderReels();
}

function handleAddComment(event) {
  event.preventDefault();
  if (!state.selectedPostId) return;

  const input = document.getElementById("comment-input");
  const comment = input.value.trim();
  if (!comment) return;

  const post = state.posts.find((item) => item.id === state.selectedPostId);
  if (!post) return;

  const active = getActiveAccount();
  const from = active ? `@${active.username}` : "@guest";

  if (!Array.isArray(post.comments)) {
    post.comments = [];
  }

  post.comments.push({
    id: crypto.randomUUID(),
    from,
    text: comment,
    createdAt: Date.now(),
  });

  persist();
  input.value = "";
  openPost(post.id);
  renderFeed();
  renderReels();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function clearData() {
  const confirmed = confirm("Delete all accounts, posts, and comments from this browser?");
  if (!confirmed) return;

  state.accounts = [];
  state.posts = [];
  state.activeAccountId = null;
  state.selectedPostId = null;
  state.viewMode = "feed";
  localStorage.removeItem(STORAGE_KEY);
  renderAll();
  closeModal();
}

function renderAccounts() {
  accountList.innerHTML = "";

  for (const account of state.accounts) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = account.id === state.activeAccountId ? "active" : "";
    button.addEventListener("click", () => setActiveAccount(account.id));

    const username = document.createElement("span");
    username.textContent = `@${account.username}`;
    const postCount = document.createElement("span");
    postCount.className = "muted small";
    postCount.textContent = `${countPostsByAccount(account.id)} posts`;

    button.append(username, postCount);
    li.append(button);
    accountList.append(li);
  }

  const active = getActiveAccount();
  activeAccountEl.textContent = active
    ? `Posting as @${active.username}`
    : "No account selected";
}

function renderViewButtons() {
  const active = getActiveAccount();
  viewFeedButton.classList.toggle("active", state.viewMode === "feed");
  viewProfileButton.classList.toggle("active", state.viewMode === "profile");
  viewReelsButton.classList.toggle("active", state.viewMode === "reels");

  if (state.viewMode === "profile") {
    viewTitleEl.textContent = active ? `Profile: @${active.username}` : "Profile (no account selected)";
  } else if (state.viewMode === "reels") {
    viewTitleEl.textContent = "Reels: scroll vertically through every post";
  } else {
    viewTitleEl.textContent = "Feed: all accounts";
  }
}

function renderFeed() {
  const isReels = state.viewMode === "reels";
  feedEl.classList.toggle("hidden", isReels);
  reelsEl.classList.toggle("hidden", !isReels);
  if (isReels) return;

  feedEl.innerHTML = "";
  const posts = getVisiblePosts();

  if (!posts.length) {
    feedEl.append(createEmptyMessage());
    return;
  }

  for (const post of posts) {
    const account = state.accounts.find((item) => item.id === post.accountId);
    const postNode = postTemplate.content.firstElementChild.cloneNode(true);

    postNode.querySelector(".post-user").textContent = account
      ? `@${account.username}`
      : "@deleted-account";
    postNode.querySelector(".post-time").textContent = formatDate(post.createdAt);

    const image = postNode.querySelector(".post-image");
    image.src = post.imageDataUrl;

    postNode.querySelector(".post-caption").textContent = post.caption || "";
    postNode.querySelector(".post-comments-count").textContent = `${post.comments?.length || 0} comments`;

    postNode.addEventListener("click", () => openPost(post.id));
    postNode.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPost(post.id);
      }
    });

    feedEl.append(postNode);
  }
}

function renderReels() {
  reelsEl.innerHTML = "";
  if (state.viewMode !== "reels") return;

  if (!state.posts.length) {
    reelsEl.append(createEmptyMessage());
    return;
  }

  for (const post of state.posts) {
    const account = state.accounts.find((item) => item.id === post.accountId);

    const card = document.createElement("article");
    card.className = "reel-card";

    const image = document.createElement("img");
    image.src = post.imageDataUrl;
    image.alt = post.caption || "Reel image";
    image.addEventListener("click", () => openPost(post.id));

    const meta = document.createElement("div");
    meta.className = "reel-meta";
    meta.innerHTML = `
      <strong>${account ? `@${account.username}` : "@deleted-account"}</strong>
      <p>${escapeHtml(post.caption || "")}</p>
      <p class="muted small">${formatDate(post.createdAt)} • ${post.comments?.length || 0} comments</p>
    `;

    card.append(image, meta);
    reelsEl.append(card);
  }
}

function openPost(postId) {
  const post = state.posts.find((item) => item.id === postId);
  if (!post) return;

  state.selectedPostId = post.id;

  const account = state.accounts.find((item) => item.id === post.accountId);
  modalImage.src = post.imageDataUrl;
  modalUser.textContent = account ? `@${account.username}` : "@deleted-account";
  modalCaption.textContent = post.caption || "";
  modalTime.textContent = formatDate(post.createdAt);

  renderComments(post.comments || []);

  if (!postModal.open) {
    postModal.showModal();
  }
}

function closeModal() {
  if (postModal.open) {
    postModal.close();
  }
  state.selectedPostId = null;
}

function renderComments(comments) {
  modalComments.innerHTML = "";

  if (!comments.length) {
    const empty = document.createElement("li");
    empty.className = "muted small";
    empty.textContent = "No comments yet.";
    modalComments.append(empty);
    return;
  }

  for (const comment of comments) {
    const item = document.createElement("li");
    item.className = "comment-item";
    item.textContent = `${comment.from}: ${comment.text}`;
    modalComments.append(item);
  }
}

function getVisiblePosts() {
  if (state.viewMode === "profile") {
    if (!state.activeAccountId) {
      return [];
    }

    return state.posts.filter((post) => post.accountId === state.activeAccountId);
  }

  return state.posts;
}

function getActiveAccount() {
  return state.accounts.find((account) => account.id === state.activeAccountId) || null;
}

function countPostsByAccount(accountId) {
  return state.posts.filter((post) => post.accountId === accountId).length;
}

function createEmptyMessage() {
  const empty = document.createElement("p");
  empty.className = "empty";
  empty.textContent = "No posts to show yet. Create an account and upload your first photo.";
  return empty;
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
