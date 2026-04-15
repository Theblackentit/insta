const STORAGE_KEY = "offline-insta-v1";
const MAX_IMAGE_DIMENSION = 1600;
const OUTPUT_QUALITY = 0.82;

const state = {
  accounts: [],
  posts: [],
  activeAccountId: null,
  activeView: "home",
};

const accountForm = document.getElementById("account-form");
const postForm = document.getElementById("post-form");
const accountList = document.getElementById("account-list");
const activeAccountEl = document.getElementById("active-account");
const feedEl = document.getElementById("feed");
const clearButton = document.getElementById("clear-data");
const postTemplate = document.getElementById("post-template");
const tabButtons = Array.from(document.querySelectorAll("[data-view-tab]"));
const views = Array.from(document.querySelectorAll("[data-view]"));

init();

function init() {
  hydrate();
  renderTabs();
  renderAccounts();
  renderFeed();

  accountForm.addEventListener("submit", handleCreateAccount);
  postForm.addEventListener("submit", handleCreatePost);
  clearButton.addEventListener("click", clearData);
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveView(button.dataset.viewTab || "home"));
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
    state.activeView = parsed.activeView || "home";
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
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
  persist();
  accountForm.reset();
  renderAccounts();
  renderFeed();
}

function setActiveAccount(accountId) {
  state.activeAccountId = accountId;
  persist();
  renderAccounts();
}

function setActiveView(viewName) {
  state.activeView = viewName;
  persist();
  renderTabs();
}

function renderTabs() {
  const activeView = state.activeView;

  tabButtons.forEach((button) => {
    const isActive = button.dataset.viewTab === activeView;
    button.classList.toggle("active", isActive);
  });

  views.forEach((view) => {
    const isActive = view.dataset.view === activeView;
    view.classList.toggle("active", isActive);
  });
}

async function handleCreatePost(event) {
  event.preventDefault();

  if (!state.activeAccountId) {
    alert("Create/select an account first.");
    return;
  }

  const submitButton = postForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Processing...";

  try {
    const formData = new FormData(postForm);
    const file = formData.get("photo");
    const caption = String(formData.get("caption") || "").trim();

    if (!(file instanceof File) || !file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }

    const imageDataUrl = await fileToOptimizedDataUrl(file);

    const post = {
      id: crypto.randomUUID(),
      accountId: state.activeAccountId,
      imageDataUrl,
      caption,
      createdAt: Date.now(),
    };

    state.posts.unshift(post);

    if (!persist()) {
      state.posts.shift();
      alert("This image is still too large to save locally. Try a smaller file.");
      return;
    }

    postForm.reset();
    setActiveView("home");
    renderFeed();
  } catch {
    alert("Couldn't process that image. Please try a different image file.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Post";
  }
}

async function fileToOptimizedDataUrl(file) {
  const imageBitmap = await createImageBitmap(file);
  const ratio = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(imageBitmap.width, imageBitmap.height));
  const width = Math.max(1, Math.round(imageBitmap.width * ratio));
  const height = Math.max(1, Math.round(imageBitmap.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.drawImage(imageBitmap, 0, 0, width, height);
  imageBitmap.close();

  return canvas.toDataURL("image/jpeg", OUTPUT_QUALITY);
}

function clearData() {
  const confirmed = confirm("Delete all accounts and posts from this browser?");
  if (!confirmed) return;

  state.accounts = [];
  state.posts = [];
  state.activeAccountId = null;
  state.activeView = "home";
  localStorage.removeItem(STORAGE_KEY);
  renderTabs();
  renderAccounts();
  renderFeed();
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
    const status = document.createElement("span");
    status.className = "muted";
    status.textContent = account.id === state.activeAccountId ? "Selected" : "";

    button.append(username, status);
    li.append(button);
    accountList.append(li);
  }

  const active = state.accounts.find((account) => account.id === state.activeAccountId);
  activeAccountEl.textContent = active ? `Posting as @${active.username}` : "No account selected";
}

function renderFeed() {
  feedEl.innerHTML = "";

  if (!state.posts.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No posts yet. Create an account and add your first photo.";
    feedEl.append(empty);
    return;
  }

  for (const post of state.posts) {
    const account = state.accounts.find((item) => item.id === post.accountId);
    const postNode = postTemplate.content.firstElementChild.cloneNode(true);
    postNode.querySelector(".post-user").textContent = account ? `@${account.username}` : "@deleted-account";
    postNode.querySelector(".post-time").textContent = formatDate(post.createdAt);
    postNode.querySelector(".post-image").src = post.imageDataUrl;
    postNode.querySelector(".post-caption").textContent = post.caption || "";

    feedEl.append(postNode);
  }
}

function formatDate(unixTime) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(unixTime);
}
