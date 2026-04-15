const STORAGE_KEY = "offline-insta-v1";

const state = {
  accounts: [],
  posts: [],
  activeAccountId: null,
};

const accountForm = document.getElementById("account-form");
const postForm = document.getElementById("post-form");
const accountList = document.getElementById("account-list");
const activeAccountEl = document.getElementById("active-account");
const feedEl = document.getElementById("feed");
const clearButton = document.getElementById("clear-data");
const postTemplate = document.getElementById("post-template");

init();

function init() {
  hydrate();
  renderAccounts();
  renderFeed();

  accountForm.addEventListener("submit", handleCreateAccount);
  postForm.addEventListener("submit", handleCreatePost);
  clearButton.addEventListener("click", clearData);
}

function hydrate() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    state.accounts = Array.isArray(parsed.accounts) ? parsed.accounts : [];
    state.posts = Array.isArray(parsed.posts) ? parsed.posts : [];
    state.activeAccountId = parsed.activeAccountId || state.accounts[0]?.id || null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
    createdAt: Date.now(),
  };

  state.posts.unshift(post);
  persist();
  postForm.reset();
  renderFeed();
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
  const confirmed = confirm("Delete all accounts and posts from this browser?");
  if (!confirmed) return;

  state.accounts = [];
  state.posts = [];
  state.activeAccountId = null;
  localStorage.removeItem(STORAGE_KEY);
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
  activeAccountEl.textContent = active
    ? `Posting as @${active.username}`
    : "No account selected";
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
    postNode.querySelector(".post-user").textContent = account
      ? `@${account.username}`
      : "@deleted-account";
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
