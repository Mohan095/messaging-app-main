/* ==========================================
   AUTHENTIC WHATSAPP STATUS SYSTEM (STORIES)
   ========================================== */

import { store } from './state.js';
import { uploadFileToStorage } from './firebase-config.js';

let activeStoryIndex = 0;
let storyTimer = null;
let currentViewingStoryList = [];

export function initStatusSystem() {
  const uploadStatusBtn = document.getElementById('upload-status-btn');
  const myStatusCard = document.getElementById('my-status-card');
  const statusModal = document.getElementById('upload-status-modal');
  const closeStatusModal = document.getElementById('close-status-modal');
  const statusForm = document.getElementById('upload-status-form');

  if (uploadStatusBtn && statusModal) {
    uploadStatusBtn.addEventListener('click', () => statusModal.classList.remove('hidden'));
  }
  if (myStatusCard && statusModal) {
    myStatusCard.addEventListener('click', () => statusModal.classList.remove('hidden'));
  }
  if (closeStatusModal && statusModal) {
    closeStatusModal.addEventListener('click', () => statusModal.classList.add('hidden'));
  }

  const statusTypeSelect = document.getElementById('status-type-select');
  const musicFields = document.getElementById('status-music-fields');
  const mediaFileGroup = document.getElementById('status-file-group');

  if (statusTypeSelect) {
    statusTypeSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'music') {
        if (musicFields) musicFields.classList.remove('hidden');
        if (mediaFileGroup) mediaFileGroup.classList.add('hidden');
      } else {
        if (musicFields) musicFields.classList.add('hidden');
        if (mediaFileGroup) mediaFileGroup.classList.remove('hidden');
      }
    });
  }

  if (statusForm) {
    statusForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const type = statusTypeSelect.value;
      const caption = document.getElementById('status-caption-input').value.trim();
      const mediaFile = document.getElementById('status-file-input').files[0];
      const songTitle = document.getElementById('status-song-title').value.trim();

      const { currentUser } = store.getState();
      let mediaUrl = "";

      if (type !== 'music') {
        if (!mediaFile) {
          alert('Please select a media file (Image or Video).');
          return;
        }
        try {
          mediaUrl = await uploadFileToStorage(mediaFile);
        } catch (err) {
          alert('Failed to upload status media file.');
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
        caption,
        songTitle: type === 'music' ? (songTitle || 'Aesthetic Track') : '',
        views: [currentUser.uid],
        likes: []
      };

      const currentState = store.getState();
      store.updateState({
        statusList: [newStatus, ...currentState.statusList]
      });

      statusForm.reset();
      statusModal.classList.add('hidden');
      alert('Status story uploaded successfully! Visible for 24 hours.');
    });
  }

  const closeViewerBtn = document.getElementById('close-status-viewer');
  const viewerOverlay = document.getElementById('status-viewer-overlay');
  if (closeViewerBtn && viewerOverlay) {
    closeViewerBtn.addEventListener('click', () => {
      closeStatusViewer();
    });
  }
}

export function renderStatusList() {
  const container = document.getElementById('status-list-container');
  if (!container) return;

  const { statusList, currentUser } = store.getState();
  const now = Date.now();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  const activeStatuses = statusList.filter((s) => {
    const elapsed = now - new Date(s.timestamp).getTime();
    return elapsed < TWENTY_FOUR_HOURS;
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
    const isSelf = userId === currentUser?.uid;
    const allSeen = userStories.every(s => s.views.includes(currentUser.uid));

    return `
      <div class="list-item" data-status-user-id="${userId}">
        <div class="item-avatar ${allSeen ? 'status-ring-seen' : 'status-ring-unseen'}">
          <img src="${latest.userAvatar}" alt="${latest.userName}">
        </div>
        <div class="item-info">
          <div class="item-top-row">
            <span class="item-name">${isSelf ? 'My Status' : latest.userName}</span>
            <span class="item-time">${timeAgo}</span>
          </div>
          <div class="item-bottom-row">
            <span class="item-preview">
              <i class="fas ${latest.type === 'video' ? 'fa-video' : latest.type === 'music' ? 'fa-music' : 'fa-image'}"></i>
              ${latest.caption || `${userStories.length} update(s)`}
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

export function openStatusViewer(userId) {
  const { statusList } = store.getState();
  const now = Date.now();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  currentViewingStoryList = statusList.filter((s) => {
    const elapsed = now - new Date(s.timestamp).getTime();
    return s.userId === userId && elapsed < TWENTY_FOUR_HOURS;
  });

  if (currentViewingStoryList.length === 0) return;

  activeStoryIndex = 0;
  const viewerOverlay = document.getElementById('status-viewer-overlay');
  if (viewerOverlay) viewerOverlay.classList.remove('hidden');

  showCurrentStory();
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

  document.getElementById('status-viewer-user-avatar').src = story.userAvatar;
  document.getElementById('status-viewer-user-name').textContent = story.userName;
  document.getElementById('status-viewer-time').textContent = formatTimeAgo(story.timestamp);
  document.getElementById('status-view-count').textContent = story.views.length;

  const contentBox = document.getElementById('status-media-box');
  if (story.type === 'image') {
    contentBox.innerHTML = `<img src="${story.url}" class="status-media-content" alt="Status">`;
  } else if (story.type === 'video') {
    contentBox.innerHTML = `<video src="${story.url}" class="status-media-content" autoplay playsinline></video>`;
  } else if (story.type === 'music') {
    contentBox.innerHTML = `
      <div class="status-music-card">
        <i class="fas fa-compact-disc fa-spin" style="font-size: 72px; color: var(--brand-accent);"></i>
        <h3>${story.songTitle || 'Music Status'}</h3>
        <p style="opacity: 0.8;">${story.caption || 'Playing music audio status'}</p>
        <audio src="${story.url}" autoplay></audio>
      </div>
    `;
  }

  const captionEl = document.getElementById('status-caption-display');
  if (captionEl) {
    captionEl.textContent = story.caption || '';
    captionEl.style.display = story.caption ? 'block' : 'none';
  }

  const fillEl = document.getElementById('status-progress-fill');
  let progress = 0;
  if (fillEl) fillEl.style.width = '0%';

  storyTimer = setInterval(() => {
    progress += 2;
    if (fillEl) fillEl.style.width = `${progress}%`;
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
