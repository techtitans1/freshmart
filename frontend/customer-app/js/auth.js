// ==================== FIREBASE AUTHENTICATION ====================
// Complete Auth with Email/Password, Google Sign-in, Realtime Database

// ==================== FIREBASE CONFIGURATION ====================
const firebaseConfig = {
    apiKey: "AIzaSyDf4QSE3kw9HQD_ZWJ-DDZ8yN3hgRp4UaM",
    authDomain: "otp-auth-ff7fb.firebaseapp.com",
    projectId: "otp-auth-ff7fb",
    storageBucket: "otp-auth-ff7fb.firebasestorage.app",
    messagingSenderId: "945314024888",
    appId: "1:945314024888:web:1eb577611a4de09757934d",
    measurementId: "G-6HMXTKV0SQ"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// ==================== FIRESTORE OPERATIONS ====================
async function saveUserToFirestore(user, provider, extraData = {}) {
    try {
        const ref = db.collection("users").doc(user.uid);
        const snap = await ref.get();

        const baseData = {
            uid: user.uid,
            name: user.displayName || extraData.name || "User",
            email: user.email,
            photo: user.photoURL || "",
            role: "user",
            isNewUser: !snap.exists,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!snap.exists) {
            // New user - create document
            await ref.set({
                ...baseData,
                providers: [provider],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                ...extraData
            });
            console.log('✅ New user saved to Firestore');
        } else {
            // Existing user - update document
            const updateData = {
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                providers: firebase.firestore.FieldValue.arrayUnion(provider)
            };
            
            // Only update fields that have values
            if (extraData.name) updateData.name = extraData.name;
            if (extraData.phone) updateData.phone = extraData.phone;
            if (extraData.address) updateData.address = extraData.address;
            if (extraData.city) updateData.city = extraData.city;
            if (extraData.state) updateData.state = extraData.state;
            if (extraData.pincode) updateData.pincode = extraData.pincode;
            if (user.photoURL) updateData.photo = user.photoURL;
            
            await ref.update(updateData);
            console.log('✅ Existing user updated in Firestore');
        }
        
        return true;
    } catch (error) {
        console.error('❌ Firestore save error:', error);
        throw error;
    }
}

async function isPhoneAlreadyExists(phone, currentUid = null) {
    try {
        const snapshot = await db
            .collection("users")
            .where("phone", "==", phone)
            .get();

        if (snapshot.empty) return false;

        // If currentUid provided, exclude it from the check
        if (currentUid) {
            return snapshot.docs.some(doc => doc.id !== currentUid);
        }
        
        // Otherwise any match means phone exists
        return true;
    } catch (error) {
        console.error('❌ Error checking phone:', error);
        // In case of Firestore error, don't block signup
        return false;
    }
}

// ==================== STATE ====================
let pendingGoogleUser = null;
let redirectUrl = null;

// ==================== DOM HELPERS ====================
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Auth system initializing...');
    
    // Get redirect URL from query params
    const params = new URLSearchParams(window.location.search);
    redirectUrl = params.get('redirect');
    
    if (redirectUrl) {
        console.log('📍 Redirect URL detected:', redirectUrl);
    }
    
    // Bind events based on page
    if ($('loginForm')) {
        console.log('📄 Login page detected');
        bindLoginEvents();
    }
    
    if ($('signupForm')) {
        console.log('📄 Signup page detected');
        bindSignupEvents();
    }
    
    // Common events
    bindCommonEvents();
    
    // Check if user is already logged in
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log('👤 User already logged in:', user.email);
            // Optional: Auto-redirect if already logged in
            // handleRedirect();
        }
    });
});

