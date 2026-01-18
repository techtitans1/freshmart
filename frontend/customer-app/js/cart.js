// ==================== FRESHMART CART WITH COD & FIRESTORE ====================

// ==================== FIREBASE CONFIG ====================
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

// ==================== RAZORPAY CONFIG ====================
const RAZORPAY_KEY = 'rzp_live_Yjaxr7IV3KhCc2';

// ==================== STORAGE KEYS ====================
const KEYS = {
    CART: 'freshmart_cart',
    USER: 'freshmart_user',
    ADDRESS: 'freshmart_address'
};

// ==================== COUPONS ====================
const COUPONS = {
    'FRESH10': { discount: 10, type: 'percent', min: 200 },
    'SAVE50': { discount: 50, type: 'fixed', min: 500 },
    'FIRST20': { discount: 20, type: 'percent', min: 0 },
    'FREESHIP': { discount: 40, type: 'shipping', min: 300 }
};

// ==================== STATE ====================
let cart = [];
let user = null;
let address = null;
let coupon = null;
let total = 0;
let isLoggedIn = false;
let paymentMethod = 'online'; // Default payment method

// ==================== DOM HELPERS ====================
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    loadLocalData();
    bindEvents();
    
    // Listen for Firebase Auth state
    auth.onAuthStateChanged(handleAuthState);
});

// ==================== AUTH STATE ====================
async function handleAuthState(firebaseUser) {
    if (firebaseUser) {
        // User is signed in
        isLoggedIn = true;
        
        // Load user data from Firestore
        await loadUserFromFirestore(firebaseUser.uid);
        
        console.log('✅ User logged in:', user?.email);
    } else {
        // User is signed out
        isLoggedIn = false;
        user = null;
        address = null;
        console.log('❌ User not logged in');
    }
    
    updateAuthUI();
    updateAddressUI();
    renderCart();
}

// ==================== LOAD USER FROM FIRESTORE ====================
async function loadUserFromFirestore(uid) {
    try {
        const doc = await db.collection('users').doc(uid).get();
        
        if (doc.exists) {
            const data = doc.data();
            
            // Set user data
            user = {
                uid: uid,
                name: data.name || '',
                email: data.email || '',
                phone: data.phone || '',
                photo: data.photo || '',
                orders: data.orders || []
            };
            
            // Set address if exists
            if (data.address || data.city || data.pincode) {
                address = {
                    name: data.name || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    address: data.address || '',
                    city: data.city || '',
                    state: data.state || '',
                    pincode: data.pincode || ''
                };
                
                // Save to localStorage for quick access
                localStorage.setItem(KEYS.ADDRESS, JSON.stringify(address));
            }
            
            // Save user to localStorage
            localStorage.setItem(KEYS.USER, JSON.stringify(user));
            
        } else {
            // Create basic user from Firebase Auth
            user = {
                uid: uid,
                name: auth.currentUser.displayName || '',
                email: auth.currentUser.email || '',
                phone: auth.currentUser.phoneNumber || '',
                photo: auth.currentUser.photoURL || '',
                orders: []
            };
            
            // Create user document in Firestore
            await db.collection('users').doc(uid).set({
                ...user,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error loading user from Firestore:', error);
        
        // Fallback to localStorage
        const savedUser = localStorage.getItem(KEYS.USER);
        if (savedUser) {
            user = JSON.parse(savedUser);
        }
    }
}

// ==================== LOAD DATA ====================
function loadLocalData() {
    try {
        cart = JSON.parse(localStorage.getItem(KEYS.CART)) || [];
        
        // Address will be loaded from Firestore
        const savedAddress = localStorage.getItem(KEYS.ADDRESS);
        if (savedAddress) {
            address = JSON.parse(savedAddress);
        }
    } catch (e) {
        console.error('Error loading data:', e);
        cart = [];
    }
}

function saveCart() {
    localStorage.setItem(KEYS.CART, JSON.stringify(cart));
}

async function saveAddress() {
    // Save to localStorage
    localStorage.setItem(KEYS.ADDRESS, JSON.stringify(address));
    
    // Save to Firestore
    if (user && user.uid) {
        try {
            await db.collection('users').doc(user.uid).update({
                name: address.name,
                phone: address.phone,
                address: address.address,
                city: address.city,
                state: address.state,
                pincode: address.pincode,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('✅ Address saved to Firestore');
        } catch (error) {
            console.error('Error saving address to Firestore:', error);
        }
    }
}

// ==================== EVENT BINDINGS ====================
function bindEvents() {
    // Clear cart
    $('clearBtn')?.addEventListener('click', clearCart);
    
    // Checkout
    $('checkoutBtn')?.addEventListener('click', handleCheckout);
    
    // Payment method selection
    $$('input[name="paymentMethod"]').forEach(input => {
        input.addEventListener('change', (e) => {
            paymentMethod = e.target.value;
            updateCheckoutButton();
        });
    });
    
    // Coupon
    $('couponBtn')?.addEventListener('click', applyCoupon);
    $('couponInput')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') applyCoupon();
    });
    
    // Coupon hints
    $$('.hint').forEach(el => {
        el.addEventListener('click', () => {
            $('couponInput').value = el.dataset.code;
            applyCoupon();
        });
    });
    
    // Address button
    $('addressBtn')?.addEventListener('click', handleAddressClick);
    
    // Address modal
    $('closeAddressModal')?.addEventListener('click', closeAddressModal);
    $('cancelAddressBtn')?.addEventListener('click', closeAddressModal);
    $('addressForm')?.addEventListener('submit', handleAddressSubmit);
    
    // Phone validation
    $('addrPhone')?.addEventListener('input', e => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    });
    
    // Pincode validation
    $('addrPincode')?.addEventListener('input', e => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
    });
    
    // Modal backdrop close
    $('addressModal')?.addEventListener('click', e => {
        if (e.target.id === 'addressModal') closeAddressModal();
    });
    
    // Toast close
    $('toastClose')?.addEventListener('click', hideToast);
    
    // Keyboard
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeAddressModal();
    });
}

