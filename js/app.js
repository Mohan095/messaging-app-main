/* ==========================================
   MAIN APPLICATION ROUTER & INITIALIZER
   ========================================== */

import { store } from './state.js';
import { initAuth, renderProfileData } from './auth.js';
import { initContacts, renderContactsList } from './contacts.js';
import { initGroups, renderGroupsList } from './groups.js';
import { initStatusSystem, renderStatusList, openStatusViewer } from './status.js';
import { initMediaLibrary, renderMediaLibrary } from './media.js';
import { initSettings } from './settings.js';
import { initAdminPanel, renderAdminMetrics } from './admin.js';
import { initChatEngine, setActiveChat, renderMessages } from './chat.js';
import { loadUserContactsFromFirebase, setupFirebaseContactsListener } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log("🚀 Initializing MD Chat Pro Application...");

  // Initialize Submodules
  initAuth();
  initContacts();
  initGroups();
  initStatusSystem();
  initMediaLibrary();
  initSettings();
  initAdminPanel();
  initChatEngine();

  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.log('SW Registration optional notice:', err);
    });
  }

  // Setup Navigation Rail Tabs
  setupNavigationTabs();

  // Setup Search Input Filters
  setupSearchFilters();

  // Subscribe to store updates to keep lists fresh
  store.subscribe((state) => {
    renderActiveTabContent();
    updateUserAvatarBadge(state.currentUser);
  });

  // Initial Render
  renderActiveTabContent();
  const currentUser = store.getState().currentUser;
  updateUserAvatarBadge(currentUser);

  if (currentUser && currentUser.uid) {
    loadUserContactsFromFirebase(currentUser.uid).then(contacts => {
      if (contacts && contacts.length > 0) {
        store.updateState({ contacts });
      }
    });
    setupFirebaseContactsListener(currentUser.uid, (remoteContacts) => {
      if (remoteContacts && remoteContacts.length > 0) {
        store.updateState({ contacts: remoteContacts });
      }
    });
  }

  // Mobile Back Button Handler
  const mobileBackBtn = document.getElementById('mobile-chat-back');
  if (mobileBackBtn) {
    mobileBackBtn.addEventListener('click', () => {
      document.getElementById('chat-window-pane')?.classList.remove('mobile-active');
      document.body.classList.remove('mobile-chat-open');
    });
  }
});

let currentActiveTab = 'chats';

function setupNavigationTabs() {
  const navBtns = document.querySelectorAll('.nav-tab-btn');
  navBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const tab = e.currentTarget.getAttribute('data-tab');
      if (!tab) return;

      navBtns.forEach((b) => b.classList.remove('active'));
      e.currentTarget.classList.add('active');

      currentActiveTab = tab;
      switchTab(tab);
    });
  });
}

function switchTab(tab) {
  // Hide all sidebar views
  document.querySelectorAll('.sidebar-view').forEach((v) => v.classList.add('hidden'));

  // Update Header Title
  const titleEl = document.getElementById('sidebar-main-title');
  
  if (tab === 'chats') {
    if (titleEl) titleEl.textContent = 'Chats';
    document.getElementById('view-chats')?.classList.remove('hidden');
  } else if (tab === 'contacts') {
    if (titleEl) titleEl.textContent = 'Contacts';
    document.getElementById('view-contacts')?.classList.remove('hidden');
  } else if (tab === 'groups') {
    if (titleEl) titleEl.textContent = 'Groups';
    document.getElementById('view-groups')?.classList.remove('hidden');
  } else if (tab === 'status') {
    if (titleEl) titleEl.textContent = 'Status';
    document.getElementById('view-status')?.classList.remove('hidden');
  } else if (tab === 'media') {
    if (titleEl) titleEl.textContent = 'Media Library';
    document.getElementById('view-media')?.classList.remove('hidden');
  } else if (tab === 'admin') {
    if (titleEl) titleEl.textContent = 'Admin Dashboard';
    document.getElementById('view-admin')?.classList.remove('hidden');
    renderAdminMetrics();
  } else if (tab === 'settings') {
    if (titleEl) titleEl.textContent = 'Settings';
    document.getElementById('view-settings')?.classList.remove('hidden');
  }

  renderActiveTabContent();
}

