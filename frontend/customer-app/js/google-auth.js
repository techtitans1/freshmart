// ==================== GOOGLE AUTHENTICATION MODULE ====================
// Standalone Google Sign-in with Enhanced Error Handling

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

// Initialize Firebase (check if already initialized)
let auth, db;

try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase initialized');
    } else {
        console.log('✅ Firebase already initialized');
    }
    
    auth = firebase.auth();
    db = firebase.firestore();
    
    // Enable persistence
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => console.log('✅ Auth persistence enabled'))
        .catch(err => console.error('❌ Persistence error:', err));
        
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

// ==================== STATE MANAGEMENT ====================
const GoogleAuth = {
    currentUser: null,
    isNewUser: false,
    userData: null,
    
    // Initialize Google Auth
    async init() {
        console.log('🔷 Google Auth Module Initializing...');
        
        // Check if Firebase is properly loaded
        if (!auth || !db) {
            console.error('❌ Firebase not properly initialized');
            this.showToast('Authentication service not available', 'error');
            return;
        }
        
        this.bindEvents();
        this.checkAuthState();
        
        // Test Firestore connection
        try {
            await db.collection('users').limit(1).get();
            console.log('✅ Firestore connection successful');
        } catch (error) {
            console.error('❌ Firestore connection failed:', error);
            if (error.code === 'permission-denied') {
                console.error('⚠️ Firestore permissions issue. Check your security rules.');
            }
        }
    },
    
    // Bind all events
    bindEvents() {
        // Google sign-in buttons - multiple selectors for flexibility
        const selectors = [
            '.google-signin-btn',
            '.google-login-btn', 
            '#googleSignInBtn',
            '#googleLoginBtn',
            '#googleSignupBtn',
            '[data-google-signin]'
        ];
        
        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(btn => {
                if (btn) {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔷 Google sign-in button clicked');
                        this.signInWithGoogle();
                    });
                    console.log(`✅ Event bound to: ${selector}`);
                }
            });
        });
        
        // Profile page auto-fill
        if (window.location.pathname.includes('profile')) {
            console.log('📄 Profile page detected');
            setTimeout(() => this.autoFillProfile(), 500);
        }
    },
    
    // Check current authentication state
    checkAuthState() {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('✅ User authenticated:', user.email);
                console.log('📊 User details:', {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    providerId: user.providerData[0]?.providerId
                });
                
                this.currentUser = user;
                
                try {
                    await this.loadUserData(user.uid);
                    this.updateUIForLoggedInUser(user);
                } catch (error) {
                    console.error('❌ Error loading user data:', error);
                }
            } else {
                console.log('👤 No authenticated user');
                this.currentUser = null;
                this.userData = null;
                this.updateUIForLoggedOutUser();
            }
        });
    },
    
    // Load user data from Firestore
    async loadUserData(uid) {
        if (!uid) return null;
        
        try {
            console.log(`📄 Loading user data for UID: ${uid}`);
            const doc = await db.collection('users').doc(uid).get();
            
            if (doc.exists) {
                this.userData = doc.data();
                console.log('✅ User data loaded:', this.userData);
                return this.userData;
            } else {
                console.log('⚠️ No Firestore document for user');
                return null;
            }
        } catch (error) {
            console.error('❌ Firestore read error:', error);
            
            if (error.code === 'permission-denied') {
                console.error('🔒 Firestore permission denied. Check security rules.');
                this.showToast('Database access denied. Contact support.', 'error');
            }
            
            throw error;
        }
    },
    
    // Sign in with Google
    async signInWithGoogle() {
        console.log('🔷 Starting Google Sign-in...');
        
        if (!auth) {
            console.error('❌ Auth not initialized');
            this.showToast('Authentication service not ready', 'error');
            return;
        }
        
        this.showLoading('Connecting to Google...');
        
        try {
            // Create provider
            const provider = new firebase.auth.GoogleAuthProvider();
            
            // Add scopes
            provider.addScope('profile');
            provider.addScope('email');
            
            // Force account selection
            provider.setCustomParameters({
                prompt: 'select_account',
                access_type: 'offline',
                include_granted_scopes: 'true'
            });
            
            console.log('🔹 Opening Google popup...');
            
            // Try popup first
            let result;
            try {
                result = await auth.signInWithPopup(provider);
            } catch (popupError) {
                console.error('❌ Popup failed:', popupError);
                
                if (popupError.code === 'auth/popup-blocked') {
                    console.log('🔄 Trying redirect method...');
                    this.hideLoading();
                    
                    // Try redirect as fallback
                    await auth.signInWithRedirect(provider);
                    return; // Redirect will reload the page
                }
                
                throw popupError;
            }
            
            const user = result.user;
            const credential = result.credential;
            const additionalInfo = result.additionalUserInfo;
            
            console.log('✅ Google sign-in successful!');
            console.log('📊 User info:', {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                isNewUser: additionalInfo.isNewUser,
                providerId: additionalInfo.providerId
            });
            
            if (credential) {
                console.log('🔑 Access token available');
            }
            
            this.currentUser = user;
            this.isNewUser = additionalInfo.isNewUser;
            
            // Check if user exists in Firestore
            let userData = null;
            try {
                userData = await this.loadUserData(user.uid);
            } catch (firestoreError) {
                console.error('⚠️ Could not load user data:', firestoreError);
                // Continue anyway - we'll create the profile
            }
            
            if (this.isNewUser || !userData || !userData.phone) {
                // New user or incomplete profile
                console.log('📝 Showing profile completion form');
                this.hideLoading();
                this.showCompleteProfileModal(user, additionalInfo.profile);
            } else {
                // Existing user with complete profile
                console.log('✅ Existing user with complete profile');
                
                try {
                    await this.updateLastLogin(user.uid);
                } catch (updateError) {
                    console.error('⚠️ Could not update last login:', updateError);
                    // Non-critical error, continue
                }
                
                this.hideLoading();
                this.showToast('Login successful!', 'success');
                
                // Redirect after successful login
                setTimeout(() => {
                    this.handleRedirect();
                }, 1000);
            }
            
        } catch (error) {
            this.hideLoading();
            console.error('❌ Google sign-in error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            
            // Detailed error handling
            this.handleAuthError(error);
        }
    },
    
    // Check for redirect result (for redirect sign-in method)
    async checkRedirectResult() {
        try {
            const result = await auth.getRedirectResult();
            if (result.user) {
                console.log('✅ Redirect sign-in successful');
                this.currentUser = result.user;
                this.isNewUser = result.additionalUserInfo?.isNewUser;
                
                // Handle the same way as popup
                const userData = await this.loadUserData(result.user.uid);
                
                if (this.isNewUser || !userData || !userData.phone) {
                    this.showCompleteProfileModal(result.user, result.additionalUserInfo?.profile);
                } else {
                    await this.updateLastLogin(result.user.uid);
                    this.showToast('Login successful!', 'success');
                    setTimeout(() => this.handleRedirect(), 1000);
                }
            }
        } catch (error) {
            console.error('❌ Redirect result error:', error);
            this.handleAuthError(error);
        }
    },
    
    // Show complete profile modal
    showCompleteProfileModal(user, googleProfile = {}) {
        console.log('📋 Showing complete profile modal');
        
        // Create modal if it doesn't exist
        let modal = document.getElementById('googleProfileModal');
        if (!modal) {
            modal = this.createProfileModal();
            document.body.appendChild(modal);
        }
        
        // Pre-fill with Google data
        const photoEl = modal.querySelector('#googleUserPhoto');
        const nameEl = modal.querySelector('#googleUserName');
        const emailEl = modal.querySelector('#googleUserEmail');
        const fullNameInput = modal.querySelector('#googleFullName');
        const emailInput = modal.querySelector('#googleEmail');
        
        const photoUrl = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=4CAF50&color=fff&size=200`;
        
        if (photoEl) photoEl.src = photoUrl;
        if (nameEl) nameEl.textContent = user.displayName || 'Welcome!';
        if (emailEl) emailEl.textContent = user.email;
        if (fullNameInput) fullNameInput.value = user.displayName || googleProfile.name || '';
        if (emailInput) emailInput.value = user.email;
        
        // Show modal
        modal.classList.add('active');
        
        // Focus on first empty required field
        setTimeout(() => {
            const firstEmpty = modal.querySelector('input:required:not([readonly]):not([value]), textarea:required:empty');
            if (firstEmpty) firstEmpty.focus();
        }, 300);
    },
    
    // Create profile completion modal
    createProfileModal() {
        const modal = document.createElement('div');
        modal.id = 'googleProfileModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Complete Your Profile</h2>
                    <button type="button" class="modal-close" onclick="GoogleAuth.cancelProfileCompletion()">×</button>
                </div>
                
                <div class="google-user-info">
                    <img id="googleUserPhoto" src="" alt="Profile" class="google-user-photo">
                    <div>
                        <h3 id="googleUserName"></h3>
                        <p id="googleUserEmail"></p>
                    </div>
                </div>
                
                <form id="googleCompleteProfileForm" onsubmit="return false;">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="googleFullName">Full Name *</label>
                            <input type="text" id="googleFullName" required readonly>
                        </div>
                        <div class="form-group">
                            <label for="googleEmail">Email *</label>
                            <input type="email" id="googleEmail" required readonly>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="googlePhone">Phone Number *</label>
                            <input type="tel" id="googlePhone" maxlength="10" required 
                                   placeholder="10-digit mobile number"
                                   pattern="[0-9]{10}">
                        </div>
                        <div class="form-group">
                            <label for="googlePincode">Pincode *</label>
                            <input type="text" id="googlePincode" maxlength="6" required 
                                   placeholder="6-digit pincode"
                                   pattern="[0-9]{6}">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="googleAddress">Address *</label>
                        <textarea id="googleAddress" rows="2" required 
                                  placeholder="Enter your complete address"></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="googleCity">City *</label>
                            <input type="text" id="googleCity" required placeholder="Enter city">
                        </div>
                        <div class="form-group">
                            <label for="googleState">State</label>
                            <select id="googleState">
                                <option value="">Select State</option>
                                <option value="Andhra Pradesh">Andhra Pradesh</option>
                                <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                                <option value="Assam">Assam</option>
                                <option value="Bihar">Bihar</option>
                                <option value="Chhattisgarh">Chhattisgarh</option>
                                <option value="Goa">Goa</option>
                                <option value="Gujarat">Gujarat</option>
                                <option value="Haryana">Haryana</option>
                                <option value="Himachal Pradesh">Himachal Pradesh</option>
                                <option value="Jharkhand">Jharkhand</option>
                                <option value="Karnataka">Karnataka</option>
                                <option value="Kerala">Kerala</option>
                                <option value="Madhya Pradesh">Madhya Pradesh</option>
                                <option value="Maharashtra">Maharashtra</option>
                                <option value="Manipur">Manipur</option>
                                <option value="Meghalaya">Meghalaya</option>
                                <option value="Mizoram">Mizoram</option>
                                <option value="Nagaland">Nagaland</option>
                                <option value="Odisha">Odisha</option>
                                <option value="Punjab">Punjab</option>
                                <option value="Rajasthan">Rajasthan</option>
                                <option value="Sikkim">Sikkim</option>
                                <option value="Tamil Nadu">Tamil Nadu</option>
                                <option value="Telangana">Telangana</option>
                                <option value="Tripura">Tripura</option>
                                <option value="Uttar Pradesh">Uttar Pradesh</option>
                                <option value="Uttarakhand">Uttarakhand</option>
                                <option value="West Bengal">West Bengal</option>
                                <option value="Delhi">Delhi</option>
                            </select>
                        </div>
                    </div>
                    
                    <button type="submit" class="btn btn-primary btn-block">
                        <i class="fas fa-check"></i> Complete Profile
                    </button>
                </form>
            </div>
            
            <style>
                .modal-overlay {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    z-index: 10000;
                    padding: 20px;
                    overflow-y: auto;
                }
                .modal-overlay.active {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .modal-content {
                    background: white;
                    border-radius: 12px;
                    padding: 30px;
                    max-width: 600px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    position: relative;
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .modal-header h2 {
                    margin: 0;
                    color: #333;
                }
                .modal-close {
                    background: none;
                    border: none;
                    font-size: 30px;
                    color: #999;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .modal-close:hover {
                    color: #333;
                }
                .google-user-info {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }
                .google-user-photo {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    object-fit: cover;
                }
                .google-user-info h3 {
                    margin: 0;
                    color: #333;
                    font-size: 18px;
                }
                .google-user-info p {
                    margin: 5px 0 0 0;
                    color: #666;
                    font-size: 14px;
                }
                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-bottom: 15px;
                }
                .form-group {
                    margin-bottom: 15px;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 500;
                    color: #555;
                }
                .form-group input,
                .form-group textarea,
                .form-group select {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 14px;
                }
                .form-group input[readonly] {
                    background: #f5f5f5;
                    cursor: not-allowed;
                }
                .btn {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 6px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .btn-primary {
                    background: #4CAF50;
                    color: white;
                }
                .btn-primary:hover {
                    background: #45a049;
                }
                .btn-block {
                    width: 100%;
                    margin-top: 20px;
                }
                @media (max-width: 600px) {
                    .form-row {
                        grid-template-columns: 1fr;
                    }
                    .modal-content {
                        padding: 20px;
                    }
                }
            </style>
        `;
        
        // Bind events after creation
        setTimeout(() => {
            const form = modal.querySelector('#googleCompleteProfileForm');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.handleCompleteProfile(e);
                });
            }
            
            // Input formatting
            const phoneInput = modal.querySelector('#googlePhone');
            const pincodeInput = modal.querySelector('#googlePincode');
            
            if (phoneInput) {
                phoneInput.addEventListener('input', (e) => {
                    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
                });
            }
            
            if (pincodeInput) {
                pincodeInput.addEventListener('input', (e) => {
                    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
                });
            }
        }, 100);
        
        return modal;
    },
    
    // Cancel profile completion
    cancelProfileCompletion() {
        const modal = document.getElementById('googleProfileModal');
        if (modal) {
            modal.classList.remove('active');
        }
        
        // Sign out the user since profile is incomplete
        if (this.currentUser && this.isNewUser) {
            this.currentUser.delete().then(() => {
                console.log('✅ Incomplete registration cancelled');
                this.showToast('Registration cancelled', 'info');
            }).catch(err => {
                console.error('❌ Could not delete user:', err);
            });
            
            auth.signOut();
        }
    },
    
    // Handle complete profile form submission
    async handleCompleteProfile(e) {
        e.preventDefault();
        console.log('📝 Completing profile...');
        
        if (!this.currentUser) {
            this.showToast('Session expired. Please sign in again.', 'error');
            return;
        }
        
        const phone = document.getElementById('googlePhone')?.value.trim();
        const address = document.getElementById('googleAddress')?.value.trim();
        const city = document.getElementById('googleCity')?.value.trim();
        const pincode = document.getElementById('googlePincode')?.value.trim();
        const state = document.getElementById('googleState')?.value.trim();
        
        // Validation
        if (!phone || phone.length !== 10) {
            this.showToast('Please enter a valid 10-digit phone number', 'error');
            return;
        }
        
        if (!address || !city || !pincode) {
            this.showToast('Please fill all required fields', 'error');
            return;
        }
        
        if (pincode.length !== 6) {
            this.showToast('Please enter a valid 6-digit pincode', 'error');
            return;
        }
        
        this.showLoading('Saving your profile...');
        
        try {
            // Check if phone already exists
            console.log('📞 Checking phone availability...');
            const phoneExists = await this.checkPhoneExists(phone, this.currentUser.uid);
            if (phoneExists) {
                this.hideLoading();
                this.showToast('This phone number is already registered', 'error');
                return;
            }
            
            // Save to Firestore
            console.log('💾 Saving profile to Firestore...');
            const profileData = {
                uid: this.currentUser.uid,
                name: this.currentUser.displayName,
                email: this.currentUser.email,
                photo: this.currentUser.photoURL || '',
                phone,
                address,
                city,
                state: state || '',
                pincode,
                provider: 'google',
                providers: ['google'],
                role: 'user',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                isNewUser: false
            };
            
            await this.saveUserProfile(profileData);
            
            this.hideLoading();
            
            // Close modal
            const modal = document.getElementById('googleProfileModal');
            if (modal) modal.classList.remove('active');
            
            this.showToast('Profile completed successfully!', 'success');
            
            // Reload user data
            await this.loadUserData(this.currentUser.uid);
            
            // Redirect
            setTimeout(() => {
                this.handleRedirect();
            }, 1000);
            
        } catch (error) {
            this.hideLoading();
            console.error('❌ Profile completion error:', error);
            
            if (error.code === 'permission-denied') {
                this.showToast('Database access denied. Please contact support.', 'error');
            } else {
                this.showToast('Failed to save profile. Please try again.', 'error');
            }
        }
    },
    
    // Save user profile to Firestore
    async saveUserProfile(data) {
        try {
            const userRef = db.collection('users').doc(data.uid);
            const doc = await userRef.get();
            
            if (!doc.exists) {
                // New document
                await userRef.set(data);
                console.log('✅ New user profile created');
            } else {
                // Update existing
                const updateData = {
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    providers: firebase.firestore.FieldValue.arrayUnion('google')
                };
                
                // Only update non-empty fields
                if (data.phone) updateData.phone = data.phone;
                if (data.address) updateData.address = data.address;
                if (data.city) updateData.city = data.city;
                if (data.state) updateData.state = data.state;
                if (data.pincode) updateData.pincode = data.pincode;
                if (data.photo) updateData.photo = data.photo;
                
                await userRef.update(updateData);
                console.log('✅ User profile updated');
            }
            
            return true;
        } catch (error) {
            console.error('❌ Firestore save error:', error);
            throw error;
        }
    },
    
    // Check if phone number already exists
    async checkPhoneExists(phone, excludeUid = null) {
        try {
            const query = db.collection('users').where('phone', '==', phone);
            const snapshot = await query.get();
            
            if (snapshot.empty) return false;
            
            if (excludeUid) {
                return snapshot.docs.some(doc => doc.id !== excludeUid);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Phone check error:', error);
            return false; // Don't block on error
        }
    },
    
    // Update last login
    async updateLastLogin(uid) {
        try {
            await db.collection('users').doc(uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ Last login updated');
        } catch (error) {
            console.error('⚠️ Could not update last login:', error);
            // Non-critical error
        }
    },
    
    // Auto-fill profile page
    async autoFillProfile() {
        if (!this.currentUser) {
            console.log('❌ No user logged in for auto-fill');
            return;
        }
        
        console.log('🔄 Auto-filling profile page...');
        
        // Wait for user data to load
        if (!this.userData) {
            try {
                await this.loadUserData(this.currentUser.uid);
            } catch (error) {
                console.error('❌ Could not load user data for auto-fill:', error);
                return;
            }
        }
        
        if (!this.userData) {
            console.log('❌ No user data available for auto-fill');
            return;
        }
        
        // Auto-fill form fields
        const fillField = (ids, value) => {
            if (!value) return;
            
            ids.forEach(id => {
                const field = document.getElementById(id);
                if (field) {
                    field.value = value;
                    console.log(`✅ Filled ${id}: ${value}`);
                }
            });
        };
        
        // Try multiple possible field IDs
        fillField(['profileName', 'fullName', 'name'], this.userData.name);
        fillField(['profileEmail', 'email'], this.userData.email);
        fillField(['profilePhone', 'phone'], this.userData.phone);
        fillField(['profileAddress', 'address'], this.userData.address);
        fillField(['profileCity', 'city'], this.userData.city);
        fillField(['profileState', 'state'], this.userData.state);
        fillField(['profilePincode', 'pincode', 'zipcode'], this.userData.pincode);
        
        // Update profile picture
        const profilePics = document.querySelectorAll('#profilePicture, .profile-pic, .user-avatar');
        profilePics.forEach(pic => {
            if (pic && this.userData.photo) {
                pic.src = this.userData.photo;
            }
        });
        
        console.log('✅ Profile auto-fill complete');
    },
    
    // Update UI for logged-in user
    updateUIForLoggedInUser(user) {
        // Implementation remains the same
        document.querySelectorAll('.google-signin-btn, .sign-in-section').forEach(el => {
            if (el) el.style.display = 'none';
        });
        
        document.querySelectorAll('.user-info, .user-section').forEach(el => {
            if (el) el.style.display = 'block';
        });
    },
    
    // Update UI for logged-out user
    updateUIForLoggedOutUser() {
        // Implementation remains the same
        document.querySelectorAll('.google-signin-btn, .sign-in-section').forEach(el => {
            if (el) el.style.display = 'block';
        });
        
        document.querySelectorAll('.user-info, .user-section').forEach(el => {
            if (el) el.style.display = 'none';
        });
    },
    
    // Sign out
    async signOut() {
        try {
            await auth.signOut();
            console.log('✅ User signed out');
            this.showToast('Signed out successfully', 'success');
            
            this.currentUser = null;
            this.userData = null;
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
            
        } catch (error) {
            console.error('❌ Sign out error:', error);
            this.showToast('Failed to sign out', 'error');
        }
    },
    
    // Handle authentication errors
    handleAuthError(error) {
        console.error('🔴 Auth error details:', {
            code: error.code,
            message: error.message,
            email: error.email,
            credential: error.credential
        });
        
        let message = 'Authentication failed. Please try again.';
        
        switch (error.code) {
            case 'auth/popup-closed-by-user':
                message = 'Sign-in cancelled';
                break;
            case 'auth/popup-blocked':
                message = 'Popup was blocked. Please allow popups and try again.';
                break;
            case 'auth/cancelled-popup-request':
                message = 'Another popup is already open';
                break;
            case 'auth/account-exists-with-different-credential':
                message = 'An account already exists with this email. Try signing in with a different method.';
                break;
            case 'auth/network-request-failed':
                message = 'Network error. Please check your internet connection.';
                break;
            case 'auth/too-many-requests':
                message = 'Too many failed attempts. Please try again later.';
                break;
            case 'auth/user-disabled':
                message = 'This account has been disabled. Contact support.';
                break;
            case 'auth/operation-not-allowed':
                message = 'Google sign-in is not enabled. Contact support.';
                break;
            case 'auth/invalid-api-key':
                message = 'Configuration error. Please contact support.';
                break;
            case 'auth/app-deleted':
                message = 'Authentication service error. Please refresh the page.';
                break;
            default:
                if (error.message) {
                    message = error.message;
                }
        }
        
        this.showToast(message, 'error');
    },
    
    // Handle redirect
    handleRedirect() {
        const params = new URLSearchParams(window.location.search);
        const redirectUrl = params.get('redirect');
        
        console.log('🔄 Redirecting...', redirectUrl || 'home');
        
        if (redirectUrl === 'cart') {
            window.location.replace('cart.html');
        } else if (redirectUrl === 'checkout') {
            window.location.replace('checkout.html');
        } else if (window.location.pathname.includes('login') || window.location.pathname.includes('signup')) {
            window.location.replace('index.html');
        } else {
            location.reload();
        }
    },
    
    // Show loading
    showLoading(text = 'Please wait...') {
        let loader = document.getElementById('googleLoader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'googleLoader';
            loader.innerHTML = `
                <div class="loader-content">
                    <div class="spinner"></div>
                    <p>${text}</p>
                </div>
                <style>
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
                        z-index: 10001;
                    }
                    .loader-content {
                        text-align: center;
                        color: white;
                    }
                    .spinner {
                        width: 50px;
                        height: 50px;
                        border: 5px solid rgba(255,255,255,0.3);
                        border-top: 5px solid white;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    },
    
    // Hide loading
    hideLoading() {
        const loader = document.getElementById('googleLoader');
        if (loader) {
            loader.style.display = 'none';
        }
    },
    
    // Show toast notification
    showToast(message, type = 'success') {
        console.log(`💬 Toast (${type}): ${message}`);
        
        let toast = document.getElementById('googleToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'googleToast';
            toast.innerHTML = `
                <i class="toast-icon"></i>
                <span class="toast-message"></span>
                <style>
                    #googleToast {
                        position: fixed;
                        top: 20px;
                        right: -400px;
                        background: #333;
                        color: white;
                        padding: 15px 20px;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        z-index: 10002;
                        transition: right 0.3s ease;
                        max-width: 350px;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    }
                    #googleToast.show {
                        right: 20px;
                    }
                    #googleToast.success {
                        background: #4CAF50;
                    }
                    #googleToast.error {
                        background: #f44336;
                    }
                    #googleToast.warning {
                        background: #ff9800;
                    }
                    #googleToast.info {
                        background: #2196F3;
                    }
                </style>
            `;
            document.body.appendChild(toast);
        }
        
        toast.className = type;
        toast.querySelector('.toast-message').textContent = message;
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => toast.classList.remove('show'), 4000);
    }
};

// ==================== PUBLIC API ====================
window.GoogleAuth = GoogleAuth;

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        await GoogleAuth.init();
        // Check for redirect result after init
        await GoogleAuth.checkRedirectResult();
    });
} else {
    GoogleAuth.init().then(() => {
        GoogleAuth.checkRedirectResult();
    });
}

// ==================== DEBUGGING ====================
console.log('%c🔷 Google Auth Module v2.1 Loaded', 'color:#4285F4;font-size:16px;font-weight:bold');
console.log('%c📱 Firebase SDK:', typeof firebase !== 'undefined' ? '✅ Loaded' : '❌ Not loaded');
console.log('%c🔐 Auth Service:', typeof firebase?.auth !== 'undefined' ? '✅ Available' : '❌ Not available');
console.log('%c💾 Firestore:', typeof firebase?.firestore !== 'undefined' ? '✅ Available' : '❌ Not available');

// Test Firebase configuration
if (typeof firebase !== 'undefined') {
    console.log('%c🔧 Firebase Config:', 'color:#666', firebaseConfig);
}