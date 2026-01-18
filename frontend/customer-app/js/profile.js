// ==================== PROFILE PAGE JAVASCRIPT ====================
// Complete profile management for FreshMart

// ==================== STATE VARIABLES ====================
let userData = null;
let editMode = 'all';
let tempPhotoData = null;

// ==================== CONSTANTS ====================
const STORAGE_KEYS = {
    CART: 'freshmart_cart',
    WISHLIST: 'freshmart_wishlist',
    USER: 'freshmart_user',
    ORDERS: 'freshmart_orders',
    SAVINGS: 'freshmart_savings'
};

// ==================== DOM ELEMENTS ====================
const DOM = {
    // Profile display elements
    profilePhoto: document.getElementById('profilePhoto'),
    photoPlaceholder: document.getElementById('photoPlaceholder'),
    photoInput: document.getElementById('photoInput'),
    username: document.getElementById('username'),
    phone: document.getElementById('phone'),
    email: document.getElementById('email'),
    address: document.getElementById('address'),
    memberSince: document.getElementById('memberSince'),
    profileBadge: document.getElementById('profileBadge'),
    
    // Stats elements
    totalOrders: document.getElementById('totalOrders'),
    wishlistCount: document.getElementById('wishlistCount'),
    totalSavings: document.getElementById('totalSavings'),
    walletBalance: document.getElementById('walletBalance'),
    cartCount: document.getElementById('cartCount'),
    
    // Orders elements
    recentOrders: document.getElementById('recentOrders'),
    noOrders: document.getElementById('noOrders'),
    
    // Modal elements
    editModal: document.getElementById('editModal'),
    modalTitle: document.getElementById('modalTitle'),
    editForm: document.getElementById('editForm'),
    editProfilePhoto: document.getElementById('editProfilePhoto'),
    editPhotoPlaceholder: document.getElementById('editPhotoPlaceholder'),
    editPhotoInput: document.getElementById('editPhotoInput'),
    editName: document.getElementById('editName'),
    editPhone: document.getElementById('editPhone'),
    editEmail: document.getElementById('editEmail'),
    editAddress: document.getElementById('editAddress'),
    
    // Form sections
    photoSection: document.getElementById('photoSection'),
    nameSection: document.getElementById('nameSection'),
    phoneSection: document.getElementById('phoneSection'),
    emailSection: document.getElementById('emailSection'),
    addressSection: document.getElementById('addressSection'),
    
    // Settings elements
    notificationToggle: document.getElementById('notificationToggle'),
    
    // Toast elements
    toast: document.getElementById('toast'),
    toastIcon: document.getElementById('toastIcon'),
    toastMessage: document.getElementById('toastMessage'),
    
    // Loading overlay
    loadingOverlay: document.getElementById('loadingOverlay')
};

// Firebase initialization
const firebaseConfig = {
    apiKey: "AIzaSyDf4QSE3kw9HQD_ZWJ-DDZ8yN3hgRp4UaM",
    authDomain: "otp-auth-ff7fb.firebaseapp.com",
    projectId: "otp-auth-ff7fb",
    storageBucket: "otp-auth-ff7fb.firebasestorage.app",
    messagingSenderId: "945314024888",
    appId: "1:945314024888:web:1eb577611a4de09757934d",
    measurementId: "G-6HMXTKV0SQ"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// ==================== AUTH STATE LISTENER ====================
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html?redirect=profile';
        return;
    }

    console.log('✅ User authenticated:', user.uid);
    await loadProfileFromFirestore(user.uid);
});

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('👤 FreshMart Profile Page Initialized');
    
    // Debug: Check if DOM elements exist
    console.log('🔍 DEBUG - DOM.totalSavings element:', DOM.totalSavings);
    
    setupEventListeners();
    updateCartCount();
});