function renderActiveTabContent() {
  const searchVal = document.getElementById('sidebar-search-input')?.value || '';

  if (currentActiveTab === 'chats') {
    renderChatsList(searchVal);
  } else if (currentActiveTab === 'contacts') {
    renderContactsList('all', searchVal);
  } else if (currentActiveTab === 'groups') {
    renderGroupsList(searchVal);
  } else if (currentActiveTab === 'status') {
    renderStatusList();
  } else if (currentActiveTab === 'media') {
    renderMediaLibrary();
  }
}

function renderChatsList(searchQuery = '') {
  const container = document.getElementById('chats-list-container');
  if (!container) return;

  const { contacts, groups, messages } = store.getState();
  const allConversations = [];

  // Add Private Contacts with conversation history
  contacts.forEach((c) => {
    const chatMsgs = messages[c.uid] || [];
    const lastMsg = chatMsgs[chatMsgs.length - 1];
    allConversations.push({
      id: c.uid,
      type: 'private',
      name: c.name,
      avatar: c.avatar,
      online: c.online,
      lastMsgText: lastMsg ? (lastMsg.type === 'text' ? lastMsg.text : `[${lastMsg.type}]`) : c.bio,
      lastMsgTime: lastMsg ? formatTimeShort(lastMsg.timestamp) : '',
      lastMsgStatus: lastMsg ? lastMsg.status : '',
      rawTime: lastMsg ? new Date(lastMsg.timestamp).getTime() : 0
    });
  });

  // Add Groups
  groups.forEach((g) => {
    const groupMsgs = messages[g.id] || [];
    const lastMsg = groupMsgs[groupMsgs.length - 1];
    allConversations.push({
      id: g.id,
      type: 'group',
      name: g.name,
      avatar: g.avatar,
      online: false,
      lastMsgText: lastMsg ? `${lastMsg.senderName}: ${lastMsg.text}` : g.description,
      lastMsgTime: lastMsg ? formatTimeShort(lastMsg.timestamp) : '',
      lastMsgStatus: lastMsg ? lastMsg.status : '',
      rawTime: lastMsg ? new Date(lastMsg.timestamp).getTime() : 0
    });
  });

  // Sort by recent conversation
  allConversations.sort((a, b) => b.rawTime - a.rawTime);

  const filtered = allConversations.filter((conv) => conv.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding: 32px; text-align: center; color: var(--text-secondary);">
        <p>No conversations found.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((c) => `
    <div class="list-item" data-chat-id="${c.id}" data-chat-type="${c.type}">
      <div class="item-avatar">
        <img src="${c.avatar}" alt="${c.name}">
        ${c.online ? '<span class="online-dot"></span>' : ''}
      </div>
      <div class="item-info">
        <div class="item-top-row">
          <span class="item-name">${c.name}</span>
          <span class="item-time">${c.lastMsgTime}</span>
        </div>
        <div class="item-bottom-row">
          <span class="item-preview">
            ${c.lastMsgText}
          </span>
        </div>
      </div>
    </div>
  `).join('');

  // Attach Item Click Listener to launch chat
  container.querySelectorAll('.list-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-chat-id');
      const type = e.currentTarget.getAttribute('data-chat-type');
      container.querySelectorAll('.list-item').forEach((i) => i.classList.remove('active'));
      e.currentTarget.classList.add('active');
      setActiveChat(id, type);
    });
  });
}

function setupSearchFilters() {
  const searchInput = document.getElementById('sidebar-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderActiveTabContent();
    });
  }

  // Delegate click for status items
  document.addEventListener('click', (e) => {
    const statusItem = e.target.closest('[data-status-user-id]');
    if (statusItem) {
      const userId = statusItem.getAttribute('data-status-user-id');
      openStatusViewer(userId);
    }
  });
}

function updateUserAvatarBadge(user) {
  if (!user) return;
  const avatarImgs = document.querySelectorAll('.nav-user-avatar');
  avatarImgs.forEach((img) => {
    img.src = user.avatar;
  });
}

function formatTimeShort(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