// ==================== UPDATE CHECKOUT BUTTON ====================
function updateCheckoutButton() {
    const btn = $('checkoutBtn');
    const text = $('checkoutText');
    
    if (!btn || !text) return;
    
    if (cart.length === 0) {
        text.textContent = 'Cart is Empty';
        btn.disabled = true;
    } else if (paymentMethod === 'cod') {
        text.textContent = `Place Order • ₹${total.toLocaleString('en-IN')}`;
        btn.disabled = false;
    } else {
        text.textContent = `Pay ₹${total.toLocaleString('en-IN')}`;
        btn.disabled = false;
    }
}

// ==================== AUTH UI ====================
function updateAuthUI() {
    // Login button
    $('loginBtn')?.classList.toggle('hidden', isLoggedIn);
    
    // User avatar
    $('userAvatar')?.classList.toggle('hidden', !isLoggedIn);
    
    // Login alert
    const showAlert = !isLoggedIn && cart.length > 0;
    $('loginAlert')?.classList.toggle('hidden', !showAlert);
    
    // Login tag on address
    $('loginTag')?.classList.toggle('hidden', isLoggedIn);
    
    // Update avatar image
    if (isLoggedIn && user?.photo) {
        const img = $('avatarImg');
        if (img) img.src = user.photo;
    }
}

// ==================== ADDRESS UI ====================
function updateAddressUI() {
    const body = $('addressBody');
    const btn = $('addressBtnText');
    
    if (!body) return;
    
    if (!isLoggedIn) {
        body.innerHTML = '<p class="no-address">Please login to add address</p>';
        if (btn) btn.textContent = 'Login to Add';
        return;
    }
    
    if (isAddressComplete()) {
        body.innerHTML = `
            <div class="saved-address">
                <div class="addr-name">${address.name}</div>
                <div class="addr-phone">+91 ${address.phone}</div>
                <div class="addr-line">${address.address}, ${address.city} - ${address.pincode}</div>
            </div>
        `;
        if (btn) btn.textContent = 'Change Address';
        $('addressBtn')?.querySelector('i')?.classList.replace('fa-plus', 'fa-edit');
    } else {
        body.innerHTML = '<p class="no-address">Please add your delivery address</p>';
        if (btn) btn.textContent = 'Add Address';
        $('addressBtn')?.querySelector('i')?.classList.replace('fa-edit', 'fa-plus');
    }
}

function isAddressComplete() {
    return address && address.name && address.phone && 
           address.email && address.address && 
           address.city && address.pincode;
}

