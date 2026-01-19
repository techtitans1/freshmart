// ==================== ORDERS PAGE JAVASCRIPT ====================

// Firebase Configuration
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

// State
let allOrders = [];
let currentFilter = 'all';
let unsubscribeOrders = null; // For real-time updates

// DOM Elements
const DOM = {
    ordersList: document.getElementById('ordersList'),
    noOrders: document.getElementById('noOrders'),
    ordersCount: document.getElementById('ordersCount'),
    deliveredCount: document.getElementById('deliveredCount'),
    pendingCount: document.getElementById('pendingCount'),
    cancelledCount: document.getElementById('cancelledCount'),
    cartCount: document.getElementById('cartCount'),
    orderModal: document.getElementById('orderModal'),
    orderModalTitle: document.getElementById('orderModalTitle'),
    orderModalBody: document.getElementById('orderModalBody'),
    toast: document.getElementById('toast'),
    toastIcon: document.getElementById('toastIcon'),
    toastMessage: document.getElementById('toastMessage'),
    loadingOverlay: document.getElementById('loadingOverlay')
};

// Auth State Listener
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html?redirect=orders';
        return;
    }
    await loadOrders(user.uid);
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('📦 Orders Page Initialized');
    setupEventListeners();
    updateCartCount();
});

// Event Listeners
function setupEventListeners() {
    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            renderOrders();
        });
    });

    // Close modal on backdrop click
    if (DOM.orderModal) {
        DOM.orderModal.addEventListener('click', (e) => {
            if (e.target === DOM.orderModal) {
                closeOrderModal();
            }
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeOrderModal();
        }
    });
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (unsubscribeOrders) {
            unsubscribeOrders();
        }
    });
}

// Load Orders from Firestore (with real-time updates)
async function loadOrders(uid) {
    showLoading();
    try {
        // Unsubscribe from previous listener if exists
        if (unsubscribeOrders) {
            unsubscribeOrders();
        }
        
        console.log('Loading orders for user:', uid);
        
        // Try with orderBy first
        let ordersQuery = db.collection('orders')
            .where('userId', '==', uid);
        
        // Try to add orderBy - will fail if index doesn't exist
        try {
            ordersQuery = ordersQuery.orderBy('createdAt', 'desc');
            console.log('Using query with orderBy');
        } catch (indexError) {
            console.warn('OrderBy not available, using without ordering:', indexError);
        }
        
        // Set up real-time listener for user's orders
        unsubscribeOrders = ordersQuery.onSnapshot((snapshot) => {
            console.log(`Received ${snapshot.size} orders from Firestore`);
            allOrders = [];
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                console.log('Order data:', doc.id, data);
                
                allOrders.push({
                    id: doc.id,
                    ...data,
                    // Convert Firestore timestamp to Date string for compatibility
                    date: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : 
                          data.createdAt || 
                          data.orderDate || 
                          new Date().toISOString()
                });
            });
            
            // Sort orders manually if orderBy wasn't used
            allOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            console.log(`Loaded ${allOrders.length} orders`);
            updateStats();
            renderOrders();
            hideLoading();
            
            // Show notification for status changes (not on initial load)
            if (snapshot.docChanges().length > 0 && allOrders.length > 0) {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "modified") {
                        const order = change.doc.data();
                        if (order.status === 'shipped' || order.status === 'out_for_delivery') {
                            showToast('Your order is out for delivery!', 'success');
                        } else if (order.status === 'delivered') {
                            showToast('Your order has been delivered!', 'success');
                        }
                    }
                });
            }
        }, (error) => {
            console.error('Snapshot error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            
            // Handle specific error types
            if (error.code === 'failed-precondition' || error.code === 9) {
                console.error('INDEX REQUIRED - Check console for index creation link');
                showToast('Creating database index... Please refresh in a moment', 'info');
                // Try without orderBy as fallback
                loadOrdersWithoutIndex(uid);
            } else if (error.code === 'permission-denied') {
                console.error('PERMISSION DENIED - Check Firestore security rules');
                showToast('Access denied. Please check your permissions.', 'error');
            } else {
                showToast('Failed to load orders: ' + error.message, 'error');
            }
            hideLoading();
        });
            
    } catch (error) {
        console.error('Error setting up orders listener:', error);
        showToast('Failed to load orders: ' + error.message, 'error');
        hideLoading();
    }
}
// Fallback: Load orders without orderBy (if index doesn't exist)
function loadOrdersWithoutIndex(uid) {
    console.log('Loading orders without index...');
    
    unsubscribeOrders = db.collection('orders')
        .where('userId', '==', uid)
        .onSnapshot((snapshot) => {
            console.log(`Received ${snapshot.size} orders (no index)`);
            allOrders = [];
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                allOrders.push({
                    id: doc.id,
                    ...data,
                    date: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : 
                          data.createdAt || 
                          data.orderDate || 
                          new Date().toISOString()
                });
            });
            
            // Sort manually
            allOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            console.log(`Loaded ${allOrders.length} orders`);
            updateStats();
            renderOrders();
            hideLoading();
        }, (error) => {
            console.error('Fallback query also failed:', error);
            showToast('Unable to load orders. Please contact support.', 'error');
            hideLoading();
        });
}
// Update Statistics
function updateStats() {
    const delivered = allOrders.filter(o => o.status?.toLowerCase() === 'delivered').length;
    const cancelled = allOrders.filter(o => o.status?.toLowerCase() === 'cancelled').length;
    const pending = allOrders.length - delivered - cancelled;

    DOM.ordersCount.textContent = allOrders.length;
    DOM.deliveredCount.textContent = delivered;
    DOM.pendingCount.textContent = pending;
    DOM.cancelledCount.textContent = cancelled;
}

