// ==================== FRESHMART CHECKOUT ====================
// Complete checkout with COD + Online Payment + Firestore

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
    ADDRESS: 'freshmart_address'
};

// ==================== STATE ====================
let cart = [];
let user = null;
let address = null;
let total = 0;
let subtotal = 0;
let discount = 0;
let delivery = 40;
let paymentMethod = 'online';

// ==================== DOM HELPERS ====================
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    
    if (cart.length === 0) {
        window.location.href = 'cart.html';
        return;
    }
    
    bindEvents();
    
    auth.onAuthStateChanged(handleAuthState);
});

// ==================== AUTH STATE ====================
async function handleAuthState(firebaseUser) {
    if (!firebaseUser) {
        toast('Please login to checkout', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html?redirect=checkout';
        }, 1500);
        return;
    }
    
    user = firebaseUser;
    console.log('✅ User authenticated:', user.uid);
    
    // Load address from Firestore
    await loadAddressFromFirestore();
    
    // Render cart items
    renderOrderItems();
    updateSummary();
}

// ==================== LOAD ADDRESS FROM FIRESTORE ====================
async function loadAddressFromFirestore() {
    try {
        const doc = await db.collection('users').doc(user.uid).get();
        
        if (doc.exists) {
            const data = doc.data();
            
            address = {
                name: data.name || '',
                phone: data.phone || '',
                email: data.email || user.email || '',
                address: data.address || '',
                city: data.city || '',
                state: data.state || '',
                pincode: data.pincode || ''
            };
            
            // Save to localStorage for cart page
            localStorage.setItem(KEYS.ADDRESS, JSON.stringify(address));
            
            displayAddress();
        } else {
            showAddressForm();
        }
    } catch (error) {
        console.error('Error loading address:', error);
        showAddressForm();
    }
}

// ==================== DISPLAY ADDRESS ====================
function displayAddress() {
    const container = $('addressDisplay');
    
    if (isAddressComplete()) {
        container.innerHTML = `
            <div class="saved-address">
                <div class="addr-name">${address.name}</div>
                <div class="addr-phone">+91 ${address.phone}</div>
                <div class="addr-line">
                    ${address.address}${address.city ? ', ' + address.city : ''}${address.pincode ? ' - ' + address.pincode : ''}
                    ${address.state ? ', ' + address.state : ''}
                </div>
            </div>
        `;
        $('changeAddressBtn').classList.remove('hidden');
        $('addressFormContainer').classList.add('hidden');
        updateProgress(2);
    } else {
        showAddressForm();
    }
}

function showAddressForm() {
    const container = $('addressDisplay');
    container.innerHTML = `
        <div class="no-address">
            <i class="fas fa-map-marker-alt"></i>
            <p>Please add your delivery address</p>
        </div>
    `;
    
    // Pre-fill form with existing data
    if (address) {
        $('addrName').value = address.name || '';
        $('addrPhone').value = address.phone || '';
        $('addrEmail').value = address.email || '';
        $('addrLine').value = address.address || '';
        $('addrCity').value = address.city || '';
        $('addrState').value = address.state || '';
        $('addrPincode').value = address.pincode || '';
    }
    
    $('addressFormContainer').classList.remove('hidden');
    $('changeAddressBtn').classList.add('hidden');
}

function isAddressComplete() {
    return address && address.name && address.phone && 
           address.address && address.city && address.pincode;
}

// ==================== LOAD CART ====================
function loadCart() {
    try {
        cart = JSON.parse(localStorage.getItem(KEYS.CART)) || [];
    } catch (e) {
        cart = [];
    }
}

// ==================== RENDER ORDER ITEMS ====================
function renderOrderItems() {
    const container = $('orderItems');
    const countEl = $('itemsCount');
    
    const totalQty = cart.reduce((s, i) => s + i.quantity, 0);
    countEl.textContent = `${totalQty} item${totalQty !== 1 ? 's' : ''}`;
    
    container.innerHTML = cart.map(item => `
        <div class="order-item">
            <img src="${item.image}" alt="${item.name}" class="order-item-img" 
                 onerror="this.src='https://via.placeholder.com/60?text=Image'">
            <div class="order-item-details">
                <div class="order-item-name">${item.name}</div>
                <div class="order-item-qty">${item.weight || 'Standard'} × ${item.quantity}</div>
            </div>
            <div class="order-item-price">₹${(item.price * item.quantity).toLocaleString('en-IN')}</div>
        </div>
    `).join('');
}

