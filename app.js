"use strict";

const pageName = document.body?.dataset?.page;
const getCurrentUserEmail = () =>
  (localStorage.getItem("currentUserEmail") || "").trim().toLowerCase();
const getCurrentUserName = () => (localStorage.getItem("currentUserName") || "").trim();
const clearStoredSession = () => {
  localStorage.removeItem("currentUserEmail");
  localStorage.removeItem("currentUserName");
};

const buildPersistentTopActionsMarkup = () => {
  const currentUserEmail = getCurrentUserEmail();
  const currentUserName = getCurrentUserName();
  const showSignedInTopActions =
    Boolean(currentUserEmail) && !["signin", "signup"].includes(pageName);
  const chatsHref = currentUserEmail ? "chats.html" : "signin.html";
  const likesHref = currentUserEmail ? "liked-you.html" : "signin.html";
  const dashboardOnlyActions =
    showSignedInTopActions
      ? `
          <a data-nav="chats" href="${chatsHref}">
            Messages <span class="nav-badge" data-messages-badge hidden>0</span>
          </a>
          ${
            pageName === "dashboard"
              ? `
                  <button
                    type="button"
                    class="filter-toggle"
                    data-filter-toggle
                    aria-label="Open dashboard filters"
                    title="Filter dashboard"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 5h18v2l-7 7v5l-4-2v-3L3 7z" />
                    </svg>
                  </button>
                `
              : `
                  <a
                    class="filter-toggle"
                    href="dashboard.html?openFilters=1"
                    aria-label="Open dashboard filters"
                    title="Filter dashboard"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 5h18v2l-7 7v5l-4-2v-3L3 7z" />
                    </svg>
                  </a>
                `
          }
          <a data-nav="liked-you" href="${likesHref}">
            Likes <span class="nav-badge" data-likes-badge hidden>0</span>
          </a>
        `
      : "";
  const upgradeControl =
    pageName === "dashboard" && currentUserEmail
      ? `
          <button
            type="button"
            class="button primary top-upgrade-button"
            data-upgrade-button
          >
            Upgrade
          </button>
        `
      : "";
  const profileMenuLinks = currentUserEmail
    ? `
        <a href="membership.html">Membership</a>
        <a href="create-profile.html">Edit profile</a>
        <button type="button" data-logout-button>Logout</button>
      `
    : `
        <a href="signin.html">Sign in</a>
        <a href="signup.html">Create account</a>
      `;
  const profileLabel = currentUserName || "Account";

  return `
    <div class="persistent-top-actions" data-persistent-actions>
      ${dashboardOnlyActions}
      ${upgradeControl}
      <div class="profile-menu">
        <button
          type="button"
          class="profile-menu-toggle"
          data-profile-menu-toggle
          aria-haspopup="true"
          aria-expanded="false"
          aria-controls="profile-menu-dropdown"
          aria-label="Open account menu for ${profileLabel}"
          title="${profileLabel}"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 12.2a4.35 4.35 0 1 0-4.35-4.35A4.35 4.35 0 0 0 12 12.2zm0 2.05c-3.78 0-7 1.95-7 4.25V20h14v-1.5c0-2.3-3.22-4.25-7-4.25z"
            />
          </svg>
        </button>
        <div id="profile-menu-dropdown" class="profile-menu-dropdown" data-profile-menu hidden>
          ${profileMenuLinks}
        </div>
      </div>
    </div>
  `;
};

const ensurePersistentTopActions = () => {
  const siteHeaders = document.querySelectorAll(".site-header");
  siteHeaders.forEach((header) => {
    let nav = header.querySelector(".nav");
    if (!nav) {
      nav = document.createElement("nav");
      nav.className = "nav";
      header.appendChild(nav);
    }

    nav
      .querySelectorAll(
        "[data-nav='chats'], [data-nav='liked-you'], [data-filter-toggle], .profile-menu"
      )
      .forEach((node) => node.remove());

    nav.insertAdjacentHTML("beforeend", buildPersistentTopActionsMarkup());
  });

  if (!siteHeaders.length && !document.querySelector("[data-floating-top-actions]")) {
    const floatingActions = document.createElement("div");
    floatingActions.className = "floating-top-actions";
    floatingActions.setAttribute("data-floating-top-actions", "");
    floatingActions.innerHTML = buildPersistentTopActionsMarkup();
    document.body.appendChild(floatingActions);
  }
};

const syncActiveNavLinks = () => {
  if (!pageName) {
    return;
  }
  const navLinks = document.querySelectorAll("[data-nav]");
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("data-nav") === pageName);
  });
};

const rerenderPersistentTopActions = () => {
  ensurePersistentTopActions();
  syncActiveNavLinks();
};

const setBadgeCount = (selector, count) => {
  document.querySelectorAll(selector).forEach((badge) => {
    badge.textContent = String(count);
    badge.hidden = count === 0;
  });
};

const hideUpgradeButtons = () => {
  document.querySelectorAll("[data-upgrade-button]").forEach((button) => {
    button.hidden = true;
  });
};

const syncUpgradeButtonVisibility = () => {
  const currentUserEmail = getCurrentUserEmail();
  const shouldHide = !currentUserEmail || getMembershipPlan(currentUserEmail) === "premium";
  document.querySelectorAll("[data-upgrade-button]").forEach((button) => {
    button.hidden = shouldHide;
  });
};

rerenderPersistentTopActions();

const setProfileMenuOpen = (open) => {
  const profileMenuToggle = document.querySelector("[data-profile-menu-toggle]");
  const profileMenu = document.querySelector("[data-profile-menu]");
  if (!profileMenuToggle || !profileMenu) {
    return;
  }
  profileMenu.hidden = !open;
  profileMenuToggle.setAttribute("aria-expanded", open ? "true" : "false");
};

document.addEventListener("click", async (event) => {
  const profileMenuToggle = event.target.closest("[data-profile-menu-toggle]");
  if (profileMenuToggle) {
    event.stopPropagation();
    const isOpen = profileMenuToggle.getAttribute("aria-expanded") === "true";
    setProfileMenuOpen(!isOpen);
    return;
  }

  const logoutButton = event.target.closest("[data-logout-button]");
  if (logoutButton) {
    const services = getFirebaseServices();
    if (services?.auth?.currentUser) {
      await services.auth.signOut();
    }
    clearStoredSession();
    rerenderPersistentTopActions();
    window.location.href = "signin.html";
    return;
  }

  const upgradeButton = event.target.closest("[data-upgrade-button]");
  if (upgradeButton) {
    const currentUserEmail = getCurrentUserEmail();
    if (!currentUserEmail) {
      window.location.href = "signin.html";
      return;
    }
    setMembershipPlan(currentUserEmail, "premium");
    syncPersistentTopActionCounts();
    renderMembershipAd();
    hideUpgradeButtons();
    return;
  }

  const profileMenu = document.querySelector("[data-profile-menu]");
  const activeToggle = document.querySelector("[data-profile-menu-toggle]");
  if (
    profileMenu &&
    activeToggle &&
    !profileMenu.hidden &&
    !profileMenu.contains(event.target) &&
    !activeToggle.contains(event.target)
  ) {
    setProfileMenuOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setProfileMenuOpen(false);
  }
});

const getFirebaseServices = () => {
  if (!window.firebaseReady || !window.firebaseServices) {
    return null;
  }
  return window.firebaseServices;
};

const REMOTE_DATA_CACHE = {
  loaded: false,
  users: [],
  profiles: {},
  likes: [],
  likeSeen: {},
  chatThreads: [],
  chatMessages: [],
  messageSeen: {},
  dashboardFilters: {},
  memberships: {}
};

const isFirebaseDataEnabled = () => Boolean(getFirebaseServices()?.db);

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const toFirestoreId = (value) =>
  encodeURIComponent(String(value || "").trim().toLowerCase()).replace(/\./g, "%2E");

const fromFirestoreId = (value) =>
  decodeURIComponent(String(value || "").replace(/%2E/g, "."));

const getCurrentUserFilterKey = () => normalizeEmail(getCurrentUserEmail()) || "anonymous";

const readCollectionDocs = async (db, collectionName, keyMapper = (doc) => doc.id) => {
  const snapshot = await db.collection(collectionName).get();
  const output = {};
  snapshot.forEach((doc) => {
    output[keyMapper(doc)] = doc.data() || {};
  });
  return output;
};

const safeFirestoreGet = async (promise, fallback, label) => {
  try {
    return await promise;
  } catch (error) {
    console.warn(`Skipping Firebase read for ${label}.`, error);
    return fallback;
  }
};