// ==================== LOGIN EVENTS ====================
function bindLoginEvents() {
    $('loginForm')?.addEventListener('submit', handleLogin);
    $('googleLoginBtn')?.addEventListener('click', handleGoogleAuth);
    
    $('togglePassword')?.addEventListener('click', () => {
        togglePassword('password', 'togglePassword');
    });
    
    $('forgotPasswordLink')?.addEventListener('click', e => {
        e.preventDefault();
        $('forgotPasswordModal')?.classList.add('active');
    });
    
    $('closeForgotModal')?.addEventListener('click', () => {
        $('forgotPasswordModal')?.classList.remove('active');
    });
    
    $('forgotPasswordForm')?.addEventListener('submit', handleForgotPassword);
    $('completeProfileForm')?.addEventListener('submit', handleCompleteProfile);
}

// ==================== SIGNUP EVENTS ====================
function bindSignupEvents() {
    $('signupForm')?.addEventListener('submit', handleSignup);
    $('googleSignupBtn')?.addEventListener('click', handleGoogleAuth);
    
    $$('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.dataset.target;
            togglePassword(targetId, null, this);
        });
    });
    
    $('password')?.addEventListener('input', checkPasswordStrength);
    
    $('phone')?.addEventListener('input', e => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    });
    
    $('pincode')?.addEventListener('input', e => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
    });
    
    $('completeProfileForm')?.addEventListener('submit', handleCompleteProfile);
}

// ==================== COMMON EVENTS ====================
function bindCommonEvents() {
    $$('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target === modal && modal.id !== 'completeProfileModal') {
                modal.classList.remove('active');
            }
        });
    });
    
    $('profilePhone')?.addEventListener('input', e => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    });
    
    $('profilePincode')?.addEventListener('input', e => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
    });
    
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            $('forgotPasswordModal')?.classList.remove('active');
        }
    });
}

// ==================== EMAIL/PASSWORD LOGIN ====================
async function handleLogin(e) {
    e.preventDefault();
    console.log('🔐 Login attempt started');
    
    const email = $('email')?.value.trim();
    const password = $('password')?.value;
    const rememberMe = $('rememberMe')?.checked;
    
    if (!email || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
    }
    
    showLoading('Logging in...');
    
    try {
        const persistence = rememberMe 
            ? firebase.auth.Auth.Persistence.LOCAL 
            : firebase.auth.Auth.Persistence.SESSION;
        
        await auth.setPersistence(persistence);
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('✅ Login successful:', user.email);
        
        await saveUserToFirestore(user, "password");
        
        hideLoading();
        toast('Login successful!', 'success');
        
        setTimeout(() => {
            console.log('🔄 Redirecting...');
            handleRedirect();
        }, 1000);
        
    } catch (error) {
        hideLoading();
        console.error('❌ Login error:', error);
        handleAuthError(error);
    }
}

// ==================== EMAIL/PASSWORD SIGNUP ====================
async function handleSignup(e) {
    e.preventDefault();
    console.log('📝 Signup attempt started');
    
    const fullName = $('fullName')?.value.trim();
    const email = $('email')?.value.trim();
    const phone = $('phone')?.value.trim();
    const password = $('password')?.value;
    const confirmPassword = $('confirmPassword')?.value;
    const address = $('address')?.value.trim();
    const city = $('city')?.value.trim();
    const state = $('state')?.value.trim();
    const pincode = $('pincode')?.value.trim();
    const termsChecked = $('termsCheck')?.checked;
    
    // Validation
    if (!fullName || !email || !phone || !password || !address || !city || !pincode) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
    }
    
    if (phone.length !== 10) {
        showMessage('Please enter a valid 10-digit phone number', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }
    
    if (pincode.length !== 6) {
        showMessage('Please enter a valid 6-digit pincode', 'error');
        return;
    }
    
    if (!termsChecked) {
        showMessage('Please accept the Terms of Service', 'error');
        return;
    }
    
    showLoading('Creating your account...');

    let userCredential = null;
    
    try {
        // Check if phone exists BEFORE creating auth account
        console.log('📞 Checking phone availability...');
        const phoneExists = await isPhoneAlreadyExists(phone);
        if (phoneExists) {
            hideLoading();
            showMessage("This phone number is already registered.", "error");
            return;
        }

        // Create the auth account
        console.log('🔑 Creating authentication account...');
        userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log('✅ Auth account created:', user.email);

        // Update display name
        await user.updateProfile({ displayName: fullName });
        
        // Save to Firestore
        console.log('💾 Saving user profile to database...');
        await saveUserToFirestore(user, "password", {
            name: fullName,
            phone,
            address,
            city,
            state: state || "",
            pincode
        });
        
        hideLoading();
        toast('Account created successfully!', 'success');
        
        console.log('✅ Signup complete, redirecting in 1.5 seconds...');
        
        setTimeout(() => {
            console.log('🔄 Redirecting to:', redirectUrl || 'index.html');
            handleRedirect();
        }, 1500);
        
    } catch (error) {
        hideLoading();
        console.error('❌ Signup error:', error);
        
        // If user was created but error occurred after, attempt rollback
        if (userCredential && userCredential.user) {
            try {
                console.log('🔙 Rolling back partially created user...');
                await userCredential.user.delete();
                console.log('✅ User rollback successful');
            } catch (deleteError) {
                console.error('❌ Could not rollback user:', deleteError);
                showMessage('Account partially created. Please use "Forgot Password" to complete setup.', 'error');
                return;
            }
        }
        
        handleAuthError(error);
    }
}