// ==================== LOAD PROFILE FROM FIRESTORE ====================
async function loadProfileFromFirestore(uid) {
    try {
        showLoading();

        const doc = await db.collection("users").doc(uid).get();
        
        if (!doc.exists) {
            console.warn("No profile data found in Firestore");
            hideLoading();
            return;
        }

        const data = doc.data();
        
        // DEBUG: Log raw Firestore data
        console.log('🔥 RAW FIRESTORE DATA:', data);
        console.log('🔥 Orders in Firestore:', data.orders);
        console.log('🔥 TotalSavings in Firestore:', data.totalSavings);

        // Normalize data for UI
        userData = {
            uid,
            name: data.name || 'User',
            email: data.email || '',
            phone: data.phone || '',
            address: [
                data.address,
                data.city,
                data.state,
                data.pincode
            ].filter(Boolean).join(', '),
            streetAddress: data.address || '',
            city: data.city || '',
            state: data.state || '',
            pincode: data.pincode || '',
            profilePhoto: data.photo || '',
            memberSince: data.createdAt?.toDate
                ? data.createdAt.toDate().toISOString()
                : new Date().toISOString(),
            wallet: data.wallet || 0,
            orders: data.orders || [],
            totalSavings: data.totalSavings || 0,
            notifications: data.notifications ?? true
        };

        console.log('📦 NORMALIZED userData:', userData);
        
        updateProfileDisplay();
        await updateStats();
        loadRecentOrders();

        hideLoading();
    } catch (err) {
        hideLoading();
        console.error("❌ Error loading profile:", err);
        showToast('Error loading profile', 'error');
    }
}

// ==================== UPDATE STATS (FIXED) ====================
async function updateStats() {
    console.log('📊 ========== UPDATING STATS ==========');
    
    // 1. Orders count
    const orders = userData?.orders || [];
    console.log('📦 Orders array:', orders);
    console.log('📦 Orders count:', orders.length);
    
    if (DOM.totalOrders) {
        DOM.totalOrders.textContent = orders.length;
        console.log('✅ Updated totalOrders DOM');
    } else {
        console.error('❌ DOM.totalOrders element not found!');
    }
    
    // 2. Wishlist count
   let wishlistCount = 0;
    try {
        const currentUser = auth.currentUser;
        if (currentUser) {
            const doc = await db.collection('wishlists').doc(currentUser.uid).get();
            
            if (doc.exists) {
                const data = doc.data();
                wishlistCount = (data.items || []).length;
                console.log('❤️ Wishlist count from Firestore:', wishlistCount);
            } else {
                // Fallback: Check user document
                const userDoc = await db.collection('users').doc(currentUser.uid).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    wishlistCount = (userData.wishlist || []).length;
                    console.log('❤️ Wishlist count from user doc:', wishlistCount);
                }
            }
        }
        
        // Fallback to localStorage
        if (wishlistCount === 0) {
            const localWishlist = localStorage.getItem('freshmart_wishlist');
            if (localWishlist) {
                const parsed = JSON.parse(localWishlist);
                wishlistCount = Array.isArray(parsed) ? parsed.length : 0;
            }
        }
    } catch (error) {
        console.error('Error loading wishlist count:', error);
        // Fallback to localStorage
        try {
            const localWishlist = localStorage.getItem('freshmart_wishlist');
            if (localWishlist) {
                const parsed = JSON.parse(localWishlist);
                wishlistCount = Array.isArray(parsed) ? parsed.length : 0;
            }
        } catch (e) {
            wishlistCount = 0;
        }
    }
    
    if (DOM.wishlistCount) {
        DOM.wishlistCount.textContent = wishlistCount;
        console.log('✅ Updated wishlist count:', wishlistCount);
    }
    // 3. Total Savings - THIS IS THE KEY FIX
    console.log('💰 ===== CALCULATING SAVINGS =====');
    const savings = await calculateTotalSavings();
    console.log('💰 Final savings value:', savings);
    
    if (DOM.totalSavings) {
        const formattedSavings = formatCurrency(savings);
        DOM.totalSavings.textContent = formattedSavings;
        console.log('✅ Updated totalSavings DOM to:', formattedSavings);
    } else {
        console.error('❌ DOM.totalSavings element NOT FOUND!');
    }
    
    // 4. Wallet balance
    const walletBalance = userData?.wallet || 0;
    if (DOM.walletBalance) {
        DOM.walletBalance.textContent = formatCurrency(walletBalance);
        console.log('✅ Updated walletBalance:', walletBalance);
    }
    
    console.log('📊 ========== STATS UPDATE COMPLETE ==========');
}

