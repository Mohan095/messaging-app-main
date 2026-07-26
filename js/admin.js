/* ==========================================
   ADMIN PANEL DASHBOARD & MODERATION
   ========================================== */

import { store } from './state.js';

export function initAdminPanel() {
  renderAdminMetrics();
  renderUserModerationList();
}

export function renderAdminMetrics() {
  const { contacts, groups, statusList, messages, suspendedUsers } = store.getState();

  let totalMessagesCount = 0;
  Object.values(messages).forEach((list) => {
    totalMessagesCount += list.length;
  });

  const totalUsers = contacts.length + 1; // contacts + current user
  const onlineUsers = contacts.filter((c) => c.online).length + 1;
  const totalGroups = groups.length;
  const totalStatuses = statusList.length;

  const elUsers = document.getElementById('stat-total-users');
  const elOnline = document.getElementById('stat-online-users');
  const elMessages = document.getElementById('stat-total-messages');
  const elGroups = document.getElementById('stat-total-groups');
  const elStatus = document.getElementById('stat-total-status');

  if (elUsers) elUsers.textContent = totalUsers;
  if (elOnline) elOnline.textContent = onlineUsers;
  if (elMessages) elMessages.textContent = totalMessagesCount;
  if (elGroups) elGroups.textContent = totalGroups;
  if (elStatus) elStatus.textContent = totalStatuses;
}

export function renderUserModerationList() {
  const container = document.getElementById('admin-users-table');
  if (!container) return;

  const { contacts, suspendedUsers = [] } = store.getState();

  container.innerHTML = contacts.map((u) => {
    const isSuspended = suspendedUsers.includes(u.uid);
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--bg-panel); border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${u.avatar}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
          <div>
            <div style="font-weight: 600;">${u.name}</div>
            <div style="font-size: 11px; color: var(--text-secondary);">${u.mobile}</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-secondary toggle-suspend-btn" data-uid="${u.uid}" style="font-size: 12px; padding: 6px 12px; color: ${isSuspended ? '#00a884' : '#ff3b30'};">
            ${isSuspended ? 'Unsuspend' : 'Suspend'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach button events
  document.querySelectorAll('.toggle-suspend-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const uid = e.currentTarget.getAttribute('data-uid');
      toggleUserSuspension(uid);
    });
  });
}

function toggleUserSuspension(uid) {
  const { suspendedUsers = [] } = store.getState();
  let updated;
  if (suspendedUsers.includes(uid)) {
    updated = suspendedUsers.filter((id) => id !== uid);
    alert('User unsuspended successfully.');
  } else {
    updated = [...suspendedUsers, uid];
    alert('User suspended successfully.');
  }

  store.updateState({ suspendedUsers: updated });
  renderAdminMetrics();
  renderUserModerationList();
}
