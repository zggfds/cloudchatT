const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const serviceAccount = require('./serviceAccountKey.json');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// API Routes

/**
 * POST /api/check-user
 * Checks if a username already exists
 */
app.post('/api/check-user', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });

    const cleanUsername = username.trim().toLowerCase();
    const userRef = db.collection('users').doc(cleanUsername);
    const userDoc = await userRef.get();

    return res.status(200).json({ exists: userDoc.exists });
  } catch (error) {
    console.error('Error in /api/check-user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/login
 * Verifies username and password
 */
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const userRef = db.collection('users').doc(cleanUsername);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    // FIX FOR LEGACY USERS:
    // If the user exists but has NO password (created before auth was added),
    // we update the user with the provided password now.
    if (!userData.password) {
        await userRef.update({ password: password });
        
        // Return success immediately
        const { password: _, ...userWithoutPassword } = userData;
        return res.status(200).json(userWithoutPassword);
    }

    // In a real production app, compare hashed passwords here.
    // For this prototype, we are comparing plaintext.
    if (userData.password !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Don't send password back to client
    const { password: _, ...userWithoutPassword } = userData;
    return res.status(200).json(userWithoutPassword);

  } catch (error) {
    console.error('Error in /api/login:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/register
 * Creates a new user with password
 */
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, avatar } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const userRef = db.collection('users').doc(cleanUsername);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const newUser = {
      username: cleanUsername,
      password: password, // Storing plaintext for prototype simplicity
      avatar: avatar || `https://ui-avatars.com/api/?name=${cleanUsername}&background=random`,
      createdAt: Date.now(),
      savedContacts: [] // Initialize empty saved contacts
    };
    
    await userRef.set(newUser);

    // Return user without password
    const { password: _, ...userResponse } = newUser;
    return res.status(201).json(userResponse);

  } catch (error) {
    console.error('Error in /api/register:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
});