// ==================== CALCULATE TOTAL SAVINGS (COMPREHENSIVE) ====================
async function calculateTotalSavings() {
    console.log('🧮 Starting savings calculation...');
    
    let totalSavings = 0;
    
    try {
        // METHOD 1: Check if totalSavings is directly stored in userData
        if (userData?.totalSavings && userData.totalSavings > 0) {
            console.log('💰 Method 1 - Direct totalSavings:', userData.totalSavings);
            totalSavings = parseFloat(userData.totalSavings) || 0;
        }
        
        // METHOD 2: Calculate from orders in userData
        const orders = userData?.orders || [];
        console.log('📋 Method 2 - Processing', orders.length, 'orders');
        
        orders.forEach((order, index) => {
            console.log(`📋 Order ${index + 1}:`, order);
            const orderSaving = calculateOrderSavings(order);
            console.log(`📋 Order ${index + 1} savings:`, orderSaving);
            totalSavings += orderSaving;
        });
        
        // METHOD 3: Check Firestore orders collection
        const currentUser = auth.currentUser;
        if (currentUser) {
            try {
                const ordersSnapshot = await db.collection('orders')
                    .where('userId', '==', currentUser.uid)
                    .get();
                
                console.log('🔥 Method 3 - Orders collection size:', ordersSnapshot.size);
                
                ordersSnapshot.forEach(doc => {
                    const order = doc.data();
                    console.log('🔥 Order from collection:', order);
                    const orderSaving = calculateOrderSavings(order);
                    totalSavings += orderSaving;
                });
            } catch (e) {
                console.log('ℹ️ Orders collection not found or empty');
            }
        }
        
        // METHOD 4: Check localStorage
        const localSavings = getLocalStorageSavings();
        console.log('💾 Method 4 - LocalStorage savings:', localSavings);
        
        if (localSavings > totalSavings) {
            totalSavings = localSavings;
        }
        
        // METHOD 5: If still 0, add demo savings for testing
        if (totalSavings === 0) {
            console.log('⚠️ No savings found - checking for any discount data...');
            
            // Check cart for potential savings
            const cartSavings = calculateCartSavings();
            console.log('🛒 Potential cart savings:', cartSavings);
            totalSavings += cartSavings;
        }
        
    } catch (error) {
        console.error('❌ Error calculating savings:', error);
    }
    
    console.log('💰 FINAL TOTAL SAVINGS:', totalSavings);
    return Math.round(totalSavings);
}

// ==================== CALCULATE ORDER SAVINGS ====================
function calculateOrderSavings(order) {
    if (!order) return 0;
    
    let savings = 0;
    
    // Check direct discount fields
    if (order.discount) {
        savings += parseFloat(order.discount) || 0;
        console.log('  → discount field:', order.discount);
    }
    
    if (order.savings) {
        savings += parseFloat(order.savings) || 0;
        console.log('  → savings field:', order.savings);
    }
    
    if (order.totalDiscount) {
        savings += parseFloat(order.totalDiscount) || 0;
        console.log('  → totalDiscount field:', order.totalDiscount);
    }
    
    if (order.couponDiscount) {
        savings += parseFloat(order.couponDiscount) || 0;
        console.log('  → couponDiscount field:', order.couponDiscount);
    }
    
    if (order.promoDiscount) {
        savings += parseFloat(order.promoDiscount) || 0;
        console.log('  → promoDiscount field:', order.promoDiscount);
    }
    
    // Calculate from items
    const items = order.items || order.cartItems || order.products || [];
    console.log('  → Items in order:', items.length);
    
    items.forEach((item, i) => {
        const itemSaving = calculateItemSavings(item);
        if (itemSaving > 0) {
            console.log(`    → Item ${i + 1} savings:`, itemSaving);
        }
        savings += itemSaving;
    });
    
    return savings;
}

