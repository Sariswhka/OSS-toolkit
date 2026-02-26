// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyD-gOlFfhmIZRbcLppAew6f_51fmDdSNBI",
    authDomain: "create-your-qr.firebaseapp.com",
    projectId: "create-your-qr",
    storageBucket: "create-your-qr.firebasestorage.app",
    messagingSenderId: "820217447050",
    appId: "1:820217447050:web:267f56620bca712a2aa373",
    measurementId: "G-187S5HBKCX"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firestore instance (used by UsageTracker in app.js)
const db = firebase.firestore();