// Render Orders
function renderOrders() {
    let filteredOrders = allOrders;

    if (currentFilter !== 'all') {
        if (currentFilter === 'pending') {
            filteredOrders = allOrders.filter(o => 
                !['delivered', 'cancelled'].includes(o.status?.toLowerCase())
            );
        } else {
            filteredOrders = allOrders.filter(o => 
                o.status?.toLowerCase() === currentFilter
            );
        }
    }

    if (filteredOrders.length === 0) {
        DOM.ordersList.innerHTML = '';
        DOM.noOrders.classList.remove('hidden');
        return;
    }

    DOM.noOrders.classList.add('hidden');
    DOM.ordersList.innerHTML = filteredOrders.map(order => createOrderCard(order)).join('');
}

// Create Order Card HTML
function createOrderCard(order) {
    const statusClass = getStatusClass(order.status);
    const statusText = formatStatus(order.status);
    const emoji = getOrderEmoji(order);
    const formattedDate = formatDate(order.date);
    const formattedTotal = formatCurrency(order.total || 0);
    const items = order.items || [];
    const displayItems = items.slice(0, 2);
    const moreCount = items.length - 2;

    return `
        <div class="order-card" onclick="viewOrderDetails('${order.id}')">
            <div class="order-header">
                <div class="order-id-section">
                    <div class="order-icon">${emoji}</div>
                    <div class="order-id-info">
                        <h3>Order #${order.id.substring(0, 8)}</h3>
                        <span class="order-date">${formattedDate}</span>
                    </div>
                </div>
                <span class="order-status ${statusClass}">${statusText}</span>
            </div>
            
            <div class="order-items-preview">
                ${displayItems.map(item => `
                    <div class="item-preview">
                        <img src="${item.image || 'images/placeholder.png'}" alt="${item.name}">
                        <span>${item.name} x${item.quantity}</span>
                    </div>
                `).join('')}
                ${moreCount > 0 ? `<span class="more-items">+${moreCount} more items</span>` : ''}
            </div>
            
            <div class="order-footer">
                <span class="order-total">${formattedTotal}</span>
                <div class="order-actions">
                    ${order.status?.toLowerCase() === 'delivered' ? 
                        `<button class="action-btn secondary" onclick="event.stopPropagation(); reorder('${order.id}')">
                            <i class="fas fa-redo"></i> Reorder
                        </button>` : 
                        `<button class="action-btn primary" onclick="event.stopPropagation(); trackOrder('${order.id}')">
                            <i class="fas fa-truck"></i> Track
                        </button>`
                    }
                </div>
            </div>
        </div>
    `;
}