// ==================== ADDRESS MODAL ====================
function handleAddressClick() {
    if (!isLoggedIn) {
        toast('Please login first', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html?redirect=cart';
        }, 1000);
        return;
    }
    openAddressModal();
}

function openAddressModal() {
    // Pre-fill from existing data
    if (address) {
        $('addrName').value = address.name || '';
        $('addrPhone').value = address.phone || '';
        $('addrEmail').value = address.email || '';
        $('addrLine').value = address.address || '';
        $('addrCity').value = address.city || '';
        $('addrPincode').value = address.pincode || '';
        $('addrState').value = address.state || '';
    } else if (user) {
        // Pre-fill from user profile
        $('addrName').value = user.name || '';
        $('addrPhone').value = user.phone || '';
        $('addrEmail').value = user.email || '';
    }
    
    $('addressModal')?.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('addrName')?.focus(), 100);
}

function closeAddressModal() {
    $('addressModal')?.classList.remove('active');
    document.body.style.overflow = '';
}

async function handleAddressSubmit(e) {
    e.preventDefault();
    
    const name = $('addrName')?.value.trim();
    const phone = $('addrPhone')?.value.trim();
    const email = $('addrEmail')?.value.trim();
    const addr = $('addrLine')?.value.trim();
    const city = $('addrCity')?.value.trim();
    const pincode = $('addrPincode')?.value.trim();
    const state = $('addrState')?.value.trim();
    
    // Validate
    if (!name) return toast('Enter your name', 'error');
    if (!phone || phone.length !== 10) return toast('Enter valid 10-digit phone', 'error');
    if (!email || !validateEmail(email)) return toast('Enter valid email', 'error');
    if (!addr) return toast('Enter address', 'error');
    if (!city) return toast('Enter city', 'error');
    if (!pincode || pincode.length !== 6) return toast('Enter valid 6-digit pincode', 'error');
    
    // Save address
    address = { name, phone, email, address: addr, city, pincode, state };
    
    showLoading('Saving address...');
    await saveAddress();
    hideLoading();
    
    closeAddressModal();
    updateAddressUI();
    toast('Address saved!', 'success');
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ==================== CART RENDER (Same as before) ====================
function renderCart() {
    const container = $('cartItems');
    const empty = $('emptyCart');
    const sidebar = $('cartSidebar');
    const clearBtn = $('clearBtn');
    const countEl = $('itemsCount');
    
    const totalQty = cart.reduce((s, i) => s + i.quantity, 0);
    if (countEl) countEl.textContent = `${totalQty} item${totalQty !== 1 ? 's' : ''}`;
    
    if (cart.length === 0) {
        if (container) container.innerHTML = '';
        empty?.classList.remove('hidden');
        sidebar?.classList.add('hidden');
        clearBtn?.classList.add('hidden');
        $('loginAlert')?.classList.add('hidden');
        return;
    }
    
    empty?.classList.add('hidden');
    sidebar?.classList.remove('hidden');
    clearBtn?.classList.remove('hidden');
    
    if (!isLoggedIn) {
        $('loginAlert')?.classList.remove('hidden');
    }
    
    if (container) {
        container.innerHTML = cart.map(item => createItemHTML(item)).join('');
        bindItemEvents();
    }
    
    updateSummary();
}

function createItemHTML(item) {
    const itemTotal = item.price * item.quantity;
    const hasDiscount = item.originalPrice && item.originalPrice > item.price;
    const discountPct = hasDiscount 
        ? Math.round((1 - item.price / item.originalPrice) * 100) 
        : 0;
    
    return `
        <div class="cart-item" data-id="${item.id}">
            <div class="item-img-wrap">
                <img src="${item.image}" alt="${item.name}" class="item-img"
                     onerror="this.src='https://via.placeholder.com/80?text=Image'">
                ${hasDiscount ? `<span class="item-badge">${discountPct}% OFF</span>` : ''}
            </div>
            
            <div class="item-details">
                <h4>${item.name}</h4>
                <p class="item-weight"><i class="fas fa-weight-hanging"></i> ${item.weight || 'Standard'}</p>
                <div class="item-prices">
                    <span class="item-price">₹${item.price}</span>
                    ${hasDiscount ? `<span class="item-old-price">₹${item.originalPrice}</span>` : ''}
                </div>
            </div>
            
            <div class="item-actions">
                <div class="qty-control">
                    <button class="qty-btn minus" data-id="${item.id}" ${item.quantity <= 1 ? 'disabled' : ''}>
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="qty-val">${item.quantity}</span>
                    <button class="qty-btn plus" data-id="${item.id}">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <button class="remove-btn" data-id="${item.id}">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
            
            <div class="item-total">
                <span class="item-total-label">Total</span>
                <span class="item-total-val">₹${itemTotal.toLocaleString('en-IN')}</span>
            </div>
        </div>
    `;
}

function bindItemEvents() {
    $$('.qty-btn.minus').forEach(btn => {
        btn.addEventListener('click', () => changeQty(+btn.dataset.id, -1));
    });
    
    $$('.qty-btn.plus').forEach(btn => {
        btn.addEventListener('click', () => changeQty(+btn.dataset.id, 1));
    });
    
    $$('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => removeItem(+btn.dataset.id));
    });
}

