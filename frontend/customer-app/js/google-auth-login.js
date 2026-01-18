// ==================== GOOGLE AUTHENTICATION STANDALONE ====================
// Clean implementation to avoid conflicts with existing auth.js

(function() {
    'use strict';
    
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

    // ==================== INITIALIZATION ====================
    let app, auth, db;
    let isInitialized = false;

    function initializeFirebase() {
        try {
            // Check if Firebase is already initialized
            if (typeof firebase === 'undefined') {
                console.error('❌ Firebase SDK not loaded');
                return false;
            }

            // Use existing app or create new one
            if (firebase.apps && firebase.apps.length > 0) {
                console.log('✅ Using existing Firebase app');
                app = firebase.apps[0];
            } else {
                console.log('✅ Initializing new Firebase app');
                app = firebase.initializeApp(firebaseConfig);
            }

            // Get auth and firestore instances
            auth = firebase.auth(app);
            db = firebase.firestore(app);
            
            isInitialized = true;
            console.log('✅ Firebase services ready');
            return true;
            
        } catch (error) {
            console.error('❌ Firebase initialization error:', error);
            return false;
        }
    }

    // ==================== GOOGLE AUTH HANDLER ====================
    const GoogleAuthHandler = {
        currentUser: null,
        pendingUser: null,
        
        // Initialize
        init() {
            if (!initializeFirebase()) {
                console.error('❌ Failed to initialize Firebase');
                return;
            }
            
            this.bindEvents();
            this.checkAuthState();
            console.log('🔷 Google Auth Handler initialized');
        },
        
        // Bind button events
        bindEvents() {
            // Wait for DOM to be ready
            const bindButtons = () => {
                // Find all Google sign-in buttons
                const buttons = document.querySelectorAll(
                    '.google-signin-btn, ' +
                    '.google-login-btn, ' +
                    '#googleLoginBtn, ' +
                    '#googleSignInBtn, ' +
                    '[data-google-login], ' +
                    '[onclick*="googleSignIn"]'
                );
                
                buttons.forEach(btn => {
                    // Remove any existing onclick attributes
                    btn.removeAttribute('onclick');
                    
                    // Add new event listener
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔷 Google button clicked');
                        this.handleGoogleSignIn();
                    }, { once: false });
                    
                    console.log('✅ Event bound to button:', btn);
                });
                
                if (buttons.length === 0) {
                    console.warn('⚠️ No Google sign-in buttons found');
                }
            };
            
            // Bind immediately and after DOM load
            bindButtons();
            
            if (document.readyState !== 'complete') {
                window.addEventListener('load', bindButtons);
            }
        },
        
        // Check auth state
        checkAuthState() {
            if (!auth) return;
            
            auth.onAuthStateChanged((user) => {
                if (user) {
                    console.log('👤 User signed in:', user.email);
                    this.currentUser = user;
                    this.onUserSignedIn(user);
                } else {
                    console.log('👤 No user signed in');
                    this.currentUser = null;
                }
            });
        },
        
        // Handle Google Sign In
        async handleGoogleSignIn() {
            console.log('🔷 Starting Google Sign-in process...');
            
            if (!isInitialized) {
                console.error('❌ Firebase not initialized');
                this.showMessage('Authentication service not ready', 'error');
                return;
            }
            
            this.showLoading('Connecting to Google...');
            
            try {
                // Create a fresh provider instance
                const provider = new firebase.auth.GoogleAuthProvider();
                
                // Configure provider
                provider.addScope('email');
                provider.addScope('profile');
                provider.setCustomParameters({
                    'prompt': 'select_account'
                });
                
                console.log('🔹 Provider configured, attempting sign-in...');
                
                // Try sign in with popup
                let result;
                try {
                    result = await auth.signInWithPopup(provider);
                    console.log('✅ Popup sign-in successful');
                } catch (popupError) {
                    console.error('❌ Popup error:', popupError);
                    
                    // If popup fails, try redirect
                    if (popupError.code === 'auth/popup-blocked' || 
                        popupError.code === 'auth/popup-closed-by-user') {
                        
                        console.log('🔄 Falling back to redirect...');
                        this.hideLoading();
                        
                        // Store current page for redirect back
                        sessionStorage.setItem('googleAuthRedirect', window.location.href);
                        
                        // Use redirect method
                        await auth.signInWithRedirect(provider);
                        return;
                    }
                    
                    throw popupError;
                }
                
                // Process successful sign-in
                const user = result.user;
                const credential = result.credential;
                const isNewUser = result.additionalUserInfo?.isNewUser;
                
                console.log('✅ Sign-in successful:', {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    isNewUser: isNewUser
                });
                
                // Handle user data
                await this.processSignedInUser(user, isNewUser);
                
                this.hideLoading();
                
            } catch (error) {
                this.hideLoading();
                console.error('❌ Sign-in error:', error);
                this.handleError(error);
            }
        },
        
        // Process signed in user
        async processSignedInUser(user, isNewUser) {
            try {
                // Check if user exists in Firestore
                const userDoc = await db.collection('users').doc(user.uid).get();
                
                if (!userDoc.exists || !userDoc.data().phone) {
                    // Need to complete profile
                    console.log('📝 Profile incomplete, showing form...');
                    this.pendingUser = user;
                    this.showProfileCompletionForm(user);
                } else {
                    // Profile complete, update last login
                    await db.collection('users').doc(user.uid).update({
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    this.showMessage('Login successful!', 'success');
                    
                    // Redirect
                    setTimeout(() => {
                        this.handleRedirect();
                    }, 1000);
                }
                
            } catch (error) {
                console.error('❌ Error processing user:', error);
                
                // If Firestore fails, still allow login
                if (error.code === 'permission-denied') {
                    console.warn('⚠️ Firestore permission denied, proceeding anyway');
                    this.showMessage('Logged in successfully!', 'success');
                    setTimeout(() => this.handleRedirect(), 1000);
                } else {
                    throw error;
                }
            }
        },
        
        // Show profile completion form
        showProfileCompletionForm(user) {
            // Remove any existing modal
            const existingModal = document.getElementById('googleProfileModal');
            if (existingModal) {
                existingModal.remove();
            }
            
            // Create modal
            const modal = document.createElement('div');
            modal.id = 'googleProfileModal';
            modal.className = 'google-modal-overlay active';
            modal.innerHTML = `
                <div class="google-modal-content">
                    <div class="google-modal-header">
                        <h2>Complete Your Profile</h2>
                    </div>
                    
                    <div class="google-user-preview">
                        <img src="${user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'User')}" 
                             alt="Profile" class="google-user-avatar">
                        <div>
                            <div class="google-user-name">${user.displayName || 'Welcome!'}</div>
                            <div class="google-user-email">${user.email}</div>
                        </div>
                    </div>
                    
                    <form id="googleProfileForm">
                        <div class="google-form-group">
                            <label>Phone Number *</label>
                            <input type="tel" id="gPhone" maxlength="10" pattern="[0-9]{10}" 
                                   placeholder="10-digit mobile number" required>
                        </div>
                        
                        <div class="google-form-group">
                            <label>Address *</label>
                            <textarea id="gAddress" rows="2" placeholder="Complete address" required></textarea>
                        </div>
                        
                        <div class="google-form-row">
                            <div class="google-form-group">
                                <label>City *</label>
                                <input type="text" id="gCity" placeholder="City" required>
                            </div>
                            <div class="google-form-group">
                                <label>Pincode *</label>
                                <input type="text" id="gPincode" maxlength="6" pattern="[0-9]{6}" 
                                       placeholder="6-digit pincode" required>
                            </div>
                        </div>
                        
                        <div class="google-form-group">
                            <label>State</label>
                            <input type="text" id="gState" placeholder="State (Optional)">
                        </div>
                        
                        <button type="submit" class="google-btn-submit">
                            Complete Profile
                        </button>
                    </form>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Add styles
            this.addModalStyles();
            
            // Bind form events
            const form = document.getElementById('googleProfileForm');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProfileSubmit();
            });
            
            // Format inputs
            document.getElementById('gPhone').addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
            });
            
            document.getElementById('gPincode').addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
            });
        },
        
        // Handle profile form submission
        async handleProfileSubmit() {
            const phone = document.getElementById('gPhone').value;
            const address = document.getElementById('gAddress').value;
            const city = document.getElementById('gCity').value;
            const pincode = document.getElementById('gPincode').value;
            const state = document.getElementById('gState').value;
            
            if (!this.pendingUser) {
                this.showMessage('Session expired. Please try again.', 'error');
                return;
            }
            
            // Validate
            if (phone.length !== 10) {
                this.showMessage('Please enter valid 10-digit phone number', 'error');
                return;
            }
            
            if (pincode.length !== 6) {
                this.showMessage('Please enter valid 6-digit pincode', 'error');
                return;
            }
            
            this.showLoading('Saving profile...');
            
            try {
                // Save to Firestore
                await db.collection('users').doc(this.pendingUser.uid).set({
                    uid: this.pendingUser.uid,
                    name: this.pendingUser.displayName || '',
                    email: this.pendingUser.email,
                    photo: this.pendingUser.photoURL || '',
                    phone: phone,
                    address: address,
                    city: city,
                    state: state || '',
                    pincode: pincode,
                    role: 'user',
                    providers: ['google'],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                
                this.hideLoading();
                
                // Close modal
                document.getElementById('googleProfileModal').remove();
                
                this.showMessage('Profile completed successfully!', 'success');
                
                // Redirect
                setTimeout(() => {
                    this.handleRedirect();
                }, 1000);
                
            } catch (error) {
                this.hideLoading();
                console.error('❌ Profile save error:', error);
                this.showMessage('Failed to save profile. Please try again.', 'error');
            }
        },
        
        // On user signed in (from auth state change)
        async onUserSignedIn(user) {
            // Check for redirect result
            try {
                const result = await auth.getRedirectResult();
                if (result.user) {
                    console.log('✅ Redirect sign-in completed');
                    await this.processSignedInUser(result.user, result.additionalUserInfo?.isNewUser);
                }
            } catch (error) {
                if (error.code !== 'auth/no-auth-event') {
                    console.error('❌ Redirect result error:', error);
                }
            }
        },
        
        // Handle redirect
        handleRedirect() {
            const savedRedirect = sessionStorage.getItem('googleAuthRedirect');
            const urlParams = new URLSearchParams(window.location.search);
            const redirectParam = urlParams.get('redirect');
            
            // Clear saved redirect
            sessionStorage.removeItem('googleAuthRedirect');
            
            if (redirectParam === 'cart') {
                window.location.href = 'cart.html';
            } else if (redirectParam === 'checkout') {
                window.location.href = 'checkout.html';
            } else if (savedRedirect && !savedRedirect.includes('login') && !savedRedirect.includes('signup')) {
                window.location.href = savedRedirect;
            } else {
                window.location.href = 'index.html';
            }
        },
        
        // Handle errors
        handleError(error) {
            let message = 'Sign-in failed. Please try again.';
            
            switch (error.code) {
                case 'auth/popup-closed-by-user':
                    message = 'Sign-in cancelled';
                    break;
                case 'auth/cancelled-popup-request':
                    message = 'Another sign-in is in progress';
                    break;
                case 'auth/network-request-failed':
                    message = 'Network error. Check your connection';
                    break;
                case 'auth/too-many-requests':
                    message = 'Too many attempts. Try again later';
                    break;
                case 'auth/user-disabled':
                    message = 'This account has been disabled';
                    break;
                case 'auth/argument-error':
                    message = 'Configuration error. Please refresh and try again';
                    break;
                case 'auth/operation-not-allowed':
                    message = 'Google sign-in is not enabled';
                    break;
            }
            
            this.showMessage(message, 'error');
        },
        
        // Show loading
        showLoading(text) {
            const existing = document.getElementById('googleLoader');
            if (existing) existing.remove();
            
            const loader = document.createElement('div');
            loader.id = 'googleLoader';
            loader.innerHTML = `
                <div class="google-loader-content">
                    <div class="google-spinner"></div>
                    <div>${text}</div>
                </div>
            `;
            document.body.appendChild(loader);
            
            this.addLoaderStyles();
        },
        
        // Hide loading
        hideLoading() {
            const loader = document.getElementById('googleLoader');
            if (loader) loader.remove();
        },
        
        // Show message
        showMessage(text, type) {
            console.log(`💬 ${type}: ${text}`);
            
            const existing = document.getElementById('googleToast');
            if (existing) existing.remove();
            
            const toast = document.createElement('div');
            toast.id = 'googleToast';
            toast.className = `google-toast ${type}`;
            toast.textContent = text;
            document.body.appendChild(toast);
            
            this.addToastStyles();
            
            setTimeout(() => toast.classList.add('show'), 100);
            setTimeout(() => toast.remove(), 4000);
        },
        
        // Add modal styles
        addModalStyles() {
            if (document.getElementById('googleModalStyles')) return;
            
            const styles = document.createElement('style');
            styles.id = 'googleModalStyles';
            styles.textContent = `
                .google-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: none;
                    align-items: center;
                    justify-content: center;
                    z-index: 99999;
                }
                .google-modal-overlay.active {
                    display: flex;
                }
                .google-modal-content {
                    background: white;
                    border-radius: 12px;
                    padding: 30px;
                    max-width: 500px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                }
                .google-modal-header {
                    margin-bottom: 20px;
                }
                .google-modal-header h2 {
                    margin: 0;
                    color: #333;
                }
                .google-user-preview {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }
                .google-user-avatar {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                }
                .google-user-name {
                    font-weight: 600;
                    color: #333;
                }
                .google-user-email {
                    color: #666;
                    font-size: 14px;
                }
                .google-form-group {
                    margin-bottom: 15px;
                }
                .google-form-group label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 500;
                    color: #555;
                }
                .google-form-group input,
                .google-form-group textarea {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 14px;
                }
                .google-form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                }
                .google-btn-submit {
                    width: 100%;
                    padding: 12px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 16px;
                    cursor: pointer;
                    margin-top: 20px;
                }
                .google-btn-submit:hover {
                    background: #45a049;
                }
            `;
            document.head.appendChild(styles);
        },
        
        // Add loader styles
        addLoaderStyles() {
            if (document.getElementById('googleLoaderStyles')) return;
            
            const styles = document.createElement('style');
            styles.id = 'googleLoaderStyles';
            styles.textContent = `
                #googleLoader {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 999999;
                }
                .google-loader-content {
                    text-align: center;
                    color: white;
                }
                .google-spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: googleSpin 1s linear infinite;
                    margin: 0 auto 15px;
                }
                @keyframes googleSpin {
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(styles);
        },
        
        // Add toast styles
        addToastStyles() {
            if (document.getElementById('googleToastStyles')) return;
            
            const styles = document.createElement('style');
            styles.id = 'googleToastStyles';
            styles.textContent = `
                .google-toast {
                    position: fixed;
                    top: 20px;
                    right: -300px;
                    padding: 15px 20px;
                    border-radius: 8px;
                    color: white;
                    z-index: 999999;
                    transition: right 0.3s ease;
                }
                .google-toast.show {
                    right: 20px;
                }
                .google-toast.success {
                    background: #4CAF50;
                }
                .google-toast.error {
                    background: #f44336;
                }
                .google-toast.info {
                    background: #2196F3;
                }
            `;
            document.head.appendChild(styles);
        }
    };

    // ==================== INITIALIZATION ====================
    
    // Wait for Firebase to be ready
    function waitForFirebase(callback) {
        if (typeof firebase !== 'undefined' && 
            firebase.auth && 
            firebase.firestore) {
            callback();
        } else {
            console.log('⏳ Waiting for Firebase SDK...');
            setTimeout(() => waitForFirebase(callback), 100);
        }
    }
    
    // Initialize when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            waitForFirebase(() => GoogleAuthHandler.init());
        });
    } else {
        waitForFirebase(() => GoogleAuthHandler.init());
    }
    
    // Expose for manual triggering if needed
    window.GoogleAuthHandler = GoogleAuthHandler;
    window.triggerGoogleSignIn = () => GoogleAuthHandler.handleGoogleSignIn();
    
    console.log('🔷 Google Auth Module loaded and waiting...');
    
})();