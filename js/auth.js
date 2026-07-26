/* ==========================================
   AUTHENTICATION & PROFILE MANAGEMENT
   ========================================== */

import { store } from './state.js';
import { uploadFileToStorage } from './firebase-config.js';

let pendingPhoneNumber = '';
let generatedOTP = '123456';

export function initAuth() {
  const loginModal = document.getElementById('auth-modal');
  const loginForm = document.getElementById('phone-login-form');
  const otpForm = document.getElementById('otp-verify-form');
  const userBtn = document.getElementById('nav-profile-btn');
  const profileDrawer = document.getElementById('profile-drawer');
  const closeProfileBtn = document.getElementById('close-profile-drawer');

  // Check auth state on load
  const state = store.getState();
  if (!state.currentUser || !state.currentUser.mobile) {
    if (loginModal) loginModal.classList.remove('hidden');
  } else {
    updateUserPresence(true);
  }

  // Handle Mobile Form Submission
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const countryCode = document.getElementById('country-code').value;
      const phoneNum = document.getElementById('phone-number-input').value.trim();
      if (!phoneNum || phoneNum.length < 7) {
        alert('Please enter a valid mobile number.');
        return;
      }
      pendingPhoneNumber = `${countryCode} ${phoneNum}`;
      
      // Simulate sending OTP
      document.getElementById('sent-phone-display').textContent = pendingPhoneNumber;
      loginForm.classList.add('hidden');
      otpForm.classList.remove('hidden');
      
      // Display demo OTP notification hint
      console.log(`🔑 Demo OTP Code: ${generatedOTP}`);
      alert(`OTP sent to ${pendingPhoneNumber}.\n\n🔑 DEMO OTP Code: ${generatedOTP}`);
    });
  }

  // Handle OTP Verification
  if (otpForm) {
    otpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const enteredOtp = document.getElementById('otp-code-input').value.trim();
      if (enteredOtp !== generatedOTP && enteredOtp !== '123456') {
        alert('Invalid OTP code. Please enter 123456');
        return;
      }

      // Successful Login / Registration
      const currentState = store.getState();
      const existingUser = currentState.currentUser || {};
      
      const updatedUser = {
        uid: existingUser.uid || `user_${Date.now()}`,
        name: existingUser.name || `User ${pendingPhoneNumber.slice(-4)}`,
        mobile: pendingPhoneNumber,
        avatar: existingUser.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        bio: existingUser.bio || "Hey there! I am using MD Chat Pro.",
        about: existingUser.about || "Available",
        online: true,
        lastSeen: "Online",
        createdAt: existingUser.createdAt || new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        privacy: existingUser.privacy || {
          lastSeen: "everyone",
          profilePhoto: "everyone",
          readReceipts: true
        }
      };

      store.updateState({ currentUser: updatedUser });
      if (loginModal) loginModal.classList.add('hidden');
      alert(`Login Successful! Welcome, ${updatedUser.name}`);
    });
  }

  // Back button in OTP modal
  const otpBackBtn = document.getElementById('otp-back-btn');
  if (otpBackBtn) {
    otpBackBtn.addEventListener('click', () => {
      otpForm.classList.add('hidden');
      loginForm.classList.remove('hidden');
    });
  }

  // Profile Drawer controls
  if (userBtn && profileDrawer) {
    userBtn.addEventListener('click', () => {
      renderProfileData();
      profileDrawer.classList.remove('hidden');
    });
  }
  if (closeProfileBtn && profileDrawer) {
    closeProfileBtn.addEventListener('click', () => {
      profileDrawer.classList.add('hidden');
    });
  }

  // Avatar Upload listener
  const avatarInput = document.getElementById('profile-avatar-input');
  if (avatarInput) {
    avatarInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const dataUrl = await uploadFileToStorage(file);
          const currentUser = store.getState().currentUser;
          store.updateState({
            currentUser: { ...currentUser, avatar: dataUrl }
          });
          renderProfileData();
        } catch (err) {
          alert('Failed to upload image');
        }
      }
    });
  }

  // Save Profile Form
  const profileForm = document.getElementById('profile-edit-form');
  if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('profile-name-input').value.trim();
      const bio = document.getElementById('profile-bio-input').value.trim();
      const about = document.getElementById('profile-about-input').value.trim();
      const lastSeenPrivacy = document.getElementById('privacy-last-seen').value;
      const readReceipts = document.getElementById('privacy-read-receipts').checked;

      const currentUser = store.getState().currentUser;
      const updated = {
        ...currentUser,
        name: name || currentUser.name,
        bio: bio || currentUser.bio,
        about: about || currentUser.about,
        privacy: {
          ...currentUser.privacy,
          lastSeen: lastSeenPrivacy,
          readReceipts: readReceipts
        }
      };

      store.updateState({ currentUser: updated });
      alert('Profile updated successfully!');
      if (profileDrawer) profileDrawer.classList.add('hidden');
    });
  }

  // Track window focus/blur for Online Status
  window.addEventListener('focus', () => updateUserPresence(true));
  window.addEventListener('blur', () => updateUserPresence(false));
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

export function renderProfileData() {
  const { currentUser } = store.getState();
  if (!currentUser) return;

  const avatarImg = document.getElementById('profile-avatar-img');
  const nameInput = document.getElementById('profile-name-input');
  const phoneDisplay = document.getElementById('profile-phone-display');
  const bioInput = document.getElementById('profile-bio-input');
  const aboutInput = document.getElementById('profile-about-input');
  const uidDisplay = document.getElementById('profile-uid-display');
  const privacyLastSeen = document.getElementById('privacy-last-seen');
  const privacyReadReceipts = document.getElementById('privacy-read-receipts');

  if (avatarImg) avatarImg.src = currentUser.avatar;
  if (nameInput) nameInput.value = currentUser.name || '';
  if (phoneDisplay) phoneDisplay.textContent = currentUser.mobile || 'N/A';
  if (bioInput) bioInput.value = currentUser.bio || '';
  if (aboutInput) aboutInput.value = currentUser.about || '';
  if (uidDisplay) uidDisplay.textContent = currentUser.uid;

  if (currentUser.privacy) {
    if (privacyLastSeen) privacyLastSeen.value = currentUser.privacy.lastSeen || 'everyone';
    if (privacyReadReceipts) privacyReadReceipts.checked = currentUser.privacy.readReceipts !== false;
  }
}

export function logoutUser() {
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
