/* ==========================================
   REAL WHATSAPP SETTINGS SYSTEM
   ========================================== */

import { store } from './state.js';

export function initSettings() {
  const themeToggle = document.getElementById('theme-toggle-switch');
  const wallpaperSelect = document.getElementById('wallpaper-select');
  const soundToggle = document.getElementById('sound-toggle-switch');
  const notifToggle = document.getElementById('notif-toggle-switch');

  const state = store.getState();

  document.getElementById('setting-menu-notif')?.addEventListener('click', () => {
    document.getElementById('sub-panel-notif')?.classList.toggle('hidden');
  });
  document.getElementById('setting-menu-privacy')?.addEventListener('click', () => {
    document.getElementById('sub-panel-privacy')?.classList.toggle('hidden');
  });
  document.getElementById('setting-menu-chats')?.addEventListener('click', () => {
    document.getElementById('sub-panel-chats')?.classList.toggle('hidden');
  });
  document.getElementById('setting-menu-security')?.addEventListener('click', () => {
    document.getElementById('sub-panel-security')?.classList.toggle('hidden');
  });
  document.getElementById('setting-menu-shortcuts')?.addEventListener('click', () => {
    document.getElementById('sub-panel-shortcuts')?.classList.toggle('hidden');
  });
  document.getElementById('setting-menu-help')?.addEventListener('click', () => {
    document.getElementById('sub-panel-help')?.classList.toggle('hidden');
  });
  document.getElementById('setting-menu-logout')?.addEventListener('click', () => {
    if (typeof window.logoutUser === 'function') {
      window.logoutUser();
    }
  });

  document.getElementById('settings-profile-header')?.addEventListener('click', () => {
    document.getElementById('profile-drawer')?.classList.remove('hidden');
  });

  if (themeToggle) {
    themeToggle.checked = state.theme === 'light';
    themeToggle.addEventListener('change', (e) => {
      const newTheme = e.target.checked ? 'light' : 'dark';
      document.body.setAttribute('data-theme', newTheme);
      store.updateState({ theme: newTheme });
    });
  }

  if (wallpaperSelect) {
    wallpaperSelect.value = state.wallpaper || 'default';
    wallpaperSelect.addEventListener('change', (e) => {
      const wp = e.target.value;
      setChatWallpaper(wp);
      store.updateState({ wallpaper: wp });
    });
  }

  if (soundToggle) {
    soundToggle.checked = state.soundEnabled !== false;
    soundToggle.addEventListener('change', (e) => {
      store.updateState({ soundEnabled: e.target.checked });
    });
  }

  if (notifToggle) {
    notifToggle.checked = state.desktopNotifs !== false;
    notifToggle.addEventListener('change', (e) => {
      if (e.target.checked && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        Notification.requestPermission();
      }
      store.updateState({ desktopNotifs: e.target.checked });
    });
  }

  document.body.setAttribute('data-theme', state.theme || 'light');
  setChatWallpaper(state.wallpaper || 'default');
}

function setChatWallpaper(wp) {
  const chatWindow = document.getElementById('chat-window-pane');
  if (!chatWindow) return;

  if (wp === 'doodle') {
    chatWindow.style.backgroundImage = `radial-gradient(circle at 50% 50%, rgba(0, 168, 132, 0.08) 0%, transparent 70%), url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`;
  } else if (wp === 'emerald') {
    chatWindow.style.backgroundImage = `none`;
    chatWindow.style.backgroundColor = `#062c24`;
  } else if (wp === 'blue') {
    chatWindow.style.backgroundImage = `none`;
    chatWindow.style.backgroundColor = `#0d233a`;
  } else {
    chatWindow.style.backgroundImage = `var(--chat-bg-pattern)`;
    chatWindow.style.backgroundColor = `var(--bg-chat-area)`;
  }
}