// ==================== GOOGLE AUTHENTICATION ====================
async function handleGoogleAuth() {
    console.log('🔷 Google Auth started');
    showLoading('Connecting to Google...');
    
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        const isNewUser = result.additionalUserInfo?.isNewUser;
        
        console.log('✅ Google auth successful:', user.email, 'New user:', isNewUser);

        if (isNewUser) {
            pendingGoogleUser = user;
            hideLoading();
            showCompleteProfileModal(user);
        } else {
            // Existing user - just update lastLogin
            await saveUserToFirestore(user, "google");
            hideLoading();
            toast('Login successful!', 'success');
            
            setTimeout(() => {
                console.log('🔄 Redirecting...');
                handleRedirect();
            }, 1000);
        }

    } catch (error) {
        hideLoading();
        console.error('❌ Google auth error:', error);
        
        // Handle account linking
        if (error.code === 'auth/account-exists-with-different-credential') {
            try {
                await linkGoogleAccount(error);
            } catch (linkError) {
                handleAuthError(linkError);
            }
        } else {
            handleAuthError(error);
        }
    }
}

async function linkGoogleAccount(error) {
    console.log('🔗 Attempting to link Google account...');
    const email = error.customData?.email || error.email;
    const pendingCred = error.credential;

    const password = prompt(
        "This email already exists. Enter your password to link Google login."
    );

    if (!password) {
        throw new Error('Password required for account linking');
    }

    try {
        const userCred = await auth.signInWithEmailAndPassword(email, password);
        await userCred.user.linkWithCredential(pendingCred);
        await saveUserToFirestore(userCred.user, "google");

        console.log('✅ Google account linked successfully');
        toast('Google account linked successfully!', 'success');
        
        setTimeout(() => handleRedirect(), 1000);
    } catch (linkError) {
        console.error('❌ Account linking failed:', linkError);
        throw linkError;
    }
}

// ==================== COMPLETE PROFILE (Google Users) ====================
function showCompleteProfileModal(user) {
    console.log('📋 Showing complete profile modal');
    const modal = $('completeProfileModal');
    const photo = $('googleUserPhoto');
    const name = $('googleUserName');
    
    if (photo) photo.src = user.photoURL || 'https://via.placeholder.com/80?text=User';
    if (name) name.textContent = `Welcome, ${user.displayName || 'User'}!`;
    
    modal?.classList.add('active');
}

