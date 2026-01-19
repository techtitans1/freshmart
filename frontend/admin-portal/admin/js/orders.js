// ================================================
// ORDERS MODULE - Complete Order Management
// ================================================

import { 
    db,
    collection, 
    getDocs, 
    doc,
    updateDoc,
    query, 
    orderBy,
    where,
    arrayUnion,
    onSnapshot
} from './firebase-config.js';
import { protectRoute, logoutAdmin } from './auth.js';

// State
let currentAdmin = null;
let allOrders = [];
let filteredOrders = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentOrderId = null;
let unsubscribeOrders = null;

// Initialize
function initOrdersPage(adminData) {
    currentAdmin = adminData;
    
    document.getElementById('pageLoader').style.display = 'none';
    document.getElementById('adminLayout').style.display = 'flex';
    
    updateAdminInfo(adminData);
    
    if (adminData.isSuperAdmin) {
        document.getElementById('adminSection').classList.remove('hidden');
    }
    
    // Real-time orders listener
    listenToOrders();
    setupEventListeners();
}

// Update admin info
function updateAdminInfo(admin) {
    document.getElementById('adminEmail').textContent = admin.email;
    document.getElementById('adminRole').textContent = admin.isSuperAdmin ? 'Super Admin' : 'Admin';
    document.getElementById('adminAvatar').textContent = admin.email.substring(0, 2).toUpperCase();
}

// Real-time orders listener
function listenToOrders() {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    
    unsubscribeOrders = onSnapshot(q, (snapshot) => {
        allOrders = [];
        snapshot.forEach(docSnap => {
            allOrders.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });
        
        applyFilters();
        updateStats();
        
        // Show notification for new orders
        if (snapshot.docChanges().some(change => change.type === 'added')) {
            const newCount = snapshot.docChanges().filter(c => c.type === 'added').length;
            if (newCount > 0 && allOrders.length > newCount) {
                showToast(`${newCount} new order(s) received!`, 'info');
            }
        }
    }, (error) => {
        console.error('Error listening to orders:', error);
        showToast('Error loading orders', 'error');
    });
}

// Update stats
function updateStats() {
    let totalOrders = 0;
    let pendingOrders = 0;
    let deliveredOrders = 0;
    let todayRevenue = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    allOrders.forEach(order => {
        totalOrders++;
        
        if (['confirmed', 'packed', 'out_for_delivery'].includes(order.status)) {
            pendingOrders++;
        }
        
        if (order.status === 'delivered') {
            deliveredOrders++;
        }
        
        // Today's revenue
        const orderDate = order.createdAt ? new Date(order.createdAt) : null;
        if (orderDate && orderDate >= today && order.status !== 'cancelled') {
            todayRevenue += order.total || 0;
        }
    });
    
    document.getElementById('totalOrdersStat').textContent = totalOrders;
    document.getElementById('pendingOrdersStat').textContent = pendingOrders;
    document.getElementById('deliveredOrdersStat').textContent = deliveredOrders;
    document.getElementById('todayRevenueStat').textContent = `₹${todayRevenue.toLocaleString('en-IN')}`;
    document.getElementById('pendingBadge').textContent = pendingOrders;
    document.getElementById('orderCount').textContent = `(${totalOrders})`;
}