// View Order Details
function viewOrderDetails(orderId) {
    const order = allOrders.find(o => o.id == orderId);
    if (!order) return;

    DOM.orderModalTitle.textContent = `Order #${order.id.substring(0, 8)}`;
    
    // Handle address - it might be an object or string
    let addressHtml = '';
    if (typeof order.address === 'object') {
        const addr = order.address;
        addressHtml = `
            <strong>${addr.name || 'N/A'}</strong><br>
            ${addr.address || ''}<br>
            ${addr.city || ''} - ${addr.pincode || ''}<br>
            ${addr.state || ''}<br>
            Phone: ${addr.phone ? '+91 ' + addr.phone : 'N/A'}
        `;
    } else {
        addressHtml = order.address || 'N/A';
    }
    
    DOM.orderModalBody.innerHTML = `
        <div class="order-detail-section">
            <h3><i class="fas fa-info-circle"></i> Order Information</h3>
            <div class="detail-row">
                <span class="detail-label">Status</span>
                <span class="detail-value order-status ${getStatusClass(order.status)}">${formatStatus(order.status)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Order Date</span>
                <span class="detail-value">${formatDate(order.date)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Delivery Address</span>
                <span class="detail-value">${addressHtml}</span>
            </div>
        </div>
        
        <div class="order-detail-section">
            <h3><i class="fas fa-shopping-bag"></i> Items (${order.items?.length || 0})</h3>
            <div class="order-items-list">
                ${(order.items || []).map(item => `
                    <div class="order-item-detail">
                        <img src="${item.image || 'images/placeholder.png'}" alt="${item.name}">
                        <div class="item-info">
                            <div class="item-name">${item.name}</div>
                            <div class="item-qty">Qty: ${item.quantity}</div>
                        </div>
                        <span class="item-price">${formatCurrency(item.price * item.quantity)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="order-detail-section">
            <h3><i class="fas fa-receipt"></i> Payment Summary</h3>
            <div class="detail-row">
                <span class="detail-label">Subtotal</span>
                <span class="detail-value">${formatCurrency(order.subtotal || order.total)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Delivery Fee</span>
                <span class="detail-value">${formatCurrency(order.deliveryFee || 0)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Discount</span>
                <span class="detail-value" style="color: var(--primary-green);">-${formatCurrency(order.discount || 0)}</span>
            </div>
            <div class="detail-row" style="font-weight: 700; font-size: 1.1rem;">
                <span class="detail-label">Total</span>
                <span class="detail-value" style="color: var(--primary-green-dark);">${formatCurrency(order.total)}</span>
            </div>
        </div>
    `;
    
    DOM.orderModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeOrderModal() {
    DOM.orderModal.classList.remove('active');
    document.body.style.overflow = '';
}

// Track Order
function trackOrder(orderId) {
    window.location.href = `order-tracking.html?orderId=${orderId}`;
}

// Reorder
function reorder(orderId) {
    const order = allOrders.find(o => o.id == orderId);
    if (!order || !order.items) return;
    
    // Add items to cart (simplified - you'd integrate with your cart system)
    let cart = JSON.parse(localStorage.getItem('freshmart_cart') || '[]');
    order.items.forEach(item => {
        const existingIndex = cart.findIndex(c => c.id === item.id);
        if (existingIndex > -1) {
            cart[existingIndex].quantity += item.quantity;
        } else {
            cart.push({...item});
        }
    });
    localStorage.setItem('freshmart_cart', JSON.stringify(cart));
    updateCartCount();
    showToast('Items added to cart!', 'success');
}

// Helper Functions
function getStatusClass(status) {
    const statusMap = {
        'delivered': 'delivered',
        'confirmed': 'pending',
        'pending': 'pending',
        'processing': 'processing',
        'packed': 'processing',
        'shipped': 'shipped',
        'out_for_delivery': 'shipped',
        'cancelled': 'cancelled'
    };
    return statusMap[status?.toLowerCase()] || 'pending';
}

function formatStatus(status) {
    if (!status) return 'Pending';
    
    // Handle snake_case statuses
    const formatted = status.replace(/_/g, ' ');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
}

function getOrderEmoji(order) {
    const status = order.status?.toLowerCase();
    if (status === 'delivered') return '✅';
    if (status === 'cancelled') return '❌';
    if (status === 'shipped' || status === 'out_for_delivery') return '🚚';
    if (status === 'packed') return '📦';
    return '🛒';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateString;
    }
}

function formatCurrency(amount) {
    return `₹${Number(amount).toLocaleString('en-IN')}`;
}

function updateCartCount() {
    try {
        const cart = JSON.parse(localStorage.getItem('freshmart_cart') || '[]');
        const total = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
        if (DOM.cartCount) {
            DOM.cartCount.textContent = total;
            DOM.cartCount.style.display = total > 0 ? 'flex' : 'none';
        }
    } catch {
        if (DOM.cartCount) {
            DOM.cartCount.style.display = 'none';
        }
    }
}

// Toast Functions
function showToast(message, type = 'success') {
    if (!DOM.toast) return;
    
    DOM.toastMessage.textContent = message;
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        info: 'fa-info-circle'
    };
    DOM.toastIcon.className = `fas ${icons[type] || icons.success}`;
    DOM.toast.className = 'toast ' + type + ' show';
    
    clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(hideToast, 4000);
}

function hideToast() {
    if (DOM.toast) {
        DOM.toast.classList.remove('show');
    }
}

// Loading Functions
function showLoading() {
    DOM.loadingOverlay?.classList.remove('hidden');
}

function hideLoading() {
    DOM.loadingOverlay?.classList.add('hidden');
}

// Global exports
window.viewOrderDetails = viewOrderDetails;
window.closeOrderModal = closeOrderModal;
window.trackOrder = trackOrder;
window.reorder = reorder;
window.hideToast = hideToast;

console.log('%c📦 Orders Page Ready', 'color: #4caf50; font-size: 16px; font-weight: bold');