// ==================== UPDATE SUMMARY ====================
function updateSummary() {
    subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    delivery = subtotal >= 500 ? 0 : 40;
    
    // Calculate product discount
    discount = cart.reduce((s, i) => {
        if (i.originalPrice && i.originalPrice > i.price) {
            return s + (i.originalPrice - i.price) * i.quantity;
        }
        return s;
    }, 0);
    
    total = subtotal + delivery;
    const totalSavings = discount + (delivery === 0 && subtotal < 500 ? 0 : (subtotal >= 500 ? 40 : 0));
    
    $('subtotal').textContent = `₹${subtotal.toLocaleString('en-IN')}`;
    
    const delEl = $('delivery');
    delEl.textContent = delivery === 0 ? 'FREE' : `₹${delivery}`;
    delEl.style.color = delivery === 0 ? 'var(--primary)' : '';
    
    $('discount').textContent = discount > 0 ? `-₹${discount.toLocaleString('en-IN')}` : '₹0';
    $('total').textContent = `₹${total.toLocaleString('en-IN')}`;
    
    // Savings
    const savingsEl = $('savingsNote');
    if (totalSavings > 0) {
        $('savings').textContent = `₹${totalSavings.toLocaleString('en-IN')}`;
        savingsEl.classList.remove('hidden');
    } else {
        savingsEl.classList.add('hidden');
    }
    
    updatePlaceOrderBtn();
}

function updatePlaceOrderBtn() {
    const btn = $('placeOrderBtn');
    const text = $('placeOrderText');
    
    if (paymentMethod === 'cod') {
        text.textContent = `Place Order • ₹${total.toLocaleString('en-IN')}`;
    } else {
        text.textContent = `Pay ₹${total.toLocaleString('en-IN')}`;
    }
}

// ==================== UPDATE PROGRESS ====================
function updateProgress(step) {
    const steps = $$('.progress-step');
    const lines = $$('.progress-line');
    
    steps.forEach((s, i) => {
        s.classList.remove('active', 'completed');
        if (i < step - 1) s.classList.add('completed');
        if (i === step - 1) s.classList.add('active');
    });
    
    lines.forEach((l, i) => {
        l.classList.toggle('completed', i < step - 1);
    });
}

// ==================== EVENT BINDINGS ====================
function bindEvents() {
    // Payment method change
    $$('input[name="paymentMethod"]').forEach(input => {
        input.addEventListener('change', (e) => {
            paymentMethod = e.target.value;
            updatePlaceOrderBtn();
            updateProgress(paymentMethod === 'cod' ? 3 : 2);
        });
    });
    
    // Change address button
    $('changeAddressBtn')?.addEventListener('click', () => {
        $('addressFormContainer').classList.remove('hidden');
        $('changeAddressBtn').classList.add('hidden');
        
        // Pre-fill form
        if (address) {
            $('addrName').value = address.name || '';
            $('addrPhone').value = address.phone || '';
            $('addrEmail').value = address.email || '';
            $('addrLine').value = address.address || '';
            $('addrCity').value = address.city || '';
            $('addrState').value = address.state || '';
            $('addrPincode').value = address.pincode || '';
        }
    });
    
    // Cancel address form
    $('cancelAddressBtn')?.addEventListener('click', () => {
        if (isAddressComplete()) {
            $('addressFormContainer').classList.add('hidden');
            $('changeAddressBtn').classList.remove('hidden');
        }
    });
    
    // Address form submit
    $('addressForm')?.addEventListener('submit', handleAddressSubmit);
    
    // Phone validation
    $('addrPhone')?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    });
    
    // Pincode validation
    $('addrPincode')?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
    });
    
    // Place order button
    $('placeOrderBtn')?.addEventListener('click', handlePlaceOrder);
}