// Apply filters
function applyFilters() {
    const search = document.getElementById('searchInput').value.toLowerCase().trim();
    const status = document.getElementById('statusFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
    filteredOrders = allOrders.filter(order => {
        // Search filter
        const matchesSearch = !search || 
            order.id.toLowerCase().includes(search) ||
            (order.address?.name && order.address.name.toLowerCase().includes(search)) ||
            (order.address?.phone && order.address.phone.includes(search)) ||
            (order.address?.email && order.address.email.toLowerCase().includes(search));
        
        // Status filter
        const matchesStatus = !status || order.status === status;
        
        // Date filter
        let matchesDate = true;
        if (dateFilter && dateFilter !== 'all') {
            const orderDate = order.createdAt ? new Date(order.createdAt) : null;
            if (orderDate) {
                const now = new Date();
                if (dateFilter === 'today') {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    matchesDate = orderDate >= today;
                } else if (dateFilter === 'week') {
                    const weekAgo = new Date();
                    weekAgo.setDate(now.getDate() - 7);
                    matchesDate = orderDate >= weekAgo;
                } else if (dateFilter === 'month') {
                    const monthAgo = new Date();
                    monthAgo.setMonth(now.getMonth() - 1);
                    matchesDate = orderDate >= monthAgo;
                }
            }
        }
        
        return matchesSearch && matchesStatus && matchesDate;
    });
    
    currentPage = 1;
    renderTable();
}

// Render table
function renderTable() {
    const tbody = document.getElementById('ordersTableBody');
    const tableInfo = document.getElementById('tableInfo');
    
    if (filteredOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No orders found</td></tr>';
        tableInfo.textContent = 'Showing 0 orders';
        document.getElementById('pagination').innerHTML = '';
        return;
    }
    
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, filteredOrders.length);
    const pageOrders = filteredOrders.slice(start, end);
    
    tableInfo.textContent = `Showing ${start + 1}-${end} of ${filteredOrders.length} orders`;
    
    let html = '';
    pageOrders.forEach(order => {
        const orderDate = formatDate(order.createdAt);
        const statusClass = getStatusClass(order.status);
        const itemCount = order.items ? order.items.length : 0;
        const totalItems = order.items ? order.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
        
        html += `
            <tr>
                <td>
                    <span class="user-id" onclick="copyToClipboard('${order.id}')" title="Click to copy">
                        ${order.id.substring(0, 16)}...
                    </span>
                </td>
                <td>
                    <div class="user-details">
                        <span class="user-name">${escapeHtml(order.address?.name || 'N/A')}</span>
                        <span class="user-email">${escapeHtml(order.address?.phone || '')}</span>
                    </div>
                </td>
                <td>
                    <span class="orders-badge">
                        ${itemCount} (${totalItems} qty)
                    </span>
                </td>
                <td>
                    <strong>₹${(order.total || 0).toLocaleString('en-IN')}</strong>
                </td>
                <td>
                    <span class="payment-method ${order.paymentMethod === 'cod' ? 'cod' : 'online'}">
                        ${order.paymentMethod === 'cod' ? 'COD' : 'Online'}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${formatStatus(order.status)}
                    </span>
                </td>
                <td>${orderDate}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon view" onclick="viewOrder('${order.id}')" title="View Details">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                        ${order.status !== 'delivered' && order.status !== 'cancelled' ? `
                        <button class="btn-icon edit" onclick="updateOrderStatus('${order.id}')" title="Update Status">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
    renderPagination(totalPages);
}

// Render pagination
function renderPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = `
        <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"/>
            </svg>
        </button>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += '<span class="page-dots">...</span>';
        }
    }
    
    html += `
        <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
            </svg>
        </button>
    `;
    
    pagination.innerHTML = html;
}

// View order details
window.viewOrder = function(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    currentOrderId = orderId;
    const modal = document.getElementById('orderModal');
    const content = document.getElementById('orderModalContent');
    
    // Generate order details HTML
    content.innerHTML = `
        <!-- Order Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <div>
                <h4 style="font-size: 1.125rem; font-weight: 700; color: var(--gray-900); margin-bottom: 4px;">
                    Order #${order.id}
                </h4>
                <p style="font-size: 0.875rem; color: var(--gray-500);">
                    ${formatDate(order.createdAt, true)}
                </p>
            </div>
            <div>
                <span class="status-badge ${getStatusClass(order.status)}">
                    ${formatStatus(order.status)}
                </span>
            </div>
        </div>
        
        <!-- Customer Info -->
        <div style="background: var(--gray-50); padding: 20px; border-radius: var(--radius-lg); margin-bottom: 24px;">
            <h5 style="font-size: 0.875rem; font-weight: 700; color: var(--gray-700); margin-bottom: 16px; text-transform: uppercase;">
                Customer Details
            </h5>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                <div>
                    <p style="font-size: 0.75rem; color: var(--gray-500); margin-bottom: 4px;">Name</p>
                    <p style="font-weight: 600; color: var(--gray-900);">${escapeHtml(order.address?.name || 'N/A')}</p>
                </div>
                <div>
                    <p style="font-size: 0.75rem; color: var(--gray-500); margin-bottom: 4px;">Phone</p>
                    <p style="font-weight: 600; color: var(--gray-900);">+91 ${escapeHtml(order.address?.phone || 'N/A')}</p>
                </div>
                <div>
                    <p style="font-size: 0.75rem; color: var(--gray-500); margin-bottom: 4px;">Email</p>
                    <p style="font-weight: 600; color: var(--gray-900);">${escapeHtml(order.address?.email || 'N/A')}</p>
                </div>
                <div>
                    <p style="font-size: 0.75rem; color: var(--gray-500); margin-bottom: 4px;">Payment</p>
                    <span class="payment-method ${order.paymentMethod === 'cod' ? 'cod' : 'online'}">
                        ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
                    </span>
                </div>
            </div>
            <div style="margin-top: 16px;">
                <p style="font-size: 0.75rem; color: var(--gray-500); margin-bottom: 4px;">Delivery Address</p>
                <p style="font-weight: 600; color: var(--gray-900);">
                    ${escapeHtml(order.address?.address || '')}<br>
                    ${escapeHtml(order.address?.city || '')} - ${escapeHtml(order.address?.pincode || '')}<br>
                    ${escapeHtml(order.address?.state || '')}
                </p>
            </div>
        </div>
        
        <!-- Order Items -->
        <div style="margin-bottom: 24px;">
            <h5 style="font-size: 0.875rem; font-weight: 700; color: var(--gray-700); margin-bottom: 16px; text-transform: uppercase;">
                Order Items
            </h5>
            <div class="order-items">
                ${order.items.map(item => `
                    <div class="order-item">
                        <div class="item-details">
                            <div class="item-name">${escapeHtml(item.name)}</div>
                            <div class="item-info">
                                ${item.weight ? `${item.weight} × ` : ''}${item.quantity} 
                                @ ₹${item.price}/unit
                            </div>
                        </div>
                        <div class="item-price">₹${(item.price * item.quantity).toLocaleString('en-IN')}</div>
                    </div>
                `).join('')}
            </div>
            <div style="border-top: 2px solid var(--gray-200); margin-top: 16px; padding-top: 16px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>Subtotal</span>
                    <span>₹${(order.subtotal || 0).toLocaleString('en-IN')}</span>
                </div>
                ${order.delivery ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>Delivery</span>
                    <span>₹${order.delivery}</span>
                </div>
                ` : ''}
                ${order.discount ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: var(--success-600);">
                    <span>Discount</span>
                    <span>-₹${order.discount}</span>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 1.125rem;">
                    <span>Total</span>
                    <span style="color: var(--primary-600);">₹${(order.total || 0).toLocaleString('en-IN')}</span>
                </div>
            </div>
        </div>
        
        <!-- Order Tracking -->
        ${order.status !== 'cancelled' ? `
        <div class="order-tracking">
            <h4 class="tracking-header">Order Status Tracking</h4>
            <div class="tracking-timeline">
                ${renderTrackingTimeline(order)}
            </div>
            
            ${order.status !== 'delivered' ? `
            <!-- Status Update Actions -->
            <div class="status-actions">
                ${order.status === 'confirmed' ? `
                    <button class="status-btn pack" onclick="changeStatus('${orderId}', 'packed')">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        </svg>
                        Mark as Packed
                    </button>
                ` : ''}
                
                ${order.status === 'packed' ? `
                    <button class="status-btn ship" onclick="changeStatus('${orderId}', 'out_for_delivery')">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="1" y="3" width="15" height="13"/>
                            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                            <circle cx="5.5" cy="18.5" r="2.5"/>
                            <circle cx="18.5" cy="18.5" r="2.5"/>
                        </svg>
                        Out for Delivery
                    </button>
                ` : ''}
                
                ${order.status === 'out_for_delivery' ? `
                    <button class="status-btn deliver" onclick="changeStatus('${orderId}', 'delivered')">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 11 12 14 22 4"/>
                            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                        </svg>
                        Mark as Delivered
                    </button>
                ` : ''}
                
                <button class="status-btn cancel" onclick="changeStatus('${orderId}', 'cancelled')">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    Cancel Order
                </button>
            </div>
            
            <!-- Delivery Assignment (for out_for_delivery) -->
            ${order.status === 'packed' ? `
            <div class="delivery-assignment">
                <h4>Assign Delivery Partner (Optional)</h4>
                <div class="delivery-inputs">
                    <input type="text" id="deliveryName" placeholder="Driver Name">
                    <input type="tel" id="deliveryPhone" placeholder="Driver Phone">
                    <button onclick="assignDelivery('${orderId}')">Assign</button>
                </div>
            </div>
            ` : ''}
            ` : ''}
        </div>
        ` : `
        <div style="text-align: center; padding: 24px; background: var(--danger-50); border-radius: var(--radius-lg);">
            <p style="color: var(--danger-700); font-weight: 600;">This order has been cancelled</p>
        </div>
        `}
    `;
    
    modal.classList.add('open');
};

// Render tracking timeline
function renderTrackingTimeline(order) {
    const statuses = ['confirmed', 'packed', 'out_for_delivery', 'delivered'];
    const currentIndex = statuses.indexOf(order.status);
    
    return statuses.map((status, index) => {
        let stepClass = '';
        if (index < currentIndex) stepClass = 'completed';
        else if (index === currentIndex) stepClass = 'active';
        
        const history = order.statusHistory?.find(h => h.status === status);
        const timestamp = history?.timestamp ? formatDate(history.timestamp, true) : '';
        
        const icons = {
            'confirmed': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
            'packed': '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>',
            'out_for_delivery': '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
            'delivered': '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'
        };
        
        const labels = {
            'confirmed': 'Confirmed',
            'packed': 'Packed',
            'out_for_delivery': 'Out for Delivery',
            'delivered': 'Delivered'
        };
        
        return `
            <div class="tracking-step ${stepClass}">
                <div class="step-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        ${icons[status]}
                    </svg>
                </div>
                <div class="step-label">${labels[status]}</div>
                ${timestamp ? `<div class="step-time">${timestamp}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Change order status
window.changeStatus = async function(orderId, newStatus) {
    if (!confirm(`Change order status to "${formatStatus(newStatus)}"?`)) return;
    
    showToast('Updating status...', 'info');
    
    try {
        const orderRef = doc(db, 'orders', orderId);
        
        // Prepare update data
        const updateData = {
            status: newStatus,
            updatedAt: new Date().toISOString()
        };
        
        // Add to status history
        const historyEntry = {
            status: newStatus,
            timestamp: new Date().toISOString(),
            message: `Order ${formatStatus(newStatus)} by admin`,
            updatedBy: currentAdmin.email
        };
        
        updateData.statusHistory = arrayUnion(historyEntry);
        
        // Update order
        await updateDoc(orderRef, updateData);
        
        showToast(`Order ${formatStatus(newStatus)} successfully!`, 'success');
        
        // Close modal and refresh
        closeOrderModal();
        
    } catch (error) {
        console.error('Error updating status:', error);
        showToast('Failed to update status', 'error');
    }
};

// Assign delivery partner
window.assignDelivery = async function(orderId) {
    const name = document.getElementById('deliveryName').value.trim();
    const phone = document.getElementById('deliveryPhone').value.trim();
    
    if (!name || !phone) {
        showToast('Please enter driver name and phone', 'warning');
        return;
    }
    
    try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
            deliveryPartner: { name, phone },
            updatedAt: new Date().toISOString()
        });
        
        showToast('Delivery partner assigned', 'success');
        
    } catch (error) {
        console.error('Error assigning delivery:', error);
        showToast('Failed to assign delivery partner', 'error');
    }
};

// Update order status (quick action from table)
window.updateOrderStatus = function(orderId) {
    viewOrder(orderId);
};

// Close modal
window.closeOrderModal = function() {
    document.getElementById('orderModal').classList.remove('open');
    currentOrderId = null;
};

// Change page
window.changePage = function(page) {
    currentPage = page;
    renderTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Copy to clipboard
window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Order ID copied!', 'success');
    });
};

