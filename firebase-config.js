// Firebase Configuration and Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC1Ea_-jV5jm3B74LAot2Z-IBWTJqAgsJM",
    authDomain: "clean-city-63aff.firebaseapp.com",
    projectId: "clean-city-63aff",
    storageBucket: "clean-city-63aff.firebasestorage.app",
    messagingSenderId: "835390454356",
    appId: "1:835390454356:web:5ba1db4b1eb010af75cbc1",
    measurementId: "G-8T8L7NG88T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Export auth instance
export { auth };
