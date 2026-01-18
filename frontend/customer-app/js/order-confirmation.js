// ==================== ORDER CONFIRMATION ====================

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

// DOM helpers
const $ = id => document.getElementById(id);

// Get order details from URL
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    const method = params.get('method') || 'online';
    
    if (!orderId) {
        console.error('No order ID found');
        window.location.href = 'cart.html';
        return;
    }
    
    // Display order ID
    $('orderId').textContent = `#${orderId}`;
    
    // Update payment badge
    updatePaymentBadge(method);
    
    // Update track order link
    const trackBtn = $('trackOrderBtn');
    if (trackBtn) {
        trackBtn.href = `order-tracking.html?orderId=${orderId}`;
    }
    
    // Load order details
    loadOrderDetails(orderId);
    
    // Show confirmation time
    $('confirmTime').textContent = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
    });
});

async function loadOrderDetails(orderId) {
    try {
        const doc = await db.collection('orders').doc(orderId).get();
        
        if (!doc.exists) {
            console.error('Order not found');
            return;
        }
        
        const order = doc.data();
        
        // Update UI with order details
        $('orderAmount').textContent = `₹${order.total.toLocaleString('en-IN')}`;
        $('itemCount').textContent = `${order.items.length} item${order.items.length > 1 ? 's' : ''}`;
        $('deliveryAddress').textContent = `${order.address.city} - ${order.address.pincode}`;
        
        // Estimated delivery (30-45 mins from now)
        const now = new Date();
        const minTime = new Date(now.getTime() + 30 * 60000);
        const maxTime = new Date(now.getTime() + 45 * 60000);
        
        $('estimatedTime').textContent = `${minTime.toLocaleTimeString('en-IN', {
            hour: 'numeric',
            minute: '2-digit'
        })} - ${maxTime.toLocaleTimeString('en-IN', {
            hour: 'numeric',
            minute: '2-digit'
        })}`;
        
    } catch (error) {
        console.error('Error loading order:', error);
    }
}

function updatePaymentBadge(method) {
    const badge = $('paymentBadge');
    if (method === 'cod') {
        badge.className = 'payment-badge cod';
        badge.innerHTML = `
            <i class="fas fa-money-bill-wave"></i>
            <span>Cash on Delivery</span>
        `;
    } else {
        badge.className = 'payment-badge';
        badge.innerHTML = `
            <i class="fas fa-credit-card"></i>
            <span>Paid Online</span>
        `;
    }
}

// Auto redirect to tracking after 10 seconds
setTimeout(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    if (orderId) {
        window.location.href = `order-tracking.html?orderId=${orderId}`;
    }
}, 10000);

console.log('%c✅ Order Confirmation Page', 'color: #2e7d32; font-size: 16px; font-weight: bold');