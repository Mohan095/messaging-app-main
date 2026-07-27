/* ==========================================
   CONTACTS MANAGEMENT SYSTEM
   ========================================== */

import { store } from './state.js';
import { uploadFileToStorage, syncContactToFirebase, findUserByMobileInFirebase } from './firebase-config.js';

export function initContacts() {
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

export function renderContactsList(filter = 'all', searchQuery = '') {
  const container = document.getElementById('contacts-list-container');
  if (!container) return;

  const { contacts } = store.getState();
  let filtered = contacts.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.mobile.includes(searchQuery);
    if (!matchesSearch) return false;
    if (filter === 'favorites') return c.favorite;
    if (filter === 'blocked') return c.blocked;
    return !c.blocked; // Default hides blocked contacts from main list unless filter is blocked
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding: 32px; text-align: center; color: var(--text-secondary);">
        <i class="fas fa-user-slash" style="font-size: 32px; margin-bottom: 12px; opacity: 0.5;"></i>
        <p>No contacts found.</p>
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

  setupContactActionEvents(container);
}

function setupContactActionEvents(container) {
  container.onclick = (e) => {
    const callBtn = e.target.closest('.call-contact-btn');
    if (callBtn) {
      e.stopPropagation();
      const contactId = callBtn.getAttribute('data-contact-id');
      const { contacts } = store.getState();
      const contact = contacts.find((c) => c.uid === contactId);
      if (contact) {
        if (typeof window.showToastAlert === 'function') {
          window.showToastAlert(`Calling ${contact.name} (${contact.mobile})...`, 'info');
        }
        if (typeof window.startCall === 'function') {
          window.startCall(false);
        }
      }
      return;
    }
    const deleteBtn = e.target.closest('.delete-contact-btn');
    if (deleteBtn) {
      e.stopPropagation();
      const contactId = deleteBtn.getAttribute('data-contact-id');
      deleteContact(contactId);
      return;
    }
    const avatarEl = e.target.closest('.item-avatar');
    if (avatarEl) {
      e.stopPropagation();
      const listItem = avatarEl.closest('.list-item');
      const contactId = listItem ? listItem.getAttribute('data-contact-id') : null;
      if (contactId && typeof window.openContactInfoModal === 'function') {
        window.openContactInfoModal(contactId);
      }
    }
  };
}

export function deleteContact(contactUid) {
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

    if (window.activeChatId === contactUid) {
      window.activeChatId = null;
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

export function toggleFavoriteContact(contactId) {
  const { contacts } = store.getState();
  const updated = contacts.map((c) => {
    if (c.uid === contactId) {
      return { ...c, favorite: !c.favorite };
    }
    return c;
  });
  store.updateState({ contacts: updated });
}

export function toggleBlockContact(contactId) {
  const { contacts } = store.getState();
  const updated = contacts.map((c) => {
    if (c.uid === contactId) {
      return { ...c, blocked: !c.blocked };
    }
    return c;
  });
  store.updateState({ contacts: updated });
}