async function handleCompleteProfile(e) {
    e.preventDefault();
    console.log('📝 Completing Google user profile...');
    
    if (!pendingGoogleUser) {
        showMessage('Session expired. Please try again.', 'error');
        return;
    }
    
    const phone = $('profilePhone')?.value.trim();
    const address = $('profileAddress')?.value.trim();
    const city = $('profileCity')?.value.trim();
    const pincode = $('profilePincode')?.value.trim();
    const state = $('profileState')?.value.trim();
    
    // Validation
    if (!phone || phone.length !== 10) {
        toast('Please enter a valid 10-digit phone number', 'error');
        return;
    }
    
    if (!address) {
        toast('Please enter your address', 'error');
        return;
    }
    
    if (!city) {
        toast('Please enter your city', 'error');
        return;
    }
    
    if (!pincode || pincode.length !== 6) {
        toast('Please enter a valid 6-digit pincode', 'error');
        return;
    }
    
    showLoading('Saving your profile...');

    try {
        const user = pendingGoogleUser;
        
        // Check phone uniqueness
        console.log('📞 Checking phone availability...');
        const phoneExists = await isPhoneAlreadyExists(phone, user.uid);
        if (phoneExists) {
            hideLoading();
            toast("This phone number is already registered.", "error");
            return;
        }

        // Save profile
        console.log('💾 Saving profile to database...');
        await saveUserToFirestore(user, "google", {
            phone,
            address,
            city,
            state: state || "",
            pincode
        });
        
        pendingGoogleUser = null;
        $('completeProfileModal')?.classList.remove('active');
        
        hideLoading();
        toast('Profile completed successfully!', 'success');
        
        console.log('✅ Profile complete, redirecting...');
        setTimeout(() => {
            handleRedirect();
        }, 1000);
        
    } catch (error) {
        hideLoading();
        console.error('❌ Profile completion error:', error);
        toast('Failed to save profile. Please try again.', 'error');
    }
}

// ==================== FORGOT PASSWORD ====================
async function handleForgotPassword(e) {
    e.preventDefault();
    console.log('🔑 Password reset requested');
    
    const email = $('resetEmail')?.value.trim();
    
    if (!email || !validateEmail(email)) {
        toast('Please enter a valid email address', 'error');
        return;
    }
    
    showLoading('Sending reset link...');
    
    try {
        await auth.sendPasswordResetEmail(email);
        
        hideLoading();
        $('forgotPasswordModal')?.classList.remove('active');
        toast('Password reset link sent to your email!', 'success');
        console.log('✅ Password reset email sent');
        
    } catch (error) {
        hideLoading();
        console.error('❌ Password reset error:', error);
        handleAuthError(error);
    }
}

// ==================== UTILITIES ====================
function validateEmail(email) {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
}

