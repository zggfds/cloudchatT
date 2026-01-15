import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache, 
  persistentMultipleTabManager,
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import { User, Message } from '../types';

// ------------------------------------------------------------------
// INSTRUCTION: Replace apiKey with your actual Firebase API Key.
// Project ID updated based on serviceAccountKey.
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyD-REPLACE_WITH_YOUR_KEY",
  authDomain: "nova-3b717.firebaseapp.com",
  projectId: "nova-3b717",
  storageBucket: "nova-3b717.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Initialize Firebase only if not already initialized
let app;
let db: any;

try {
  app = initializeApp(firebaseConfig);
  
  // Initialize Firestore with offline persistence enabled
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (error) {
  console.error("Firebase initialization error.", error);
}

// Collection References
export const usersRef = () => collection(db, 'users');
export const messagesRef = () => collection(db, 'messages');

export const getFirebaseDB = () => db;

const API_URL = 'http://127.0.0.1:3001/api';

/**
 * Check if username exists
 */
export const checkUserExists = async (username: string): Promise<boolean> => {
  const cleanUsername = username.trim().toLowerCase();

  try {
    // Attempt backend check first
    const response = await fetch(`${API_URL}/check-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUsername }),
    });
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.warn("Backend unavailable, checking Firestore directly");
    if (!db) throw new Error("Firebase not initialized");
    
    try {
      const docRef = doc(db, 'users', cleanUsername);
      const snap = await getDoc(docRef);
      return snap.exists();
    } catch (firestoreError: any) {
      // If client is offline and no cache, we can't determine.
      // But throwing here crashes the UI flow.
      console.error("Firestore check failed:", firestoreError);
      if (firestoreError.message && firestoreError.message.includes('offline')) {
          throw new Error("You are offline. Please check your internet connection.");
      }
      throw firestoreError;
    }
  }
};

/**
 * Login User
 */
export const loginUser = async (username: string, password: string): Promise<User> => {
  const cleanUsername = username.trim().toLowerCase();

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUsername, password }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Login failed');
    }
    return await response.json();
  } catch (error: any) {
    if (error.message === 'Invalid password' || error.message === 'User not found') {
      throw error;
    }
    
    console.warn("Backend unavailable, falling back to Firestore Login");
    if (!db) throw new Error("Firebase not initialized");
    
    const docRef = doc(db, 'users', cleanUsername);
    let snap;
    
    try {
        snap = await getDoc(docRef);
    } catch (e: any) {
        if (e.message?.includes('offline')) {
             throw new Error("You are offline. Please check your internet connection.");
        }
        throw e;
    }
    
    if (!snap.exists()) throw new Error("User not found");
    
    const userData = snap.data();

    // FIX FOR LEGACY USERS:
    // If the user exists in Firestore but has no password field,
    // update it with the provided password.
    if (!userData.password) {
        // Only attempt update if online, otherwise allow login locally? 
        // Safer to just allow login if field is missing to avoid blocking.
        // We attempt update in background.
        updateDoc(docRef, { password }).catch(console.error);
        
        return {
            username: userData.username,
            avatar: userData.avatar,
            createdAt: userData.createdAt,
            savedContacts: userData.savedContacts || []
        } as User;
    }

    if (userData.password !== password) {
       throw new Error("Invalid password");
    }

    return {
        username: userData.username,
        avatar: userData.avatar,
        createdAt: userData.createdAt,
        savedContacts: userData.savedContacts || []
    } as User;
  }
};

/**
 * Register User
 */
export const registerUser = async (username: string, password: string, avatarUrl: string): Promise<User> => {
  const cleanUsername = username.trim().toLowerCase();

  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUsername, password, avatar: avatarUrl }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Registration failed');
    }
    return await response.json();
  } catch (error: any) {
    console.warn("Backend unavailable, falling back to Firestore Register");
    if (!db) throw new Error("Firebase not initialized");

    const docRef = doc(db, 'users', cleanUsername);
    let snap;
    try {
        snap = await getDoc(docRef);
    } catch (e: any) {
        if (e.message?.includes('offline')) throw new Error("Offline: Cannot verify username availability.");
        throw e;
    }
    
    if (snap.exists()) throw new Error("Username already exists");

    const newUser = {
      username: cleanUsername,
      password: password,
      avatar: avatarUrl || `https://ui-avatars.com/api/?name=${cleanUsername}&background=random`,
      createdAt: Date.now(),
      savedContacts: []
    };
    
    await setDoc(docRef, newUser);
    
    // Return without password
    const { password: _, ...userReturn } = newUser;
    return userReturn as User;
  }
};

/**
 * Sends a message to a specific user (Client-side Direct to Firestore)
 */
export const sendMessage = async (from: string, to: string, text: string) => {
  if (!db || !text.trim()) return;

  await addDoc(messagesRef(), {
    from,
    to,
    text: text.trim(),
    createdAt: Date.now(),
    participants: [from, to] // Helper array for simpler querying
  });
};

/**
 * Subscribes to messages between two users (Client-side Realtime)
 */
export const subscribeToMessages = (currentUser: string, chatPartner: string, callback: (messages: Message[]) => void) => {
  if (!db) return () => {};

  // Query messages where participants include both users
  // We sort client-side to avoid complex indexes
  const q = query(
    messagesRef(),
    where('participants', 'array-contains', currentUser)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    // onSnapshot automatically handles offline cache events
    const allMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
    
    // Filter client-side for the specific chat partner
    const chatMessages = allMessages.filter(m => 
      (m.from === currentUser && m.to === chatPartner) || 
      (m.from === chatPartner && m.to === currentUser)
    );

    // Sort client-side by time
    chatMessages.sort((a, b) => a.createdAt - b.createdAt);

    callback(chatMessages);
  }, (error) => {
    console.error("Error subscribing to messages:", error);
  });

  return unsubscribe;
};

/**
 * Subscribes to the list of all users (for the sidebar)
 */
export const subscribeToUsers = (currentUser: string, callback: (users: User[]) => void) => {
  if (!db) return () => {};

  const q = query(usersRef(), orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs
      .map(doc => doc.data() as User)
      .filter(u => u.username !== currentUser); // Exclude self
    callback(users);
  }, (error) => {
    console.error("Error subscribing to users:", error);
  });
};

/**
 * Subscribe to Current User Data (Real-time updates for Saved Contacts)
 */
export const subscribeToUserData = (username: string, callback: (user: User) => void) => {
  if (!db) return () => {};
  
  const docRef = doc(db, 'users', username);
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as User);
    }
  });
}

/**
 * Toggle Saved Contact (Add/Remove from savedContacts array)
 */
export const toggleSavedContact = async (currentUser: string, targetUser: string, isSaved: boolean) => {
    if (!db) return;
    const userRef = doc(db, 'users', currentUser);
    
    if (isSaved) {
        // Remove
        await updateDoc(userRef, {
            savedContacts: arrayRemove(targetUser)
        });
    } else {
        // Add
        await updateDoc(userRef, {
            savedContacts: arrayUnion(targetUser)
        });
    }
}