// ==================== CALCULATE ITEM SAVINGS ====================
function calculateItemSavings(item) {
    if (!item) return 0;
    
    const quantity = parseInt(item.quantity) || 1;
    let saving = 0;
    
    // Method 1: originalPrice vs price
    if (item.originalPrice !== undefined && item.price !== undefined) {
        const original = parseFloat(item.originalPrice);
        const current = parseFloat(item.price);
        if (original > current && !isNaN(original) && !isNaN(current)) {
            saving = (original - current) * quantity;
        }
    }
    
    // Method 2: mrp vs price
    if (saving === 0 && item.mrp !== undefined && item.price !== undefined) {
        const mrp = parseFloat(item.mrp);
        const price = parseFloat(item.price);
        if (mrp > price && !isNaN(mrp) && !isNaN(price)) {
            saving = (mrp - price) * quantity;
        }
    }
    
    // Method 3: mrp vs salePrice
    if (saving === 0 && item.mrp !== undefined && item.salePrice !== undefined) {
        const mrp = parseFloat(item.mrp);
        const sale = parseFloat(item.salePrice);
        if (mrp > sale && !isNaN(mrp) && !isNaN(sale)) {
            saving = (mrp - sale) * quantity;
        }
    }
    
    // Method 4: oldPrice vs price
    if (saving === 0 && item.oldPrice !== undefined && item.price !== undefined) {
        const old = parseFloat(item.oldPrice);
        const price = parseFloat(item.price);
        if (old > price && !isNaN(old) && !isNaN(price)) {
            saving = (old - price) * quantity;
        }
    }
    
    // Method 5: discount field
    if (saving === 0 && item.discount !== undefined) {
        saving = parseFloat(item.discount) * quantity;
    }
    
    // Method 6: discountPercent
    if (saving === 0 && item.discountPercent !== undefined && item.price !== undefined) {
        const percent = parseFloat(item.discountPercent);
        const price = parseFloat(item.price);
        if (!isNaN(percent) && !isNaN(price) && percent > 0) {
            const originalPrice = price / (1 - percent / 100);
            saving = (originalPrice - price) * quantity;
        }
    }
    
    return Math.max(0, saving);
}

// ==================== GET LOCAL STORAGE SAVINGS ====================
function getLocalStorageSavings() {
    try {
        // Check direct savings
        const savedAmount = localStorage.getItem(STORAGE_KEYS.SAVINGS);
        if (savedAmount) {
            return parseFloat(savedAmount) || 0;
        }
        
        // Check orders in localStorage
        const ordersData = localStorage.getItem(STORAGE_KEYS.ORDERS);
        if (ordersData) {
            const orders = JSON.parse(ordersData);
            let total = 0;
            orders.forEach(order => {
                total += calculateOrderSavings(order);
            });
            return total;
        }
        
        return 0;
    } catch (error) {
        return 0;
    }
}

// ==================== CALCULATE CART SAVINGS ====================
function calculateCartSavings() {
    try {
        const cartData = localStorage.getItem(STORAGE_KEYS.CART);
        if (!cartData) return 0;
        
        const cart = JSON.parse(cartData);
        let savings = 0;
        
        cart.forEach(item => {
            savings += calculateItemSavings(item);
        });
        
        return savings;
    } catch (error) {
        return 0;
    }
}

// ==================== FORMAT CURRENCY ====================
function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) {
        return '₹0';
    }
    const rounded = Math.round(amount);
    return `₹${rounded.toLocaleString('en-IN')}`;
}

// ==================== UPDATE CART COUNT ====================
function updateCartCount() {
    try {
        const cartData = localStorage.getItem(STORAGE_KEYS.CART);
        const cart = cartData ? JSON.parse(cartData) : [];
        const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        if (DOM.cartCount) {
            DOM.cartCount.textContent = totalItems;
            DOM.cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    } catch (error) {
        if (DOM.cartCount) {
            DOM.cartCount.textContent = '0';
            DOM.cartCount.style.display = 'none';
        }
    }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    if (DOM.photoInput) {
        DOM.photoInput.addEventListener('change', handleMainPhotoUpload);
    }
    
    if (DOM.editPhotoInput) {
        DOM.editPhotoInput.addEventListener('change', handleModalPhotoUpload);
    }
    
    if (DOM.editForm) {
        DOM.editForm.addEventListener('submit', handleFormSubmit);
    }
    
    if (DOM.editPhone) {
        DOM.editPhone.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
        });
    }
    
    if (DOM.notificationToggle) {
        DOM.notificationToggle.checked = userData?.notifications ?? true;
        DOM.notificationToggle.addEventListener('change', handleNotificationToggle);
    }
    
    if (DOM.editModal) {
        DOM.editModal.addEventListener('click', function(e) {
            if (e.target === DOM.editModal) {
                closeEditModal();
            }
        });
    }
    
    document.addEventListener('keydown', handleKeyboard);
    
    console.log('🎯 Event listeners attached');
}

function handleKeyboard(e) {
    if (e.key === 'Escape') {
        if (DOM.editModal?.classList.contains('active')) {
            closeEditModal();
        }
        hideToast();
    }
}