function togglePassword(inputId, buttonId, buttonEl) {
    const input = $(inputId);
    const button = buttonId ? $(buttonId) : buttonEl;
    
    if (!input) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        button?.querySelector('i')?.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        button?.querySelector('i')?.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

function checkPasswordStrength() {
    const password = $('password')?.value;
    const strengthEl = $('passwordStrength');
    const fillEl = $('strengthFill');
    const textEl = $('strengthText');
    
    if (!strengthEl || !fillEl || !textEl) return;
    
    if (!password) {
        strengthEl.classList.add('hidden');
        return;
    }
    
    strengthEl.classList.remove('hidden');
    
    let strength = 0;
    let label = 'Weak';
    
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    if (strength <= 2) {
        label = 'Weak';
        fillEl.className = 'strength-fill weak';
        textEl.className = 'strength-text weak';
    } else if (strength === 3) {
        label = 'Fair';
        fillEl.className = 'strength-fill fair';
        textEl.className = 'strength-text fair';
    } else if (strength === 4) {
        label = 'Good';
        fillEl.className = 'strength-fill good';
        textEl.className = 'strength-text good';
    } else {
        label = 'Strong';
        fillEl.className = 'strength-fill strong';
        textEl.className = 'strength-text strong';
    }
    
    textEl.textContent = label;
}

function handleAuthError(error) {
    console.error('🔴 Auth error details:', error.code, error.message);
    
    let message = 'An error occurred. Please try again.';
    
    switch (error.code) {
        case 'auth/email-already-in-use':
            message = 'This email is already registered. Please login.';
            break;
        case 'auth/invalid-email':
            message = 'Invalid email address.';
            break;
        case 'auth/weak-password':
            message = 'Password is too weak. Use at least 6 characters.';
            break;
        case 'auth/user-not-found':
            message = 'No account found with this email.';
            break;
        case 'auth/wrong-password':
            message = 'Incorrect password. Please try again.';
            break;
        case 'auth/invalid-credential':
            message = 'Invalid email or password. Please try again.';
            break;
        case 'auth/too-many-requests':
            message = 'Too many attempts. Please try again later.';
            break;
        case 'auth/popup-closed-by-user':
            message = 'Sign-in cancelled. Please try again.';
            break;
        case 'auth/network-request-failed':
            message = 'Network error. Check your connection.';
            break;
        case 'auth/operation-not-allowed':
            message = 'This sign-in method is not enabled. Contact support.';
            break;
        case 'auth/popup-blocked':
            message = 'Popup was blocked. Please allow popups for this site.';
            break;
        default:
            if (error.message) {
                message = error.message;
            }
    }
    
    showMessage(message, 'error');
}

function handleRedirect() {
    const targetUrl = redirectUrl === 'cart' ? 'cart.html' : 'index.html';
    console.log('🚀 Redirecting to:', targetUrl);
    
    // Use replace to prevent back button issues
    window.location.replace(targetUrl);
}

// ==================== UI HELPERS ====================
function showMessage(text, type) {
    console.log(`💬 Message (${type}):`, text);
    
    const messageEl = $('authMessage');
    const textEl = $('messageText');
    
    if (!messageEl || !textEl) {
        // Fallback to toast if message elements don't exist
        toast(text, type);
        return;
    }
    
    textEl.textContent = text;
    messageEl.className = `auth-message ${type}`;
    messageEl.classList.remove('hidden');
    
    if (type === 'error') {
        setTimeout(() => messageEl.classList.add('hidden'), 5000);
    }
}

function toast(msg, type = 'success') {
    console.log(`🍞 Toast (${type}):`, msg);
    
    const toastEl = $('toast');
    const msgEl = $('toastMsg');
    const iconEl = $('toastIcon');
    
    if (!toastEl) {
        // Create toast if it doesn't exist
        const newToast = document.createElement('div');
        newToast.id = 'toast';
        newToast.className = `toast ${type}`;
        newToast.innerHTML = `
            <i id="toastIcon" class="fas fa-check-circle"></i>
            <span id="toastMsg">${msg}</span>
        `;
        document.body.appendChild(newToast);
        
        setTimeout(() => {
            newToast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            newToast.classList.remove('show');
            setTimeout(() => newToast.remove(), 300);
        }, 4000);
        
        return;
    }
    
    if (msgEl) msgEl.textContent = msg;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    if (iconEl) iconEl.className = `fas ${icons[type] || icons.success}`;
    
    toastEl.className = `toast ${type} show`;
    
    setTimeout(() => toastEl.classList.remove('show'), 4000);
}

function showLoading(text = 'Please wait...') {
    console.log('⏳ Loading:', text);
    const loadingEl = $('loading');
    const textEl = $('loadingText');
    
    if (textEl) textEl.textContent = text;
    if (loadingEl) loadingEl.classList.remove('hidden');
}

function hideLoading() {
    console.log('✅ Loading complete');
    const loadingEl = $('loading');
    if (loadingEl) loadingEl.classList.add('hidden');
}

// ==================== EXPORTS ====================
window.handleGoogleAuth = handleGoogleAuth;
window.handleCompleteProfile = handleCompleteProfile;

// ==================== CONSOLE ====================
console.log('%c🔐 FreshMart Auth System v2.0 Ready!', 'color:#2e7d32;font-size:16px;font-weight:bold');
console.log('%c📱 Firebase Auth + Firestore Enabled', 'color:#666');
console.log('%c🔧 Debug mode: Check console for detailed logs', 'color:#ff9800');

// ==================== ERROR BOUNDARY ====================
window.addEventListener('unhandledrejection', event => {
    console.error('⚠️ Unhandled promise rejection:', event.reason);
    hideLoading();
    toast('An unexpected error occurred. Please refresh and try again.', 'error');
});