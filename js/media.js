/* ==========================================
   MEDIA LIBRARY MANAGEMENT
   ========================================== */

import { store } from './state.js';

export function initMediaLibrary() {
  const filterType = document.getElementById('media-filter-type');
  if (filterType) {
    filterType.addEventListener('change', () => {
      renderMediaLibrary();
    });
  }
}

export function renderMediaLibrary() {
  const container = document.getElementById('media-library-grid');
  if (!container) return;

  const { messages } = store.getState();
  const mediaItems = [];

  // Extract all media items from all chat messages
  Object.keys(messages).forEach((chatId) => {
    const list = messages[chatId] || [];
    list.forEach((msg) => {
      if (['image', 'video', 'audio', 'document'].includes(msg.type)) {
        mediaItems.push({
          id: msg.id,
          chatId,
          type: msg.type,
          url: msg.url || msg.text,
          fileName: msg.fileName || 'Attachment',
          timestamp: msg.timestamp,
          senderId: msg.senderId
        });
      }
    });
  });

  const selectedType = document.getElementById('media-filter-type')?.value || 'all';
  const filtered = mediaItems.filter((item) => {
    if (selectedType === 'all') return true;
    return item.type === selectedType;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-secondary);">
        <i class="fas fa-photo-video" style="font-size: 36px; margin-bottom: 12px; opacity: 0.5;"></i>
        <p>No media files found in your library.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((item) => {
    if (item.type === 'image') {
      return `
        <div class="media-card" onclick="window.open('${item.url}', '_blank')">
          <img src="${item.url}" alt="Image">
          <span class="media-type-badge"><i class="fas fa-image"></i></span>
        </div>
      `;
    } else if (item.type === 'video') {
      return `
        <div class="media-card" onclick="window.open('${item.url}', '_blank')">
          <video src="${item.url}"></video>
          <span class="media-type-badge"><i class="fas fa-video"></i></span>
        </div>
      `;
    } else if (item.type === 'audio') {
      return `
        <div class="media-card flex-center" style="background: var(--bg-panel); flex-direction: column; gap: 8px;">
          <i class="fas fa-microphone fa-2x" style="color: var(--brand-green);"></i>
          <span style="font-size: 11px; color: var(--text-secondary);">Voice Note</span>
          <audio src="${item.url}" controls style="width: 90%; height: 24px;"></audio>
        </div>
      `;
    } else {
      return `
        <div class="media-card flex-center" style="background: var(--bg-panel); flex-direction: column; gap: 8px; padding: 12px;" onclick="window.open('${item.url}', '_blank')">
          <i class="fas fa-file-pdf fa-2x" style="color: #ff3b30;"></i>
          <span style="font-size: 11px; text-align: center; word-break: break-all;">${item.fileName}</span>
        </div>
      `;
    }
  }).join('');
}