// Export orders
window.exportOrders = function(period) {
    let orders = [...allOrders];
    const now = new Date();
    
    if (period !== 'all') {
        orders = orders.filter(order => {
            const orderDate = order.createdAt ? new Date(order.createdAt) : null;
            if (!orderDate) return false;
            
            if (period === 'today') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return orderDate >= today;
            } else if (period === 'week') {
                const weekAgo = new Date();
                weekAgo.setDate(now.getDate() - 7);
                return orderDate >= weekAgo;
            } else if (period === 'month') {
                const monthAgo = new Date();
                monthAgo.setMonth(now.getMonth() - 1);
                return orderDate >= monthAgo;
            }
            return true;
        });
    }
    
    if (orders.length === 0) {
        showToast('No orders to export', 'info');
        return;
    }
    
    // Generate CSV
    let csv = '\ufeffOrder ID,Customer,Phone,Items,Total,Payment,Status,Date\n';
    orders.forEach(order => {
        const items = order.items ? order.items.map(i => `${i.name} x${i.quantity}`).join('; ') : '';
        csv += `"${order.id}","${order.address?.name || ''}","${order.address?.phone || ''}","${items}","₹${order.total || 0}","${order.paymentMethod || ''}","${order.status || ''}","${formatDate(order.createdAt)}"\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `orders_${period}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showToast(`Exported ${orders.length} orders`, 'success');
};

// Setup event listeners
function setupEventListeners() {
    // Search
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 300));
    
    // Filters
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('dateFilter').addEventListener('change', applyFilters);
    
    // Refresh
    document.getElementById('refreshBtn').addEventListener('click', () => {
        showToast('Refreshing...', 'info');
        applyFilters();
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        if (confirm('Are you sure you want to logout?')) {
            if (unsubscribeOrders) unsubscribeOrders();
            await logoutAdmin();
        }
    });
    
    // Mobile menu
    document.getElementById('menuToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });
    
    // Modal close on overlay click
    document.querySelector('#orderModal .modal-overlay').addEventListener('click', closeOrderModal);
}

// Utility functions
function formatDate(date, includeTime = false) {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    
    if (includeTime) {
        return d.toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function formatStatus(status) {
    const statusMap = {
        'confirmed': 'Confirmed',
        'packed': 'Packed',
        'out_for_delivery': 'Out for Delivery',
        'delivered': 'Delivered',
        'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
}

function getStatusClass(status) {
    const classMap = {
        'confirmed': 'status-pending',
        'packed': 'status-active',
        'out_for_delivery': 'status-active',
        'delivered': 'status-active',
        'cancelled': 'status-suspended'
    };
    return classMap[status] || 'status-inactive';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };
    
    toast.innerHTML = `
        ${icons[type] || icons.info}
        <span class="toast-message">${message}</span>
        <button class="toast-close">×</button>
    `;
    
    container.appendChild(toast);
    
    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
    
    setTimeout(() => {
        toast.classList.add('toast-fade');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

window.showComingSoon = (feature) => showToast(`${feature} coming soon!`, 'info');

// Initialize with auth protection
protectRoute(initOrdersPage);