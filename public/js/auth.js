// Authentication Logic
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// DOM Elements
const loginSection = document.getElementById('loginSection');
const appSection   = document.getElementById('appSection');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn    = document.getElementById('logoutBtn');
const userName     = document.getElementById('userName');
const userPhoto    = document.getElementById('userPhoto');

// ── Auth State Observer ──────────────────────────────────────────────────────
auth.onAuthStateChanged((user) => {
    if (user) {
        loginSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        userName.textContent = user.displayName || user.email;
        userPhoto.src = user.photoURL ||
            'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'User');
        googleLoginBtn.textContent = 'Sign in with Google';
        googleLoginBtn.disabled = false;
        localStorage.removeItem('authRedirectPending');
        hideLoginMessage();
        if (typeof UsageTracker !== 'undefined') UsageTracker.init(user.uid);
    } else {
        loginSection.classList.remove('hidden');
        appSection.classList.add('hidden');
        if (typeof UsageTracker !== 'undefined') UsageTracker.stop();
    }
});

// ── Redirect result handler (only runs when returning from Google redirect) ──
if (localStorage.getItem('authRedirectPending')) {
    showLoginInfo('Completing sign-in, please wait...');
    auth.getRedirectResult()
        .then(() => {
            localStorage.removeItem('authRedirectPending');
            hideLoginMessage();
        })
        .catch((error) => {
            localStorage.removeItem('authRedirectPending');
            hideLoginMessage();
            if (error.code) {
                console.error('Redirect login error:', error);
                showLoginError(error.code);
            }
        });
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function showLoginInfo(msg) {
    const el = document.getElementById('loginError');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('login-info');
    el.style.display = 'block';
}

function hideLoginMessage() {
    const el = document.getElementById('loginError');
    if (!el) return;
    el.style.display = 'none';
    el.classList.remove('login-info');
}

function showLoginError(code) {
    const messages = {
        'auth/network-request-failed': 'Network error. Please check your connection and try again.',
        'auth/too-many-requests':      'Too many attempts. Please wait a moment and try again.',
        'auth/user-disabled':          'This account has been disabled.',
        'auth/unauthorized-domain':    'This domain is not authorised. Please contact support.',
        'auth/account-exists-with-different-credential': 'An account already exists with a different sign-in method.'
    };
    const el = document.getElementById('loginError');
    if (!el) return;
    el.textContent = messages[code] || 'Sign-in failed. Please try again.';
    el.classList.remove('login-info');
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 6000);
}

// ── Sign In — popup first, redirect as automatic fallback ────────────────────
const POPUP_FAIL_CODES = new Set([
    'auth/popup-closed-by-user',
    'auth/popup-blocked',
    'auth/cancelled-popup-request',
    'auth/operation-not-supported-in-this-environment'
]);

googleLoginBtn.addEventListener('click', () => {
    googleLoginBtn.textContent = 'Signing in...';
    googleLoginBtn.disabled = true;

    auth.signInWithPopup(provider)
        .catch((error) => {
            console.error('Login error:', error);
            if (POPUP_FAIL_CODES.has(error.code)) {
                // Popup failed — fall back to full-page redirect
                localStorage.setItem('authRedirectPending', '1');
                auth.signInWithRedirect(provider);
            } else {
                googleLoginBtn.textContent = 'Sign in with Google';
                googleLoginBtn.disabled = false;
                showLoginError(error.code);
            }
        });
});

// ── Logout ───────────────────────────────────────────────────────────────────
logoutBtn.addEventListener('click', () => {
    auth.signOut();
});