function changeQty(id, delta) {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    
    item.quantity += delta;
    
    if (item.quantity <= 0) {
        removeItem(id);
    } else {
        saveCart();
        renderCart();
    }
}

function removeItem(id) {
    const item = cart.find(i => i.id === id);
    
    const el = document.querySelector(`.cart-item[data-id="${id}"]`);
    if (el) {
        el.style.transform = 'translateX(100%)';
        el.style.opacity = '0';
        el.style.transition = 'all 0.3s ease';
    }
    
    setTimeout(() => {
        cart = cart.filter(i => i.id !== id);
        saveCart();
        renderCart();
        if (item) toast(`${item.name} removed`, 'info');
    }, 300);
}

function clearCart() {
    if (cart.length === 0) return toast('Cart is already empty', 'info');
    
    if (confirm('Clear all items from cart?')) {
        cart = [];
        coupon = null;
        saveCart();
        renderCart();
        toast('Cart cleared', 'success');
    }
}

// ==================== SUMMARY ====================
function updateSummary() {
    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    let delivery = subtotal >= 500 ? 0 : 40;
    
    // Product discount
    let discount = cart.reduce((s, i) => {
        if (i.originalPrice && i.originalPrice > i.price) {
            return s + (i.originalPrice - i.price) * i.quantity;
        }
        return s;
    }, 0);
    
    // Coupon discount
    let couponDiscount = 0;
    if (coupon && COUPONS[coupon]) {
        const c = COUPONS[coupon];
        if (c.type === 'percent') couponDiscount = Math.round(subtotal * c.discount / 100);
        else if (c.type === 'fixed') couponDiscount = c.discount;
        else if (c.type === 'shipping') delivery = 0;
    }
    
    total = subtotal + delivery - couponDiscount;
    const totalSavings = discount + couponDiscount + (delivery === 0 && subtotal >= 500 ? 40 : 0);
    
    // Update DOM
    $('subtotal').textContent = `₹${subtotal.toLocaleString('en-IN')}`;
    
    const delEl = $('delivery');
    if (delEl) {
        delEl.textContent = delivery === 0 ? 'FREE' : `₹${delivery}`;
        delEl.style.color = delivery === 0 ? 'var(--primary)' : '';
    }
    
    $('discount').textContent = (discount + couponDiscount) > 0 
        ? `-₹${(discount + couponDiscount).toLocaleString('en-IN')}` 
        : '₹0';
    
    $('total').textContent = `₹${total.toLocaleString('en-IN')}`;
    
    // Savings
    const savingsEl = $('savingsNote');
    if (savingsEl) {
        if (totalSavings > 0) {
            $('savings').textContent = `₹${totalSavings.toLocaleString('en-IN')}`;
            savingsEl.classList.remove('hidden');
        } else {
            savingsEl.classList.add('hidden');
        }
    }
    
    // Update checkout button
    updateCheckoutButton();
}

// ==================== COUPON ====================
function applyCoupon() {
    const input = $('couponInput');
    const code = input?.value.trim().toUpperCase();
    
    if (!code) return showCouponMsg('Enter a coupon code', 'error');
    
    const c = COUPONS[code];
    if (!c) {
        coupon = null;
        updateSummary();
        return showCouponMsg('Invalid coupon code', 'error');
    }
    
    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    if (subtotal < c.min) {
        return showCouponMsg(`Minimum order ₹${c.min} required`, 'error');
    }
    
    coupon = code;
    updateSummary();
    
    let msg = '';
    if (c.type === 'percent') msg = `${c.discount}% off applied!`;
    else if (c.type === 'fixed') msg = `₹${c.discount} off applied!`;
    else if (c.type === 'shipping') msg = 'Free delivery applied!';
    
    showCouponMsg(msg, 'success');
    toast(`Coupon ${code} applied!`, 'success');
}

