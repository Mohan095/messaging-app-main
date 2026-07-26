/* ==========================================
   REAL-TIME CHAT ENGINE (USER-TO-USER ONLY)
   ========================================== */

import { store } from './state.js';
import { uploadFileToStorage } from './firebase-config.js';

let activeChatId = null;
let activeChatType = 'private'; // 'private' or 'group'
let mediaRecorder = null;
let audioChunks = [];
let voiceTimerInterval = null;
let voiceSeconds = 0;

export function initChatEngine() {
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

export function setActiveChat(targetId, type = 'private') {
  activeChatId = targetId;
  activeChatType = type;

  const emptyState = document.getElementById('empty-chat-state');
  const chatPane = document.getElementById('active-chat-content');
  const chatWindow = document.getElementById('chat-window-pane');

  if (emptyState) emptyState.classList.add('hidden');
  if (chatPane) chatPane.classList.remove('hidden');
  if (chatWindow) chatWindow.classList.add('mobile-active');
  document.body.classList.add('mobile-chat-open');

  const { contacts, groups } = store.getState();
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

  renderMessages();
}

export function renderMessages() {
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
          <img src="${msg.url}" alt="Image" onclick="window.open('${msg.url}', '_blank')">
        </div>
        ${msg.text && msg.text !== msg.fileName ? `<div class="message-text" style="margin-top: 4px;">${escapeHtml(msg.text)}</div>` : ''}
      `;
    } else if (msg.type === 'video') {
      contentHtml = `
        <div class="message-media">
          <video src="${msg.url}" controls></video>
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

  const { currentUser, messages } = store.getState();
  const newMsg = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    senderId: currentUser.uid,
    senderName: currentUser.name,
    timestamp: new Date().toISOString(),
    status: 'seen',
    ...msgData
  };

  const currentChatMsgs = messages[activeChatId] || [];
  const updatedMessages = {
    ...messages,
    [activeChatId]: [...currentChatMsgs, newMsg]
  };

  store.updateState({ messages: updatedMessages });
  renderMessages();
  playMessageAudioAlert();
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
