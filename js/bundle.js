/* ==========================================
   MD CHAT PRO - BUNDLE
   Live Google Auth & Cloud Storage
   3-Step Verification Modal Flow with Profile Image Upload
   ========================================== */

(function () {
  'use strict';

  /* ------------------------------------------
     0. CUSTOM ANIMATED TOAST ALERT SYSTEM
     ------------------------------------------ */
  window.alert = function (message, type) {
    createToastAlert(message, type);
  };
  window.showToastAlert = function (message, type, duration) {
    createToastAlert(message, type, duration);
  };

  function createToastAlert(message, type, duration = 4500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const msgStr = String(message || '').toLowerCase();
    let alertType = type;

    if (!alertType) {
      if (msgStr.includes('failed') || msgStr.includes('error') || msgStr.includes('required') || msgStr.includes('invalid') || msgStr.includes('denied') || msgStr.includes('not completed')) {
        alertType = 'error';
      } else if (msgStr.includes('deleted') || msgStr.includes('removed') || msgStr.includes('warning') || msgStr.includes('no active')) {
        alertType = 'warning';
      } else if (msgStr.includes('notice') || msgStr.includes('demo') || msgStr.includes('code:') || msgStr.includes('initializing') || msgStr.includes('info')) {
        alertType = 'info';
      } else {
        alertType = 'success';
      }
    }

    let iconClass = 'fas fa-check-circle';
    let titleBadge = 'Success';

    if (alertType === 'error' || alertType === 'danger') {
      iconClass = 'fas fa-exclamation-circle';
      titleBadge = 'Error';
    } else if (alertType === 'warning') {
      iconClass = msgStr.includes('deleted') ? 'fas fa-trash-alt' : 'fas fa-exclamation-triangle';
      titleBadge = 'Warning';
    } else if (alertType === 'info') {
      iconClass = 'fas fa-info-circle';
      titleBadge = 'Info';
    } else {
      iconClass = 'fas fa-check-circle';
      titleBadge = 'Success';
    }

    const safeMessage = typeof escapeHtml === 'function' 
      ? escapeHtml(String(message))
      : String(message).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const toast = document.createElement('div');
    toast.className = `toast-alert toast-${alertType}`;
    
    toast.innerHTML = `
      <div class="toast-alert-icon">
        <i class="${iconClass}"></i>
      </div>
      <div class="toast-alert-body">
        <div class="toast-alert-header">
          <span class="toast-alert-badge">${titleBadge}</span>
        </div>
        <div class="toast-alert-message">${safeMessage}</div>
      </div>
      <button class="toast-alert-close" title="Close">&times;</button>
      <div class="toast-progress-bar">
        <div class="toast-progress-fill" style="animation-duration: ${duration}ms"></div>
      </div>
    `;

    toast.querySelector('.toast-alert-close').addEventListener('click', () => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 380);
    });

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 380);
      }
    }, duration);
  }

  /* PREVENT RIGHT CLICK (CONTEXT MENU) & VIEW SOURCE KEYBOARD SHORTCUTS */
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  document.addEventListener('keydown', (e) => {
    if (
      e.key === 'F12' ||
      (e.ctrlKey && (e.key === 'u' || e.key === 'U')) ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) ||
      (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) ||
      (e.ctrlKey && (e.key === 's' || e.key === 'S'))
    ) {
      e.preventDefault();
    }
  });

  /* ------------------------------------------
     1. FIREBASE INITIALIZATION & DATA HELPER
     ------------------------------------------ */
  const firebaseConfig = {
    apiKey: "AIzaSyBHrCqx1FFnYw52Py4ZIicn5Pg_yxXeKjo",
    authDomain: "chat-mk-f1fc4.firebaseapp.com",
    projectId: "chat-mk-f1fc4",
    storageBucket: "chat-mk-f1fc4.firebasestorage.app",
    messagingSenderId: "561728667110",
    appId: "1:561728667110:web:2b6b05ad11b4826c63ea27",
    measurementId: "G-4M56M2Q8LW"
  };

  let db = null;
  let auth = null;
  let googleProvider = null;

  if (typeof firebase !== 'undefined') {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.firestore();
      auth = firebase.auth();
      googleProvider = new firebase.auth.GoogleAuthProvider();
      console.log("🔥 Firebase project initialized: chat-mk-f1fc4. Firestore & Google Auth ready.");
    } catch (e) {
      console.log("Firebase initialization status:", e.message);
    }
  }

  async function uploadFileToStorage(file, folder = "uploads") {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error("No file provided"));
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  function syncUserDataToFirebase(user) {
    if (!user || !user.uid) return;
    if (db) {
      try {
        db.collection('users').doc(user.uid).set({
          uid: user.uid,
          name: user.name || '',
          email: user.email || '',
          mobile: user.mobile || '',
          avatar: user.avatar || '',
          bio: user.bio || '',
          about: user.about || '',
          online: Boolean(user.online),
          lastSeen: user.lastSeen || 'Online',
          updatedAt: new Date().toISOString()
        }, { merge: true }).then(() => {
          console.log("🔥 Saved user profile to Firebase Firestore (chat-mk-f1fc4)!");
        }).catch((err) => {
          console.log("Firestore notice:", err.message);
        });
      } catch (err) {}
    }
  }

  function syncMessageToFirebase(chatId, message) {
    if (!db || !chatId || !message) return;
    try {
      const participants = Array.from(new Set([message.senderId, chatId]));
      db.collection('messages').doc(message.id).set({
        ...message,
        chatId,
        participants,
        createdAt: new Date().toISOString()
      }, { merge: true }).then(() => {
        console.log("🔥 Message synced to Firebase Firestore (chat-mk-f1fc4)!");
      }).catch((err) => console.log("Firestore message notice:", err.message));
    } catch (err) {}
  }

  let unsubscribeMessagesListener = null;

  function setupFirebaseMessagesListener(currentUserId) {
    if (!db || !currentUserId) return;
    if (unsubscribeMessagesListener) {
      try { unsubscribeMessagesListener(); } catch (e) {}
    }

    try {
      unsubscribeMessagesListener = db.collection('messages')
        .onSnapshot((snapshot) => {
          const remoteMsgs = snapshot.docs.map(doc => doc.data());
          if (remoteMsgs && remoteMsgs.length > 0) {
            const { messages } = store.getState();
            let updated = false;
            const newMessagesState = { ...messages };

            remoteMsgs.forEach(msg => {
              let convKey = null;
              if (msg.senderId === currentUserId) {
                convKey = msg.chatId;
              } else if (msg.chatId === currentUserId || (msg.participants && msg.participants.includes(currentUserId))) {
                convKey = msg.senderId;
              } else if (msg.chatId && msg.chatId.startsWith('group_')) {
                convKey = msg.chatId;
              }

              if (convKey) {
                const currentList = newMessagesState[convKey] || [];
                if (!currentList.some(m => m.id === msg.id)) {
                  const isRead = (msg.senderId === currentUserId) || (activeChatId === convKey);
                  const msgWithRead = { ...msg, read: isRead };
                  newMessagesState[convKey] = [...currentList, msgWithRead].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                  updated = true;

                  if (msg.senderId !== currentUserId && activeChatId !== convKey) {
                    const unreadCnt = (newMessagesState[convKey] || []).filter(m => m.senderId !== currentUserId && m.read === false).length;
                    if (typeof window.showToastAlert === 'function') {
                      window.showToastAlert(`📩 New message from ${msg.senderName || 'Contact'}: "${msg.text || '[Media]'}" (${unreadCnt})`, 'info', 5000);
                    }
                  }
                }
              }
            });

            if (updated) {
              store.updateState({ messages: newMessagesState });
              renderMessages();
              if (typeof renderChatsList === 'function') renderChatsList();
              if (typeof updateNavChatsBadge === 'function') updateNavChatsBadge();
            }
          }
        }, (err) => {
          console.log("Firestore messages listener notice:", err.message);
        });
    } catch (err) {
      console.log("Firestore messages snapshot notice:", err.message);
    }
  }

  function syncStatusToFirebase(statusObj) {
    if (!db || !statusObj) return;
    try {
      db.collection('statuses').doc(statusObj.id).set({
        ...statusObj,
        createdAt: new Date().toISOString()
      }, { merge: true }).then(() => {
        console.log("🔥 Status story synced to Firebase Firestore (chat-mk-f1fc4)!");
      }).catch((err) => console.log("Firestore status notice:", err.message));
    } catch (err) {}
  }

  function syncContactToFirebase(currentUserId, contact) {
    if (!db || !currentUserId || !contact) return;
    try {
      // Path: users/{currentUserId}/contacts/{contact.uid} - Restricts read/write access exclusively to current user
      db.collection('users').doc(currentUserId).collection('contacts').doc(contact.uid).set({
        ...contact,
        ownerUid: currentUserId,
        syncedAt: new Date().toISOString()
      }, { merge: true }).then(() => {
        console.log(`🔥 Contact "${contact.name}" synced to Firebase Firestore under user ${currentUserId}!`);
      }).catch((err) => console.log("Firestore contact sync notice:", err.message));
    } catch (err) {}
  }

  async function deleteContactFromFirebase(currentUserId, contactUid) {
    if (!db || !currentUserId || !contactUid) return;
    try {
      await db.collection('users').doc(currentUserId).collection('contacts').doc(contactUid).delete();
      console.log(`🔥 Contact "${contactUid}" deleted from Firebase Firestore.`);
    } catch (err) {
      console.log("Firestore contact delete notice:", err.message);
    }
  }

  async function loadUserContactsFromFirebase(currentUserId) {
    if (!db || !currentUserId) return [];
    try {
      const snapshot = await db.collection('users').doc(currentUserId).collection('contacts').get();
      const contacts = snapshot.docs.map(doc => doc.data());
      if (contacts && contacts.length > 0) {
        const localContacts = store.getState().contacts || [];
        const contactMap = new Map();
        localContacts.forEach(c => contactMap.set(c.uid || c.mobile, c));
        contacts.forEach(c => contactMap.set(c.uid || c.mobile, c));
        const merged = Array.from(contactMap.values());
        store.updateState({ contacts: merged });
      }
      return contacts;
    } catch (err) {
      console.log("Firestore contact fetch notice:", err.message);
      return [];
    }
  }

  async function findUserByMobileInFirebase(mobileNumber) {
    if (!db || !mobileNumber) return null;
    try {
      const cleanInput = mobileNumber.replace(/\D/g, '');
      const snapshot = await db.collection('users').get();
      let matchedUser = null;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.mobile) {
          const userDigits = data.mobile.replace(/\D/g, '');
          if (userDigits.length >= 10 && cleanInput.length >= 10) {
            if (userDigits.slice(-10) === cleanInput.slice(-10)) {
              matchedUser = data;
            }
          } else if (userDigits === cleanInput) {
            matchedUser = data;
          }
        }
      });
      return matchedUser;
    } catch (err) {
      console.log("Firestore user search by mobile notice:", err.message);
      return null;
    }
  }

  let unsubscribeContactsListener = null;

  function setupFirebaseContactsListener(currentUserId) {
    if (!db || !currentUserId) return;
    if (unsubscribeContactsListener) {
      try { unsubscribeContactsListener(); } catch (e) {}
    }

    try {
      unsubscribeContactsListener = db.collection('users').doc(currentUserId).collection('contacts')
        .onSnapshot((snapshot) => {
          const remoteContacts = snapshot.docs.map(doc => doc.data());
          if (remoteContacts && remoteContacts.length > 0) {
            const localContacts = store.getState().contacts || [];
            const contactMap = new Map();
            localContacts.forEach(c => contactMap.set(c.uid || c.mobile, c));
            remoteContacts.forEach(c => contactMap.set(c.uid || c.mobile, c));
            const mergedContacts = Array.from(contactMap.values());
            store.updateState({ contacts: mergedContacts });
          }
        }, (err) => {
          console.log("Firestore contacts listener notice:", err.message);
        });
    } catch (err) {
      console.log("Firestore contacts snapshot notice:", err.message);
    }
  }

  function syncGroupToFirebase(group) {
    if (!db || !group) return;
    try {
      // Path: groups/{group.id} - Access policy requires request.auth.uid in resource.data.members
      db.collection('groups').doc(group.id).set({
        ...group,
        syncedAt: new Date().toISOString()
      }, { merge: true }).then(() => {
        console.log(`🔥 Group "${group.name}" synced to Firebase Firestore (Members restricted)!`);
      }).catch((err) => console.log("Firestore group sync notice:", err.message));
    } catch (err) {}
  }

  async function loadUserGroupsFromFirebase(currentUserId) {
    if (!db || !currentUserId) return [];
    try {
      const snapshot = await db.collection('groups').where('members', 'array-contains', currentUserId).get();
      return snapshot.docs.map(doc => doc.data());
    } catch (err) {
      console.log("Firestore group fetch notice:", err.message);
      return [];
    }
  }

  /* ------------------------------------------
     2. REAL-TIME MULTI-TAB BROADCAST CHANNEL
     ------------------------------------------ */
  const syncChannel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('whatsapp_pro_tab_sync') : null;

  /* ------------------------------------------
     3. STATE MANAGEMENT & DATA STORE
     ------------------------------------------ */
  const STORAGE_KEY = 'whatsapp_pro_state_v8';

  const DEFAULT_INITIAL_STATE = {
    currentUser: {
      uid: "user_pro_777",
      name: "My Account",
      mobile: "+1 555-0199",
      email: "user@gmail.com",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      bio: "Hey there! I am using MD Chat Pro.",
      about: "Available",
      online: true,
      registered: false,
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

      try {
        localStorage.removeItem('whatsapp_pro_state_v1');
        localStorage.removeItem('whatsapp_pro_state_v2');
        localStorage.removeItem('whatsapp_pro_state_v3');
        localStorage.removeItem('whatsapp_pro_state_v4');
        localStorage.removeItem('whatsapp_pro_state_v5');
        localStorage.removeItem('whatsapp_pro_state_v6');
        localStorage.removeItem('whatsapp_pro_state_v7');
      } catch (e) {}

      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            this.state = JSON.parse(e.newValue);
            this.notify();
          } catch (err) {}
        }
      });
    }

    loadState() {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_INITIAL_STATE, ...parsed };
        } catch (e) {
          console.error("Failed to parse stored state:", e);
        }
      }
      return DEFAULT_INITIAL_STATE;
    }

    saveState(broadcast = true) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.notify();
      if (broadcast && syncChannel) {
        syncChannel.postMessage({ type: 'STATE_CHANGED' });
      }
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
      if (this.state.currentUser) {
        syncUserDataToFirebase(this.state.currentUser);
      }
    }
  }

  const store = new DataStore();

  if (syncChannel) {
    syncChannel.onmessage = (e) => {
      if (e.data && e.data.type === 'STATE_CHANGED') {
        store.state = store.loadState();
        store.notify();
      }
    };
  }

  /* ------------------------------------------
     4. SPLASH SCREEN & 3-STEP SIGNUP VERIFICATION
     ------------------------------------------ */
  let signupTempData = {};

  function initSplashScreenAndSignup() {
    const splash = document.getElementById('splash-screen');
    const signupModal = document.getElementById('signup-modal');

    // Fade out splash screen after 2.2 seconds
    setTimeout(() => {
      if (splash) splash.classList.add('fade-out');

      const state = store.getState();
      if (!state.currentUser || !state.currentUser.registered) {
        if (signupModal) signupModal.classList.remove('hidden');
      } else {
        updateUserPresence(true);
        if (state.currentUser && state.currentUser.uid) {
          loadUserContactsFromFirebase(state.currentUser.uid);
          setupFirebaseContactsListener(state.currentUser.uid);
          setupFirebaseMessagesListener(state.currentUser.uid);
        }
      }
    }, 2200);

    const page1Form = document.getElementById('signup-page-1');
    const page2Form = document.getElementById('signup-page-2');
    const page3Form = document.getElementById('signup-page-3');

    const stepDot1 = document.getElementById('step-dot-1');
    const stepDot2 = document.getElementById('step-dot-2');
    const stepDot3 = document.getElementById('step-dot-3');

    const backBtn = document.getElementById('signup-back-btn');
    const step3BackBtn = document.getElementById('signup-step3-back-btn');
    const googleBtn = document.getElementById('continue-google-btn');

    const avatarFileInput = document.getElementById('signup-avatar-file-input');
    const avatarPreview = document.getElementById('signup-avatar-preview');

    // STEP 1: Name & Mobile
    if (page1Form) {
      page1Form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name-input').value.trim();
        const countryCode = document.getElementById('signup-country-code').value;
        const phoneNum = document.getElementById('signup-phone-input').value.trim();

        if (!name || !phoneNum) {
          alert('Please enter your Name and Mobile Number.');
          return;
        }

        signupTempData.name = name;
        signupTempData.mobile = `${countryCode} ${phoneNum}`;

        page1Form.classList.add('hidden');
        page2Form.classList.remove('hidden');
        if (stepDot1) stepDot1.classList.remove('active');
        if (stepDot2) stepDot2.classList.add('active');
      });
    }

    // STEP 2 Back Button
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        page2Form.classList.add('hidden');
        page1Form.classList.remove('hidden');
        if (stepDot2) stepDot2.classList.remove('active');
        if (stepDot1) stepDot1.classList.add('active');
      });
    }

    // STEP 2: Continue with Google -> Goes to Step 3 ONLY on Success
    if (googleBtn) {
      googleBtn.addEventListener('click', async () => {
        if (!auth || !googleProvider) {
          alert("Google Auth is initializing. Please try again in a moment.");
          return;
        }

        try {
          googleProvider.setCustomParameters({ prompt: 'select_account' });
          const result = await auth.signInWithPopup(googleProvider);
          const user = result.user;

          if (user && user.email) {
            signupTempData.email = user.email;
            signupTempData.name = signupTempData.name || user.displayName || "Google User";
            signupTempData.avatar = user.photoURL || signupTempData.avatar;
            signupTempData.uid = user.uid;

            console.log("🔥 Firebase Google Sign-In Success:", user.email);

            if (avatarPreview) {
              avatarPreview.src = signupTempData.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
            }

            // Move to Step 3 ONLY on SUCCESS
            page2Form.classList.add('hidden');
            page3Form.classList.remove('hidden');
            if (stepDot2) stepDot2.classList.remove('active');
            if (stepDot3) stepDot3.classList.add('active');
          } else {
            alert("Google Sign-In was not completed. Please sign in with your Google account.");
          }
        } catch (err) {
          console.log("Firebase Google Auth Notice:", err.message);
          alert("Google Auth Notice: " + (err.message || "Google Sign-In is required to proceed to Step 3."));
        }
      });
    }

    // STEP 3 Back Button
    if (step3BackBtn) {
      step3BackBtn.addEventListener('click', () => {
        page3Form.classList.add('hidden');
        page2Form.classList.remove('hidden');
        if (stepDot3) stepDot3.classList.remove('active');
        if (stepDot2) stepDot2.classList.add('active');
      });
    }

    // STEP 3: Profile Photo File Upload
    if (avatarFileInput) {
      avatarFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const dataUrl = await uploadFileToStorage(file);
            signupTempData.avatar = dataUrl;
            if (avatarPreview) avatarPreview.src = dataUrl;
          } catch (err) {
            alert('Failed to process profile image file.');
          }
        }
      });
    }

    // STEP 3 Submit: Complete & Launch
    if (page3Form) {
      page3Form.addEventListener('submit', (e) => {
        e.preventDefault();
        completeUserSignup();
      });
    }

    // Profile Drawer Handlers
    const closeProfileBtn = document.getElementById('close-profile-drawer');
    const profileDrawer = document.getElementById('profile-drawer');

    if (closeProfileBtn && profileDrawer) {
      closeProfileBtn.addEventListener('click', () => {
        profileDrawer.classList.add('hidden');
      });
    }

    const drawerAvatarInput = document.getElementById('profile-avatar-input');
    if (drawerAvatarInput) {
      drawerAvatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const dataUrl = await uploadFileToStorage(file);
            const currentUser = store.getState().currentUser;
            store.updateState({
              currentUser: { ...currentUser, avatar: dataUrl }
            });
            renderProfileData();
            showToastAlert('Profile photo updated successfully!', 'success');
          } catch (err) {
            showToastAlert('Failed to upload profile photo.', 'error');
          }
        }
      });
    }

    const profileForm = document.getElementById('profile-edit-form');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('profile-name-input').value.trim();
        const bio = document.getElementById('profile-bio-input').value.trim();
        const about = document.getElementById('profile-about-input').value.trim();

        const currentUser = store.getState().currentUser;
        const updated = {
          ...currentUser,
          name: name || currentUser.name,
          bio: bio || currentUser.bio,
          about: about || currentUser.about
        };

        store.updateState({ currentUser: updated });
        renderProfileData();
        showToastAlert('Profile details updated successfully!', 'success');
        if (profileDrawer) profileDrawer.classList.add('hidden');
      });
    }

    // Direct Edit Profile Pencil & Profile Card Click
    const openMyProfileDrawer = (e) => {
      if (e) e.stopPropagation();
      renderProfileData();
      document.getElementById('profile-drawer')?.classList.remove('hidden');
    };

    document.getElementById('edit-profile-pencil')?.addEventListener('click', openMyProfileDrawer);
    document.getElementById('settings-profile-header')?.addEventListener('click', openMyProfileDrawer);
    document.getElementById('global-nav-avatar')?.addEventListener('click', openMyProfileDrawer);
    document.getElementById('nav-profile-btn')?.addEventListener('click', openMyProfileDrawer);
    document.getElementById('status-my-avatar')?.addEventListener('click', openMyProfileDrawer);

    // Auto-render profile data on state changes
    store.subscribe(renderProfileData);
    renderProfileData();

    window.addEventListener('focus', () => updateUserPresence(true));
    window.addEventListener('blur', () => updateUserPresence(false));
  }

  function renderProfileData() {
    const { currentUser } = store.getState();
    if (!currentUser) return;

    // Update Settings Page Header
    const settingsAvatar = document.getElementById('settings-user-avatar');
    const settingsName = document.getElementById('settings-user-name');
    const settingsBio = document.getElementById('settings-user-bio');

    if (settingsAvatar) settingsAvatar.src = currentUser.avatar;
    if (settingsName) settingsName.textContent = currentUser.name;
    if (settingsBio) settingsBio.textContent = currentUser.bio || currentUser.about || "Hey there! I am using MD Chat Pro.";

    // Update Profile Drawer Inputs & Big View Elements
    const profileImg = document.getElementById('profile-avatar-img');
    const profileNameTitle = document.getElementById('profile-name-title');
    const profileNameInput = document.getElementById('profile-name-input');
    const profileEmailInput = document.getElementById('profile-email-input');
    const profilePhoneDisplay = document.getElementById('profile-phone-display');
    const profileBioInput = document.getElementById('profile-bio-input');
    const profileAboutInput = document.getElementById('profile-about-input');
    const profileUidDisplay = document.getElementById('profile-uid-display');
    const profileZoomBtn = document.getElementById('profile-zoom-btn');

    if (profileImg) {
      profileImg.src = currentUser.avatar;
      profileImg.onclick = () => openMediaLightbox(currentUser.avatar, 'image', `${currentUser.name}'s Profile Photo (My Big View)`);
    }

    if (profileZoomBtn) {
      profileZoomBtn.onclick = () => openMediaLightbox(currentUser.avatar, 'image', `${currentUser.name}'s Profile Photo (Full Screen HD)`);
    }

    if (profileNameTitle) {
      profileNameTitle.innerHTML = `${escapeHtml(currentUser.name || 'My Profile')} <i class="fas fa-check-circle" style="color: var(--brand-green); font-size: 17px;"></i>`;
    }

    if (profileNameInput) profileNameInput.value = currentUser.name || '';
    if (profileEmailInput) profileEmailInput.value = currentUser.email || 'user@gmail.com';
    if (profilePhoneDisplay) profilePhoneDisplay.textContent = currentUser.mobile || '+91 9876543210';
    if (profileBioInput) profileBioInput.value = currentUser.bio || '';
    if (profileAboutInput) profileAboutInput.value = currentUser.about || '';
    if (profileUidDisplay) profileUidDisplay.textContent = `UID: ${currentUser.uid || 'user_pro_777'}`;

    // Update Global Nav & Status Avatars
    const globalAvatar = document.getElementById('global-nav-avatar');
    if (globalAvatar) globalAvatar.src = currentUser.avatar;

    const statusAvatar = document.getElementById('status-my-avatar');
    if (statusAvatar) statusAvatar.src = currentUser.avatar;
  }

  function completeUserSignup() {
    const signupModal = document.getElementById('signup-modal');
    const currentState = store.getState();
    const existing = currentState.currentUser || {};

    const updatedUser = {
      uid: signupTempData.uid || existing.uid || `user_fb_${Date.now()}`,
      name: signupTempData.name || existing.name || "User",
      mobile: signupTempData.mobile || existing.mobile || "+1 555-0199",
      email: signupTempData.email || "user@gmail.com",
      avatar: signupTempData.avatar || existing.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      bio: existing.bio || "Hey there! I am using MD Chat Pro.",
      about: existing.about || "Available",
      online: true,
      registered: true,
      lastSeen: "Online",
      createdAt: new Date().toISOString()
    };

    store.updateState({ currentUser: updatedUser });
    syncUserDataToFirebase(updatedUser);
    if (updatedUser.uid) {
      loadUserContactsFromFirebase(updatedUser.uid);
      setupFirebaseContactsListener(updatedUser.uid);
      setupFirebaseMessagesListener(updatedUser.uid);
    }

    if (signupModal) signupModal.classList.add('hidden');
    alert(`3-Step Verification Complete!\n\nName: ${updatedUser.name}\nMobile: ${updatedUser.mobile}\nEmail: ${updatedUser.email}\nProfile Photo: Set`);
  }

  function updateUserPresence(isOnline) {
    const currentState = store.getState();
    if (currentState.currentUser) {
      store.updateState({
        currentUser: {
          ...currentState.currentUser,
          online: isOnline,
          lastSeen: isOnline ? "Online" : `Last seen today at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        }
      });
    }
  }

  function renderProfileData() {
    const { currentUser } = store.getState();
    if (!currentUser) return;

    const avatarImg = document.getElementById('profile-avatar-img');
    const nameInput = document.getElementById('profile-name-input');
    const emailInput = document.getElementById('profile-email-input');
    const phoneDisplay = document.getElementById('profile-phone-display');
    const bioInput = document.getElementById('profile-bio-input');
    const aboutInput = document.getElementById('profile-about-input');
    const uidDisplay = document.getElementById('profile-uid-display');

    if (avatarImg) avatarImg.src = currentUser.avatar;
    if (nameInput) nameInput.value = currentUser.name || '';
    if (emailInput) emailInput.value = currentUser.email || '';
    if (phoneDisplay) phoneDisplay.textContent = currentUser.mobile || 'N/A';
    if (bioInput) bioInput.value = currentUser.bio || '';
    if (aboutInput) aboutInput.value = currentUser.about || '';
    if (uidDisplay) uidDisplay.textContent = currentUser.uid;

    const settingsAvatar = document.getElementById('settings-user-avatar');
    const settingsName = document.getElementById('settings-user-name');
    const settingsBio = document.getElementById('settings-user-bio');
    const myStatusAvatar = document.getElementById('status-my-avatar');
    const globalNavAvatar = document.getElementById('global-nav-avatar');

    if (settingsAvatar) settingsAvatar.src = currentUser.avatar;
    if (settingsName) settingsName.textContent = currentUser.name;
    if (settingsBio) settingsBio.textContent = `${currentUser.email} • ${currentUser.bio}`;
    if (myStatusAvatar) myStatusAvatar.src = currentUser.avatar;
    if (globalNavAvatar) globalNavAvatar.src = currentUser.avatar;

    renderMyStatusRing();
  }

  /* ------------------------------------------
     5. CONTACTS SYSTEM
     ------------------------------------------ */
  function initContacts() {
    const addContactBtn = document.getElementById('add-contact-btn');
    const addContactModal = document.getElementById('add-contact-modal');
    const closeContactModal = document.getElementById('close-contact-modal');
    const addContactForm = document.getElementById('add-contact-form');

    if (addContactBtn && addContactModal) {
      addContactBtn.addEventListener('click', () => {
        addContactModal.classList.remove('hidden');
      });
    }
    if (closeContactModal && addContactModal) {
      closeContactModal.addEventListener('click', () => {
        addContactModal.classList.add('hidden');
      });
    }

    if (addContactForm) {
      addContactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-contact-name').value.trim();
        const mobile = document.getElementById('new-contact-mobile').value.trim();
        const bioEl = document.getElementById('new-contact-bio');
        const bio = bioEl ? bioEl.value.trim() : '';
        const photoFile = document.getElementById('new-contact-photo').files[0];

        if (!name || !mobile) {
          alert('Please fill in Name and Mobile Number.');
          return;
        }

        let avatarUrl = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80";
        if (photoFile) {
          try {
            avatarUrl = await uploadFileToStorage(photoFile);
          } catch (err) {}
        }

        // Query Firebase Firestore for registered user by mobile number
        let targetUser = await findUserByMobileInFirebase(mobile);
        const cleanMobile = mobile.replace(/\D/g, '');

        // Check local state or registered demo fallback users if offline/demo
        if (!targetUser) {
          const currentState = store.getState();
          const allKnownUsers = [
            currentState.currentUser,
            ...(currentState.contacts || []),
            { uid: "demo_1", name: "Sarah Connor", mobile: "+1 555-0199", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80", bio: "Available" },
            { uid: "demo_2", name: "Alex Rivers", mobile: "+1 555-0144", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", bio: "At the gym 🏋️‍♂️" },
            { uid: "demo_3", name: "Emily Watson", mobile: "+1 555-0188", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", bio: "Coding modern apps 🚀" },
            { uid: "demo_4", name: "David Chen", mobile: "+1 555-0177", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80", bio: "In a meeting 👨‍💻" }
          ];
          targetUser = allKnownUsers.find(u => u && u.mobile && cleanMobile.length >= 7 && u.mobile.replace(/\D/g, '').includes(cleanMobile));
        }

        // STRICT FIREBASE USER VERIFICATION CHECK
        if (!targetUser) {
          if (typeof window.showToastAlert === 'function') {
            window.showToastAlert(`Verification Failed: Mobile number (${mobile}) is not registered! Only verified registered users can be added as contacts.`, 'error');
          } else {
            alert(`Verification Failed: Mobile number (${mobile}) is not registered! Only verified registered users can be added as contacts.`);
          }
          return;
        }

        const contactUid = targetUser.uid || `user_${Date.now()}`;
        const finalName = name || targetUser.name;
        const finalAvatar = targetUser.avatar || avatarUrl;
        const finalBio = bio || targetUser.bio || "Hey there! I am using MD Chat Pro.";

        const newContact = {
          uid: contactUid,
          name: finalName,
          mobile: targetUser.mobile || mobile,
          avatar: finalAvatar,
          bio: finalBio,
          online: Boolean(targetUser.online !== undefined ? targetUser.online : true),
          lastSeen: targetUser.lastSeen || "Online",
          favorite: false,
          blocked: false
        };

        const currentState = store.getState();
        const existingIndex = currentState.contacts.findIndex(c => 
          c.uid === newContact.uid || 
          (c.mobile && cleanMobile.length >= 7 && c.mobile.replace(/\D/g, '').includes(cleanMobile))
        );

        let updatedContacts;
        if (existingIndex >= 0) {
          updatedContacts = [...currentState.contacts];
          updatedContacts[existingIndex] = { ...updatedContacts[existingIndex], ...newContact };
        } else {
          updatedContacts = [...currentState.contacts, newContact];
        }

        store.updateState({ contacts: updatedContacts });

        // Sync contact to Firebase Firestore with private user access policy
        if (currentState.currentUser && currentState.currentUser.uid) {
          syncContactToFirebase(currentState.currentUser.uid, newContact);
        }

        addContactForm.reset();
        addContactModal.classList.add('hidden');

        if (typeof window.showToastAlert === 'function') {
          window.showToastAlert(`Verified: Contact "${finalName}" (${mobile}) added successfully!`, 'success');
        } else {
          alert(`Verified: Contact "${finalName}" (${mobile}) added successfully!`);
        }
      });
    }
  }

  function renderContactsList(filter = 'all', searchQuery = '') {
    const container = document.getElementById('contacts-list-container');
    if (!container) return;

    const { contacts } = store.getState();
    let filtered = contacts.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.mobile.includes(searchQuery);
      if (!matchesSearch) return false;
      if (filter === 'favorites') return c.favorite;
      if (filter === 'blocked') return c.blocked;
      return !c.blocked;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="padding: 32px; text-align: center; color: var(--text-secondary);">
          <i class="fas fa-user-plus" style="font-size: 32px; margin-bottom: 12px; opacity: 0.5;"></i>
          <p>No contacts added yet.</p>
          <p style="font-size: 12px; margin-top: 6px; color: var(--brand-green);">Click the + icon above to add a contact!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map((c) => `
      <div class="list-item" data-contact-id="${c.uid}">
        <div class="item-avatar">
          <img src="${c.avatar}" alt="${c.name}">
          ${c.online ? '<span class="online-dot"></span>' : ''}
        </div>
        <div class="item-info">
          <div class="item-top-row">
            <span class="item-name" style="font-weight: 600; font-size: 15px; color: var(--text-primary);">${c.name}</span>
            <span class="item-time" style="color: ${c.favorite ? '#ffb703' : 'inherit'}">
              ${c.favorite ? '<i class="fas fa-star"></i>' : ''}
            </span>
          </div>
          <div class="item-bottom-row">
            <span class="item-preview" style="color: var(--brand-green); font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-mobile-alt" style="font-size: 12px; color: var(--brand-green);"></i>
              ${c.mobile}
            </span>
          </div>
        </div>
        <div class="item-actions" style="display: flex; align-items: center; gap: 8px;">
          <button type="button" class="icon-btn call-contact-btn" data-contact-id="${c.uid}" title="Call ${c.name}" style="width: 36px; height: 36px; font-size: 15px; color: #ffffff; background: #008069; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(0, 128, 105, 0.35);">
            <i class="fas fa-phone-alt"></i>
          </button>
          <button type="button" class="icon-btn delete-contact-btn" data-contact-id="${c.uid}" title="Delete Contact" style="width: 32px; height: 32px; font-size: 13px; color: #ef4444; background: rgba(239, 68, 68, 0.1); border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.list-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.delete-contact-btn') || e.target.closest('.call-contact-btn')) return;
        if (e.target.closest('.item-avatar')) {
          e.stopPropagation();
          const contactId = item.getAttribute('data-contact-id');
          if (contactId) openContactInfoModal(contactId);
          return;
        }
        const id = e.currentTarget.getAttribute('data-contact-id');
        container.querySelectorAll('.list-item').forEach((i) => i.classList.remove('active'));
        e.currentTarget.classList.add('active');
        setActiveChat(id, 'private');
      });
    });

    container.querySelectorAll('.call-contact-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const contactId = e.currentTarget.getAttribute('data-contact-id');
        const { contacts } = store.getState();
        const contact = contacts.find((c) => c.uid === contactId);
        if (contact) {
          activeChatId = contactId;
          setActiveChat(contactId, 'private');
          if (typeof window.showToastAlert === 'function') {
            window.showToastAlert(`Calling ${contact.name} (${contact.mobile})...`, 'info');
          }
          if (typeof startCall === 'function') {
            startCall(false);
          } else if (typeof window.startCall === 'function') {
            window.startCall(false);
          }
        }
      });
    });

    container.querySelectorAll('.delete-contact-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const contactId = e.currentTarget.getAttribute('data-contact-id');
        deleteContact(contactId);
      });
    });
  }

  function deleteContact(contactUid) {
    const currentState = store.getState();
    const contactToDelete = currentState.contacts.find(c => c.uid === contactUid);
    if (!contactToDelete) return;

    if (confirm(`Are you sure you want to delete contact "${contactToDelete.name}"?`)) {
      const updatedContacts = currentState.contacts.filter(c => c.uid !== contactUid);
      const updatedMessages = { ...currentState.messages };
      delete updatedMessages[contactUid];

      store.updateState({ contacts: updatedContacts, messages: updatedMessages });

      if (currentState.currentUser && currentState.currentUser.uid) {
        deleteContactFromFirebase(currentState.currentUser.uid, contactUid);
      }

      if (activeChatId === contactUid) {
        activeChatId = null;
        document.getElementById('active-chat-content')?.classList.add('hidden');
        document.getElementById('empty-chat-state')?.classList.remove('hidden');
      }

      if (typeof window.showToastAlert === 'function') {
        window.showToastAlert(`Contact "${contactToDelete.name}" deleted.`, 'warning');
      } else {
        alert(`Contact "${contactToDelete.name}" deleted.`);
      }
    }
  }

  window.deleteContact = deleteContact;

  /* ------------------------------------------
     6. GROUPS SYSTEM
     ------------------------------------------ */
  function initGroups() {
    const createGroupBtn = document.getElementById('create-group-btn');
    const createGroupModal = document.getElementById('create-group-modal');
    const closeGroupModal = document.getElementById('close-group-modal');
    const groupForm = document.getElementById('create-group-form');

    if (createGroupBtn && createGroupModal) {
      createGroupBtn.addEventListener('click', () => {
        populateGroupContactPicker();
        createGroupModal.classList.remove('hidden');
      });
    }
    if (closeGroupModal && createGroupModal) {
      closeGroupModal.addEventListener('click', () => {
        createGroupModal.classList.add('hidden');
      });
    }

    if (groupForm) {
      groupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-group-name').value.trim();
        const description = document.getElementById('new-group-desc').value.trim();
        const photoFile = document.getElementById('new-group-photo').files[0];
        
        const selectedMembers = Array.from(
          document.querySelectorAll('.group-member-checkbox:checked')
        ).map((cb) => cb.value);

        if (!name) {
          alert('Please enter a Group Name.');
          return;
        }

        const { currentUser } = store.getState();
        selectedMembers.push(currentUser.uid);

        let groupAvatar = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80";
        if (photoFile) {
          try {
            groupAvatar = await uploadFileToStorage(photoFile);
          } catch (err) {}
        }

        const newGroup = {
          id: `group_${Date.now()}`,
          name,
          avatar: groupAvatar,
          description: description || "Welcome to the group!",
          createdBy: currentUser.uid,
          createdAt: new Date().toISOString(),
          members: Array.from(new Set(selectedMembers)),
          admins: [currentUser.uid]
        };

        const currentState = store.getState();
        store.updateState({
          groups: [...currentState.groups, newGroup]
        });

        // Sync group to Firebase Firestore with member-restricted data access policy
        syncGroupToFirebase(newGroup);

        groupForm.reset();
        createGroupModal.classList.add('hidden');
        alert(`Group "${name}" created successfully!`);
      });
    }
  }

  function populateGroupContactPicker() {
    const container = document.getElementById('group-members-picker');
    if (!container) return;

    const { contacts } = store.getState();
    if (contacts.length === 0) {
      container.innerHTML = `<p style="font-size: 12px; color: var(--text-secondary);">No contacts available yet. Add contacts first!</p>`;
      return;
    }

    container.innerHTML = contacts.map((c) => `
      <label style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--bg-panel); border-radius: 8px; cursor: pointer;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${c.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
          <span>${c.name}</span>
        </div>
        <input type="checkbox" class="group-member-checkbox" value="${c.uid}">
      </label>
    `).join('');
  }

  function renderGroupsList(searchQuery = '') {
    const container = document.getElementById('groups-list-container');
    if (!container) return;

    const { groups } = store.getState();
    const filtered = groups.filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="padding: 32px; text-align: center; color: var(--text-secondary);">
          <i class="fas fa-users" style="font-size: 32px; margin-bottom: 12px; opacity: 0.5;"></i>
          <p>No groups created yet.</p>
          <p style="font-size: 12px; margin-top: 6px; color: var(--brand-green);">Click the Group + icon above to create one!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map((g) => `
      <div class="list-item" data-group-id="${g.id}">
        <div class="item-avatar">
          <img src="${g.avatar}" alt="${g.name}">
        </div>
        <div class="item-info">
          <div class="item-top-row">
            <span class="item-name">${g.name}</span>
            <span class="item-time">${g.members.length} members</span>
          </div>
          <div class="item-bottom-row">
            <span class="item-preview">${g.description}</span>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.list-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-group-id');
        container.querySelectorAll('.list-item').forEach((i) => i.classList.remove('active'));
        e.currentTarget.classList.add('active');
        setActiveChat(id, 'group');
      });
    });
  }

  /* ------------------------------------------
     7. AUTHENTIC WHATSAPP STATUS SYSTEM & SEGMENTED RINGS
     ------------------------------------------ */
  let activeStoryIndex = 0;
  let storyTimer = null;
  let isStoryPaused = false;
  let currentViewingStoryList = [];

  function initStatusSystem() {
    const uploadStatusBtn = document.getElementById('upload-status-btn');
    const myStatusCard = document.getElementById('my-status-card');
    const statusModal = document.getElementById('upload-status-modal');
    const closeStatusModal = document.getElementById('close-status-modal');
    const statusForm = document.getElementById('upload-status-form');

    const tabMediaBtn = document.getElementById('status-tab-media');
    const tabTextBtn = document.getElementById('status-tab-text');
    const mediaView = document.getElementById('status-media-creator-view');
    const textView = document.getElementById('status-text-creator-view');
    const statusTypeInput = document.getElementById('status-type-select');

    const filePickerZone = document.getElementById('status-file-picker-zone');
    const filePrompt = document.getElementById('status-file-prompt');
    const fileInput = document.getElementById('status-file-input');
    const previewContainer = document.getElementById('status-file-preview-container');
    const imgPreview = document.getElementById('status-image-preview-el');
    const videoPreview = document.getElementById('status-video-preview-el');
    const changeFileBtn = document.getElementById('change-status-file-btn');

    const textCanvas = document.getElementById('status-text-canvas');
    const textContentInput = document.getElementById('status-text-content-input');
    const bgColorInput = document.getElementById('status-bg-color-select');
    const colorSwatches = document.querySelectorAll('.color-swatch');

    const myStatusViewBtn = document.getElementById('my-status-view-btn');
    const myStatusAddBtn = document.getElementById('my-status-add-btn');
    const myStatusDeleteBtn = document.getElementById('my-status-delete-btn');

    if (uploadStatusBtn && statusModal) {
      uploadStatusBtn.addEventListener('click', () => statusModal.classList.remove('hidden'));
    }

    // My Status Card Click -> Opens viewer if status exists, otherwise opens uploader
    if (myStatusCard) {
      myStatusCard.addEventListener('click', (e) => {
        if (e.target.closest('.my-status-actions')) return;

        const { statusList, currentUser } = store.getState();
        const now = Date.now();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        const myStories = statusList.filter((s) => {
          const elapsed = now - new Date(s.timestamp).getTime();
          return s.userId === currentUser.uid && elapsed < TWENTY_FOUR_HOURS;
        });

        if (myStories.length > 0) {
          openStatusViewer(currentUser.uid);
        } else {
          if (statusModal) statusModal.classList.remove('hidden');
        }
      });
    }

    // Action Icon 1: View My Status
    if (myStatusViewBtn) {
      myStatusViewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const { statusList, currentUser } = store.getState();
        const now = Date.now();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        const myStories = statusList.filter((s) => {
          const elapsed = now - new Date(s.timestamp).getTime();
          return s.userId === currentUser.uid && elapsed < TWENTY_FOUR_HOURS;
        });

        if (myStories.length > 0) {
          openStatusViewer(currentUser.uid);
        } else {
          alert('You have no active status updates right now. Tap the + or edit button to add one!');
        }
      });
    }

    // Action Icon 2: Add / Edit Status
    if (myStatusAddBtn) {
      myStatusAddBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (statusModal) statusModal.classList.remove('hidden');
      });
    }

    // Action Icon 3: Delete My Status
    if (myStatusDeleteBtn) {
      myStatusDeleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const { statusList, currentUser } = store.getState();
        const myStories = statusList.filter(s => s.userId === currentUser.uid);

        if (myStories.length === 0) {
          alert('No active status updates to delete.');
          return;
        }

        if (confirm('Are you sure you want to delete your active status update(s)?')) {
          const updatedStatusList = statusList.filter(s => s.userId !== currentUser.uid);
          store.updateState({ statusList: updatedStatusList });
          alert('Your status update has been deleted!');
        }
      });
    }

    if (closeStatusModal && statusModal) {
      closeStatusModal.addEventListener('click', () => statusModal.classList.add('hidden'));
    }

    // Tab Switcher
    if (tabMediaBtn && tabTextBtn) {
      tabMediaBtn.addEventListener('click', () => {
        tabMediaBtn.classList.add('active');
        tabTextBtn.classList.remove('active');
        mediaView.classList.remove('hidden');
        textView.classList.add('hidden');
        if (statusTypeInput) statusTypeInput.value = 'image';
      });

      tabTextBtn.addEventListener('click', () => {
        tabTextBtn.classList.add('active');
        tabMediaBtn.classList.remove('active');
        textView.classList.remove('hidden');
        mediaView.classList.add('hidden');
        if (statusTypeInput) statusTypeInput.value = 'text';
      });
    }

    // Media File Picker & Preview
    if (filePrompt && fileInput) {
      filePrompt.addEventListener('click', () => fileInput.click());
    }
    if (changeFileBtn && fileInput) {
      changeFileBtn.addEventListener('click', () => fileInput.click());
    }

    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const dataUrl = await uploadFileToStorage(file);
          if (filePrompt) filePrompt.classList.add('hidden');
          if (previewContainer) previewContainer.classList.remove('hidden');

          if (file.type.startsWith('video/')) {
            if (statusTypeInput) statusTypeInput.value = 'video';
            if (imgPreview) imgPreview.classList.add('hidden');
            if (videoPreview) {
              videoPreview.src = dataUrl;
              videoPreview.classList.remove('hidden');
            }
          } else {
            if (statusTypeInput) statusTypeInput.value = 'image';
            if (videoPreview) videoPreview.classList.add('hidden');
            if (imgPreview) {
              imgPreview.src = dataUrl;
              imgPreview.classList.remove('hidden');
            }
          }
        } catch (err) {
          alert('Failed to preview media file.');
        }
      });
    }

    // Color Palette Swatches for Text Story
    colorSwatches.forEach((swatch) => {
      swatch.addEventListener('click', (e) => {
        colorSwatches.forEach((s) => s.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const color = e.currentTarget.getAttribute('data-color');
        if (textCanvas) textCanvas.style.backgroundColor = color;
        if (bgColorInput) bgColorInput.value = color;
      });
    });

    // Form Submit
    if (statusForm) {
      statusForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = statusTypeInput ? statusTypeInput.value : 'image';
        const caption = document.getElementById('status-caption-input').value.trim();
        const textContent = textContentInput ? textContentInput.value.trim() : '';
        const mediaFile = fileInput ? fileInput.files[0] : null;
        const bgColor = bgColorInput ? bgColorInput.value : '#005c4b';

        const { currentUser } = store.getState();
        let mediaUrl = "";

        if (type !== 'text') {
          if (!mediaFile && (!imgPreview || imgPreview.classList.contains('hidden'))) {
            alert('Please select a photo or video to share.');
            return;
          }
          if (mediaFile) {
            try {
              mediaUrl = await uploadFileToStorage(mediaFile);
            } catch (err) {
              alert('Failed to process media file.');
              return;
            }
          } else if (imgPreview && imgPreview.src) {
            mediaUrl = imgPreview.src;
          }
        } else {
          if (!textContent) {
            alert('Please type a status message.');
            return;
          }
        }

        const newStatus = {
          id: `status_${Date.now()}`,
          userId: currentUser.uid,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          timestamp: new Date().toISOString(),
          type,
          url: mediaUrl,
          caption: type === 'text' ? textContent : (caption || ''),
          bgColor: bgColor || '#005c4b',
          views: [currentUser.uid],
          likes: []
        };

        const currentState = store.getState();
        store.updateState({
          statusList: [newStatus, ...currentState.statusList]
        });
        syncStatusToFirebase(newStatus);

        // Reset form & view
        statusForm.reset();
        if (filePrompt) filePrompt.classList.remove('hidden');
        if (previewContainer) previewContainer.classList.add('hidden');
        if (imgPreview) imgPreview.src = '';
        if (videoPreview) videoPreview.src = '';
        if (textCanvas) textCanvas.style.backgroundColor = '#005c4b';

        statusModal.classList.add('hidden');
        renderMyStatusRing();
        renderStatusList();
        alert('Status story published successfully! Visible for all contacts for 24 hours.');
      });
    }

    const closeViewerBtn = document.getElementById('close-status-viewer');
    const viewerOverlay = document.getElementById('status-viewer-overlay');
    if (closeViewerBtn && viewerOverlay) {
      closeViewerBtn.addEventListener('click', () => {
        closeStatusViewer();
      });
    }

    const pauseBtn = document.getElementById('pause-status-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        isStoryPaused = !isStoryPaused;
        pauseBtn.innerHTML = isStoryPaused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
      });
    }

    const sendReplyBtn = document.getElementById('send-status-reply-btn');
    const replyInput = document.getElementById('status-reply-input');

    function sendReply() {
      const text = replyInput ? replyInput.value.trim() : '';
      if (!text || currentViewingStoryList.length === 0) return;
      const currentStory = currentViewingStoryList[activeStoryIndex];
      if (!currentStory) return;

      const replyMsg = `💬 Replied to status: "${currentStory.caption || 'Status story'}"\n\n${text}`;
      
      const { currentUser, messages } = store.getState();
      const targetUserId = currentStory.userId;

      const newMsg = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        senderId: currentUser.uid,
        senderName: currentUser.name,
        timestamp: new Date().toISOString(),
        status: 'seen',
        type: 'text',
        text: replyMsg
      };

      const currentChatMsgs = messages[targetUserId] || [];
      const updatedMessages = {
        ...messages,
        [targetUserId]: [...currentChatMsgs, newMsg]
      };

      store.updateState({ messages: updatedMessages });
      if (replyInput) replyInput.value = '';
      closeStatusViewer();
      setActiveChat(targetUserId, 'private');
      switchTab('chats');
    }

    if (sendReplyBtn) sendReplyBtn.addEventListener('click', sendReply);
    if (replyInput) {
      replyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendReply();
      });
    }

    const statusListContainer = document.getElementById('status-list-container');
    if (statusListContainer) {
      statusListContainer.addEventListener('click', (e) => {
        const item = e.target.closest('[data-status-user-id]');
        if (item) {
          const userId = item.getAttribute('data-status-user-id');
          if (userId) openStatusViewer(userId);
        }
      });
    }
  }

  function renderStatusRingSvg(count, viewedCount) {
    if (count === 0) return '';
    const r = 23;
    const circumference = 2 * Math.PI * r;
    if (count === 1) {
      const stroke = (viewedCount >= 1) ? '#8696a0' : '#00a884';
      return `<svg class="status-ring-svg" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r="${r}" fill="none" stroke="${stroke}" stroke-width="2.5"/>
      </svg>`;
    }

    const gap = 6;
    const dashLength = (circumference - (count * gap)) / count;
    let paths = '';

    for (let i = 0; i < count; i++) {
      const stroke = (i < viewedCount) ? '#8696a0' : '#00a884';
      const offset = i * (dashLength + gap);
      paths += `<circle cx="26" cy="26" r="${r}" fill="none" stroke="${stroke}" stroke-width="2.5" 
        stroke-dasharray="${dashLength} ${circumference - dashLength}" 
        stroke-dashoffset="${-offset}"/>`;
    }

    return `<svg class="status-ring-svg" viewBox="0 0 52 52">${paths}</svg>`;
  }

  function renderMyStatusRing() {
    const ringBox = document.getElementById('my-status-ring-box');
    const myAvatar = document.getElementById('status-my-avatar');
    const mySubtext = document.getElementById('my-status-subtext');
    if (!ringBox) return;

    const { statusList, currentUser } = store.getState();
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    const myStories = statusList.filter((s) => {
      const elapsed = now - new Date(s.timestamp).getTime();
      return s.userId === currentUser.uid && elapsed < TWENTY_FOUR_HOURS;
    });

    if (myAvatar) myAvatar.src = currentUser.avatar;

    if (myStories.length > 0) {
      const count = myStories.length;
      const viewedCount = myStories.filter(s => s.views.length > 1).length;
      ringBox.innerHTML = `
        ${renderStatusRingSvg(count, viewedCount)}
        <div class="status-avatar-inner">
          <img src="${currentUser.avatar}" alt="My Avatar">
        </div>
      `;
      if (mySubtext) mySubtext.textContent = formatTimeAgo(myStories[0].timestamp);
    } else {
      ringBox.innerHTML = `
        <div class="status-avatar-inner">
          <img src="${currentUser.avatar}" alt="My Avatar">
        </div>
        <span class="my-status-add-badge"><i class="fas fa-plus"></i></span>
      `;
      if (mySubtext) mySubtext.textContent = 'Tap to add status update';
    }
  }

  function renderStatusList() {
    const container = document.getElementById('status-list-container');
    if (!container) return;

    const { statusList, currentUser } = store.getState();
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    const activeStatuses = statusList.filter((s) => {
      const elapsed = now - new Date(s.timestamp).getTime();
      return s.userId !== currentUser.uid && elapsed < TWENTY_FOUR_HOURS;
    });

    if (activeStatuses.length === 0) {
      container.innerHTML = `
        <div style="padding: 24px 16px; text-align: center; color: var(--text-secondary);">
          <p>No recent status updates from your contacts.</p>
        </div>
      `;
      return;
    }

    const grouped = {};
    activeStatuses.forEach((s) => {
      if (!grouped[s.userId]) grouped[s.userId] = [];
      grouped[s.userId].push(s);
    });

    container.innerHTML = Object.keys(grouped).map((userId) => {
      const userStories = grouped[userId];
      const latest = userStories[0];
      const timeAgo = formatTimeAgo(latest.timestamp);
      const count = userStories.length;
      const viewedCount = userStories.filter(s => s.views.includes(currentUser.uid)).length;

      return `
        <div class="list-item" data-status-user-id="${userId}">
          <div class="status-ring-container">
            ${renderStatusRingSvg(count, viewedCount)}
            <div class="status-avatar-inner">
              <img src="${latest.userAvatar}" alt="${latest.userName}">
            </div>
          </div>
          <div class="item-info">
            <div class="item-top-row">
              <span class="item-name">${latest.userName}</span>
              <span class="item-time">${timeAgo}</span>
            </div>
            <div class="item-bottom-row">
              <span class="item-preview">
                <i class="fas ${latest.type === 'video' ? 'fa-video' : latest.type === 'text' ? 'fa-align-left' : 'fa-image'}"></i>
                ${latest.caption || `${userStories.length} update(s)`}
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function openStatusViewer(userId) {
    const { statusList } = store.getState();
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    currentViewingStoryList = statusList.filter((s) => {
      const elapsed = now - new Date(s.timestamp).getTime();
      return s.userId === userId && elapsed < TWENTY_FOUR_HOURS;
    });

    if (currentViewingStoryList.length === 0) return;

    activeStoryIndex = 0;
    isStoryPaused = false;
    const viewerOverlay = document.getElementById('status-viewer-overlay');
    if (viewerOverlay) viewerOverlay.classList.remove('hidden');

    renderStoryProgressBars();
    showCurrentStory();
  }

  function renderStoryProgressBars() {
    const container = document.getElementById('status-progress-bars-container');
    if (!container) return;

    container.innerHTML = currentViewingStoryList.map((_, i) => `
      <div class="progress-bar-track">
        <div class="progress-bar-fill" id="status-bar-fill-${i}"></div>
      </div>
    `).join('');
  }

  function showCurrentStory() {
    if (storyTimer) clearInterval(storyTimer);

    const story = currentViewingStoryList[activeStoryIndex];
    if (!story) {
      closeStatusViewer();
      return;
    }

    const { currentUser } = store.getState();
    if (currentUser && !story.views.includes(currentUser.uid)) {
      story.views.push(currentUser.uid);
      store.saveState();
    }

    currentViewingStoryList.forEach((_, i) => {
      const bar = document.getElementById(`status-bar-fill-${i}`);
      if (bar) {
        if (i < activeStoryIndex) bar.style.width = '100%';
        else if (i > activeStoryIndex) bar.style.width = '0%';
      }
    });

    document.getElementById('status-viewer-user-avatar').src = story.userAvatar;
    document.getElementById('status-viewer-user-name').textContent = story.userName;
    document.getElementById('status-viewer-time').textContent = formatTimeAgo(story.timestamp);
    document.getElementById('status-view-count').textContent = story.views.length;

    const contentBox = document.getElementById('status-media-box');
    if (story.type === 'image') {
      contentBox.innerHTML = `<img src="${story.url}" class="status-media-content" alt="Status">`;
    } else if (story.type === 'video') {
      contentBox.innerHTML = `<video src="${story.url}" class="status-media-content" autoplay playsinline></video>`;
    } else if (story.type === 'text') {
      contentBox.innerHTML = `
        <div class="status-text-card" style="background-color: ${story.bgColor || '#005c4b'};">
          <span>${story.caption || ''}</span>
        </div>
      `;
    }

    const captionEl = document.getElementById('status-caption-display');
    if (captionEl) {
      if (story.type !== 'text' && story.caption) {
        captionEl.textContent = story.caption;
        captionEl.style.display = 'block';
      } else {
        captionEl.style.display = 'none';
      }
    }

    const currentBar = document.getElementById(`status-bar-fill-${activeStoryIndex}`);
    let progress = 0;
    if (currentBar) currentBar.style.width = '0%';

    storyTimer = setInterval(() => {
      if (isStoryPaused) return;
      progress += 2;
      if (currentBar) currentBar.style.width = `${progress}%`;
      if (progress >= 100) {
        clearInterval(storyTimer);
        activeStoryIndex++;
        if (activeStoryIndex < currentViewingStoryList.length) {
          showCurrentStory();
        } else {
          closeStatusViewer();
        }
      }
    }, 100);
  }

  function closeStatusViewer() {
    if (storyTimer) clearInterval(storyTimer);
    const viewerOverlay = document.getElementById('status-viewer-overlay');
    if (viewerOverlay) viewerOverlay.classList.add('hidden');
  }

  function formatTimeAgo(isoString) {
    const date = new Date(isoString);
    const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  }

  /* ------------------------------------------
     8. REAL WHATSAPP SETTINGS SYSTEM
     ------------------------------------------ */
  function initSettings() {
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
    document.getElementById('help-contact-support-btn')?.addEventListener('click', () => {
      showToastAlert('Support ticket submitted successfully! Agent assigned.', 'success');
    });

    // GLOBAL KEYBOARD SHORTCUTS CONTROLLER
    document.addEventListener('keydown', (e) => {
      // Ctrl + N: Open Add Contact
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        document.getElementById('add-contact-btn')?.click();
        showToastAlert('Shortcut: Add New Contact opened', 'info');
      }
      // Ctrl + /: Focus Search Messages
      else if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('sidebar-search-input');
        if (searchInput) {
          searchInput.focus();
          showToastAlert('Shortcut: Search activated', 'info');
        }
      }
      // Ctrl + S: Open Settings Tab
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        document.getElementById('nav-profile-btn')?.click();
        showToastAlert('Shortcut: Settings opened', 'info');
      }
      // Escape: Close Modals / Menus / Active Chat View
      else if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal-overlay:not(.hidden)');
        if (modals.length > 0) {
          modals.forEach(m => m.classList.add('hidden'));
        } else {
          document.getElementById('sidebar-dropdown-menu')?.classList.add('hidden');
          document.getElementById('emoji-popover')?.classList.add('hidden');
          document.getElementById('attachment-menu')?.classList.add('hidden');
        }
      }
    });

    document.getElementById('settings-profile-header')?.addEventListener('click', () => {
      renderProfileData();
      document.getElementById('profile-drawer')?.classList.remove('hidden');
    });

    if (themeToggle) {
      themeToggle.checked = state.theme !== 'dark';
      themeToggle.addEventListener('change', (e) => {
        const newTheme = e.target.checked ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        store.updateState({ theme: newTheme });
        showToastAlert(`Theme mode changed to ${newTheme.toUpperCase()}`, 'info');
      });
    }

    // All Text & Icon Accent Color Swatches Controller
    const accentSwatches = document.querySelectorAll('.color-accent-btn');
    accentSwatches.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const color = e.currentTarget.getAttribute('data-color');
        accentSwatches.forEach(b => b.style.border = '2px solid transparent');
        e.currentTarget.style.border = '2.5px solid #ffffff';

        let brandGreen = '#008069';
        let brandHover = '#006e5a';
        let brandAccent = '#00a884';

        if (color === 'blue') {
          brandGreen = '#0284c7';
          brandHover = '#0369a1';
          brandAccent = '#38bdf8';
        } else if (color === 'crimson') {
          brandGreen = '#dc2626';
          brandHover = '#b91c1c';
          brandAccent = '#f87171';
        } else if (color === 'purple') {
          brandGreen = '#7c3aed';
          brandHover = '#6d28d9';
          brandAccent = '#a78bfa';
        } else if (color === 'amber') {
          brandGreen = '#d97706';
          brandHover = '#b45309';
          brandAccent = '#fbbf24';
        }

        document.documentElement.style.setProperty('--brand-green', brandGreen);
        document.documentElement.style.setProperty('--brand-green-hover', brandHover);
        document.documentElement.style.setProperty('--brand-accent', brandAccent);
        showToastAlert(`Text & Icon theme color updated to ${color.toUpperCase()}!`, 'success');
      });
    });

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



  /* ------------------------------------------
     10. CHAT ENGINE & USER MESSAGING
     ------------------------------------------ */
  let activeChatId = null;
  let activeChatType = 'private';
  let mediaRecorder = null;
  let audioChunks = [];
  let voiceTimerInterval = null;
  let voiceSeconds = 0;

  function initChatEngine() {
    const messageInput = document.getElementById('chat-message-input');
    const sendBtn = document.getElementById('send-message-btn');
    const emojiBtn = document.getElementById('emoji-btn');
    const attachmentBtn = document.getElementById('attach-btn');
    const voiceRecordBtn = document.getElementById('voice-record-btn');
    const cancelVoiceBtn = document.getElementById('cancel-voice-btn');
    const sendVoiceBtn = document.getElementById('send-voice-btn');

    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        sendCurrentMessage();
      });
    }

    if (messageInput) {
      messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendCurrentMessage();
        } else {
          triggerTypingIndicator();
        }
      });
    }

    if (emojiBtn) {
      emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const popover = document.getElementById('emoji-popover');
        if (popover) popover.classList.toggle('hidden');
      });
    }
    document.querySelectorAll('.emoji-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        if (messageInput) {
          messageInput.value += e.target.textContent;
          messageInput.focus();
        }
      });
    });

    if (attachmentBtn) {
      attachmentBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('attachment-menu');
        if (menu) menu.classList.toggle('hidden');
      });
    }

    document.getElementById('attach-image-btn')?.addEventListener('click', () => triggerFileInput('image/*'));
    document.getElementById('attach-video-btn')?.addEventListener('click', () => triggerFileInput('video/*'));
    document.getElementById('attach-audio-btn')?.addEventListener('click', () => triggerFileInput('audio/*'));
    document.getElementById('attach-doc-btn')?.addEventListener('click', () => triggerFileInput('.pdf,.doc,.docx,.txt'));

    const hiddenFileInput = document.getElementById('hidden-chat-file-input');
    if (hiddenFileInput) {
      hiddenFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file && activeChatId) {
          try {
            const url = await uploadFileToStorage(file);
            let type = 'document';
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('video/')) type = 'video';
            else if (file.type.startsWith('audio/')) type = 'audio';

            sendMessage({
              type,
              url,
              text: file.name,
              fileName: file.name
            });
          } catch (err) {
            alert('Failed to send file.');
          }
        }
      });
    }

    if (voiceRecordBtn) {
      voiceRecordBtn.addEventListener('click', startVoiceRecording);
    }
    if (cancelVoiceBtn) {
      cancelVoiceBtn.addEventListener('click', cancelVoiceRecording);
    }
    if (sendVoiceBtn) {
      sendVoiceBtn.addEventListener('click', stopAndSendVoiceRecording);
    }

    const headerCallBtn = document.getElementById('header-call-btn');
    const headerVideoBtn = document.getElementById('header-video-btn');
    if (headerCallBtn) {
      headerCallBtn.addEventListener('click', () => startCall(false));
    }
    if (headerVideoBtn) {
      headerVideoBtn.addEventListener('click', () => startCall(true));
    }

    const headerDetailsEl = document.getElementById('chat-header-details');
    if (headerDetailsEl) {
      headerDetailsEl.addEventListener('click', () => {
        if (activeChatId) {
          openContactInfoModal(activeChatId);
        }
      });
    }

    const headerDeleteBtn = document.getElementById('header-delete-btn');
    if (headerDeleteBtn) {
      headerDeleteBtn.addEventListener('click', () => {
        if (!activeChatId) {
          if (typeof window.showToastAlert === 'function') {
            window.showToastAlert('Please select a contact or conversation to delete.', 'warning');
          }
          return;
        }
        deleteContact(activeChatId);
      });
    }

    const hangupBtn = document.getElementById('call-hangup-btn');
    if (hangupBtn) {
      hangupBtn.addEventListener('click', endCall);
    }

    const muteBtn = document.getElementById('call-toggle-mute');
    if (muteBtn) {
      muteBtn.addEventListener('click', (e) => {
        e.currentTarget.classList.toggle('active');
        const isMuted = e.currentTarget.classList.contains('active');
        if (typeof window.showToastAlert === 'function') {
          window.showToastAlert(isMuted ? 'Microphone muted' : 'Microphone unmuted', 'info');
        }
      });
    }

    const cameraBtn = document.getElementById('call-toggle-camera');
    if (cameraBtn) {
      cameraBtn.addEventListener('click', (e) => {
        e.currentTarget.classList.toggle('active');
        const isDisabled = e.currentTarget.classList.contains('active');
        if (typeof window.showToastAlert === 'function') {
          window.showToastAlert(isDisabled ? 'Camera turned off' : 'Camera turned on', 'info');
        }
      });
    }

    document.addEventListener('click', () => {
      document.getElementById('emoji-popover')?.classList.add('hidden');
      document.getElementById('attachment-menu')?.classList.add('hidden');
    });
  }

  let callTimerInterval = null;
  let callSeconds = 0;
  let localCallStream = null;

  function startCall(isVideo = false) {
    window.startCall = startCall;
    const { contacts, groups } = store.getState();
    const avatarEl = document.getElementById('call-user-avatar');
    const nameEl = document.getElementById('call-user-name');
    const titleTextEl = document.getElementById('call-type-text');
    const titleIconEl = document.getElementById('call-type-icon');
    const timerEl = document.getElementById('call-status-timer');
    const overlay = document.getElementById('call-modal-overlay');
    const videoStreamsContainer = document.getElementById('call-video-streams');

    if (!activeChatId) {
      if (typeof window.showToastAlert === 'function') {
        window.showToastAlert('Please select a contact or conversation to start a call.', 'warning');
      } else {
        alert('Please select a contact or conversation to start a call.');
      }
      return;
    }

    let contact = contacts.find(c => c.uid === activeChatId);
    let group = groups.find(g => g.id === activeChatId);
    const targetName = contact ? contact.name : (group ? group.name : 'Contact');
    const targetAvatar = contact ? contact.avatar : (group ? group.avatar : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80');

    if (avatarEl) avatarEl.src = targetAvatar;
    if (nameEl) nameEl.textContent = targetName;
    if (titleTextEl) titleTextEl.textContent = isVideo ? 'MD Video Call' : 'MD Voice Call';
    if (titleIconEl) titleIconEl.className = isVideo ? 'fas fa-video' : 'fas fa-phone-alt';
    if (timerEl) timerEl.textContent = 'Calling...';

    if (videoStreamsContainer) {
      if (isVideo) {
        videoStreamsContainer.classList.remove('hidden');
        startCameraPreview();
      } else {
        videoStreamsContainer.classList.add('hidden');
      }
    }

    if (overlay) overlay.classList.remove('hidden');

    callSeconds = 0;
    clearInterval(callTimerInterval);

    setTimeout(() => {
      if (timerEl) timerEl.textContent = '00:00';
      callTimerInterval = setInterval(() => {
        callSeconds++;
        const mins = String(Math.floor(callSeconds / 60)).padStart(2, '0');
        const secs = String(callSeconds % 60).padStart(2, '0');
        if (timerEl) timerEl.textContent = `${mins}:${secs}`;
      }, 1000);
    }, 2000);
  }

  async function startCameraPreview() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localCallStream = stream;
      const localVideo = document.getElementById('call-local-video');
      const remoteVideo = document.getElementById('call-remote-video');
      if (localVideo) localVideo.srcObject = stream;
      if (remoteVideo) remoteVideo.srcObject = stream;
    } catch (err) {
      console.log('Camera access notice:', err);
    }
  }

  function endCall() {
    clearInterval(callTimerInterval);
    if (localCallStream) {
      localCallStream.getTracks().forEach(track => track.stop());
      localCallStream = null;
    }
    const overlay = document.getElementById('call-modal-overlay');
    if (overlay) overlay.classList.add('hidden');

    const durationStr = callSeconds > 0 ? `${String(Math.floor(callSeconds / 60)).padStart(2, '0')}:${String(callSeconds % 60).padStart(2, '0')}` : '00:00';
    if (typeof window.showToastAlert === 'function') {
      window.showToastAlert(`Call ended. Duration: ${durationStr}`, 'info');
    } else {
      alert(`Call ended. Duration: ${durationStr}`);
    }
  }

  function triggerFileInput(accept) {
    const fileInput = document.getElementById('hidden-chat-file-input');
    if (fileInput) {
      fileInput.accept = accept;
      fileInput.click();
    }
  }

  function setActiveChat(targetId, type = 'private') {
    activeChatId = targetId;
    activeChatType = type;

    const emptyState = document.getElementById('empty-chat-state');
    const chatPane = document.getElementById('active-chat-content');
    const chatWindow = document.getElementById('chat-window-pane');

    if (emptyState) emptyState.classList.add('hidden');
    if (chatPane) chatPane.classList.remove('hidden');
    if (chatWindow) chatWindow.classList.add('mobile-active');

    const { contacts, groups, messages, currentUser } = store.getState();
    const currentUserId = currentUser ? currentUser.uid : '';
    const avatarEl = document.getElementById('chat-header-avatar');
    const titleEl = document.getElementById('chat-header-title');
    const subtitleEl = document.getElementById('chat-header-subtitle');

    if (type === 'private') {
      const contact = contacts.find((c) => c.uid === targetId);
      if (contact) {
        if (avatarEl) avatarEl.src = contact.avatar;
        if (titleEl) titleEl.textContent = contact.name;
        if (subtitleEl) subtitleEl.textContent = contact.online ? 'Online' : contact.lastSeen || 'Offline';
      }
    } else {
      const group = groups.find((g) => g.id === targetId);
      if (group) {
        if (avatarEl) avatarEl.src = group.avatar;
        if (titleEl) titleEl.textContent = group.name;
        if (subtitleEl) subtitleEl.textContent = `${group.members.length} members`;
      }
    }

    // Mark all unread messages for this chat as read
    const chatMsgs = messages[targetId] || [];
    if (chatMsgs.some(m => m.senderId !== currentUserId && m.read === false)) {
      const updatedMsgs = chatMsgs.map(m => (m.senderId !== currentUserId && m.read === false) ? { ...m, read: true } : m);
      store.updateState({
        messages: {
          ...messages,
          [targetId]: updatedMsgs
        }
      });
      setTimeout(() => {
        renderChatsList();
        updateNavChatsBadge();
      }, 0);
    }

    renderMessages();
  }

  function renderMessages() {
    if (!activeChatId) return;

    const container = document.getElementById('messages-container');
    if (!container) return;

    const { messages, currentUser } = store.getState();
    const chatMessages = messages[activeChatId] || [];

    if (chatMessages.length === 0) {
      container.innerHTML = `
        <div class="date-divider">Start of conversation</div>
        <div style="text-align: center; font-size: 13px; color: var(--text-secondary); margin-top: 20px;">
          <i class="fas fa-lock" style="font-size: 12px; margin-right: 4px;"></i>
          End-to-End User-to-User Messages
        </div>
      `;
      return;
    }

    const now = Date.now();

    container.innerHTML = chatMessages.map((msg) => {
      const isOut = msg.senderId === currentUser.uid;
      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const msgTime = new Date(msg.timestamp).getTime();
      const secondsDiff = Math.floor((now - msgTime) / 1000);
      const canEdit = isOut && (secondsDiff <= 15) && msg.type === 'text' && !msg.deleted;
      const canDelete = isOut && !msg.deleted;

      let statusCheck = '<i class="fas fa-check message-status-icon"></i>';
      if (msg.status === 'delivered') statusCheck = '<i class="fas fa-check-double message-status-icon"></i>';
      if (msg.status === 'seen') statusCheck = '<i class="fas fa-check-double message-status-icon seen"></i>';

      let contentHtml = '';
      if (msg.deleted) {
        contentHtml = `<div class="message-text deleted-msg-text" style="font-style: italic; opacity: 0.7; display: flex; align-items: center; gap: 6px;"><i class="fas fa-ban"></i> This message was deleted</div>`;
      } else if (msg.type === 'text') {
        contentHtml = `<div class="message-text">${escapeHtml(msg.text)}</div>`;
      } else if (msg.type === 'image') {
        contentHtml = `
          <div class="message-media">
            <img src="${msg.url}" alt="Image" style="cursor: pointer;" onclick="window.openMediaLightbox('${msg.url}', 'image', '${escapeHtml(msg.text || 'Image')}')">
          </div>
          ${msg.text && msg.text !== msg.fileName ? `<div class="message-text" style="margin-top: 4px;">${escapeHtml(msg.text)}</div>` : ''}
        `;
      } else if (msg.type === 'video') {
        contentHtml = `
          <div class="message-media">
            <video src="${msg.url}" controls style="cursor: pointer;" onclick="window.openMediaLightbox('${msg.url}', 'video', '${escapeHtml(msg.text || 'Video')}')"></video>
          </div>
          ${msg.text && msg.text !== msg.fileName ? `<div class="message-text" style="margin-top: 4px;">${escapeHtml(msg.text)}</div>` : ''}
        `;
      } else if (msg.type === 'audio') {
        contentHtml = `
          <div class="audio-player-bubble">
            <button class="play-voice-btn"><i class="fas fa-play"></i></button>
            <div class="audio-waveform-bar">
              <span class="wave-bar active" style="height: 12px;"></span>
              <span class="wave-bar active" style="height: 20px;"></span>
              <span class="wave-bar active" style="height: 14px;"></span>
              <span class="wave-bar" style="height: 18px;"></span>
              <span class="wave-bar" style="height: 10px;"></span>
            </div>
            <audio src="${msg.url}" controls style="width: 140px; height: 32px;"></audio>
          </div>
        `;
      } else if (msg.type === 'document') {
        contentHtml = `
          <div class="document-box" onclick="window.open('${msg.url}', '_blank')">
            <i class="fas fa-file-pdf document-icon"></i>
            <div class="document-info">
              <span class="document-name">${escapeHtml(msg.fileName || 'Document')}</span>
              <span class="document-size">Click to view file</span>
            </div>
          </div>
        `;
      }

      return `
        <div class="message-bubble ${isOut ? 'out' : 'in'}" data-msg-id="${msg.id}">
          ${!isOut && activeChatType === 'group' && msg.senderName ? `<div class="sender-name">${msg.senderName}</div>` : ''}
          ${contentHtml}
          <div class="message-meta">
            ${msg.isEdited && !msg.deleted ? `<span class="edited-tag" style="font-size: 10px; opacity: 0.75; font-style: italic; margin-right: 4px;">(edited)</span>` : ''}
            <span>${time}</span>
            ${isOut && !msg.deleted ? statusCheck : ''}
          </div>
          ${(canEdit || canDelete) ? `
            <div class="message-actions-bar">
              ${canEdit ? `<button type="button" class="msg-action-btn edit-msg-btn" data-msg-id="${msg.id}" title="Edit message (15s limit remaining: ${15 - secondsDiff}s)"><i class="fas fa-pen"></i></button>` : ''}
              ${canDelete ? `<button type="button" class="msg-action-btn delete-msg-btn" data-msg-id="${msg.id}" title="Delete message"><i class="fas fa-trash-alt"></i></button>` : ''}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    setupMessageActionEvents(container);
    container.scrollTop = container.scrollHeight;
  }

  function setupMessageActionEvents(container) {
    container.onclick = (e) => {
      const editBtn = e.target.closest('.edit-msg-btn');
      const deleteBtn = e.target.closest('.delete-msg-btn');

      if (editBtn) {
        e.stopPropagation();
        const msgId = editBtn.getAttribute('data-msg-id');
        handleEditMessage(msgId);
      } else if (deleteBtn) {
        e.stopPropagation();
        const msgId = deleteBtn.getAttribute('data-msg-id');
        handleDeleteMessage(msgId);
      }
    };
  }

  function handleEditMessage(msgId) {
    const { messages } = store.getState();
    const currentMsgs = messages[activeChatId] || [];
    const msgIndex = currentMsgs.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    const msg = currentMsgs[msgIndex];
    const secondsDiff = Math.floor((Date.now() - new Date(msg.timestamp).getTime()) / 1000);
    if (secondsDiff > 15) {
      if (typeof window.showToastAlert === 'function') {
        window.showToastAlert('Edit period expired! Messages can only be edited within 15 seconds of sending.', 'error');
      } else {
        alert('Edit period expired! Messages can only be edited within 15 seconds of sending.');
      }
      renderMessages();
      return;
    }

    const newText = prompt(`Edit your message (15s window - ${15 - secondsDiff}s left):`, msg.text);
    if (newText !== null && newText.trim() !== '' && newText.trim() !== msg.text) {
      const freshSecondsDiff = Math.floor((Date.now() - new Date(msg.timestamp).getTime()) / 1000);
      if (freshSecondsDiff > 15) {
        if (typeof window.showToastAlert === 'function') {
          window.showToastAlert('Edit period expired! 15 seconds limit reached.', 'error');
        } else {
          alert('Edit period expired! 15 seconds limit reached.');
        }
        renderMessages();
        return;
      }
      const updatedMsgs = [...currentMsgs];
      updatedMsgs[msgIndex] = {
        ...msg,
        text: newText.trim(),
        isEdited: true
      };
      store.updateState({
        messages: {
          ...messages,
          [activeChatId]: updatedMsgs
        }
      });
      renderMessages();
      if (typeof window.showToastAlert === 'function') {
        window.showToastAlert('Message edited successfully!', 'success');
      }
    }
  }

  function handleDeleteMessage(msgId) {
    const { messages } = store.getState();
    const currentMsgs = messages[activeChatId] || [];
    const msgIndex = currentMsgs.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    if (confirm('Are you sure you want to delete this message?')) {
      const updatedMsgs = [...currentMsgs];
      updatedMsgs[msgIndex] = {
        ...updatedMsgs[msgIndex],
        deleted: true,
        text: 'This message was deleted'
      };
      store.updateState({
        messages: {
          ...messages,
          [activeChatId]: updatedMsgs
        }
      });
      renderMessages();
      if (typeof window.showToastAlert === 'function') {
        window.showToastAlert('Message deleted.', 'warning');
      }
    }
  }

  function sendCurrentMessage() {
    const input = document.getElementById('chat-message-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text || !activeChatId) return;

    sendMessage({
      type: 'text',
      text
    });
    input.value = '';
  }

  function sendMessage(msgData) {
    if (!activeChatId) return;

    const { currentUser, messages, contacts } = store.getState();
    const newMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      senderId: currentUser.uid,
      senderName: currentUser.name,
      timestamp: new Date().toISOString(),
      status: 'seen',
      read: true,
      ...msgData
    };

    const currentChatMsgs = messages[activeChatId] || [];
    const updatedMessages = {
      ...messages,
      [activeChatId]: [...currentChatMsgs, newMsg]
    };

    store.updateState({ messages: updatedMessages });
    syncMessageToFirebase(activeChatId, newMsg);
    renderMessages();
    renderChatsList();
    playMessageAudioAlert();

    // Trigger user-to-user auto response for live notification view testing
    if (activeChatType === 'private' && activeChatId) {
      const targetId = activeChatId;
      const contactObj = contacts.find(c => c.uid === targetId);
      if (contactObj) {
        setTimeout(() => {
          const sampleReplies = [
            `Got your message! I am reviewing it right now. 👍`,
            `Thanks for reaching out! Let's talk soon. 😊`,
            `Received: "${msgData.text || 'media'}". Thanks!`,
            `Hey ${currentUser.name}! Message received loud and clear. 🚀`
          ];
          const replyText = sampleReplies[Math.floor(Math.random() * sampleReplies.length)];
          receiveIncomingUserMessage(targetId, replyText, contactObj.name);
        }, 1500);
      }
    }
  }

  function receiveIncomingUserMessage(chatId, text, senderName = 'Contact') {
    const { messages, contacts, groups, currentUser } = store.getState();
    const currentUserId = currentUser ? currentUser.uid : '';
    const contact = contacts.find(c => c.uid === chatId);
    const group = groups.find(g => g.id === chatId);
    const displayName = senderName || (contact ? contact.name : (group ? group.name : 'User'));
    const isCurrentActive = (activeChatId === chatId);

    const newMsg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      senderId: chatId,
      senderName: displayName,
      text: text,
      type: 'text',
      timestamp: new Date().toISOString(),
      status: 'delivered',
      read: isCurrentActive
    };

    const currentChatMsgs = messages[chatId] || [];
    const updatedMessages = {
      ...messages,
      [chatId]: [...currentChatMsgs, newMsg]
    };

    store.updateState({ messages: updatedMessages });

    const currentMsgs = updatedMessages[chatId] || [];
    const unreadCount = currentMsgs.filter(m => m.senderId !== currentUserId && m.read === false).length;

    if (isCurrentActive) {
      renderMessages();
    } else {
      if (typeof window.showToastAlert === 'function') {
        window.showToastAlert(`📩 New message from ${displayName}: "${text}" (${unreadCount})`, 'info', 5000);
      }
      playMessageAudioAlert();
    }

    renderChatsList();
    updateNavChatsBadge();
  }

  function updateNavChatsBadge() {
    const { messages, currentUser } = store.getState();
    const currentUserId = currentUser ? currentUser.uid : '';
    let totalUnread = 0;

    Object.keys(messages).forEach(chatId => {
      const chatMsgs = messages[chatId] || [];
      totalUnread += chatMsgs.filter(m => m.senderId !== currentUserId && m.read === false).length;
    });

    const chatsBtn = document.getElementById('nav-chats-btn');
    if (chatsBtn) {
      let badgeEl = chatsBtn.querySelector('.badge');
      if (totalUnread > 0) {
        if (!badgeEl) {
          badgeEl = document.createElement('span');
          badgeEl.className = 'badge';
          chatsBtn.appendChild(badgeEl);
        }
        badgeEl.textContent = totalUnread > 9 ? '9+' : `(${totalUnread})`;
        badgeEl.style.display = 'flex';
      } else if (badgeEl) {
        badgeEl.style.display = 'none';
      }
    }
  }

  async function startVoiceRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
      mediaRecorder.start();

      document.getElementById('chat-input-bar').classList.add('hidden');
      document.getElementById('voice-recorder-bar').classList.remove('hidden');

      voiceSeconds = 0;
      document.getElementById('voice-timer').textContent = '00:00';
      voiceTimerInterval = setInterval(() => {
        voiceSeconds++;
        const mins = String(Math.floor(voiceSeconds / 60)).padStart(2, '0');
        const secs = String(voiceSeconds % 60).padStart(2, '0');
        document.getElementById('voice-timer').textContent = `${mins}:${secs}`;
      }, 1000);
    } catch (err) {
      alert('Microphone access permission required to record voice notes.');
    }
  }

  function cancelVoiceRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    clearInterval(voiceTimerInterval);
    document.getElementById('voice-recorder-bar').classList.add('hidden');
    document.getElementById('chat-input-bar').classList.remove('hidden');
  }

  function stopAndSendVoiceRecording() {
    if (!mediaRecorder) return;
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      try {
        const url = await uploadFileToStorage(audioBlob);
        sendMessage({
          type: 'audio',
          url,
          text: 'Voice Note'
        });
      } catch (e) {
        alert('Failed to send voice note.');
      }
    };
    mediaRecorder.stop();
    clearInterval(voiceTimerInterval);
    document.getElementById('voice-recorder-bar').classList.add('hidden');
    document.getElementById('chat-input-bar').classList.remove('hidden');
  }

  function triggerTypingIndicator() {
    const subtitleEl = document.getElementById('chat-header-subtitle');
    if (subtitleEl && activeChatType === 'private') {
      const originalText = subtitleEl.textContent;
      subtitleEl.textContent = 'typing...';
      subtitleEl.style.color = 'var(--brand-accent)';
      setTimeout(() => {
        subtitleEl.textContent = originalText;
        subtitleEl.style.color = 'var(--text-secondary)';
      }, 2000);
    }
  }

  function playMessageAudioAlert() {
    const { soundEnabled } = store.getState();
    if (soundEnabled === false) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {}
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
  }

  /* ------------------------------------------
     11. MAIN APP ROUTER & ENTRY POINT
     ------------------------------------------ */
  let currentActiveTab = 'chats';

  document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Initializing Authentic MD Chat Pro with 3-Step Verification...");

    initSplashScreenAndSignup();
    initContacts();
    initGroups();
    initStatusSystem();
    initSettings();
    initChatEngine();

    if (window.location.protocol.startsWith('http') && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    setupNavigationTabs();
    setupSearchFilters();

    store.subscribe((state) => {
      renderActiveTabContent();
      renderProfileData();
    });

    renderActiveTabContent();
    renderProfileData();

    const currentUser = store.getState().currentUser;
    if (currentUser && currentUser.uid) {
      loadUserContactsFromFirebase(currentUser.uid);
      setupFirebaseContactsListener(currentUser.uid);
      setupFirebaseMessagesListener(currentUser.uid);
    }

    const mobileBackBtn = document.getElementById('mobile-chat-back');
    if (mobileBackBtn) {
      mobileBackBtn.addEventListener('click', () => {
        document.getElementById('chat-window-pane')?.classList.remove('mobile-active');
      });
    }
  });

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

    const chatHeaderDetails = document.getElementById('chat-header-details');
    if (chatHeaderDetails) {
      chatHeaderDetails.addEventListener('click', (e) => {
        if (e.target.closest('#mobile-chat-back')) return;
        if (activeChatId) {
          openContactInfoModal(activeChatId);
        }
      });
    }

    const headerSettingsBtn = document.getElementById('header-settings-btn');
    if (headerSettingsBtn) {
      headerSettingsBtn.addEventListener('click', () => {
        navBtns.forEach((b) => b.classList.remove('active'));
        document.getElementById('nav-profile-btn')?.classList.add('active');
        currentActiveTab = 'settings';
        switchTab('settings');
      });
    }

    // Sidebar Header Dropdown Menu
    const menuBtn = document.getElementById('sidebar-menu-btn');
    const dropdownMenu = document.getElementById('sidebar-dropdown-menu');

    if (menuBtn && dropdownMenu) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('hidden');
      });
    }

    document.addEventListener('click', () => {
      dropdownMenu?.classList.add('hidden');
    });

    document.getElementById('dropdown-new-contact')?.addEventListener('click', () => {
      dropdownMenu?.classList.add('hidden');
      document.getElementById('add-contact-modal')?.classList.remove('hidden');
    });

    document.getElementById('dropdown-new-group')?.addEventListener('click', () => {
      dropdownMenu?.classList.add('hidden');
      populateGroupContactPicker();
      document.getElementById('create-group-modal')?.classList.remove('hidden');
    });

    document.getElementById('dropdown-status')?.addEventListener('click', () => {
      dropdownMenu?.classList.add('hidden');
      navBtns.forEach((b) => b.classList.remove('active'));
      document.getElementById('nav-status-btn')?.classList.add('active');
      currentActiveTab = 'status';
      switchTab('status');
    });

    document.getElementById('dropdown-settings')?.addEventListener('click', () => {
      dropdownMenu?.classList.add('hidden');
      navBtns.forEach((b) => b.classList.remove('active'));
      document.getElementById('nav-profile-btn')?.classList.add('active');
      currentActiveTab = 'settings';
      switchTab('settings');
    });

    document.getElementById('dropdown-logout')?.addEventListener('click', () => {
      dropdownMenu?.classList.add('hidden');
      logoutUser();
    });

    document.getElementById('setting-menu-logout')?.addEventListener('click', () => {
      logoutUser();
    });

    document.getElementById('profile-logout-btn')?.addEventListener('click', () => {
      logoutUser();
    });
  }

  function logoutUser() {
    if (!confirm("Are you sure you want to log out of MD Chat Pro?")) return;

    const currentState = store.getState();
    const updatedUser = {
      ...currentState.currentUser,
      registered: false,
      online: false
    };

    store.updateState({ currentUser: updatedUser });

    document.getElementById('profile-drawer')?.classList.add('hidden');
    document.getElementById('sidebar-dropdown-menu')?.classList.add('hidden');

    const page1Form = document.getElementById('signup-page-1');
    const page2Form = document.getElementById('signup-page-2');
    const page3Form = document.getElementById('signup-page-3');
    if (page1Form) page1Form.classList.remove('hidden');
    if (page2Form) page2Form.classList.add('hidden');
    if (page3Form) page3Form.classList.add('hidden');

    const stepDot1 = document.getElementById('step-dot-1');
    const stepDot2 = document.getElementById('step-dot-2');
    const stepDot3 = document.getElementById('step-dot-3');
    if (stepDot1) stepDot1.classList.add('active');
    if (stepDot2) stepDot2.classList.remove('active');
    if (stepDot3) stepDot3.classList.remove('active');

    const signupModal = document.getElementById('signup-modal');
    if (signupModal) signupModal.classList.remove('hidden');

    if (typeof window.showToastAlert === 'function') {
      window.showToastAlert('Logged out successfully.', 'info');
    } else {
      alert('Logged out successfully.');
    }
  }

  window.logoutUser = logoutUser;

  function switchTab(tab) {
    document.querySelectorAll('.sidebar-view').forEach((v) => v.classList.add('hidden'));
    const titleEl = document.getElementById('sidebar-main-title');
    const searchBox = document.querySelector('.search-box');
    const chatWindow = document.getElementById('chat-window-pane');

    if (chatWindow && window.innerWidth <= 768) {
      chatWindow.classList.remove('mobile-active');
    }
    
    if (tab === 'chats') {
      if (titleEl) titleEl.textContent = 'Chats';
      document.getElementById('view-chats')?.classList.remove('hidden');
      if (searchBox) searchBox.classList.remove('hidden');
    } else if (tab === 'contacts') {
      if (titleEl) titleEl.textContent = 'Contacts';
      document.getElementById('view-contacts')?.classList.remove('hidden');
      if (searchBox) searchBox.classList.remove('hidden');
    } else if (tab === 'groups') {
      if (titleEl) titleEl.textContent = 'Groups';
      document.getElementById('view-groups')?.classList.remove('hidden');
      if (searchBox) searchBox.classList.remove('hidden');
    } else if (tab === 'status') {
      if (titleEl) titleEl.textContent = 'Status';
      document.getElementById('view-status')?.classList.remove('hidden');
      if (searchBox) searchBox.classList.add('hidden'); // SEARCH REMOVED ON STATUS TAB
    } else if (tab === 'settings') {
      if (titleEl) titleEl.textContent = 'Settings';
      document.getElementById('view-settings')?.classList.remove('hidden');
      if (searchBox) searchBox.classList.add('hidden');
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
    }
  }

  function renderChatsList(searchQuery = '') {
    const container = document.getElementById('chats-list-container');
    if (!container) return;

    const { contacts, groups, messages, currentUser } = store.getState();
    const currentUserId = currentUser ? currentUser.uid : '';
    const allConversations = [];

    contacts.forEach((c) => {
      const chatMsgs = messages[c.uid] || [];
      const lastMsg = chatMsgs[chatMsgs.length - 1];
      const unreadCount = chatMsgs.filter(m => m.senderId !== currentUserId && m.read === false).length;
      allConversations.push({
        id: c.uid,
        type: 'private',
        name: c.name,
        avatar: c.avatar,
        online: c.online,
        lastMsgText: lastMsg ? (lastMsg.type === 'text' ? lastMsg.text : `[${lastMsg.type}]`) : c.bio,
        lastMsgTime: lastMsg ? formatTimeShort(lastMsg.timestamp) : '',
        lastMsgStatus: lastMsg ? lastMsg.status : '',
        rawTime: lastMsg ? new Date(lastMsg.timestamp).getTime() : 0,
        unreadCount
      });
    });

    groups.forEach((g) => {
      const groupMsgs = messages[g.id] || [];
      const lastMsg = groupMsgs[groupMsgs.length - 1];
      const unreadCount = groupMsgs.filter(m => m.senderId !== currentUserId && m.read === false).length;
      allConversations.push({
        id: g.id,
        type: 'group',
        name: g.name,
        avatar: g.avatar,
        online: false,
        lastMsgText: lastMsg ? `${lastMsg.senderName}: ${lastMsg.text}` : g.description,
        lastMsgTime: lastMsg ? formatTimeShort(lastMsg.timestamp) : '',
        lastMsgStatus: lastMsg ? lastMsg.status : '',
        rawTime: lastMsg ? new Date(lastMsg.timestamp).getTime() : 0,
        unreadCount
      });
    });

    allConversations.sort((a, b) => b.rawTime - a.rawTime);

    const filtered = allConversations.filter((conv) => conv.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="padding: 32px; text-align: center; color: var(--text-secondary);">
          <p>No active conversations.</p>
          <p style="font-size: 12px; margin-top: 6px; color: var(--brand-green);">Add a contact or create a group to start chatting!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map((c) => `
      <div class="list-item ${c.id === activeChatId ? 'active' : ''}" data-chat-id="${c.id}" data-chat-type="${c.type}">
        <div class="item-avatar">
          <img src="${c.avatar}" alt="${c.name}">
          ${c.online ? '<span class="online-dot"></span>' : ''}
        </div>
        <div class="item-info">
          <div class="item-top-row">
            <span class="item-name" style="${c.unreadCount > 0 ? 'font-weight: 700; color: var(--text-primary);' : ''}">${c.name}</span>
            <span class="item-time" style="${c.unreadCount > 0 ? 'color: var(--brand-green); font-weight: 600;' : ''}">${c.lastMsgTime}</span>
          </div>
          <div class="item-bottom-row" style="display: flex; justify-content: space-between; align-items: center;">
            <span class="item-preview" style="${c.unreadCount > 0 ? 'color: var(--text-primary); font-weight: 600;' : ''}">
              ${c.lastMsgText}
            </span>
            ${c.unreadCount > 0 ? `<span class="unread-badge-count" style="background: var(--brand-green); color: #ffffff; font-size: 11px; font-weight: 700; height: 20px; min-width: 20px; padding: 0 6px; border-radius: 9999px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0, 128, 105, 0.4); margin-left: 6px;">(${c.unreadCount})</span>` : ''}
          </div>
        </div>
        <div class="item-actions" style="display: flex; align-items: center; gap: 4px;">
          <button type="button" class="icon-btn delete-chat-btn" data-chat-id="${c.id}" data-chat-type="${c.type}" title="Delete Contact / Chat" style="width: 32px; height: 32px; font-size: 14px; color: #ef4444; background: transparent; border: none; cursor: pointer;">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.list-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.delete-chat-btn')) return;
        if (e.target.closest('.item-avatar')) {
          e.stopPropagation();
          const chatId = item.getAttribute('data-chat-id');
          if (chatId) openContactInfoModal(chatId);
          return;
        }
        const id = e.currentTarget.getAttribute('data-chat-id');
        const type = e.currentTarget.getAttribute('data-chat-type');
        container.querySelectorAll('.list-item').forEach((i) => i.classList.remove('active'));
        e.currentTarget.classList.add('active');
        setActiveChat(id, type);
      });
    });

    container.querySelectorAll('.delete-chat-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const chatId = e.currentTarget.getAttribute('data-chat-id');
        deleteContact(chatId);
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

    document.addEventListener('click', (e) => {
      const statusItem = e.target.closest('[data-status-user-id]');
      if (statusItem) {
        const userId = statusItem.getAttribute('data-status-user-id');
        openStatusViewer(userId);
      }
    });
  }

  function formatTimeShort(isoString) {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function openContactInfoModal(targetId) {
    const modal = document.getElementById('contact-info-modal');
    if (!modal) return;

    const { contacts, groups, messages } = store.getState();
    const avatarEl = document.getElementById('contact-info-avatar');
    const nameEl = document.getElementById('contact-info-name');
    const phoneEl = document.getElementById('contact-info-phone');
    const bioEl = document.getElementById('contact-info-bio');
    const statusEl = document.getElementById('contact-info-status');
    const mediaCountEl = document.getElementById('contact-info-media-count');
    const mediaGridEl = document.getElementById('contact-info-media-grid');
    const zoomBtn = document.getElementById('contact-info-zoom-btn');

    const contact = contacts.find(c => c.uid === targetId);
    const group = groups.find(g => g.id === targetId);

    if (contact) {
      if (avatarEl) {
        avatarEl.src = contact.avatar;
        avatarEl.onclick = () => openMediaLightbox(contact.avatar, 'image', `${contact.name}'s Profile Photo (Big View)`);
      }
      if (zoomBtn) {
        zoomBtn.onclick = () => openMediaLightbox(contact.avatar, 'image', `${contact.name}'s Profile Photo (Full Screen HD)`);
      }
      if (nameEl) nameEl.innerHTML = `${escapeHtml(contact.name)} <i class="fas fa-check-circle" style="color: var(--brand-green); font-size: 17px;"></i>`;
      if (phoneEl) phoneEl.textContent = contact.mobile || 'N/A';
      if (bioEl) bioEl.textContent = contact.bio || 'Hey there! I am using MD Chat Pro.';
      if (statusEl) statusEl.textContent = contact.online ? '🟢 Online' : contact.lastSeen || 'Offline';
    } else if (group) {
      if (avatarEl) {
        avatarEl.src = group.avatar;
        avatarEl.onclick = () => openMediaLightbox(group.avatar, 'image', `${group.name}'s Group Icon (Big View)`);
      }
      if (zoomBtn) {
        zoomBtn.onclick = () => openMediaLightbox(group.avatar, 'image', `${group.name}'s Group Icon (Full Screen HD)`);
      }
      if (nameEl) nameEl.textContent = group.name;
      if (phoneEl) phoneEl.textContent = `Group (${group.members.length} members)`;
      if (bioEl) bioEl.textContent = group.description || 'Welcome to the group chat!';
      if (statusEl) statusEl.textContent = `${group.members.length} Members`;
    }

    const chatMsgs = messages[targetId] || [];
    const mediaMsgs = chatMsgs.filter(m => !m.deleted && (m.type === 'image' || m.type === 'video'));

    if (mediaCountEl) mediaCountEl.textContent = `${mediaMsgs.length} item(s)`;

    if (mediaGridEl) {
      if (mediaMsgs.length === 0) {
        mediaGridEl.innerHTML = `
          <div style="grid-column: span 3; padding: 20px; text-align: center; color: var(--text-secondary); font-size: 12.5px;">
            <i class="fas fa-photo-video" style="font-size: 24px; opacity: 0.4; margin-bottom: 6px;"></i>
            <p>No photos or videos shared yet.</p>
          </div>
        `;
      } else {
        mediaGridEl.innerHTML = mediaMsgs.map(m => {
          if (m.type === 'image') {
            return `
              <div style="position: relative; width: 100%; height: 60px; border-radius: 6px; overflow: hidden; cursor: pointer; border: 1px solid var(--border-color);" onclick="window.openMediaLightbox('${m.url}', 'image', '${escapeHtml(m.text || 'Image')}')">
                <img src="${m.url}" style="width: 100%; height: 100%; object-fit: cover;">
              </div>
            `;
          } else {
            return `
              <div style="position: relative; width: 100%; height: 60px; border-radius: 6px; overflow: hidden; cursor: pointer; border: 1px solid var(--border-color); background: #000;" onclick="window.openMediaLightbox('${m.url}', 'video', '${escapeHtml(m.text || 'Video')}')">
                <video src="${m.url}" style="width: 100%; height: 100%; object-fit: cover;"></video>
                <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); color: #fff; font-size: 16px;">
                  <i class="fas fa-play-circle"></i>
                </div>
              </div>
            `;
          }
        }).join('');
      }
    }

    const closeBtn = document.getElementById('close-contact-info-modal');
    if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');

    const callBtn = document.getElementById('contact-info-call-btn');
    if (callBtn) callBtn.onclick = () => { modal.classList.add('hidden'); startCall(false, targetId); };

    const videoBtn = document.getElementById('contact-info-video-btn');
    if (videoBtn) videoBtn.onclick = () => { modal.classList.add('hidden'); startCall(true, targetId); };

    const deleteBtn = document.getElementById('contact-info-delete-btn');
    if (deleteBtn) deleteBtn.onclick = () => { modal.classList.add('hidden'); deleteContact(targetId); };

    modal.classList.remove('hidden');
  }

  function openMediaLightbox(url, type, caption = '') {
    const modal = document.getElementById('media-lightbox-modal');
    if (!modal) return;

    const imgEl = document.getElementById('lightbox-img');
    const videoEl = document.getElementById('lightbox-video');
    const titleEl = document.getElementById('lightbox-title');
    const captionEl = document.getElementById('lightbox-caption');
    const downloadBtn = document.getElementById('lightbox-download-btn');
    const closeBtn = document.getElementById('close-lightbox-btn');

    if (downloadBtn) downloadBtn.href = url;
    if (captionEl) captionEl.textContent = caption || '';
    if (titleEl) titleEl.textContent = type === 'video' ? 'Video View' : 'Image View';

    if (type === 'video') {
      if (imgEl) imgEl.classList.add('hidden');
      if (videoEl) {
        videoEl.src = url;
        videoEl.classList.remove('hidden');
        videoEl.play().catch(() => {});
      }
    } else {
      if (videoEl) {
        videoEl.pause();
        videoEl.classList.add('hidden');
      }
      if (imgEl) {
        imgEl.src = url;
        imgEl.classList.remove('hidden');
      }
    }

    if (closeBtn) {
      closeBtn.onclick = () => {
        if (videoEl) videoEl.pause();
        modal.classList.add('hidden');
      };
    }

    modal.classList.remove('hidden');
  }

  // Universal Cross-Device Touch & Click Delegation for Contact Avatar Big View
  document.addEventListener('click', (e) => {
    const avatarEl = e.target.closest('.item-avatar') || e.target.closest('.chat-avatar');
    if (avatarEl) {
      const listItem = avatarEl.closest('.list-item');
      const targetId = listItem ? (listItem.getAttribute('data-contact-id') || listItem.getAttribute('data-chat-id')) : activeChatId;
      if (targetId && typeof openContactInfoModal === 'function') {
        e.stopPropagation();
        openContactInfoModal(targetId);
      }
    }
  }, { capture: true });

  window.openContactInfoModal = openContactInfoModal;
  window.openMediaLightbox = openMediaLightbox;
})();