function showCouponMsg(msg, type) {
    const el = $('couponMsg');
    if (!el) return;
    
    el.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i> ${msg}`;
    el.className = `coupon-msg ${type}`;
    el.classList.remove('hidden');
    
    if (type === 'error') {
        setTimeout(() => el.classList.add('hidden'), 4000);
    }
}

// ==================== CHECKOUT ====================
async function handleCheckout() {
    // Step 1: Check cart
    if (cart.length === 0) {
        return toast('Your cart is empty!', 'error');
    }
    
    // Step 2: Check login
    if (!isLoggedIn) {
        toast('Please login to checkout', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html?redirect=cart';
        }, 1000);
        return;
    }
    
    // Step 3: Check address
    if (!isAddressComplete()) {
        toast('Please add delivery address', 'warning');
        openAddressModal();
        return;
    }
    
    // Step 4: Process based on payment method
    if (paymentMethod === 'cod') {
        await processCODOrder();
    } else {
        initOnlinePayment();
    }
}

// ==================== COD ORDER ====================
// ==================== COD ORDER (FIXED) ====================
async function processCODOrder() {
    showLoading('Placing your order...');
    
    const orderId = 'ORD' + Date.now();
    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const delivery = subtotal >= 500 ? 0 : 40;
    
    // Calculate discount
    let discount = cart.reduce((s, i) => {
        if (i.originalPrice && i.originalPrice > i.price) {
            return s + (i.originalPrice - i.price) * i.quantity;
        }
        return s;
    }, 0);
    
    try {
        // Ensure user is authenticated
        if (!user || !user.uid) {
            hideLoading();
            toast('Please login to place order', 'error');
            return;
        }
        
        // Create order object with proper structure
        const orderData = {
            id: orderId,
            paymentId: null,
            paymentMethod: 'cod',
            items: cart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.image || '',
                weight: item.weight || ''
            })),
            subtotal: subtotal,
            delivery: delivery,
            discount: discount,
            total: total,
            address: {
                name: address.name || '',
                phone: address.phone || '',
                email: address.email || '',
                address: address.address || '',
                city: address.city || '',
                state: address.state || '',
                pincode: address.pincode || ''
            },
            status: 'confirmed',
            statusHistory: [
                { 
                    status: 'confirmed', 
                    timestamp: new Date().toISOString(), 
                    message: 'Order placed (Cash on Delivery)' 
                }
            ],
            createdAt: new Date().toISOString(),
            userId: user.uid
        };
        
        console.log('Creating order:', orderData);
        
        // Save order to Firestore
        await db.collection('orders').doc(orderId).set(orderData);
        
        console.log('Order saved to Firestore');
        
        // Update user's orders array
        const userOrderData = {
            id: orderId,
            total: total,
            status: 'confirmed',
            date: new Date().toISOString(),
            itemCount: cart.length,
            paymentMethod: 'cod'
        };
        
        await db.collection('users').doc(user.uid).update({
            orders: firebase.firestore.FieldValue.arrayUnion(userOrderData)
        });
        
        console.log('User orders updated');
        
        // Clear cart
        cart = [];
        coupon = null;
        saveCart();
        
        hideLoading();
        
        // Redirect to order confirmation
        window.location.href = `order-confirmation.html?orderId=${orderId}&method=cod`;
        
    } catch (error) {
        hideLoading();
        console.error('Error creating COD order:', error);
        
        // More specific error message
        if (error.code === 'permission-denied') {
            toast('Permission denied. Please check Firestore rules.', 'error');
        } else {
            toast(`Error: ${error.message}`, 'error');
        }
    }
}
// ==================== ONLINE PAYMENT ====================
function initOnlinePayment() {
    if (typeof Razorpay === 'undefined') {
        return toast('Payment gateway error. Refresh page.', 'error');
    }
    
    const orderId = 'ORD' + Date.now();
    
    const options = {
        key: RAZORPAY_KEY,
        amount: total * 100,
        currency: 'INR',
        name: 'FreshMart',
        description: `Order ${orderId}`,
        image: 'https://your-logo-url.com/logo.png',
        handler: response => processOnlinePayment(response, orderId),
        prefill: {
            name: address.name,
            email: address.email,
            contact: '+91' + address.phone
        },
        notes: {
            order_id: orderId,
            address: `${address.address}, ${address.city} - ${address.pincode}`
        },
        theme: { color: '#2e7d32' },
        modal: {
            ondismiss: () => toast('Payment cancelled', 'info'),
            confirm_close: true
        }
    };
    
    try {
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', (response) => {
            console.error('Payment failed:', response);
            toast(response.error?.description || 'Payment failed', 'error');
        });
        rzp.open();
    } catch (e) {
        console.error('Razorpay error:', e);
        toast('Payment initialization failed', 'error');
    }
}

// ==================== ONLINE PAYMENT (FIXED) ====================
async function processOnlinePayment(response, orderId) {
    showLoading('Creating your order...');
    
    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const delivery = subtotal >= 500 ? 0 : 40;
    
    // Calculate discount
    let discount = cart.reduce((s, i) => {
        if (i.originalPrice && i.originalPrice > i.price) {
            return s + (i.originalPrice - i.price) * i.quantity;
        }
        return s;
    }, 0);
    
    try {
        // Ensure user is authenticated
        if (!user || !user.uid) {
            hideLoading();
            toast('Please login to place order', 'error');
            return;
        }
        
        // Create order object
        const orderData = {
            id: orderId,
            paymentId: response.razorpay_payment_id,
            paymentMethod: 'online',
            items: cart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.image || '',
                weight: item.weight || ''
            })),
            subtotal: subtotal,
            delivery: delivery,
            discount: discount,
            total: total,
            address: {
                name: address.name || '',
                phone: address.phone || '',
                email: address.email || '',
                address: address.address || '',
                city: address.city || '',
                state: address.state || '',
                pincode: address.pincode || ''
            },
            status: 'confirmed',
            statusHistory: [
                { 
                    status: 'confirmed', 
                    timestamp: new Date().toISOString(), 
                    message: 'Order confirmed' 
                }
            ],
            createdAt: new Date().toISOString(),
            userId: user.uid
        };
        
        console.log('Creating order:', orderData);
        
        // Save order to Firestore
        await db.collection('orders').doc(orderId).set(orderData);
        
        // Update user's orders array
        const userOrderData = {
            id: orderId,
            total: total,
            status: 'confirmed',
            date: new Date().toISOString(),
            itemCount: cart.length,
            paymentMethod: 'online'
        };
        
        await db.collection('users').doc(user.uid).update({
            orders: firebase.firestore.FieldValue.arrayUnion(userOrderData)
        });
        
        // Clear cart
        cart = [];
        coupon = null;
        saveCart();
        
        hideLoading();
        
        // Redirect to order confirmation
        window.location.href = `order-confirmation.html?orderId=${orderId}&method=online`;
        
    } catch (error) {
        hideLoading();
        console.error('Error creating order:', error);
        
        if (error.code === 'permission-denied') {
            toast('Permission denied. Please check Firestore rules.', 'error');
        } else {
            toast(`Error: ${error.message}`, 'error');
        }
    }
}

// ==================== UTILITIES ====================
function toast(msg, type = 'success') {
    const el = $('toast');
    const msgEl = $('toastMsg');
    const iconEl = $('toastIcon');
    
    if (!el || !msgEl) return;
    
    msgEl.textContent = msg;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    iconEl.className = `fas ${icons[type] || icons.success}`;
    el.className = `toast ${type} show`;
    
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(hideToast, 4000);
}

function hideToast() {
    $('toast')?.classList.remove('show');
}

function showLoading(text = 'Processing...') {
    $('loadingText').textContent = text;
    $('loading')?.classList.remove('hidden');
}

function hideLoading() {
    $('loading')?.classList.add('hidden');
}

// ==================== CONSOLE ====================
console.log('%c🛒 FreshMart Cart with COD & Firestore', 'color:#2e7d32;font-size:16px;font-weight:bold');
console.log('%c💳 Online + COD Payment Ready', 'color:#666');