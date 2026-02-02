// Authentication Functions
import { auth } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Global current user
let currentUser = null;
let currentUserRole = 'user'; // 'user' or 'admin'

// Initialize auth state observer
function initAuthObserver() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            // Fetch user profile from MongoDB to get role
            const profile = await getUserProfile(user.uid);
            currentUserRole = profile?.role || 'user';
            console.log('User authenticated:', user.email, 'Role:', currentUserRole);
        } else {
            currentUser = null;
            currentUserRole = 'user';
            console.log('User signed out');
        }
    });
}

// Sign Up with Email/Password
async function signUpWithEmail(email, password, name) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create user profile in MongoDB
        await createUserProfile({
            uid: user.uid,
            email: user.email,
            name: name,
            role: 'user', // Default role
            createdAt: new Date().toISOString()
        });

        showToast('Account created successfully! 🎉');
        return { success: true, user };
    } catch (error) {
        let message = 'Sign up failed';
        if (error.code === 'auth/email-already-in-use') {
            message = 'Email already in use';
        } else if (error.code === 'auth/weak-password') {
            message = 'Password should be at least 6 characters';
        } else if (error.code === 'auth/invalid-email') {
            message = 'Invalid email address';
        }
        showToast(message);
        return { success: false, error: message };
    }
}

// Sign In with Email/Password
async function signInWithEmail(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Fetch user profile to get role
        const profile = await getUserProfile(user.uid);
        currentUserRole = profile?.role || 'user';

        showToast('Welcome back! 👋');
        return { success: true, user, role: currentUserRole };
    } catch (error) {
        let message = 'Login failed';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            message = 'Invalid email or password';
        } else if (error.code === 'auth/invalid-email') {
            message = 'Invalid email address';
        } else if (error.code === 'auth/invalid-credential') {
            message = 'Invalid credentials';
        }
        showToast(message);
        return { success: false, error: message };
    }
}

// Sign Out
async function signOutUser() {
    try {
        await signOut(auth);
        currentUser = null;
        currentUserRole = 'user';
        showToast('Signed out successfully');
        return { success: true };
    } catch (error) {
        showToast('Sign out failed');
        return { success: false, error: error.message };
    }
}

// Password Reset
async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        showToast('Password reset email sent! Check your inbox 📧');
        return { success: true };
    } catch (error) {
        let message = 'Password reset failed';
        if (error.code === 'auth/user-not-found') {
            message = 'No account found with this email';
        } else if (error.code === 'auth/invalid-email') {
            message = 'Invalid email address';
        }
        showToast(message);
        return { success: false, error: message };
    }
}

// Create user profile in MongoDB
async function createUserProfile(userData) {
    try {
        const response = await fetch('http://localhost:5000/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        return await response.json();
    } catch (error) {
        console.error('Failed to create user profile:', error);
        return null;
    }
}

// Get user profile from MongoDB
async function getUserProfile(uid) {
    try {
        const response = await fetch(`http://localhost:5000/api/users/${uid}`);
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch user profile:', error);
        return null;
    }
}

// Check if current user is admin
function isAdmin() {
    return currentUserRole === 'admin';
}

// Get current user
function getCurrentUser() {
    return currentUser;
}

// Check if user is authenticated
function isAuthenticated() {
    return currentUser !== null;
}

// Export functions
window.authFunctions = {
    initAuthObserver,
    signUpWithEmail,
    signInWithEmail,
    signOutUser,
    resetPassword,
    isAdmin,
    getCurrentUser,
    isAuthenticated
};
