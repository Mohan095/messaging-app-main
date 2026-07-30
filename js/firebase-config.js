/* ==========================================
   FIREBASE CONFIG & DEMO FALLBACK ENGINE
   ========================================== */

// Standard Firebase Configuration Placeholder
// Fill in your project keys here to connect to live Firebase services
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.apiKey !== "" && firebaseConfig.projectId !== ""
);

console.log(
  isFirebaseConfigured
    ? "🔥 Firebase Client Initialized with live configuration."
    : "⚡ Operating in Full Demo Engine Mode (Local Storage & Reactive Bus)."
);

/**
 * Storage Helper for Media Uploads (Base64 / Blob to Data URL fallback)
 */
export async function uploadFileToStorage(file, folder = "uploads") {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file provided"));
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Firebase Firestore Data Access Helpers (Restricted to Authorized User/Member Data)
 */
export async function syncContactToFirebase(currentUserId, contact) {
  if (typeof firebase === 'undefined' || !firebase.apps.length || !currentUserId || !contact) return;
  try {
    const db = firebase.firestore();
    // Path: users/{currentUserId}/contacts/{contact.uid} - Restricts read/write access exclusively to current user
    await db.collection('users').doc(currentUserId).collection('contacts').doc(contact.uid).set({
      ...contact,
      ownerUid: currentUserId,
      syncedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`🔥 Contact "${contact.name}" synced to Firebase Firestore under user ${currentUserId}.`);
  } catch (err) {
    console.warn("Firestore Contact sync notice:", err.message);
  }
}

export async function deleteContactFromFirebase(currentUserId, contactUid) {
  if (typeof firebase === 'undefined' || !firebase.apps.length || !currentUserId || !contactUid) return;
  try {
    const db = firebase.firestore();
    await db.collection('users').doc(currentUserId).collection('contacts').doc(contactUid).delete();
    console.log(`🔥 Contact "${contactUid}" deleted from Firebase Firestore.`);
  } catch (err) {
    console.warn("Firestore Contact delete notice:", err.message);
  }
}

export async function loadUserContactsFromFirebase(currentUserId) {
  if (typeof firebase === 'undefined' || !firebase.apps.length || !currentUserId) return [];
  try {
    const db = firebase.firestore();
    const snapshot = await db.collection('users').doc(currentUserId).collection('contacts').get();
    return snapshot.docs.map(doc => doc.data());
  } catch (err) {
    console.warn("Firestore Contact fetch notice:", err.message);
    return [];
  }
}

export async function findUserByMobileInFirebase(mobileNumber) {
  if (typeof firebase === 'undefined' || !firebase.apps.length || !mobileNumber) return null;
  try {
    const db = firebase.firestore();
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
    console.warn("Firestore user search notice:", err.message);
    return null;
  }
}

let unsubscribeContacts = null;
export function setupFirebaseContactsListener(currentUserId, onUpdate) {
  if (typeof firebase === 'undefined' || !firebase.apps.length || !currentUserId) return;
  if (unsubscribeContacts) {
    try { unsubscribeContacts(); } catch (e) {}
  }
  try {
    const db = firebase.firestore();
    unsubscribeContacts = db.collection('users').doc(currentUserId).collection('contacts')
      .onSnapshot((snapshot) => {
        const contacts = snapshot.docs.map(doc => doc.data());
        if (onUpdate && typeof onUpdate === 'function') {
          onUpdate(contacts);
        }
      }, (err) => console.warn("Contacts snapshot notice:", err.message));
  } catch (err) {}
}

let unsubscribeMessages = null;
export function setupFirebaseMessagesListener(currentUserId, onUpdate) {
  if (typeof firebase === 'undefined' || !firebase.apps.length || !currentUserId) return;
  if (unsubscribeMessages) {
    try { unsubscribeMessages(); } catch (e) {}
  }
  try {
    const db = firebase.firestore();
    unsubscribeMessages = db.collection('messages')
      .onSnapshot((snapshot) => {
        const msgs = snapshot.docs.map(doc => doc.data());
        if (onUpdate && typeof onUpdate === 'function') {
          onUpdate(msgs);
        }
      }, (err) => console.warn("Messages snapshot notice:", err.message));
  } catch (err) {}
}

export async function syncGroupToFirebase(group) {
  if (typeof firebase === 'undefined' || !firebase.apps.length || !group) return;
  try {
    const db = firebase.firestore();
    // Path: groups/{group.id} - Access policy requires request.auth.uid in resource.data.members
    await db.collection('groups').doc(group.id).set({
      ...group,
      syncedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`🔥 Group "${group.name}" synced to Firebase Firestore (Members restricted).`);
  } catch (err) {
    console.warn("Firestore Group sync notice:", err.message);
  }
}

export async function loadUserGroupsFromFirebase(currentUserId) {
  if (typeof firebase === 'undefined' || !firebase.apps.length || !currentUserId) return [];
  try {
    const db = firebase.firestore();
    // Fetch only groups where the current user is a member
    const snapshot = await db.collection('groups').where('members', 'array-contains', currentUserId).get();
    return snapshot.docs.map(doc => doc.data());
  } catch (err) {
    console.warn("Firestore Group fetch notice:", err.message);
    return [];
  }
}