// ==================== PROFILE DISPLAY ====================
function updateProfileDisplay() {
    if (!userData) {
        console.warn('No user data to display');
        return;
    }
    
    const photoData = userData.profilePhoto || userData.photo || null;
    updatePhotoDisplay(DOM.profilePhoto, DOM.photoPlaceholder, photoData);
    
    if (DOM.username) {
        DOM.username.textContent = userData.name || 'Guest User';
    }
    
    if (DOM.phone) {
        if (userData.phone) {
            DOM.phone.textContent = `+91 ${formatPhoneNumber(userData.phone)}`;
            DOM.phone.classList.remove('not-set');
        } else {
            DOM.phone.textContent = 'Not set';
            DOM.phone.classList.add('not-set');
        }
    }
    
    if (DOM.email) {
        DOM.email.textContent = userData.email || 'Not set';
        DOM.email.classList.toggle('not-set', !userData.email);
    }
    
    if (DOM.address) {
        let displayAddress = userData.address || '';
        
        if (!displayAddress && (userData.streetAddress || userData.city)) {
            displayAddress = [
                userData.streetAddress,
                userData.city,
                userData.state,
                userData.pincode
            ].filter(Boolean).join(', ');
        }
        
        if (displayAddress) {
            const maxLength = 50;
            DOM.address.textContent = displayAddress.length > maxLength 
                ? displayAddress.substring(0, maxLength) + '...'
                : displayAddress;
            DOM.address.classList.remove('not-set');
        } else {
            DOM.address.textContent = 'Not set';
            DOM.address.classList.add('not-set');
        }
    }
    
    if (DOM.memberSince) {
        const dateStr = userData.memberSince || userData.createdAt;
        if (dateStr) {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                DOM.memberSince.textContent = date.toLocaleDateString('en-IN', {
                    month: 'short',
                    year: 'numeric'
                });
            } else {
                DOM.memberSince.textContent = 'Recently';
            }
        }
    }
    
    console.log('✅ Profile display updated');
}

function updatePhotoDisplay(imgElement, placeholderElement, photoData) {
    if (!imgElement) return;
    
    if (photoData && photoData.trim() !== '') {
        imgElement.src = photoData;
        imgElement.style.display = 'block';
        if (placeholderElement) {
            placeholderElement.style.display = 'none';
        }
    } else {
        imgElement.src = '';
        imgElement.style.display = 'none';
        if (placeholderElement) {
            placeholderElement.style.display = 'flex';
        }
    }
}

function formatPhoneNumber(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return cleaned;
}

// ==================== RECENT ORDERS ====================
function loadRecentOrders() {
    const orders = userData?.orders || [];
    
    if (orders.length === 0) {
        showNoOrders();
        return;
    }
    
    hideNoOrders();
    
    const sortedOrders = [...orders].sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || 0);
        const dateB = new Date(b.date || b.createdAt || 0);
        return dateB - dateA;
    });
    
    const recentOrders = sortedOrders.slice(0, 3);
    
    if (DOM.recentOrders) {
        DOM.recentOrders.innerHTML = recentOrders
            .map(order => createOrderItemHTML(order))
            .join('');
    }
}

function showNoOrders() {
    if (DOM.recentOrders) DOM.recentOrders.innerHTML = '';
    if (DOM.noOrders) DOM.noOrders.classList.remove('hidden');
}

function hideNoOrders() {
    if (DOM.noOrders) DOM.noOrders.classList.add('hidden');
}

function createOrderItemHTML(order) {
    const statusClass = getStatusClass(order.status);
    const statusText = formatStatus(order.status);
    const orderEmoji = getOrderEmoji(order);
    const formattedDate = formatOrderDate(order.date || order.createdAt);
    const formattedTotal = formatCurrency(order.total || order.totalAmount || 0);
    const orderId = order.id || order.orderId || Date.now();
    
    return `
        <div class="order-item" data-order-id="${orderId}" onclick="viewOrderDetails('${orderId}')">
            <div class="order-icon">${orderEmoji}</div>
            <div class="order-info">
                <div class="order-id">Order #${orderId}</div>
                <div class="order-date">${formattedDate}</div>
            </div>
            <span class="order-status ${statusClass}">${statusText}</span>
            <span class="order-amount">${formattedTotal}</span>
        </div>
    `;
}

