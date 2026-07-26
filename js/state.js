/* ==========================================
   STATE MANAGEMENT & DATA STORE (CLEAN MODE)
   ========================================== */

const STORAGE_KEY = 'whatsapp_pro_state_v2';

const DEFAULT_INITIAL_STATE = {
  currentUser: {
    uid: "user_pro_777",
    name: "My Account",
    mobile: "+1 555-0199",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    bio: "Hey there! I am using MD Chat Pro.",
    about: "Available",
    online: true,
    lastSeen: "Online",
    createdAt: new Date().toISOString(),
    privacy: {
      lastSeen: "everyone",
      profilePhoto: "everyone",
      readReceipts: true
    }
  },
  theme: "light",
  wallpaper: "default",
  soundEnabled: true,
  desktopNotifs: true,
  contacts: [],
  groups: [],
  statusList: [
    {
      id: "status_demo_1",
      userId: "demo_1",
      userName: "Sarah Connor",
      userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      type: "image",
      url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80",
      caption: "Working on new MD Chat Pro features! 🚀",
      views: [],
      likes: []
    },
    {
      id: "status_demo_2",
      userId: "demo_2",
      userName: "Alex Rivers",
      userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      type: "image",
      url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80",
      caption: "Evening workout session 💪",
      views: [],
      likes: []
    },
    {
      id: "status_demo_3",
      userId: "demo_3",
      userName: "Emily Watson",
      userAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      type: "image",
      url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80",
      caption: "Peaceful weekend views 🌊",
      views: [],
      likes: []
    }
  ],
  messages: {},
  reports: [],
  suspendedUsers: []
};

class DataStore {
  constructor() {
    this.listeners = [];
    this.state = this.loadState();
  }

  loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_INITIAL_STATE, ...parsed };
      } catch (e) {
        console.error("Failed to parse stored state, using default:", e);
      }
    }
    return DEFAULT_INITIAL_STATE;
  }

  saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach((fn) => fn(this.state));
  }

  getState() {
    return this.state;
  }

  updateState(updater) {
    this.state = typeof updater === 'function' ? updater(this.state) : { ...this.state, ...updater };
    this.saveState();
  }
}

export const store = new DataStore();
