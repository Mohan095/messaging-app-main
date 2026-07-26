/* ==========================================
   GROUP CHAT SYSTEM & ADMIN CONTROL
   ========================================== */

import { store } from './state.js';
import { uploadFileToStorage, syncGroupToFirebase } from './firebase-config.js';

export function initGroups() {
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
      selectedMembers.push(currentUser.uid); // Include creator

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

export function populateGroupContactPicker() {
  const container = document.getElementById('group-members-picker');
  if (!container) return;

  const { contacts } = store.getState();
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

export function renderGroupsList(searchQuery = '') {
  const container = document.getElementById('groups-list-container');
  if (!container) return;

  const { groups } = store.getState();
  const filtered = groups.filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="padding: 32px; text-align: center; color: var(--text-secondary);">
        <i class="fas fa-users-slash" style="font-size: 32px; margin-bottom: 12px; opacity: 0.5;"></i>
        <p>No groups found.</p>
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
}