function getStatusClass(status) {
    const statusMap = {
        'delivered': 'delivered',
        'confirmed': 'pending',
        'pending': 'pending',
        'processing': 'pending',
        'shipped': 'pending',
        'cancelled': 'cancelled',
        'refunded': 'cancelled'
    };
    return statusMap[status?.toLowerCase()] || 'pending';
}

function formatStatus(status) {
    if (!status) return 'Pending';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function getOrderEmoji(order) {
    const status = order.status?.toLowerCase();
    if (status === 'delivered') return '✅';
    if (status === 'cancelled' || status === 'refunded') return '❌';
    if (status === 'shipped') return '🚚';
    return '📦';
}

function formatOrderDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return dateString;
    }
}

function viewOrderDetails(orderId) {
    window.location.href = `orders.html?id=${orderId}`;
}

// ==================== PHOTO UPLOAD ====================
async function handleMainPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const validation = validateImageFile(file);
    if (!validation.valid) {
        showToast(validation.message, 'error');
        return;
    }
    
    try {
        showLoading();
        
        const base64 = await convertFileToBase64(file);
        const compressedBase64 = await compressImage(base64);
        
        userData.profilePhoto = compressedBase64;
        
        const currentUser = auth.currentUser;
        if (currentUser) {
            await db.collection('users').doc(currentUser.uid).update({
                photo: compressedBase64,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        updateProfileDisplay();
        
        hideLoading();
        showToast('Profile photo updated successfully!', 'success');
        
    } catch (error) {
        hideLoading();
        console.error('Error uploading photo:', error);
        showToast('Failed to upload photo. Please try again.', 'error');
    }
    
    event.target.value = '';
}

async function handleModalPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const validation = validateImageFile(file);
    if (!validation.valid) {
        showToast(validation.message, 'error');
        return;
    }
    
    try {
        const base64 = await convertFileToBase64(file);
        const compressedBase64 = await compressImage(base64);
        
        tempPhotoData = compressedBase64;
        updatePhotoDisplay(DOM.editProfilePhoto, DOM.editPhotoPlaceholder, compressedBase64);
        
    } catch (error) {
        console.error('Error uploading photo:', error);
        showToast('Failed to upload photo. Please try again.', 'error');
    }
    
    event.target.value = '';
}

function validateImageFile(file) {
    if (!file.type.startsWith('image/')) {
        return { valid: false, message: 'Please select an image file' };
    }
    
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        return { valid: false, message: 'Image size should be less than 5MB' };
    }
    
    return { valid: true };
}

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

function compressImage(base64) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const maxWidth = 500;
            const maxHeight = 500;
            
            let { width, height } = img;
            
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width *= ratio;
                height *= ratio;
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            const compressed = canvas.toDataURL('image/jpeg', 0.8);
            resolve(compressed);
        };
        
        img.onerror = () => resolve(base64);
        img.src = base64;
    });
}

function removePhoto() {
    tempPhotoData = null;
    updatePhotoDisplay(DOM.editProfilePhoto, DOM.editPhotoPlaceholder, null);
    
    if (DOM.editPhotoInput) {
        DOM.editPhotoInput.value = '';
    }
    
    showToast('Photo removed. Click Save to confirm.', 'info');
}

// ==================== EDIT MODAL ====================
function openEditModal(mode = 'all') {
    editMode = mode;
    tempPhotoData = userData?.profilePhoto || null;
    
    const titles = {
        'all': 'Edit Profile',
        'phone': 'Update Phone Number',
        'email': 'Update Email Address',
        'address': 'Update Delivery Address'
    };
    
    if (DOM.modalTitle) {
        DOM.modalTitle.textContent = titles[mode] || 'Edit Profile';
    }
    
    toggleFormSections(mode);
    populateEditForm();
    
    if (DOM.editModal) {
        DOM.editModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => focusFirstInput(mode), 100);
    }
}

function toggleFormSections(mode) {
    const sectionVisibility = {
        'photoSection': mode === 'all',
        'nameSection': mode === 'all',
        'phoneSection': mode === 'all' || mode === 'phone',
        'emailSection': mode === 'all' || mode === 'email',
        'addressSection': mode === 'all' || mode === 'address'
    };
    
    Object.entries(sectionVisibility).forEach(([sectionId, visible]) => {
        const section = DOM[sectionId];
        if (section) {
            section.classList.toggle('hidden', !visible);
        }
    });
}