// ==================== ADDRESS SUBMIT ====================
async function handleAddressSubmit(e) {
    e.preventDefault();
    
    const name = $('addrName').value.trim();
    const phone = $('addrPhone').value.trim();
    const email = $('addrEmail').value.trim();
    const addr = $('addrLine').value.trim();
    const city = $('addrCity').value.trim();
    const state = $('addrState').value.trim();
    const pincode = $('addrPincode').value.trim();
    
    // Validate
    if (!name) return toast('Please enter your name', 'error');
    if (!phone || phone.length !== 10) return toast('Please enter valid 10-digit phone', 'error');
    if (!email || !validateEmail(email)) return toast('Please enter valid email', 'error');
    if (!addr) return toast('Please enter your address', 'error');
    if (!city) return toast('Please enter your city', 'error');
    if (!pincode || pincode.length !== 6) return toast('Please enter valid 6-digit pincode', 'error');
    
    showLoading('Saving address...');
    
    try {
        // Save to Firestore
        await db.collection('users').doc(user.uid).update({
            name,
            phone,
            address: addr,
            city,
            state,
            pincode,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        address = { name, phone, email, address: addr, city, state, pincode };
        localStorage.setItem(KEYS.ADDRESS, JSON.stringify(address));
        
        hideLoading();
        displayAddress();
        toast('Address saved successfully!', 'success');
        
    } catch (error) {
        hideLoading();
        console.error('Error saving address:', error);
        toast('Failed to save address', 'error');
    }
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ==================== PLACE ORDER ====================
async function handlePlaceOrder() {
    // Validate address
    if (!isAddressComplete()) {
        toast('Please add delivery address', 'warning');
        showAddressForm();
        return;
    }
    
    if (paymentMethod === 'online') {
        initRazorpay();
    } else {
        await processCODOrder();
    }
}

// ==================== RAZORPAY PAYMENT ====================
function initRazorpay() {
    if (typeof Razorpay === 'undefined') {
        toast('Payment gateway error. Please refresh.', 'error');
        return;
    }
    
    const orderId = 'ORD' + Date.now();
    
    const options = {
        key: RAZORPAY_KEY,
        amount: total * 100,
        currency: 'INR',
        name: 'FreshMart',
        description: `Order ${orderId}`,
        image: 'https://your-logo-url.com/logo.png',
        handler: (response) => processOnlineOrder(response, orderId),
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

// ==================== PROCESS ONLINE ORDER ====================
async function processOnlineOrder(response, orderId) {
    showLoading('Creating your order...');
    
    try {
        const order = {
            id: orderId,
            paymentId: response.razorpay_payment_id,
            paymentMethod: 'online',
            items: [...cart],
            subtotal,
            delivery,
            discount,
            total,
            address: { ...address },
            status: 'confirmed',
            statusHistory: [
                { status: 'confirmed', timestamp: new Date().toISOString(), message: 'Order confirmed' }
            ],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            userId: user.uid
        };
        
        // Save order to Firestore
        await db.collection('orders').doc(orderId).set(order);
        
        // Add order to user's orders array
        await db.collection('users').doc(user.uid).update({
            orders: firebase.firestore.FieldValue.arrayUnion({
                id: orderId,
                total,
                status: 'confirmed',
                date: new Date().toISOString(),
                itemCount: cart.length
            })
        });
        
        // Clear cart
        localStorage.removeItem(KEYS.CART);
        
        hideLoading();
        
        // Redirect to order confirmation
        window.location.href = `order-confirmation.html?orderId=${orderId}&method=online`;
        
    } catch (error) {
        hideLoading();
        console.error('Error creating order:', error);
        toast('Failed to create order. Please contact support.', 'error');
    }
}

// ==================== PROCESS COD ORDER ====================
async function processCODOrder() {
    showLoading('Placing your order...');
    
    const orderId = 'ORD' + Date.now();
    
    try {
        const order = {
            id: orderId,
            paymentId: null,
            paymentMethod: 'cod',
            items: [...cart],
            subtotal,
            delivery,
            discount,
            total,
            address: { ...address },
            status: 'confirmed',
            statusHistory: [
                { status: 'confirmed', timestamp: new Date().toISOString(), message: 'Order confirmed (COD)' }
            ],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            userId: user.uid
        };
        
        // Save order to Firestore
        await db.collection('orders').doc(orderId).set(order);
        
        // Add order to user's orders array
        await db.collection('users').doc(user.uid).update({
            orders: firebase.firestore.FieldValue.arrayUnion({
                id: orderId,
                total,
                status: 'confirmed',
                date: new Date().toISOString(),
                itemCount: cart.length
            })
        });
        
        // Clear cart
        localStorage.removeItem(KEYS.CART);
        
        hideLoading();
        
        // Redirect to order confirmation
        window.location.href = `order-confirmation.html?orderId=${orderId}&method=cod`;
        
    } catch (error) {
        hideLoading();
        console.error('Error creating order:', error);
        toast('Failed to place order. Please try again.', 'error');
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
console.log('%c🛒 FreshMart Checkout', 'color:#2e7d32;font-size:16px;font-weight:bold');
console.log('%c💳 COD + Online Payment Ready', 'color:#666');