// ==================== ORDER TRACKING ====================

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
const $$ = sel => document.querySelectorAll(sel);

let orderData = null;
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId') || params.get('id');
    
    if (!orderId) {
        toast('Order ID not found', 'error');
        setTimeout(() => window.location.href = 'profile.html', 2000);
        return;
    }
    
    $('orderId').textContent = `#${orderId}`;
    
    // Check auth state
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadOrder(orderId);
            // Start real-time updates
            listenToOrderUpdates(orderId);
        } else {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        }
    });
});

// Load order from Firestore
async function loadOrder(orderId) {
    try {
        showLoading();
        
        const doc = await db.collection('orders').doc(orderId).get();
        
        if (!doc.exists) {
            hideLoading();
            toast('Order not found', 'error');
            setTimeout(() => window.location.href = 'profile.html', 2000);
            return;
        }
        
        orderData = { ...doc.data(), id: doc.id };
        
        // Check if this order belongs to current user
        if (orderData.userId !== currentUser.uid) {
            hideLoading();
            toast('Unauthorized access', 'error');
            setTimeout(() => window.location.href = 'profile.html', 2000);
            return;
        }
        
        displayOrder();
        updateTracking();
        hideLoading();
        
    } catch (error) {
        console.error('Error loading order:', error);
        toast('Failed to load order', 'error');
        hideLoading();
    }
}

// Real-time order updates
function listenToOrderUpdates(orderId) {
    db.collection('orders').doc(orderId)
        .onSnapshot((doc) => {
            if (doc.exists) {
                orderData = { ...doc.data(), id: doc.id };
                displayOrder();
                updateTracking();
                
                // Show notification if status changed
                const status = orderData.status;
                if (status === 'packed') {
                    toast('Your order has been packed!', 'success');
                } else if (status === 'shipped') {
                    toast('Your order is out for delivery!', 'success');
                    $('deliveryPartner').style.display = 'block';
                } else if (status === 'delivered') {
                    toast('Your order has been delivered!', 'success');
                }
            }
        });
}

// Display order details
function displayOrder() {
    // Order date
    let orderDate;
    if (orderData.createdAt?.toDate) {
        orderDate = orderData.createdAt.toDate();
    } else if (orderData.createdAt) {
        orderDate = new Date(orderData.createdAt);
    } else {
        orderDate = new Date();
    }
    
    $('orderDate').textContent = orderDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Status badge
    const status = orderData.status || 'confirmed';
    const statusText = getStatusText(status);
    const statusIcon = getStatusIcon(status);
    $('statusBadge').innerHTML = `<i class="fas fa-${statusIcon}"></i> ${statusText}`;
    
    // Apply status color
    $('statusBadge').className = `order-status-badge ${status}`;
    
    // Items
    const itemsContainer = $('summaryItems');
    itemsContainer.innerHTML = orderData.items.map(item => `
        <div class="summary-item">
            <span class="summary-item-name">
                ${item.name} ${item.weight ? `(${item.weight})` : ''} × ${item.quantity}
            </span>
            <span class="summary-item-price">₹${(item.price * item.quantity).toLocaleString('en-IN')}</span>
        </div>
    `).join('');
    
    // Total
    $('totalAmount').textContent = `₹${orderData.total.toLocaleString('en-IN')}`;
    
    // Address
    const addr = orderData.address;
    $('deliveryAddress').innerHTML = `
        <strong>${addr.name}</strong><br>
        ${addr.address}<br>
        ${addr.city} - ${addr.pincode}<br>
        ${addr.state || ''}<br>
        Phone: +91 ${addr.phone}
    `;
    
    // Show delivery partner for shipped/delivered orders
    if (status === 'shipped' || status === 'delivered') {
        $('deliveryPartner').style.display = 'block';
    }
}

// Update tracking timeline
function updateTracking() {
    const status = orderData.status || 'confirmed';
    const history = orderData.statusHistory || [];
    
    // Status order
    const statusOrder = ['confirmed', 'packed', 'shipped', 'delivered'];
    const currentIndex = statusOrder.indexOf(status);
    
    // Update timeline items
    const items = $$('.timeline-item');
    items.forEach((item, index) => {
        const itemStatus = item.dataset.status;
        const itemIndex = statusOrder.indexOf(itemStatus);
        
        // Remove all classes first
        item.classList.remove('active', 'completed');
        
        if (itemIndex < currentIndex) {
            item.classList.add('completed');
        } else if (itemIndex === currentIndex) {
            item.classList.add('active');
        }
    });
    
    // Update times from history
    history.forEach(entry => {
        const timeEl = $(`${entry.status}Time`);
        if (timeEl) {
            const date = entry.timestamp ? new Date(entry.timestamp) : new Date();
            timeEl.textContent = date.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    });
    
    // If no history, at least show confirmed time
    if (history.length === 0 && orderData.createdAt) {
        const confirmedTimeEl = $('confirmedTime');
        if (confirmedTimeEl) {
            let date;
            if (orderData.createdAt?.toDate) {
                date = orderData.createdAt.toDate();
            } else {
                date = new Date(orderData.createdAt);
            }
            confirmedTimeEl.textContent = date.toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }
}

// Helper functions
function getStatusText(status) {
    const statusTexts = {
        'confirmed': 'Order Confirmed',
        'packed': 'Order Packed',
        'shipped': 'Out for Delivery',
        'delivered': 'Delivered',
        'cancelled': 'Cancelled'
    };
    return statusTexts[status] || status.charAt(0).toUpperCase() + status.slice(1);
}

function getStatusIcon(status) {
    const icons = {
        'confirmed': 'check-circle',
        'packed': 'box',
        'shipped': 'truck',
        'delivered': 'home',
        'cancelled': 'times-circle'
    };
    return icons[status] || 'spinner fa-spin';
}

// Toast notification
function toast(msg, type = 'info') {
    const el = $('toast');
    const msgEl = $('toastMsg');
    const iconEl = $('toastIcon');
    
    if (!el || !msgEl || !iconEl) return;
    
    msgEl.textContent = msg;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    iconEl.className = `fas ${icons[type] || icons.info}`;
    el.className = `toast ${type} show`;
    
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
        el.classList.remove('show');
    }, 4000);
}

// Loading functions
function showLoading() {
    const el = $('loading');
    if (el) el.classList.remove('hidden');
}

function hideLoading() {
    const el = $('loading');
    if (el) el.classList.add('hidden');
}

// Additional CSS for status badge colors
const style = document.createElement('style');
style.textContent = `
    .order-status-badge.confirmed {
        background: rgba(46, 125, 50, 0.2);
        color: #2e7d32;
    }
    .order-status-badge.packed {
        background: rgba(25, 118, 210, 0.2);
        color: #1976d2;
    }
    .order-status-badge.shipped {
        background: rgba(255, 152, 0, 0.2);
        color: #ff9800;
    }
    .order-status-badge.delivered {
        background: rgba(76, 175, 80, 0.2);
        color: #4caf50;
    }
    .order-status-badge.cancelled {
        background: rgba(229, 57, 53, 0.2);
        color: #e53935;
    }
`;
document.head.appendChild(style);

console.log('%c📦 Order Tracking Ready', 'color: #2e7d32; font-size: 16px; font-weight: bold');