function focusFirstInput(mode) {
    const inputMap = {
        'all': DOM.editName,
        'phone': DOM.editPhone,
        'email': DOM.editEmail,
        'address': DOM.editAddress
    };
    
    const input = inputMap[mode];
    if (input) {
        input.focus();
        input.select();
    }
}

function closeEditModal() {
    if (DOM.editModal) {
        DOM.editModal.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    if (DOM.editForm) {
        DOM.editForm.reset();
    }
    
    tempPhotoData = null;
    editMode = 'all';
}

function populateEditForm() {
    if (!userData) return;
    
    if (DOM.editName) DOM.editName.value = userData.name || '';
    if (DOM.editPhone) DOM.editPhone.value = userData.phone || '';
    if (DOM.editEmail) DOM.editEmail.value = userData.email || '';
    if (DOM.editAddress) DOM.editAddress.value = userData.address || '';
    
    updatePhotoDisplay(
        DOM.editProfilePhoto, 
        DOM.editPhotoPlaceholder, 
        userData.profilePhoto
    );
}

// ==================== FORM SUBMISSION ====================
async function handleFormSubmit(event) {
    event.preventDefault();

    const currentUser = auth.currentUser;
    if (!currentUser) {
        showToast('User not authenticated', 'error');
        return;
    }

    const updatedData = {
        name: DOM.editName?.value.trim() || '',
        phone: DOM.editPhone?.value.trim() || '',
        email: DOM.editEmail?.value.trim() || '',
        address: DOM.editAddress?.value.trim() || '',
        photo: tempPhotoData || userData.profilePhoto || ''
    };

    const validation = validateFormData(updatedData, editMode);
    if (!validation.valid) {
        showToast(validation.message, 'error');
        return;
    }

    showLoading();

    try {
        if (updatedData.phone && editMode !== 'email' && updatedData.phone !== userData.phone) {
            const snapshot = await db.collection('users')
                .where('phone', '==', updatedData.phone)
                .get();

            const exists = snapshot.docs.some(doc => doc.id !== currentUser.uid);
            if (exists) {
                hideLoading();
                showToast('This phone number is already registered.', 'error');
                return;
            }
        }

        const firestoreUpdate = {
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (editMode === 'all') {
            firestoreUpdate.name = updatedData.name;
            firestoreUpdate.phone = updatedData.phone;
            firestoreUpdate.address = updatedData.address;
            firestoreUpdate.photo = updatedData.photo;
        } else if (editMode === 'phone') {
            firestoreUpdate.phone = updatedData.phone;
        } else if (editMode === 'address') {
            firestoreUpdate.address = updatedData.address;
        }

        await db.collection('users').doc(currentUser.uid).update(firestoreUpdate);

        userData = {
            ...userData,
            ...updatedData,
            profilePhoto: updatedData.photo
        };

        updateProfileDisplay();
        await updateStats();
        closeEditModal();

        hideLoading();
        showToast('Profile updated successfully!', 'success');

    } catch (error) {
        hideLoading();
        console.error('❌ Profile update failed:', error);
        showToast('Failed to update profile. Please try again.', 'error');
    }
}

function validateFormData(data, mode) {
    if (mode === 'all' && !data.name) {
        return { valid: false, message: 'Please enter your name' };
    }
    
    if (mode === 'all' && data.name.length < 2) {
        return { valid: false, message: 'Name must be at least 2 characters' };
    }
    
    if ((mode === 'all' || mode === 'phone') && data.phone) {
        if (!/^\d{10}$/.test(data.phone)) {
            return { valid: false, message: 'Please enter a valid 10-digit phone number' };
        }
    }
    
    if ((mode === 'all' || mode === 'email') && data.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            return { valid: false, message: 'Please enter a valid email address' };
        }
    }
    
    if (mode === 'address' && !data.address) {
        return { valid: false, message: 'Please enter your delivery address' };
    }
    
    return { valid: true };
}

// ==================== SETTINGS ====================
function handleNotificationToggle(event) {
    const enabled = event.target.checked;
    userData.notifications = enabled;
    
    const currentUser = auth.currentUser;
    if (currentUser) {
        db.collection('users').doc(currentUser.uid).update({
            notifications: enabled
        });
    }
    
    showToast(enabled ? 'Notifications enabled' : 'Notifications disabled', 'info');
}

function openNotificationSettings() {
    if (DOM.notificationToggle) {
        DOM.notificationToggle.checked = !DOM.notificationToggle.checked;
        DOM.notificationToggle.dispatchEvent(new Event('change'));
    }
}

function shareApp() {
    const shareData = {
        title: 'FreshMart - Online Grocery Store',
        text: 'Check out FreshMart for fresh groceries!',
        url: window.location.origin
    };
    
    if (navigator.share) {
        navigator.share(shareData)
            .then(() => showToast('Thanks for sharing!', 'success'))
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    fallbackShare(shareData);
                }
            });
    } else {
        fallbackShare(shareData);
    }
}