const loadFirebaseAppData = async () => {
  const services = getFirebaseServices();
  if (!services?.db) {
    REMOTE_DATA_CACHE.loaded = true;
    return;
  }
  const authUser = await new Promise((resolve) => {
    let unsubscribe = () => {};
    unsubscribe = services.auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
  if (!authUser) {
    clearStoredSession();
    rerenderPersistentTopActions();
    REMOTE_DATA_CACHE.loaded = true;
    return;
  }
  localStorage.setItem("currentUserEmail", authUser.email || "");
  localStorage.setItem("currentUserName", authUser.displayName || "");
  rerenderPersistentTopActions();

  const authEmail = normalizeEmail(authUser.email);
  const encodedAuthEmail = toFirestoreId(authEmail);
  const [
    usersSnapshot,
    profiles,
    likesFromSnapshot,
    likesToSnapshot,
    chatThreadsASnapshot,
    chatThreadsBSnapshot,
    chatMessagesFromSnapshot,
    chatMessagesToSnapshot,
    likeSeenDoc,
    messageSeenDoc,
    dashboardFiltersDoc,
    memberships
  ] = await Promise.all([
    safeFirestoreGet(
      services.db.collection("users").get(),
      { forEach: () => {} },
      "users"
    ),
    safeFirestoreGet(
      readCollectionDocs(services.db, "profiles", (doc) => fromFirestoreId(doc.id)),
      {},
      "profiles"
    ),
    safeFirestoreGet(
      services.db.collection("likes").where("from", "==", authEmail).get(),
      { forEach: () => {} },
      "likes-from"
    ),
    safeFirestoreGet(
      services.db.collection("likes").where("to", "==", authEmail).get(),
      { forEach: () => {} },
      "likes-to"
    ),
    safeFirestoreGet(
      services.db.collection("chatThreads").where("a", "==", authEmail).get(),
      { forEach: () => {} },
      "chatThreads-a"
    ),
    safeFirestoreGet(
      services.db.collection("chatThreads").where("b", "==", authEmail).get(),
      { forEach: () => {} },
      "chatThreads-b"
    ),
    safeFirestoreGet(
      services.db.collection("chatMessages").where("from", "==", authEmail).get(),
      { forEach: () => {} },
      "chatMessages-from"
    ),
    safeFirestoreGet(
      services.db.collection("chatMessages").where("to", "==", authEmail).get(),
      { forEach: () => {} },
      "chatMessages-to"
    ),
    safeFirestoreGet(
      services.db.collection("likeSeen").doc(encodedAuthEmail).get(),
      { exists: false, data: () => ({}) },
      "likeSeen"
    ),
    safeFirestoreGet(
      services.db.collection("messageSeen").doc(encodedAuthEmail).get(),
      { exists: false, data: () => ({}) },
      "messageSeen"
    ),
    safeFirestoreGet(
      services.db.collection("dashboardFilters").doc(encodedAuthEmail).get(),
      { exists: false, data: () => ({}) },
      "dashboardFilters"
    ),
    safeFirestoreGet(
      readCollectionDocs(services.db, "memberships", (doc) => fromFirestoreId(doc.id)),
      {},
      "memberships"
    )
  ]);

  REMOTE_DATA_CACHE.users = [];
  usersSnapshot.forEach((doc) => {
    const data = doc.data() || {};
    REMOTE_DATA_CACHE.users.push({
      id: doc.id,
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      phone: data.phone || "",
      email: normalizeEmail(data.email),
      createdAt: data.createdAt || ""
    });
  });
  REMOTE_DATA_CACHE.profiles = profiles;
  REMOTE_DATA_CACHE.likes = [];
  const likesById = new Map();
  likesFromSnapshot.forEach((doc) => likesById.set(doc.id, { id: doc.id, ...(doc.data() || {}) }));
  likesToSnapshot.forEach((doc) => likesById.set(doc.id, { id: doc.id, ...(doc.data() || {}) }));
  REMOTE_DATA_CACHE.likes = Array.from(likesById.values());
  REMOTE_DATA_CACHE.chatThreads = [];
  const threadsById = new Map();
  chatThreadsASnapshot.forEach((doc) => threadsById.set(doc.id, { id: doc.id, ...(doc.data() || {}) }));
  chatThreadsBSnapshot.forEach((doc) => threadsById.set(doc.id, { id: doc.id, ...(doc.data() || {}) }));
  REMOTE_DATA_CACHE.chatThreads = Array.from(threadsById.values());
  REMOTE_DATA_CACHE.chatMessages = [];
  const messagesById = new Map();
  chatMessagesFromSnapshot.forEach((doc) => messagesById.set(doc.id, { id: doc.id, ...(doc.data() || {}) }));
  chatMessagesToSnapshot.forEach((doc) => messagesById.set(doc.id, { id: doc.id, ...(doc.data() || {}) }));
  REMOTE_DATA_CACHE.chatMessages = Array.from(messagesById.values());
  REMOTE_DATA_CACHE.likeSeen = likeSeenDoc.exists
    ? { [authEmail]: Number((likeSeenDoc.data() || {}).count || 0) }
    : {};
  REMOTE_DATA_CACHE.messageSeen = messageSeenDoc.exists
    ? { [authEmail]: Number((messageSeenDoc.data() || {}).count || 0) }
    : {};
  REMOTE_DATA_CACHE.dashboardFilters = dashboardFiltersDoc.exists
    ? { [authEmail]: dashboardFiltersDoc.data() || {} }
    : {};
  REMOTE_DATA_CACHE.memberships = Object.fromEntries(
    Object.entries(memberships).map(([key, value]) => [key, value.plan || "free"])
  );
  REMOTE_DATA_CACHE.loaded = true;
};

const appDataReady = loadFirebaseAppData().catch((error) => {
  console.error("Unable to load Firebase app data.", error);
  REMOTE_DATA_CACHE.loaded = true;
});

const whenAppDataReady = (callback) => {
  appDataReady.then(callback).catch((error) => {
    console.error("Unable to initialize page data.", error);
  });
};

const LOCAL_USERS_KEY = "localTestUsers";
const LOCAL_PROFILES_KEY = "localTestProfiles";
const LOCAL_LIKES_KEY = "localProfileLikes";
const LOCAL_LIKE_SEEN_KEY = "localLikeSeenByUser";
const LOCAL_CHAT_THREADS_KEY = "localChatThreads";
const LOCAL_CHAT_MESSAGES_KEY = "localChatMessages";
const LOCAL_MESSAGE_SEEN_KEY = "localMessageSeenByUser";
const LOCAL_DASH_FILTERS_KEY = "localDashboardFilters";
const LOCAL_MEMBERSHIPS_KEY = "localMembershipPlans";
const MEMBERSHIP_FREE_READ_LIMIT = 5;
const PAID_MEMBERSHIP_PLANS = new Set(["premium"]);
const LEGACY_TEST_EMAILS = new Set([
  "david.cole@testmatch.com",
  "marcus.hill@testmatch.com",
  "amina.yusuf@testmatch.com",
  "chioma.okafor@testmatch.com",
  "amina@example.com",
  "chioma@example.com",
  "tunde@example.com"
]);

const readLocalUsers = () => {
  if (isFirebaseDataEnabled()) {
    return REMOTE_DATA_CACHE.users;
  }
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const writeLocalUsers = (users) => {
  if (isFirebaseDataEnabled()) {
    REMOTE_DATA_CACHE.users = Array.isArray(users) ? users : [];
    const db = getFirebaseServices()?.db;
    if (db) {
      const currentEmail = getCurrentUserEmail();
      return Promise.all(REMOTE_DATA_CACHE.users
        .filter((user) => normalizeEmail(user.email) === currentEmail)
        .map((user) => {
        const docId = user.uid || user.id || toFirestoreId(user.email);
        return db.collection("users").doc(docId).set(user, { merge: true });
      }));
    }
    return;
  }
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
};

const readLocalProfiles = () => {
  if (isFirebaseDataEnabled()) {
    return REMOTE_DATA_CACHE.profiles;
  }
  try {
    const raw = localStorage.getItem(LOCAL_PROFILES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
};

const writeLocalProfiles = (profiles) => {
  if (isFirebaseDataEnabled()) {
    REMOTE_DATA_CACHE.profiles = profiles && typeof profiles === "object" ? profiles : {};
    const db = getFirebaseServices()?.db;
    if (db) {
      const currentEmail = getCurrentUserEmail();
      return Promise.all(Object.entries(REMOTE_DATA_CACHE.profiles)
        .filter(([email]) => normalizeEmail(email) === currentEmail)
        .map(([email, profile]) =>
        db.collection("profiles").doc(toFirestoreId(email)).set(
          {
            ...(profile || {}),
            email: normalizeEmail(email),
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        )
      ));
    }
    return;
  }
  localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(profiles));
};

const readLocalLikes = () => {
  if (isFirebaseDataEnabled()) {
    return REMOTE_DATA_CACHE.likes;
  }
  try {
    const raw = localStorage.getItem(LOCAL_LIKES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const writeLocalLikes = (likes) => {
  if (isFirebaseDataEnabled()) {
    REMOTE_DATA_CACHE.likes = Array.isArray(likes) ? likes : [];
    const db = getFirebaseServices()?.db;
    if (db) {
      const currentEmail = getCurrentUserEmail();
      return Promise.all(REMOTE_DATA_CACHE.likes
        .filter((like) => normalizeEmail(like.from) === currentEmail)
        .map((like) => {
        const id =
          like.id ||
          `${toFirestoreId(like.from)}__${toFirestoreId(like.to)}`;
        return db.collection("likes").doc(id).set({ ...like, id }, { merge: true });
      }));
    }
    return;
  }
  localStorage.setItem(LOCAL_LIKES_KEY, JSON.stringify(likes));
};

const readLikeSeen = () => {
  if (isFirebaseDataEnabled()) {
    return REMOTE_DATA_CACHE.likeSeen;
  }
  try {
    const raw = localStorage.getItem(LOCAL_LIKE_SEEN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
};

const writeLikeSeen = (seenMap) => {
  if (isFirebaseDataEnabled()) {
    REMOTE_DATA_CACHE.likeSeen =
      seenMap && typeof seenMap === "object" ? seenMap : {};
    const db = getFirebaseServices()?.db;
    if (db) {
      return Promise.all(Object.entries(REMOTE_DATA_CACHE.likeSeen).map(([email, count]) =>
        db.collection("likeSeen").doc(toFirestoreId(email)).set(
          {
            email: normalizeEmail(email),
            count: Number(count || 0),
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        )
      ));
    }
    return;
  }
  localStorage.setItem(LOCAL_LIKE_SEEN_KEY, JSON.stringify(seenMap));
};

const readLocalChatThreads = () => {
  if (isFirebaseDataEnabled()) {
    return REMOTE_DATA_CACHE.chatThreads;
  }
  try {
    const raw = localStorage.getItem(LOCAL_CHAT_THREADS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const writeLocalChatThreads = (threads) => {
  if (isFirebaseDataEnabled()) {
    REMOTE_DATA_CACHE.chatThreads = Array.isArray(threads) ? threads : [];
    const db = getFirebaseServices()?.db;
    if (db) {
      return Promise.all(REMOTE_DATA_CACHE.chatThreads.map((thread) => {
        const id = thread.id || `thread-${Date.now()}`;
        return db.collection("chatThreads").doc(id).set({ ...thread, id }, { merge: true });
      }));
    }
    return;
  }
  localStorage.setItem(LOCAL_CHAT_THREADS_KEY, JSON.stringify(threads));
};

const readLocalChatMessages = () => {
  if (isFirebaseDataEnabled()) {
    return REMOTE_DATA_CACHE.chatMessages;
  }
  try {
    const raw = localStorage.getItem(LOCAL_CHAT_MESSAGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const writeLocalChatMessages = (messages) => {
  if (isFirebaseDataEnabled()) {
    REMOTE_DATA_CACHE.chatMessages = Array.isArray(messages) ? messages : [];
    const db = getFirebaseServices()?.db;
    if (db) {
      const currentEmail = getCurrentUserEmail();
      return Promise.all(REMOTE_DATA_CACHE.chatMessages
        .filter((message) => normalizeEmail(message.from) === currentEmail)
        .map((message) => {
        const id = message.id || `msg-${Date.now()}`;
        return db.collection("chatMessages").doc(id).set({ ...message, id }, { merge: true });
      }));
    }
    return;
  }
  localStorage.setItem(LOCAL_CHAT_MESSAGES_KEY, JSON.stringify(messages));
};

const readMessageSeen = () => {
  if (isFirebaseDataEnabled()) {
    return REMOTE_DATA_CACHE.messageSeen;
  }
  try {
    const raw = localStorage.getItem(LOCAL_MESSAGE_SEEN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
};

const writeMessageSeen = (seenMap) => {
  if (isFirebaseDataEnabled()) {
    REMOTE_DATA_CACHE.messageSeen =
      seenMap && typeof seenMap === "object" ? seenMap : {};
    const db = getFirebaseServices()?.db;
    if (db) {
      return Promise.all(Object.entries(REMOTE_DATA_CACHE.messageSeen).map(([email, count]) =>
        db.collection("messageSeen").doc(toFirestoreId(email)).set(
          {
            email: normalizeEmail(email),
            count: Number(count || 0),
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        )
      ));
    }
    return;
  }
  localStorage.setItem(LOCAL_MESSAGE_SEEN_KEY, JSON.stringify(seenMap));
};

const readDashboardFilters = () => {
  if (isFirebaseDataEnabled()) {
    return REMOTE_DATA_CACHE.dashboardFilters[getCurrentUserFilterKey()] || {};
  }
  try {
    const raw = localStorage.getItem(LOCAL_DASH_FILTERS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
};

const writeDashboardFilters = (filters) => {
  if (isFirebaseDataEnabled()) {
    const key = getCurrentUserFilterKey();
    REMOTE_DATA_CACHE.dashboardFilters[key] =
      filters && typeof filters === "object" ? filters : {};
    const db = getFirebaseServices()?.db;
    if (db) {
      return db.collection("dashboardFilters").doc(toFirestoreId(key)).set(
        {
          ...REMOTE_DATA_CACHE.dashboardFilters[key],
          email: key,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    }
    return;
  }
  localStorage.setItem(LOCAL_DASH_FILTERS_KEY, JSON.stringify(filters));
};

const readMembershipPlans = () => {
  if (isFirebaseDataEnabled()) {
    return REMOTE_DATA_CACHE.memberships;
  }
  try {
    const raw = localStorage.getItem(LOCAL_MEMBERSHIPS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
};

const writeMembershipPlans = (plans) => {
  if (isFirebaseDataEnabled()) {
    REMOTE_DATA_CACHE.memberships =
      plans && typeof plans === "object" ? plans : {};
    const db = getFirebaseServices()?.db;
    if (db) {
      const currentEmail = getCurrentUserEmail();
      return Promise.all(Object.entries(REMOTE_DATA_CACHE.memberships)
        .filter(([email]) => normalizeEmail(email) === currentEmail)
        .map(([email, plan]) =>
        db.collection("memberships").doc(toFirestoreId(email)).set(
          {
            email: normalizeEmail(email),
            plan: normalizeMembershipPlan(plan),
            updatedAt: new Date().toISOString()
          },
          { merge: true }
        )
      ));
    }
    return;
  }
  localStorage.setItem(LOCAL_MEMBERSHIPS_KEY, JSON.stringify(plans));
};

const normalizeMembershipPlan = (plan) => {
  const normalized = String(plan || "").trim().toLowerCase();
  if (["silver", "gold", "platinum"].includes(normalized)) {
    return "premium";
  }
  if (["free", "premium"].includes(normalized)) {
    return normalized;
  }
  return "free";
};

const getMembershipPlan = (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return "free";
  }
  const plans = readMembershipPlans();
  return normalizeMembershipPlan(plans[normalizedEmail]);
};

const setMembershipPlan = (email, plan) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return;
  }
  const plans = readMembershipPlans();
  plans[normalizedEmail] = normalizeMembershipPlan(plan);
  const writeResult = writeMembershipPlans(plans);
  syncUpgradeButtonVisibility();
  return writeResult;
};

const hasPaidMembership = (email) =>
  PAID_MEMBERSHIP_PLANS.has(getMembershipPlan(email));

const getMembershipLabel = (plan) => {
  const normalized = normalizeMembershipPlan(plan);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const isUnlimitedReadPlan = (email) => {
  const plan = getMembershipPlan(email);
  return plan === "premium";
};

const isPriorityPlan = (email) => getMembershipPlan(email) === "premium";

syncUpgradeButtonVisibility();

const getMonthKey = (value) => {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

const canReadInboundMessage = (viewerEmail, message, allMessages) => {
  const normalizedEmail = String(viewerEmail || "").trim().toLowerCase();
  if (!normalizedEmail || !message || message.to !== normalizedEmail) {
    return true;
  }
  if (isUnlimitedReadPlan(normalizedEmail)) {
    return true;
  }
  const targetMonth = getMonthKey(message.at);
  if (!targetMonth) {
    return true;
  }
  const inboundThisMonth = allMessages
    .filter(
      (entry) =>
        entry &&
        entry.to === normalizedEmail &&
        getMonthKey(entry.at) === targetMonth
    )
    .sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));
  const visibleIds = new Set(
    inboundThisMonth.slice(0, MEMBERSHIP_FREE_READ_LIMIT).map((entry) => entry.id)
  );
  return visibleIds.has(message.id);
};

const syncPersistentTopActionCounts = () => {
  const currentUserEmail = getCurrentUserEmail();
  if (!currentUserEmail) {
    setBadgeCount("[data-messages-badge]", 0);
    setBadgeCount("[data-likes-badge]", 0);
    return;
  }

  const localLikes = readLocalLikes();
  const localChatMessages = readLocalChatMessages();
  const receivedLikes = localLikes.filter((entry) => entry && entry.to === currentUserEmail);
  const inboundCount = localChatMessages.filter(
    (entry) => entry && entry.to === currentUserEmail
  ).length;
  const messageSeenMap = readMessageSeen();
  const seenMessageCount = Number(messageSeenMap[currentUserEmail] || 0);
  const unreadMessageCount = Math.max(0, inboundCount - seenMessageCount);

  setBadgeCount("[data-likes-badge]", receivedLikes.length);
  setBadgeCount("[data-messages-badge]", unreadMessageCount);
};

const createMembershipBadgeMarkup = (email) => {
  const plan = getMembershipPlan(email);
  if (!hasPaidMembership(email)) {
    return "";
  }
  return `<span class="membership-badge membership-badge-${plan}">${getMembershipLabel(plan)}</span>`;
};

const applyMembershipHighlight = (element, email) => {
  if (!element) {
    return;
  }
  const plan = getMembershipPlan(email);
  element.classList.toggle("is-member-highlight", hasPaidMembership(email));
  element.classList.toggle("is-member-premium", plan === "premium");
};

const renderMembershipAd = () => {
  if (["signin", "signup", "create-profile", "membership"].includes(pageName)) {
    return;
  }
  const currentUserEmail = getCurrentUserEmail();
  if (currentUserEmail && hasPaidMembership(currentUserEmail)) {
    document.querySelectorAll("[data-membership-ad]").forEach((node) => node.remove());
    return;
  }
  const main = document.querySelector("main");
  if (!main || document.querySelector("[data-membership-ad]")) {
    return;
  }
  const adCard = document.createElement("section");
  adCard.className = "card membership-ad";
  adCard.setAttribute("data-membership-ad", "");
  adCard.innerHTML = `
    <p class="badge">Sponsored</p>
    <h2 class="page-title">Upgrade for cleaner browsing</h2>
    <p class="page-intro">
      Premium removes ads, highlights your profile, unlocks unlimited reads,
      and gives your messages priority placement.
    </p>
    <a class="button primary" href="membership.html">See membership plans</a>
  `;
  main.appendChild(adCard);
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const uploadProfilePhoto = async (file, userEmail) => {
  const formData = new FormData();
  formData.append("photo", file);
  formData.append("userEmail", userEmail || "anonymous");

  const response = await fetch("/api/bunny/profile-photo", {
    method: "POST",
    body: formData
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.url) {
    throw new Error(payload.error || "Unable to upload profile photo.");
  }
  return payload.url;
};

const getProfilePhotoSources = async (files, userEmail) => {
  if (!files.length) {
    return [];
  }
  try {
    return await Promise.all(files.map((file) => uploadProfilePhoto(file, userEmail)));
  } catch (error) {
    console.warn("Bunny upload unavailable; falling back to temporary data URLs.", error);
    return Promise.all(files.map((file) => fileToDataUrl(file)));
  }
};

const createAvatarDataUrl = (name, background) => {
  const label = (name || "M").trim().charAt(0).toUpperCase() || "M";
  const bg = background || "#111111";
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='360' viewBox='0 0 360 360'>` +
    `<rect width='360' height='360' fill='${bg}'/>` +
    "<circle cx='180' cy='140' r='72' fill='rgba(255,255,255,0.18)'/>" +
    "<rect x='64' y='230' width='232' height='92' rx='46' fill='rgba(255,255,255,0.16)'/>" +
    `<text x='180' y='198' text-anchor='middle' font-size='92' fill='#ffffff' font-family='Arial, sans-serif' font-weight='700'>${label}</text>` +
    "</svg>";
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const localPasswordHash = (password) => {
  return btoa(unescape(encodeURIComponent(password)));
};

const createLocalUser = ({ firstName, lastName, phone, email, password }) => {
  return {
    id: `local-${Date.now()}`,
    firstName,
    lastName,
    phone,
    email,
    passwordHash: localPasswordHash(password),
    createdAt: new Date().toISOString()
  };
};

const purgeLegacyLocalTestData = () => {
  try {
    const rawUsers = localStorage.getItem(LOCAL_USERS_KEY);
    if (rawUsers) {
      const users = JSON.parse(rawUsers);
      if (Array.isArray(users)) {
        const filteredUsers = users.filter(
          (entry) => !LEGACY_TEST_EMAILS.has(normalizeEmail(entry?.email))
        );
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(filteredUsers));
      }
    }

    const rawProfiles = localStorage.getItem(LOCAL_PROFILES_KEY);
    if (rawProfiles) {
      const profiles = JSON.parse(rawProfiles);
      if (profiles && typeof profiles === "object") {
        Object.keys(profiles).forEach((email) => {
          if (LEGACY_TEST_EMAILS.has(normalizeEmail(email))) {
            delete profiles[email];
          }
        });
        localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(profiles));
      }
    }
  } catch (error) {
    console.warn("Unable to purge legacy local test data.", error);
  }
};

const getOppositeGender = (gender) => {
  if (gender === "male") {
    return "female";
  }
  if (gender === "female") {
    return "male";
  }
  return "";
};

purgeLegacyLocalTestData();
syncPersistentTopActionCounts();
renderMembershipAd();

let createProfileExistingPhotos = [];
let createProfileExistingPrimaryIndex = 0;

const toAuthMessage = (error, fallback) => {
  const code = error && error.code ? error.code : "";
  if (code === "auth/email-already-in-use") {
    return "That email is already in use.";
  }
  if (code === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }
  if (code === "auth/weak-password") {
    return "Password is too weak. Use at least 8 characters.";
  }
  if (
    code === "auth/user-not-found" ||
    code === "auth/wrong-password" ||
    code === "auth/invalid-credential"
  ) {
    return "Invalid email or password.";
  }
  return fallback;
};

const splitDisplayName = (displayName) => {
  const parts = String(displayName || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" ")
  };
};

const saveFirebaseUserDocument = async (services, user, details = {}) => {
  if (!services || !services.db || !user) {
    return;
  }
  const nameParts = splitDisplayName(user.displayName);
  const firstName = details.firstName ?? nameParts.firstName;
  const lastName = details.lastName ?? nameParts.lastName;
  await services.db.collection("users").doc(user.uid).set(
    {
      uid: user.uid,
      firstName,
      lastName,
      phone: details.phone ?? "",
      email: details.email ?? user.email ?? "",
      updatedAt: new Date().toISOString(),
      createdAt: details.createdAt ?? new Date().toISOString()
    },
    { merge: true }
  );
};

const signupForm = document.querySelector("[data-signup-form]");
if (signupForm) {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const note = document.querySelector("[data-signup-note]");
    const passwordField = signupForm.querySelector("#password");
    const confirmField = signupForm.querySelector("#confirmPassword");
    const firstNameField = signupForm.querySelector("#firstName");
    const lastNameField = signupForm.querySelector("#lastName");
    const phoneField = signupForm.querySelector("#phone");
    const emailField = signupForm.querySelector("#email");
    const submitButton = signupForm.querySelector("button[type='submit']");
    if (
      !note ||
      !passwordField ||
      !confirmField ||
      !firstNameField ||
      !lastNameField ||
      !phoneField ||
      !emailField
    ) {
      return;
    }

    note.classList.remove("form-error");
    note.textContent = "";

    if (passwordField.value !== confirmField.value) {
      note.textContent = "Passwords do not match.";
      note.classList.add("form-error");
      return;
    }

    if (passwordField.value.length < 8) {
      note.textContent = "Password must be at least 8 characters.";
      note.classList.add("form-error");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const services = getFirebaseServices();
      if (!services) {
        const firstName = firstNameField.value.trim();
        const lastName = lastNameField.value.trim();
        const phone = phoneField.value.trim();
        const email = emailField.value.trim().toLowerCase();
        const users = readLocalUsers();
        const existing = users.find((entry) => entry.email === email);
        if (existing) {
          note.textContent = "That email is already in use.";
          note.classList.add("form-error");
          return;
        }
        users.push(
          createLocalUser({
            firstName,
            lastName,
            phone,
            email,
            password: passwordField.value
          })
        );
        writeLocalUsers(users);
        note.textContent = "Account saved locally. Redirecting to sign in...";
        setTimeout(() => {
          window.location.href = "signin.html";
        }, 700);
        return;
      }

      const firstName = firstNameField.value.trim();
      const lastName = lastNameField.value.trim();
      const phone = phoneField.value.trim();
      const email = emailField.value.trim().toLowerCase();

      const credential = await services.auth.createUserWithEmailAndPassword(
        email,
        passwordField.value
      );

      if (credential.user) {
        await credential.user.updateProfile({
          displayName: `${firstName} ${lastName}`.trim()
        });
      }

      await saveFirebaseUserDocument(services, credential.user, {
        firstName,
        lastName,
        phone,
        email,
        createdAt: new Date().toISOString()
      });

      note.textContent = "Account created. Redirecting to sign in...";
      setTimeout(() => {
        window.location.href = "signin.html";
      }, 700);
    } catch (error) {
      note.textContent = toAuthMessage(error, "Unable to create account.");
      note.classList.add("form-error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}

const signinForm = document.querySelector("[data-signin-form]");
if (signinForm) {
  signinForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const emailField = signinForm.querySelector("#signin-username");
    const passwordField = signinForm.querySelector("#signin-password");
    const note = document.querySelector("[data-signin-note]");
    const submitButton = signinForm.querySelector("button[type='submit']");
    if (!emailField || !passwordField || !note) {
      return;
    }

    note.classList.remove("form-error");
    note.textContent = "";

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const email = emailField.value.trim().toLowerCase();
      const services = getFirebaseServices();
      if (services) {
        try {
          const credential = await services.auth.signInWithEmailAndPassword(
            email,
            passwordField.value
          );

          if (credential.user) {
            await saveFirebaseUserDocument(services, credential.user);
            localStorage.setItem("currentUserEmail", credential.user.email || "");
            localStorage.setItem(
              "currentUserName",
              credential.user.displayName || ""
            );
          }

          let hasProfile = localStorage.getItem("hasProfile") === "true";
          if (services.db && credential.user?.email) {
            const profileDoc = await services.db
              .collection("profiles")
              .doc(toFirestoreId(credential.user.email))
              .get();
            hasProfile = profileDoc.exists;
          }
          window.location.href = hasProfile ? "dashboard.html" : "create-profile.html";
          return;
        } catch (error) {
          const code = error && error.code ? error.code : "";
          const canFallbackToLocal =
            code === "auth/user-not-found" ||
            code === "auth/wrong-password" ||
            code === "auth/invalid-credential";
          if (!canFallbackToLocal) {
            throw error;
          }
        }
      }

      const users = readLocalUsers();
      const localUser = users.find((entry) => entry.email === email);
      if (!localUser || localUser.passwordHash !== localPasswordHash(passwordField.value)) {
        note.textContent = "Invalid email or password.";
        note.classList.add("form-error");
        return;
      }
      localStorage.setItem("currentUserEmail", localUser.email || "");
      localStorage.setItem(
        "currentUserName",
        `${localUser.firstName || ""} ${localUser.lastName || ""}`.trim()
      );
      const profiles = readLocalProfiles();
      const hasProfile =
        Boolean(profiles[email]) || localStorage.getItem("hasProfile") === "true";
      window.location.href = hasProfile
        ? "dashboard.html"
        : "create-profile.html";
    } catch (error) {
      note.textContent = toAuthMessage(error, "Unable to login.");
      note.classList.add("form-error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}

whenAppDataReady(async () => {
syncPersistentTopActionCounts();
renderMembershipAd();

const membershipPage = document.querySelector("[data-membership-page]");
if (membershipPage) {
  const currentUserEmail = getCurrentUserEmail();
  const membershipUrl = new URL(window.location.href);
  const isMembershipOnboarding = membershipUrl.searchParams.get("onboarding") === "1";
  const currentPlanLabel = document.querySelector("[data-current-plan]");
  const currentPlanNote = document.querySelector("[data-current-plan-note]");
  const planButtons = document.querySelectorAll("[data-select-plan]");
  const continueButton = document.querySelector("[data-membership-continue]");

  const goToMembershipNextStep = () => {
    window.location.href = "dashboard.html";
  };

  const renderMembershipPage = () => {
    const plan = getMembershipPlan(currentUserEmail);
    if (currentPlanLabel) {
      currentPlanLabel.textContent = getMembershipLabel(plan);
    }
    if (currentPlanNote) {
      currentPlanNote.textContent = currentUserEmail
        ? `${getMembershipLabel(plan)} is active for ${currentUserEmail}.`
        : "Sign in to attach a plan to your profile.";
    }
    if (continueButton) {
      continueButton.hidden = !isMembershipOnboarding || !currentUserEmail;
    }

    planButtons.forEach((button) => {
      const buttonPlan = normalizeMembershipPlan(button.getAttribute("data-select-plan"));
      const card = button.closest("[data-plan-card]");
      const isActive = buttonPlan === plan;
      if (card) {
        card.classList.toggle("is-current-plan", isActive);
      }
      button.disabled = !currentUserEmail;
      button.textContent =
        isActive && isMembershipOnboarding ? "Keep this plan" : isActive ? "Current plan" : "Choose plan";
    });
  };

  if (continueButton) {
    continueButton.addEventListener("click", () => {
      goToMembershipNextStep();
    });
  }

  planButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!currentUserEmail) {
        window.location.href = "signin.html";
        return;
      }
      setMembershipPlan(currentUserEmail, button.getAttribute("data-select-plan"));
      syncPersistentTopActionCounts();
      renderMembershipAd();
      if (isMembershipOnboarding) {
        goToMembershipNextStep();
        return;
      }
      renderMembershipPage();
    });
  });

  renderMembershipPage();
}

const createProfileForm = document.querySelector("[data-create-profile-form]");
if (createProfileForm) {
  const languagePicker = createProfileForm.querySelector("#profile-languages");
  const languageList = createProfileForm.querySelector("[data-languages-list]");
  const languageInputs = createProfileForm.querySelector(
    "[data-languages-hidden-inputs]"
  );
  const languageError = createProfileForm.querySelector("[data-languages-error]");
  const lookingForPicker = createProfileForm.querySelector("#profile-looking-for");
  const lookingForList = createProfileForm.querySelector("[data-looking-for-list]");
  const lookingForInputs = createProfileForm.querySelector(
    "[data-looking-for-hidden-inputs]"
  );
  const lookingForError = createProfileForm.querySelector("[data-looking-for-error]");
  const heightField = createProfileForm.querySelector("#profile-height-cm");
  const heightError = createProfileForm.querySelector("[data-height-error]");
  const languageSelections = new Map();
  const lookingForSelections = new Map();
  const currentUserEmail = (localStorage.getItem("currentUserEmail") || "")
    .trim()
    .toLowerCase();
  const locationField = createProfileForm.querySelector("[data-location-field]");
  const locationRequestButton = createProfileForm.querySelector("[data-location-request]");
  const locationSuggestions = createProfileForm.querySelector("[data-location-suggestions]");
  const locationRow = locationField?.closest(".form-row") || null;
  const locationNote =
    createProfileForm.querySelector("[data-location-note]") ||
    locationRow?.querySelector(".form-note") ||
    null;
  const locationState = {
    hasPermission: false,
    requestInFlight: false,
    hasVerifiedSelection: false,
    queryRequestId: 0,
    activeSuggestionIndex: -1,
    selectedLocationLabel: "",
    selectedLocationSource: "",
    suggestions: [],
    inputTimer: null
  };
  const allProfiles = readLocalProfiles();
  const existingProfile =
    currentUserEmail && allProfiles[currentUserEmail]
      ? allProfiles[currentUserEmail]
      : null;

  const getOptionLabel = (select, value) => {
    if (!select) {
      return value;
    }
    const option = Array.from(select.options).find((entry) => entry.value === value);
    return option ? option.text : value;
  };

  const validateHeightField = () => {
    if (!heightField) {
      return true;
    }
    const rawHeight = String(heightField.value || "").trim();
    if (!rawHeight) {
      if (heightError) {
        heightError.hidden = true;
      }
      return true;
    }
    const parsedHeight = Number(rawHeight);
    const isValid =
      /^\d+$/.test(rawHeight) &&
      Number.isInteger(parsedHeight) &&
      parsedHeight >= 100 &&
      parsedHeight <= 250;
    if (heightError) {
      heightError.hidden = isValid;
    }
    return isValid;
  };

  const setLocationAttention = (active) => {
    if (!locationRow) {
      return;
    }
    locationRow.classList.toggle("is-attention", active);
  };

  const setLocationNote = (message, isError = false) => {
    if (!locationNote) {
      return;
    }
    locationNote.textContent = message;
    locationNote.classList.toggle("form-error", isError);
  };

  const focusLocationRequirements = () => {
    if (!locationRow) {
      return;
    }
    setLocationAttention(true);
    locationRow.scrollIntoView({ behavior: "smooth", block: "center" });
    if (locationRequestButton) {
      locationRequestButton.focus();
    } else if (locationField) {
      locationField.focus();
    }
    window.setTimeout(() => {
      setLocationAttention(false);
    }, 2200);
  };

  const applyResolvedCity = (city) => {
    if (!locationField) {
      return;
    }
    locationField.value = String(city || "").trim();
    locationState.selectedLocationLabel = locationField.value;
    locationState.selectedLocationSource = "geolocation";
    locationState.hasPermission = Boolean(locationField.value);
    locationState.hasVerifiedSelection = Boolean(locationField.value);
    if (locationSuggestions) {
      locationSuggestions.hidden = true;
      locationSuggestions.innerHTML = "";
    }
    if (locationState.hasVerifiedSelection) {
      setLocationAttention(false);
      setLocationNote("City shared from your device.", false);
    }
  };

  const clearLocationSelection = () => {
    locationState.hasPermission = false;
    locationState.hasVerifiedSelection = false;
    locationState.selectedLocationLabel = "";
    locationState.selectedLocationSource = "";
  };

  const fetchCityFromCoordinates = async (latitude, longitude) => {
    const endpoint =
      "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" +
      encodeURIComponent(latitude) +
      "&lon=" +
      encodeURIComponent(longitude);
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error("Reverse geocoding failed");
    }
    const data = await response.json();
    const address = data && data.address ? data.address : {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.suburb ||
      address.county;
    if (!city) {
      throw new Error("City not found");
    }
    return city;
  };

  const normalizeLocationResult = (entry) => {
    const address = entry && entry.address ? entry.address : {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.suburb ||
      "";
    const state = address.state || address.region || address.county || "";
    const country = address.country || "";
    const label = city || entry.name || "";
    const detail = [state, country].filter(Boolean).join(", ");
    return {
      label,
      detail,
      displayValue: [label, country].filter(Boolean).join(", "),
      raw: entry
    };
  };

  const renderLocationSuggestions = () => {
    if (!locationSuggestions) {
      return;
    }
    locationSuggestions.innerHTML = "";
    if (!locationState.suggestions.length) {
      locationSuggestions.hidden = true;
      return;
    }

    locationState.suggestions.forEach((suggestion, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "location-suggestion";
      if (index === locationState.activeSuggestionIndex) {
        button.classList.add("is-active");
      }
      button.innerHTML = `<strong>${suggestion.label}</strong><span>${suggestion.detail}</span>`;
      button.addEventListener("click", () => {
        if (!locationField) {
          return;
        }
        locationField.value = suggestion.displayValue;
        locationState.selectedLocationLabel = suggestion.displayValue;
        locationState.selectedLocationSource = "manual";
        locationState.hasVerifiedSelection = true;
        locationState.hasPermission = false;
        locationState.suggestions = [];
        locationState.activeSuggestionIndex = -1;
        locationSuggestions.hidden = true;
        locationSuggestions.innerHTML = "";
        setLocationAttention(false);
        setLocationNote("Real city selected.", false);
      });
      locationSuggestions.appendChild(button);
    });

    locationSuggestions.hidden = false;
  };

  const fetchLocationSuggestions = async (query) => {
    const trimmedQuery = String(query || "").trim();
    if (trimmedQuery.length < 2) {
      locationState.suggestions = [];
      locationState.activeSuggestionIndex = -1;
      renderLocationSuggestions();
      return;
    }

    const requestId = ++locationState.queryRequestId;
    const endpoint =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&featuretype=city&q=" +
      encodeURIComponent(trimmedQuery);

    try {
      const response = await fetch(endpoint, {
        headers: {
          Accept: "application/json"
        }
      });
      if (!response.ok) {
        throw new Error("Location search failed");
      }
      const data = await response.json();
      if (requestId !== locationState.queryRequestId) {
        return;
      }
      const unique = [];
      const seen = new Set();
      data.forEach((entry) => {
        const normalized = normalizeLocationResult(entry);
        if (!normalized.label) {
          return;
        }
        const key = normalized.displayValue.toLowerCase();
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        unique.push(normalized);
      });
      locationState.suggestions = unique;
      locationState.activeSuggestionIndex = unique.length ? 0 : -1;
      renderLocationSuggestions();
      if (!unique.length) {
        setLocationNote("No matching real cities found yet. Keep typing or share your location.", true);
      } else {
        setLocationNote("Choose a real city from the list, or share your location.", false);
      }
    } catch (error) {
      if (requestId !== locationState.queryRequestId) {
        return;
      }
      locationState.suggestions = [];
      locationState.activeSuggestionIndex = -1;
      renderLocationSuggestions();
      setLocationNote("Location search is unavailable right now. You can still use Share my city.", true);
    }
  };

  const requestLocationPermission = async (reason = "button") => {
    if (!locationField || !("geolocation" in navigator) || locationState.requestInFlight) {
      return locationState.hasPermission;
    }

    locationState.requestInFlight = true;
    if (locationRequestButton) {
      locationRequestButton.disabled = true;
    }
    setLocationNote("Allow location access so we can collect your city.", false);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 0
        });
      });
      const city = await fetchCityFromCoordinates(
        position.coords.latitude,
        position.coords.longitude
      );
      applyResolvedCity(city);
      return true;
    } catch (error) {
      locationState.hasPermission = false;
      setLocationAttention(true);
      setLocationNote(
        reason === "submit"
          ? "Select a real city from the list or allow location access before saving."
          : "Location access was not granted. You can still type and select a real city below.",
        true
      );
      return false;
    } finally {
      locationState.requestInFlight = false;
      if (locationRequestButton) {
        locationRequestButton.disabled = false;
      }
    }
  };

  const renderLanguageSelections = () => {
    if (!languageList || !languageInputs) {
      return;
    }
    languageList.innerHTML = "";
    languageInputs.innerHTML = "";

    languageSelections.forEach((label, value) => {
      const tag = document.createElement("span");
      tag.className = "selected-tag";
      tag.textContent = label;

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "selected-tag-remove";
      removeButton.textContent = "x";
      removeButton.setAttribute("aria-label", `Remove ${label}`);
      removeButton.addEventListener("click", () => {
        languageSelections.delete(value);
        renderLanguageSelections();
      });

      tag.appendChild(removeButton);
      languageList.appendChild(tag);

      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "languages[]";
      input.value = value;
      languageInputs.appendChild(input);
    });

    if (languageError) {
      languageError.hidden = languageSelections.size > 0;
    }
  };

  const renderLookingForSelections = () => {
    if (!lookingForList || !lookingForInputs) {
      return;
    }
    lookingForList.innerHTML = "";
    lookingForInputs.innerHTML = "";

    lookingForSelections.forEach((label, value) => {
      const tag = document.createElement("span");
      tag.className = "selected-tag";
      tag.textContent = label;

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "selected-tag-remove";
      removeButton.textContent = "x";
      removeButton.setAttribute("aria-label", `Remove ${label}`);
      removeButton.addEventListener("click", () => {
        lookingForSelections.delete(value);
        renderLookingForSelections();
      });

      tag.appendChild(removeButton);
      lookingForList.appendChild(tag);

      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "lookingFor[]";
      input.value = value;
      lookingForInputs.appendChild(input);
    });

    if (lookingForError) {
      lookingForError.hidden = lookingForSelections.size > 0;
    }
  };

  if (lookingForPicker) {
    lookingForPicker.addEventListener("change", () => {
      const value = lookingForPicker.value;
      if (!value) {
        return;
      }
      const label =
        lookingForPicker.options[lookingForPicker.selectedIndex]?.text || value;
      if (!lookingForSelections.has(value)) {
        lookingForSelections.set(value, label);
      }
      lookingForPicker.value = "";
      if (lookingForError) {
        lookingForError.hidden = lookingForSelections.size > 0;
      }
      renderLookingForSelections();
    });
  }

  if (languagePicker) {
    languagePicker.addEventListener("change", () => {
      const value = languagePicker.value;
      if (!value) {
        return;
      }
      const label = languagePicker.options[languagePicker.selectedIndex]?.text || value;
      if (!languageSelections.has(value)) {
        languageSelections.set(value, label);
      }
      languagePicker.value = "";
      if (languageError) {
        languageError.hidden = languageSelections.size > 0;
      }
      renderLanguageSelections();
    });
  }

  if (heightField) {
    heightField.addEventListener("input", () => {
      validateHeightField();
    });
  }

  renderLanguageSelections();
  renderLookingForSelections();

  if (existingProfile && typeof existingProfile === "object") {
    const simpleFields = [
      "profileName",
      "location",
      "bio",
      "profession",
      "education",
      "gender",
      "heightCm",
      "weightKg",
      "religion",
      "smoking",
      "drinking",
      "kids",
      "kidsCount",
      "tribe",
      "tribeOther"
    ];

    simpleFields.forEach((fieldName) => {
      const field = createProfileForm.elements.namedItem(fieldName);
      if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLSelectElement) && !(field instanceof HTMLTextAreaElement)) {
        return;
      }
      const value = existingProfile[fieldName];
      if (value === undefined || value === null) {
        return;
      }
      if (fieldName === "location") {
        return;
      }
      field.value = String(value);
    });

    if (locationField && existingProfile.location) {
      locationField.value = String(existingProfile.location).trim();
      locationState.selectedLocationLabel = locationField.value;
      locationState.selectedLocationSource = "existing";
      locationState.hasVerifiedSelection = Boolean(locationField.value);
    }

    const existingLanguages = Array.isArray(existingProfile.languages)
      ? existingProfile.languages
      : [];
    existingLanguages.forEach((value) => {
      languageSelections.set(value, getOptionLabel(languagePicker, value));
    });

    const existingLookingFor = Array.isArray(existingProfile.lookingFor)
      ? existingProfile.lookingFor
      : [];
    existingLookingFor.forEach((value) => {
      lookingForSelections.set(value, getOptionLabel(lookingForPicker, value));
    });

    createProfileExistingPhotos = Array.isArray(existingProfile.photos)
      ? existingProfile.photos.slice(0, 5)
      : [];
    createProfileExistingPrimaryIndex = Number.isInteger(existingProfile.primaryPhotoIndex)
      ? existingProfile.primaryPhotoIndex
      : 0;

    renderLanguageSelections();
    renderLookingForSelections();
  } else {
    createProfileExistingPhotos = [];
    createProfileExistingPrimaryIndex = 0;
  }

  if (locationField) {
    if (!locationField.value) {
      locationField.value = "";
    }
    locationField.removeAttribute("readonly");
    locationField.removeAttribute("aria-readonly");
    locationField.addEventListener("input", () => {
      clearLocationSelection();
      setLocationAttention(false);
      if (locationSuggestions) {
        locationSuggestions.hidden = false;
      }
      if (locationState.inputTimer) {
        window.clearTimeout(locationState.inputTimer);
      }
      const typedValue = locationField.value.trim();
      if (!typedValue) {
        locationState.suggestions = [];
        locationState.activeSuggestionIndex = -1;
        renderLocationSuggestions();
        setLocationNote("Type and select a real city, or allow location access to auto-fill it.", false);
        return;
      }
      setLocationNote("Searching for real cities...", false);
      locationState.inputTimer = window.setTimeout(() => {
        fetchLocationSuggestions(typedValue).catch(() => {});
      }, 250);
    });
    locationField.addEventListener("keydown", (event) => {
      if (!locationState.suggestions.length) {
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        locationState.activeSuggestionIndex =
          (locationState.activeSuggestionIndex + 1) % locationState.suggestions.length;
        renderLocationSuggestions();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        locationState.activeSuggestionIndex =
          (locationState.activeSuggestionIndex - 1 + locationState.suggestions.length) %
          locationState.suggestions.length;
        renderLocationSuggestions();
      } else if (event.key === "Enter") {
        event.preventDefault();
        const selected = locationState.suggestions[locationState.activeSuggestionIndex];
        const buttons = locationSuggestions?.querySelectorAll(".location-suggestion");
        if (selected && buttons && buttons[locationState.activeSuggestionIndex]) {
          buttons[locationState.activeSuggestionIndex].click();
        }
      } else if (event.key === "Escape") {
        locationState.suggestions = [];
        locationState.activeSuggestionIndex = -1;
        renderLocationSuggestions();
      }
    });
    locationField.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (locationSuggestions) {
          locationSuggestions.hidden = true;
        }
      }, 120);
    });
    locationField.addEventListener("focus", () => {
      if (locationState.suggestions.length && locationSuggestions) {
        locationSuggestions.hidden = false;
      }
    });
  }

  if (locationRequestButton) {
    locationRequestButton.addEventListener("click", async () => {
      await requestLocationPermission("button");
    });
  }

  if (!("geolocation" in navigator)) {
    setLocationNote(
      "This browser cannot share your location, but you can still type and select a real city.",
      false
    );
    if (locationRequestButton) {
      locationRequestButton.disabled = true;
    }
  } else {
    setLocationNote(
      "Type and select a real city, or allow location access to auto-fill it.",
      false
    );
    if (locationState.hasVerifiedSelection) {
      setLocationNote("Saved city loaded. You can keep it, change it, or use Share my city.", false);
    }
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((status) => {
          if (status.state === "granted") {
            requestLocationPermission("button").catch(() => {});
          }
          status.onchange = () => {
            if (status.state === "granted") {
              requestLocationPermission("button").catch(() => {});
              return;
            }
            locationState.hasPermission = false;
          };
        })
        .catch(() => {});
    }
  }

  createProfileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const hasLanguage = languageSelections.size > 0;
    const hasLookingFor = lookingForSelections.size > 0;
    if (languageError) {
      languageError.hidden = hasLanguage;
    }
    if (!hasLanguage) {
      if (languageError) {
        languageError.hidden = false;
      }
      return;
    }
    if (lookingForError) {
      lookingForError.hidden = hasLookingFor;
    }
    if (!hasLookingFor) {
      if (lookingForError) {
        lookingForError.hidden = false;
      }
      return;
    }
    const hasLocation =
      Boolean(locationField?.value.trim()) &&
      (locationState.hasPermission || locationState.hasVerifiedSelection);
    if (!hasLocation) {
      focusLocationRequirements();
      setLocationNote(
        "Select a real city from the suggestions or use Share my city before saving.",
        true
      );
      return;
    }
    if (!validateHeightField()) {
      heightField?.focus();
      heightField?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const fileInput = createProfileForm.querySelector(
      "[data-profile-photo-input]"
    );
    const primaryInput = createProfileForm.querySelector("[data-primary-photo]");
    if (fileInput && primaryInput) {
      const files = fileInput.files ? Array.from(fileInput.files) : [];
      const profileKey = currentUserEmail || `local-anon-${Date.now()}`;
      const formData = new FormData(createProfileForm);
      let photos = createProfileExistingPhotos.slice();
      if (files.length) {
        photos = await getProfilePhotoSources(files, profileKey);
      }
      if (!photos.length) {
        alert("Please add at least one photo.");
        return;
      }
      if (primaryInput.value === "") {
        primaryInput.value = String(
          Math.min(createProfileExistingPrimaryIndex, photos.length - 1)
        );
      }
      const parsedPrimary = Number.parseInt(primaryInput.value || "0", 10);
      const primaryPhotoIndex =
        Number.isInteger(parsedPrimary) && parsedPrimary >= 0 && parsedPrimary < photos.length
          ? parsedPrimary
          : 0;
      const profiles = readLocalProfiles();
      profiles[profileKey] = {
        profileName: String(formData.get("profileName") || "").trim(),
        location: String(formData.get("location") || "").trim(),
        bio: String(formData.get("bio") || "").trim(),
        profession: String(formData.get("profession") || "").trim(),
        education: String(formData.get("education") || "").trim(),
        gender: String(formData.get("gender") || "").trim(),
        heightCm: String(formData.get("heightCm") || "").trim(),
        weightKg: String(formData.get("weightKg") || "").trim(),
        religion: String(formData.get("religion") || "").trim(),
        smoking: String(formData.get("smoking") || "").trim(),
        drinking: String(formData.get("drinking") || "").trim(),
        kids: String(formData.get("kids") || "").trim(),
        kidsCount: String(formData.get("kidsCount") || "").trim(),
        tribe: String(formData.get("tribe") || "").trim(),
        tribeOther: String(formData.get("tribeOther") || "").trim(),
        languages: formData.getAll("languages[]"),
        lookingFor: formData.getAll("lookingFor[]"),
        photos,
        primaryPhotoIndex,
        completedAt: new Date().toISOString()
      };
      await writeLocalProfiles(profiles);
      createProfileExistingPhotos = photos.slice();
      createProfileExistingPrimaryIndex = primaryPhotoIndex;
    }
    localStorage.setItem("hasProfile", "true");
    window.location.href = "membership.html?onboarding=1";
  });
}

const dashboardGrid = document.querySelector("[data-dashboard-grid]");
if (dashboardGrid) {
  whenAppDataReady(() => {
  const dashboardEmpty = document.querySelector("[data-dashboard-empty]");
  const likesBadge = document.querySelector("[data-likes-badge]");
  const messagesBadge = document.querySelector("[data-messages-badge]");
  const filterToggle = document.querySelector("[data-filter-toggle]");
  const filterModal = document.querySelector("[data-filter-modal]");
  const filterReligion = document.querySelector("[data-filter-religion]");
  const filterLookingFor = document.querySelector("[data-filter-looking-for]");
  const filterLocation = document.querySelector("[data-filter-location]");
  const filterApply = document.querySelector("[data-filter-apply]");
  const filterReset = document.querySelector("[data-filter-reset]");
  const filterClose = document.querySelector("[data-filter-close]");
  const currentUserEmail = (localStorage.getItem("currentUserEmail") || "")
    .trim()
    .toLowerCase();
  if (!currentUserEmail) {
    window.location.href = "signin.html";
  }
  const localLikes = readLocalLikes();
  const localChatMessages = readLocalChatMessages();
  const messageCount = currentUserEmail
    ? localChatMessages.filter((entry) => entry && entry.to === currentUserEmail).length
    : 0;
  const messageSeenMap = readMessageSeen();
  const seenMessageCount = Number(messageSeenMap[currentUserEmail] || 0);
  const unreadMessageCount = Math.max(0, messageCount - seenMessageCount);
  if (messagesBadge) {
    setBadgeCount("[data-messages-badge]", unreadMessageCount);
  }
  const receivedLikes = currentUserEmail
    ? localLikes.filter((entry) => entry.to === currentUserEmail)
    : [];
  if (likesBadge) {
    setBadgeCount("[data-likes-badge]", receivedLikes.length);
  }
  if (currentUserEmail && receivedLikes.length > 0) {
    const seenMap = readLikeSeen();
    const seenCount = Number(seenMap[currentUserEmail] || 0);
    if (receivedLikes.length > seenCount) {
      const newCount = receivedLikes.length - seenCount;
      alert(`You received ${newCount} new like${newCount === 1 ? "" : "s"}!`);
      seenMap[currentUserEmail] = receivedLikes.length;
      writeLikeSeen(seenMap);
    }
  }
  const used = new Set();
  let dashboardFilters = readDashboardFilters();

  const placeholderSquare = (name) => {
    const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
    return `<div class="profile-square-fallback">${initial}</div>`;
  };

  const matchesDashboardFilters = (record) => {
    if (!record || typeof record !== "object") {
      return false;
    }
    const religionFilter = String(dashboardFilters.religion || "").toLowerCase();
    const lookingForFilter = String(dashboardFilters.lookingFor || "").toLowerCase();
    const locationFilter = String(dashboardFilters.location || "").toLowerCase();
    if (religionFilter && String(record.religion || "").toLowerCase() !== religionFilter) {
      return false;
    }
    if (lookingForFilter) {
      const lookingFor = Array.isArray(record.lookingFor) ? record.lookingFor : [];
      const hasLookingFor = lookingFor.some(
        (entry) => String(entry || "").toLowerCase() === lookingForFilter
      );
      if (!hasLookingFor) {
        return false;
      }
    }
    if (locationFilter) {
      const location = String(record.location || "").toLowerCase();
      if (!location.includes(locationFilter)) {
        return false;
      }
    }
    return true;
  };

  const renderDashboardCards = () => {
    const localUsers = readLocalUsers();
    const localProfiles = readLocalProfiles();
    const currentUserProfile = currentUserEmail ? localProfiles[currentUserEmail] : null;
    const currentGender = String(currentUserProfile?.gender || "").toLowerCase();
    const oppositeGender = getOppositeGender(currentGender);
    const cards = [];
    used.clear();
    dashboardGrid.innerHTML = "";

    Object.entries(localProfiles).forEach(([email, profile]) => {
      if (email === currentUserEmail) {
        return;
      }
      const record = profile && typeof profile === "object" ? profile : {};
      const candidateGender = String(record.gender || "").toLowerCase();
      if (!oppositeGender || candidateGender !== oppositeGender) {
        return;
      }
      if (!matchesDashboardFilters(record)) {
        return;
      }
      const name = record.profileName || email || "Member";
      const photos = Array.isArray(record.photos) ? record.photos : [];
      const primaryIndex = Number.isInteger(record.primaryPhotoIndex)
        ? record.primaryPhotoIndex
        : 0;
      const chosenPhoto = photos[primaryIndex] || photos[0] || "";
      cards.push({
        key: email,
        name,
        location: record.location || "",
        photo: chosenPhoto
      });
      used.add(email);
    });

    localUsers.forEach((user) => {
      if (
        !user ||
        !user.email ||
        used.has(user.email) ||
        user.email === currentUserEmail
      ) {
        return;
      }
      const profile = localProfiles[user.email];
      const candidateGender = String(profile?.gender || "").toLowerCase();
      if (!oppositeGender || candidateGender !== oppositeGender) {
        return;
      }
      if (!matchesDashboardFilters(profile || {})) {
        return;
      }
      const photos = Array.isArray(profile?.photos) ? profile.photos : [];
      const primaryIndex = Number.isInteger(profile?.primaryPhotoIndex)
        ? profile.primaryPhotoIndex
        : 0;
      cards.push({
        key: user.email,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
        location: profile?.location || "",
        photo: photos[primaryIndex] || photos[0] || ""
      });
    });

    if (dashboardEmpty) {
      dashboardEmpty.hidden = cards.length > 0;
    }

    cards.forEach((entry) => {
      const tile = document.createElement("article");
      tile.className = "profile-tile";
      applyMembershipHighlight(tile, entry.key);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "profile-tile-button";
      button.setAttribute("aria-label", `View ${entry.name} profile`);
      button.innerHTML = `
        <div class="profile-square">
          ${
            entry.photo
              ? `<img src="${entry.photo}" alt="${entry.name} profile photo" loading="lazy" />`
              : placeholderSquare(entry.name)
          }
        </div>
        <div class="profile-meta">
          <strong>${entry.name} ${createMembershipBadgeMarkup(entry.key)}</strong>
          <span>${entry.location || "Nigeria"}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        const key = entry.key || "";
        window.location.href = `view-profile.html?user=${encodeURIComponent(key)}`;
      });
      tile.appendChild(button);
      dashboardGrid.appendChild(tile);
    });
  };

  if (
    filterModal &&
    filterToggle &&
    filterReligion &&
    filterLookingFor &&
    filterLocation &&
    filterApply &&
    filterReset &&
    filterClose
  ) {
    const syncFilterInputs = () => {
      filterReligion.value = String(dashboardFilters.religion || "");
      filterLookingFor.value = String(dashboardFilters.lookingFor || "");
      filterLocation.value = String(dashboardFilters.location || "");
    };
    const closeFilterModal = () => {
      filterModal.hidden = true;
    };
    syncFilterInputs();

    filterToggle.addEventListener("click", () => {
      syncFilterInputs();
      filterModal.hidden = false;
    });
    filterClose.addEventListener("click", closeFilterModal);
    filterModal.addEventListener("click", (event) => {
      if (event.target === filterModal) {
        closeFilterModal();
      }
    });
    filterApply.addEventListener("click", () => {
      dashboardFilters = {
        religion: filterReligion.value,
        lookingFor: filterLookingFor.value,
        location: filterLocation.value.trim()
      };
      writeDashboardFilters(dashboardFilters);
      closeFilterModal();
      renderDashboardCards();
    });
    filterReset.addEventListener("click", () => {
      dashboardFilters = {};
      writeDashboardFilters(dashboardFilters);
      syncFilterInputs();
      closeFilterModal();
      renderDashboardCards();
    });

    if (new URLSearchParams(window.location.search).get("openFilters") === "1") {
      syncFilterInputs();
      filterModal.hidden = false;
    }
  }

  renderDashboardCards();
  });
}

const likedGrid = document.querySelector("[data-liked-grid]");
if (likedGrid) {
  const likedEmpty = document.querySelector("[data-liked-empty]");
  const likesBadge = document.querySelector("[data-likes-badge]");
  const localProfiles = readLocalProfiles();
  const localLikes = readLocalLikes();
  const currentUserEmail = (localStorage.getItem("currentUserEmail") || "")
    .trim()
    .toLowerCase();
  const receivedLikes = currentUserEmail
    ? localLikes.filter((entry) => entry.to === currentUserEmail)
    : [];

  if (likesBadge) {
    setBadgeCount("[data-likes-badge]", receivedLikes.length);
  }

  if (currentUserEmail) {
    const seenMap = readLikeSeen();
    seenMap[currentUserEmail] = receivedLikes.length;
    writeLikeSeen(seenMap);
  }

  const latestBySender = new Map();
  receivedLikes.forEach((entry) => {
    if (!entry || !entry.from) {
      return;
    }
    const existing = latestBySender.get(entry.from);
    if (!existing || String(entry.at || "") > String(existing.at || "")) {
      latestBySender.set(entry.from, entry);
    }
  });

  const cards = Array.from(latestBySender.values()).sort((a, b) =>
    String(b.at || "").localeCompare(String(a.at || ""))
  );

  const placeholderSquare = (name) => {
    const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
    return `<div class="profile-square-fallback">${initial}</div>`;
  };

  if (!cards.length && likedEmpty) {
    likedEmpty.hidden = false;
  }

  cards.forEach((entry) => {
    const record = localProfiles[entry.from] || {};
    const name = record.profileName || entry.from;
    const photos = Array.isArray(record.photos) ? record.photos : [];
    const primaryIndex = Number.isInteger(record.primaryPhotoIndex)
      ? record.primaryPhotoIndex
      : 0;
    const chosenPhoto = photos[primaryIndex] || photos[0] || "";

    const tile = document.createElement("article");
    tile.className = "profile-tile";
    applyMembershipHighlight(tile, entry.from);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "profile-tile-button";
    button.setAttribute("aria-label", `View ${name} profile`);
    button.innerHTML = `
      <div class="profile-square">
        ${
          chosenPhoto
            ? `<img src="${chosenPhoto}" alt="${name} profile photo" loading="lazy" />`
            : placeholderSquare(name)
        }
      </div>
      <div class="profile-meta">
        <strong>${name} ${createMembershipBadgeMarkup(entry.from)}</strong>
        <span>${record.location || "Nigeria"}</span>
      </div>
    `;
    button.addEventListener("click", () => {
      window.location.href = `view-profile.html?user=${encodeURIComponent(entry.from)}`;
    });
    tile.appendChild(button);
    likedGrid.appendChild(tile);
  });
}

const chatsApp = document.querySelector("[data-chats-app]");
if (chatsApp) {
  const threadList = document.querySelector("[data-chat-thread-list]");
  const chatEmpty = document.querySelector("[data-chat-empty]");
  const activeName = document.querySelector("[data-chat-active-name]");
  const messageList = document.querySelector("[data-chat-message-list]");
  const composeForm = document.querySelector("[data-chat-compose]");
  const composeInput = document.querySelector("[data-chat-compose-input]");
  const messagesBadge = document.querySelector("[data-messages-badge]");
  const likesBadge = document.querySelector("[data-likes-badge]");
  const currentUserEmail = (localStorage.getItem("currentUserEmail") || "")
    .trim()
    .toLowerCase();
  const profiles = readLocalProfiles();
  const likes = readLocalLikes();

  const getDisplayName = (email) => {
    if (!email) return "Member";
    const p = profiles[email];
    return p && p.profileName ? p.profileName : email;
  };

  if (likesBadge && currentUserEmail) {
    const receivedLikes = likes.filter((entry) => entry.to === currentUserEmail);
    setBadgeCount("[data-likes-badge]", receivedLikes.length);
  }

  if (!currentUserEmail || !threadList || !messageList || !composeForm || !composeInput) {
    if (chatEmpty) {
      chatEmpty.hidden = false;
      chatEmpty.textContent = "Sign in to view and send messages.";
    }
    if (composeInput) composeInput.disabled = true;
    const sendButton = composeForm ? composeForm.querySelector("button[type='submit']") : null;
    if (sendButton) sendButton.disabled = true;
  } else {
    let threads = readLocalChatThreads();
    let messages = readLocalChatMessages();
    const currentPlan = getMembershipPlan(currentUserEmail);
    const pendingRecipient = (localStorage.getItem("pendingChatRecipientKey") || "")
      .trim()
      .toLowerCase();
    const panelHead = document.querySelector(".chat-panel-head");
    if (panelHead && !panelHead.querySelector("[data-membership-read-note]")) {
      const note = document.createElement("p");
      note.className = "membership-read-note";
      note.setAttribute("data-membership-read-note", "");
      note.textContent =
        currentPlan === "free"
          ? "Your plan includes 5 full incoming message reads each month."
          : "Premium includes unlimited reading and priority inbox placement.";
      panelHead.appendChild(note);
    }

    if (pendingRecipient && pendingRecipient !== currentUserEmail) {
      const exists = threads.find(
        (entry) =>
          entry &&
          ((entry.a === currentUserEmail && entry.b === pendingRecipient) ||
            (entry.a === pendingRecipient && entry.b === currentUserEmail))
      );
      if (!exists) {
        const thread = {
          id: `thread-${Date.now()}`,
          a: currentUserEmail,
          b: pendingRecipient,
          createdAt: new Date().toISOString()
        };
        threads.push(thread);
        await writeLocalChatThreads(threads);
      }
    }

    const inboundCount = messages.filter((entry) => entry.to === currentUserEmail).length;
    const seenMap = readMessageSeen();
    seenMap[currentUserEmail] = inboundCount;
    writeMessageSeen(seenMap);
    if (messagesBadge) {
      setBadgeCount("[data-messages-badge]", 0);
    }

    const getThreadOther = (thread) =>
      thread.a === currentUserEmail ? thread.b : thread.a;

    const getThreadMessages = (threadId) =>
      messages
        .filter((entry) => entry.threadId === threadId)
        .sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")));

    const filteredThreads = () =>
      threads
        .filter((entry) => entry && (entry.a === currentUserEmail || entry.b === currentUserEmail))
        .sort((a, b) => {
          const aPriority = isPriorityPlan(getThreadOther(a)) ? 1 : 0;
          const bPriority = isPriorityPlan(getThreadOther(b)) ? 1 : 0;
          if (aPriority !== bPriority) {
            return bPriority - aPriority;
          }
          const aMsgs = getThreadMessages(a.id);
          const bMsgs = getThreadMessages(b.id);
          const aLast = aMsgs.length ? aMsgs[aMsgs.length - 1].at : a.createdAt || "";
          const bLast = bMsgs.length ? bMsgs[bMsgs.length - 1].at : b.createdAt || "";
          return String(bLast).localeCompare(String(aLast));
        });

    let activeThreadId = null;
    const currentThreads = filteredThreads();
    if (pendingRecipient) {
      const pendingThread = currentThreads.find((entry) => getThreadOther(entry) === pendingRecipient);
      if (pendingThread) {
        activeThreadId = pendingThread.id;
      }
    }
    if (!activeThreadId && currentThreads.length) {
      activeThreadId = currentThreads[0].id;
    }
    localStorage.removeItem("pendingChatRecipientKey");
    localStorage.removeItem("pendingChatRecipientName");

    const renderMessages = () => {
      messageList.innerHTML = "";
      const thread = filteredThreads().find((entry) => entry.id === activeThreadId);
      if (!thread) {
        if (activeName) activeName.textContent = "Select a conversation";
        return;
      }
      const otherEmail = getThreadOther(thread);
      if (activeName) activeName.textContent = getDisplayName(otherEmail);
      const threadMessages = getThreadMessages(thread.id);
      if (!threadMessages.length) {
        const emptyState = document.createElement("p");
        emptyState.className = "form-note";
        emptyState.textContent = "No messages yet. Say hello.";
        messageList.appendChild(emptyState);
        return;
      }
      threadMessages.forEach((entry) => {
        const bubble = document.createElement("div");
        const own = entry.from === currentUserEmail;
        const readable = own ? true : canReadInboundMessage(currentUserEmail, entry, messages);
        bubble.className = `chat-bubble ${own ? "own" : "other"}`;
        if (!readable) {
          bubble.classList.add("is-blurred");
          bubble.textContent = "Upgrade to Gold to read this message.";
        } else {
          bubble.textContent = entry.text || "";
        }
        messageList.appendChild(bubble);
      });
      messageList.scrollTop = messageList.scrollHeight;
    };

    const renderThreads = () => {
      const list = filteredThreads();
      threadList.innerHTML = "";
      if (!list.length) {
        if (chatEmpty) chatEmpty.hidden = false;
        if (activeName) activeName.textContent = "Select a conversation";
        messageList.innerHTML = "";
        return;
      }
      if (chatEmpty) chatEmpty.hidden = true;
      list.forEach((thread) => {
        const otherEmail = getThreadOther(thread);
        const threadMessages = getThreadMessages(thread.id);
        const last = threadMessages.length ? threadMessages[threadMessages.length - 1].text : "";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "chat-thread-item";
        applyMembershipHighlight(button, otherEmail);
        if (thread.id === activeThreadId) {
          button.classList.add("active");
        }
        const badgeMarkup = createMembershipBadgeMarkup(otherEmail);
        const priorityLabel = isPriorityPlan(otherEmail)
          ? '<span class="thread-priority-label">Priority</span>'
          : "";
        button.innerHTML = `
          <strong>${getDisplayName(otherEmail)} ${badgeMarkup}</strong>
          ${priorityLabel}
          <span>${last || "Start the conversation"}</span>
        `;
        button.addEventListener("click", () => {
          activeThreadId = thread.id;
          renderThreads();
          renderMessages();
        });
        threadList.appendChild(button);
      });
    };

    composeForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = composeInput.value.trim();
      if (!text || !activeThreadId) {
        return;
      }
      const thread = filteredThreads().find((entry) => entry.id === activeThreadId);
      if (!thread) {
        return;
      }
      const otherEmail = getThreadOther(thread);
      messages = readLocalChatMessages();
      messages.push({
        id: `msg-${Date.now()}`,
        threadId: thread.id,
        from: currentUserEmail,
        to: otherEmail,
        text,
        at: new Date().toISOString()
      });
      await writeLocalChatMessages(messages);
      composeInput.value = "";
      renderThreads();
      renderMessages();
    });

    renderThreads();
    renderMessages();
  }
}

const profileDetailRoot = document.querySelector("[data-profile-detail]");
if (profileDetailRoot) {
  const detailPhoto = document.querySelector("[data-detail-photo]");
  const detailName = document.querySelector("[data-detail-name]");
  const detailLocation = document.querySelector("[data-detail-location]");
  const detailGender = document.querySelector("[data-detail-gender]");
  const detailReligion = document.querySelector("[data-detail-religion]");
  const detailTribe = document.querySelector("[data-detail-tribe]");
  const detailLookingFor = document.querySelector("[data-detail-looking-for]");
  const detailLanguages = document.querySelector("[data-detail-languages]");
  const detailProfession = document.querySelector("[data-detail-profession]");
  const detailEducation = document.querySelector("[data-detail-education]");
  const detailHeight = document.querySelector("[data-detail-height]");
  const detailWeight = document.querySelector("[data-detail-weight]");
  const detailSmoking = document.querySelector("[data-detail-smoking]");
  const detailDrinking = document.querySelector("[data-detail-drinking]");
  const detailKids = document.querySelector("[data-detail-kids]");
  const detailBio = document.querySelector("[data-detail-bio]");
  const detailGallery = document.querySelector("[data-detail-gallery]");
  const sendMessageButton = document.querySelector("[data-send-message]");
  const likeProfileButton = document.querySelector("[data-like-profile]");
  const likeProfileNote = document.querySelector("[data-like-note]");
  const messageModal = document.querySelector("[data-message-modal]");
  const messageModalRecipient = document.querySelector("[data-message-modal-recipient]");
  const messageModalText = document.querySelector("[data-message-modal-text]");
  const messageModalNote = document.querySelector("[data-message-modal-note]");
  const messageModalSend = document.querySelector("[data-message-modal-send]");
  const messageModalCancel = document.querySelector("[data-message-modal-cancel]");
  const photoLightbox = document.querySelector("[data-photo-lightbox]");
  const photoLightboxImage = document.querySelector("[data-photo-lightbox-image]");
  const photoLightboxClose = document.querySelector("[data-photo-lightbox-close]");
  const notFoundCard = document.querySelector("[data-profile-not-found]");
  const url = new URL(window.location.href);
  const key = url.searchParams.get("user") || "";
  const profiles = readLocalProfiles();
  const record = key ? profiles[key] : null;

  const display = (value) =>
    Array.isArray(value) ? (value.length ? value.join(", ") : "Not set") : value || "Not set";
  const closeLightbox = () => {
    if (!photoLightbox || !photoLightboxImage) {
      return;
    }
    photoLightbox.hidden = true;
    photoLightboxImage.src = "";
  };

  if (photoLightbox && photoLightboxClose) {
    photoLightboxClose.addEventListener("click", closeLightbox);
    photoLightbox.addEventListener("click", (event) => {
      if (event.target === photoLightbox) {
        closeLightbox();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !photoLightbox.hidden) {
        closeLightbox();
      }
    });
  }

  if (!record || typeof record !== "object") {
    profileDetailRoot.hidden = true;
    if (notFoundCard) {
      notFoundCard.hidden = false;
    }
  } else if (
    detailPhoto &&
    detailName &&
    detailLocation &&
    detailGender &&
    detailReligion &&
    detailTribe &&
    detailLookingFor &&
    detailLanguages &&
    detailProfession &&
    detailEducation &&
    detailHeight &&
    detailWeight &&
    detailSmoking &&
    detailDrinking &&
    detailKids &&
    detailBio &&
    detailGallery
  ) {
    applyMembershipHighlight(profileDetailRoot, key);
    const photos = Array.isArray(record.photos) ? record.photos : [];
    const primaryIndex = Number.isInteger(record.primaryPhotoIndex)
      ? record.primaryPhotoIndex
      : 0;
    const heroPhoto = photos[primaryIndex] || photos[0] || "";
    const renderMainPhoto = (src) => {
      if (!detailPhoto) {
        return;
      }
      detailPhoto.innerHTML = src
        ? `<img src="${src}" alt="${display(record.profileName)} profile photo" />`
        : `<div class="profile-square-fallback">${String(display(record.profileName)).charAt(0).toUpperCase()}</div>`;
    };

    let selectedMainPhoto = heroPhoto;
    renderMainPhoto(selectedMainPhoto);

    detailName.innerHTML = `${display(record.profileName)} ${createMembershipBadgeMarkup(key)}`;
    detailLocation.textContent = display(record.location);
    detailGender.textContent = display(record.gender);
    detailReligion.textContent = display(record.religion);
    detailTribe.textContent = display(record.tribeOther || record.tribe);
    detailLookingFor.textContent = display(record.lookingFor);
    detailLanguages.textContent = display(record.languages);
    detailProfession.textContent = display(record.profession);
    detailEducation.textContent = display(record.education);
    detailHeight.textContent = record.heightCm ? `${record.heightCm} cm` : "Not set";
    detailWeight.textContent = record.weightKg ? `${record.weightKg} kg` : "Not set";
    detailSmoking.textContent = display(record.smoking);
    detailDrinking.textContent = display(record.drinking);
    const kidsText = record.kidsCount
      ? `${display(record.kids)} (${record.kidsCount})`
      : display(record.kids);
    detailKids.textContent = kidsText;
    detailBio.textContent = display(record.bio);
    detailGallery.innerHTML = "";
    if (photos.length) {
      photos.forEach((src, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "profile-detail-gallery-item";
        if (src === selectedMainPhoto) {
          button.classList.add("is-active");
        }
        button.setAttribute(
          "aria-label",
          `Open ${display(record.profileName)} photo ${index + 1}`
        );
        button.innerHTML = `<img src="${src}" alt="${display(record.profileName)} photo ${index + 1}" loading="lazy" />`;
        button.addEventListener("click", () => {
          selectedMainPhoto = src;
          renderMainPhoto(src);
          detailGallery
            .querySelectorAll(".profile-detail-gallery-item")
            .forEach((entry) => entry.classList.remove("is-active"));
          button.classList.add("is-active");
          if (photoLightbox && photoLightboxImage) {
            photoLightboxImage.src = src;
            photoLightbox.hidden = false;
          }
        });
        detailGallery.appendChild(button);
      });
    } else {
      const fallback = document.createElement("div");
      fallback.className = "profile-square-fallback";
      fallback.textContent = String(display(record.profileName)).charAt(0).toUpperCase();
      detailGallery.appendChild(fallback);
    }
    if (sendMessageButton) {
      sendMessageButton.addEventListener("click", () => {
        if (!messageModal || !messageModalText) {
          return;
        }
        if (messageModalRecipient) {
          messageModalRecipient.textContent = `To: ${display(record.profileName)}`;
        }
        if (messageModalNote) {
          messageModalNote.textContent = "";
        }
        messageModalText.value = "";
        messageModal.hidden = false;
        messageModalText.focus();
      });
    }

    const closeMessageModal = () => {
      if (!messageModal) {
        return;
      }
      messageModal.hidden = true;
      if (messageModalText) {
        messageModalText.value = "";
      }
      if (messageModalNote) {
        messageModalNote.textContent = "";
      }
    };

    if (messageModal && messageModalCancel) {
      messageModalCancel.addEventListener("click", closeMessageModal);
      messageModal.addEventListener("click", (event) => {
        if (event.target === messageModal) {
          closeMessageModal();
        }
      });
    }

    if (messageModalSend && messageModalText) {
      messageModalSend.addEventListener("click", async () => {
        const currentUserEmail = (localStorage.getItem("currentUserEmail") || "")
          .trim()
          .toLowerCase();
        const text = messageModalText.value.trim();

        if (!currentUserEmail) {
          if (messageModalNote) {
            messageModalNote.textContent = "Sign in to send a message.";
            messageModalNote.classList.add("form-error");
          }
          return;
        }
        if (!text) {
          if (messageModalNote) {
            messageModalNote.textContent = "Please enter a message.";
            messageModalNote.classList.add("form-error");
          }
          return;
        }

        const threads = readLocalChatThreads();
        let thread = threads.find(
          (entry) =>
            entry &&
            ((entry.a === currentUserEmail && entry.b === key) ||
              (entry.a === key && entry.b === currentUserEmail))
        );

        if (!thread) {
          thread = {
            id: `thread-${Date.now()}`,
            a: currentUserEmail,
            b: key,
            createdAt: new Date().toISOString()
          };
          threads.push(thread);
          await writeLocalChatThreads(threads);
        }

        const messages = readLocalChatMessages();
        messages.push({
          id: `msg-${Date.now()}`,
          threadId: thread.id,
          from: currentUserEmail,
          to: key,
          text,
          at: new Date().toISOString()
        });
        await writeLocalChatMessages(messages);

        localStorage.setItem("pendingChatRecipientKey", key);
        localStorage.setItem("pendingChatRecipientName", display(record.profileName));
        closeMessageModal();
        window.location.href = "chats.html";
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && messageModal && !messageModal.hidden) {
        closeMessageModal();
      }
    });
    if (likeProfileButton && likeProfileNote) {
      const currentUserEmail = (localStorage.getItem("currentUserEmail") || "")
        .trim()
        .toLowerCase();
      const isOwnProfile = currentUserEmail && currentUserEmail === key;
      const likes = readLocalLikes();
      const alreadyLiked = likes.some(
        (entry) => entry.from === currentUserEmail && entry.to === key
      );

      if (!currentUserEmail) {
        likeProfileButton.disabled = true;
        likeProfileNote.textContent = "Sign in to like profiles.";
      } else if (isOwnProfile) {
        likeProfileButton.disabled = true;
        likeProfileNote.textContent = "You cannot like your own profile.";
      } else if (alreadyLiked) {
        likeProfileButton.classList.add("is-liked");
        likeProfileButton.textContent = "Liked";
        likeProfileNote.textContent = "You already liked this profile.";
      } else {
        likeProfileButton.addEventListener("click", async () => {
          const updatedLikes = readLocalLikes();
          const exists = updatedLikes.some(
            (entry) => entry.from === currentUserEmail && entry.to === key
          );
          if (exists) {
            likeProfileButton.classList.add("is-liked");
            likeProfileButton.textContent = "Liked";
            likeProfileNote.textContent = "You already liked this profile.";
            return;
          }
          updatedLikes.push({
            from: currentUserEmail,
            to: key,
            at: new Date().toISOString()
          });
          await writeLocalLikes(updatedLikes);
          likeProfileButton.classList.add("is-liked");
          likeProfileButton.textContent = "Liked";
          likeProfileNote.textContent = "Profile liked. They will get an alert.";
        });
      }
    }
  }
}

});

const photoInput = document.querySelector("[data-profile-photo-input]");
const photoPreviews = document.querySelector("[data-photo-previews]");
const primaryPhoto = document.querySelector("[data-primary-photo]");
whenAppDataReady(() => {
if (photoInput && photoPreviews && primaryPhoto) {
  const renderPreviews = (sources, selectedIndex = 0) => {
    photoPreviews.innerHTML = "";
    const safeSelectedIndex =
      selectedIndex >= 0 && selectedIndex < sources.length ? selectedIndex : 0;
    sources.forEach((source, index) => {
      const card = document.createElement("div");
      card.className = "photo-card";
      const img = document.createElement("img");
      img.src = source.src;
      img.alt = `Photo ${index + 1}`;

      const label = document.createElement("label");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "primaryPhotoPick";
      radio.value = String(index);
      if (index === safeSelectedIndex) {
        radio.checked = true;
        primaryPhoto.value = String(safeSelectedIndex);
      }
      radio.addEventListener("change", () => {
        primaryPhoto.value = radio.value;
      });
      label.appendChild(radio);
      label.append(" Profile photo");

      card.appendChild(img);
      card.appendChild(label);
      photoPreviews.appendChild(card);
    });
  };

  photoInput.addEventListener("change", () => {
    const files = photoInput.files ? Array.from(photoInput.files) : [];
    if (files.length > 5) {
      alert("You can select up to 5 photos.");
      photoInput.value = "";
      if (createProfileExistingPhotos.length) {
        renderPreviews(
          createProfileExistingPhotos.map((src) => ({ src })),
          createProfileExistingPrimaryIndex
        );
      } else {
        photoPreviews.innerHTML = "";
        primaryPhoto.value = "";
      }
      return;
    }
    if (!files.length) {
      if (createProfileExistingPhotos.length) {
        renderPreviews(
          createProfileExistingPhotos.map((src) => ({ src })),
          createProfileExistingPrimaryIndex
        );
      } else {
        photoPreviews.innerHTML = "";
        primaryPhoto.value = "";
      }
      return;
    }
    renderPreviews(files.map((file) => ({ src: URL.createObjectURL(file) })), 0);
  });

  if (createProfileExistingPhotos.length) {
    renderPreviews(
      createProfileExistingPhotos.map((src) => ({ src })),
      createProfileExistingPrimaryIndex
    );
  }
}
});

const bioField = document.querySelector("#profile-bio");
const bioEmojiButtons = document.querySelectorAll("[data-bio-emoji]");
if (bioField && bioEmojiButtons.length) {
  bioEmojiButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const emoji = button.getAttribute("data-bio-emoji");
      if (!emoji) return;
      const start = bioField.selectionStart || bioField.value.length;
      const end = bioField.selectionEnd || bioField.value.length;
      const prefix = bioField.value.slice(0, start);
      const suffix = bioField.value.slice(end);
      const spacer = prefix && !prefix.endsWith(" ") ? " " : "";
      bioField.value = `${prefix}${spacer}${emoji} ${suffix}`.trimStart();
      const cursor = prefix.length + spacer.length + emoji.length + 1;
      bioField.focus();
      bioField.setSelectionRange(cursor, cursor);
    });
  });
}

const tribeSelect = document.querySelector("#profile-tribe");
const otherTribeRow = document.querySelector("[data-other-tribe-row]");
const otherTribeField = document.querySelector("#profile-tribe-other");
if (tribeSelect && otherTribeRow && otherTribeField) {
  const syncOtherTribeField = () => {
    const show = tribeSelect.value === "other";
    otherTribeRow.hidden = !show;
    otherTribeRow.classList.toggle("is-hidden", !show);
    otherTribeField.required = show;
    otherTribeField.disabled = !show;
    if (!show) {
      otherTribeField.value = "";
    } else {
      otherTribeField.focus();
    }
  };

  tribeSelect.addEventListener("change", syncOtherTribeField);
  syncOtherTribeField();
}

const kidsSelect = document.querySelector("#profile-kids");
const kidsCountRow = document.querySelector("[data-kids-count-row]");
const kidsCountField = document.querySelector("#profile-kids-count");
if (kidsSelect && kidsCountRow && kidsCountField) {
  const syncKidsCountField = () => {
    const show = kidsSelect.value === "have-kids";
    kidsCountRow.hidden = !show;
    kidsCountRow.classList.toggle("is-hidden", !show);
    kidsCountField.required = show;
    kidsCountField.disabled = !show;
    if (!show) {
      kidsCountField.value = "";
    } else {
      kidsCountField.focus();
    }
  };

  kidsSelect.addEventListener("change", syncKidsCountField);
  syncKidsCountField();
}
