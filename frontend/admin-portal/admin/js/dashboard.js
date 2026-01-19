// ================================================
// DASHBOARD MODULE - Complete Dashboard Management
// ================================================

import { 
    db,
    collection, 
    getDocs, 
    query, 
    orderBy, 
    limit,
    onSnapshot
} from './firebase-config.js';
import { protectRoute, logoutAdmin } from './auth.js';

// State
let currentAdmin = null;
let unsubscribeOrders = null;

// Initialize Dashboard
function initDashboard(adminData) {
    currentAdmin = adminData;
    
    // Hide loader, show content
    document.getElementById('pageLoader').style.display = 'none';
    document.getElementById('adminLayout').style.display = 'flex';
    
    // Update admin info
    updateAdminInfo(adminData);
    
    // Show admin section for super admins
    if (adminData.isSuperAdmin) {
        document.getElementById('adminSection').classList.remove('hidden');
    }
    
    // Set current date
    setCurrentDate();
    
    // Load dashboard data
    loadDashboardData();
    
    // Setup real-time listeners
    setupRealtimeListeners();
    
    // Setup event listeners
    setupEventListeners();
}

// Update admin info
function updateAdminInfo(admin) {
    document.getElementById('adminEmail').textContent = admin.email;
    document.getElementById('adminRole').textContent = admin.isSuperAdmin ? 'Super Admin' : 'Admin';
    document.getElementById('adminAvatar').textContent = admin.email.substring(0, 2).toUpperCase();
    document.getElementById('adminName').textContent = admin.email.split('@')[0];
}

// Set current date
function setCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', options);
}

// Load all dashboard data
async function loadDashboardData() {
    try {
        await Promise.all([
            loadUserStats(),
            loadOrderStats(),
            loadRecentUsers(),
            loadRecentOrders()
        ]);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

// Setup real-time listeners
function setupRealtimeListeners() {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    
    unsubscribeOrders = onSnapshot(q, (snapshot) => {
        loadOrderStats();
        loadRecentOrders();
        
        // Notification for new orders
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' && change.doc.data().status === 'confirmed') {
                const isNewOrder = snapshot.docChanges().filter(c => c.type === 'added').length <= 1;
                if (!isNewOrder) return;
                
                showToast('New order received!', 'info');
            }
        });
    });
}

// Load user statistics
async function loadUserStats() {
    try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        
        document.getElementById('totalUsers').textContent = snapshot.size;
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

// Load order statistics
async function loadOrderStats() {
    try {
        const ordersRef = collection(db, 'orders');
        const snapshot = await getDocs(ordersRef);
        
        let totalOrders = 0;
        let pendingOrders = 0;
        let todayRevenue = 0;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        snapshot.forEach(doc => {
            const order = doc.data();
            totalOrders++;
            
            // Count pending orders
            if (['confirmed', 'packed', 'out_for_delivery'].includes(order.status)) {
                pendingOrders++;
            }
            
            // Calculate today's revenue
            const orderDate = order.createdAt ? new Date(order.createdAt) : null;
            if (orderDate && orderDate >= today && order.status !== 'cancelled') {
                todayRevenue += order.total || 0;
            }
        });
        
        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('pendingOrders').textContent = pendingOrders;
        document.getElementById('todayRevenue').textContent = `₹${todayRevenue.toLocaleString('en-IN')}`;
        document.getElementById('pendingBadge').textContent = pendingOrders;
        
    } catch (error) {
        console.error('Error loading order stats:', error);
    }
}

// Load recent users
async function loadRecentUsers() {
    const tbody = document.getElementById('recentUsersTable');
    
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('createdAt', 'desc'), limit(5));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="3" class="empty-cell">No users found</td></tr>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            const joinedDate = formatDate(user.createdAt);
            const statusClass = user.status === 'active' ? 'active' : 'inactive';
            
            html += `
                <tr>
                    <td>
                        <div class="user-cell">
                            <div class="user-avatar-table">${getInitials(user.name)}</div>
                            <div class="user-details">
                                <span class="user-name">${escapeHtml(user.name || 'N/A')}</span>
                                <span class="user-email">${escapeHtml(user.email || '')}</span>
                            </div>
                        </div>
                    </td>
                    <td>${joinedDate}</td>
                    <td><span class="status-badge ${statusClass}">${user.status || 'N/A'}</span></td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading recent users:', error);
        tbody.innerHTML = '<tr><td colspan="3" class="error-cell">Error loading users</td></tr>';
    }
}

// Load recent orders
async function loadRecentOrders() {
    const tbody = document.getElementById('recentOrdersTable');
    
    try {
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, orderBy('createdAt', 'desc'), limit(5));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">No orders found</td></tr>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const order = doc.data();
            const statusClass = getStatusClass(order.status);
            
            html += `
                <tr onclick="window.location.href='orders.html?id=${doc.id}'" style="cursor: pointer;">
                    <td>
                        <span class="user-id">${doc.id.substring(0, 8)}...</span>
                    </td>
                    <td>${escapeHtml(order.address?.name || 'N/A')}</td>
                    <td><strong>₹${(order.total || 0).toLocaleString('en-IN')}</strong></td>
                    <td><span class="status-badge ${statusClass}">${formatStatus(order.status)}</span></td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading recent orders:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="error-cell">Error loading orders</td></tr>';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
        showToast('Refreshing data...', 'info');
        loadDashboardData();
    });
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        if (confirm('Are you sure you want to logout?')) {
            if (unsubscribeOrders) unsubscribeOrders();
            await logoutAdmin();
        }
    });
    
    // Mobile menu toggle
    document.getElementById('menuToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });
    
    // Close sidebar on outside click
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const menuToggle = document.getElementById('menuToggle');
        
        if (sidebar.classList.contains('open') && 
            !sidebar.contains(e.target) && 
            !menuToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
}

// Export data function
window.exportData = function() {
    showToast('Export feature coming soon!', 'info');
};

// Utility Functions
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
        'confirmed': 'pending',
        'packed': 'active',
        'out_for_delivery': 'active',
        'delivered': 'active',
        'cancelled': 'suspended'
    };
    return classMap[status] || 'inactive';
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

// Initialize with auth protection
protectRoute(initDashboard);