function fallbackShare(shareData) {
    const shareText = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
    navigator.clipboard.writeText(shareText)
        .then(() => showToast('Link copied to clipboard!', 'success'))
        .catch(() => showToast('Unable to share.', 'error'));
}

function rateApp() {
    showToast('Thank you for your feedback! ⭐', 'success');
}

// ==================== LOGOUT ====================
function handleLogout() {
    const confirmed = confirm('Are you sure you want to logout?');
    if (!confirmed) return;
    
    showLoading();
    
    auth.signOut().then(() => {
        localStorage.removeItem(STORAGE_KEYS.USER);
        
        hideLoading();
        showToast('Logged out successfully!', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }).catch((error) => {
        hideLoading();
        console.error('Logout error:', error);
        showToast('Error logging out', 'error');
    });
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'success') {
    if (!DOM.toast || !DOM.toastMessage || !DOM.toastIcon) return;
    
    DOM.toastMessage.textContent = message;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-circle'
    };
    
    DOM.toastIcon.className = `fas ${icons[type] || icons.success}`;
    DOM.toast.className = 'toast';
    DOM.toast.classList.add(type, 'show');
    
    clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(hideToast, 4000);
}

function hideToast() {
    if (DOM.toast) {
        DOM.toast.classList.remove('show');
    }
    clearTimeout(window.toastTimeout);
}

// ==================== LOADING OVERLAY ====================
function showLoading() {
    if (DOM.loadingOverlay) {
        DOM.loadingOverlay.classList.remove('hidden');
    }
}

function hideLoading() {
    if (DOM.loadingOverlay) {
        DOM.loadingOverlay.classList.add('hidden');
    }
}

// ==================== TEST FUNCTION - ADD THIS FOR DEBUGGING ====================
window.testSavings = async function(amount = 150) {
    console.log('🧪 Testing savings with amount:', amount);
    
    // Directly update DOM
    if (DOM.totalSavings) {
        DOM.totalSavings.textContent = formatCurrency(amount);
        console.log('✅ DOM updated directly');
    } else {
        console.error('❌ totalSavings element not found!');
        
        // Try to find it another way
        const element = document.getElementById('totalSavings');
        console.log('Alternative search:', element);
        
        if (element) {
            element.textContent = formatCurrency(amount);
            console.log('✅ Found via getElementById');
        }
    }
};

// Add demo savings to test
window.addDemoSavings = async function() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.error('No user logged in');
        return;
    }
    
    try {
        await db.collection('users').doc(currentUser.uid).update({
            totalSavings: 250,
            orders: [
                {
                    id: '12345',
                    date: new Date().toISOString(),
                    total: 500,
                    discount: 50,
                    status: 'delivered',
                    items: [
                        { name: 'Apples', price: 100, originalPrice: 120, quantity: 2 },
                        { name: 'Milk', price: 50, originalPrice: 60, quantity: 1 }
                    ]
                }
            ]
        });
        
        console.log('✅ Demo data added! Refreshing...');
        window.location.reload();
    } catch (error) {
        console.error('Error adding demo data:', error);
    }
};

// ==================== GLOBAL EXPORTS ====================
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.removePhoto = removePhoto;
window.handleLogout = handleLogout;
window.viewOrderDetails = viewOrderDetails;
window.openNotificationSettings = openNotificationSettings;
window.shareApp = shareApp;
window.rateApp = rateApp;
window.hideToast = hideToast;

console.log('%c👤 FreshMart Profile', 'color: #2e7d32; font-size: 16px; font-weight: bold;');
console.log('%cProfile management ready!', 'color: #666; font-size: 12px;');
console.log('%c💡 Debug: Run testSavings(100) or addDemoSavings() in console', 'color: #1976d2;');