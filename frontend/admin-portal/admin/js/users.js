// ================================================
// USERS MODULE - Complete User Management
// ================================================

import { 
    db,
    functions,
    collection, 
    doc,
    getDocs, 
    updateDoc,
    deleteDoc,
    query, 
    orderBy,
    serverTimestamp,
    httpsCallable,
    onSnapshot  // Add this for real-time updates
} from './firebase-config.js';
import { protectRoute, logoutAdmin } from './auth.js';

// State
let currentAdmin = null;
let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
const itemsPerPage = 10;
let deleteUserId = null;
let editUserId = null;
let usersUnsubscribe = null; // For real-time listener

// Cloud Functions
let createUserFn = null;
let updateUserFn = null;
let deleteUserFn = null;

// Initialize
function initUsersPage(adminData) {
    currentAdmin = adminData;
    
    // Initialize Cloud Functions (optional - only if you have them deployed)
    try {
        createUserFn = httpsCallable(functions, 'createUser');
        updateUserFn = httpsCallable(functions, 'updateUser');
        deleteUserFn = httpsCallable(functions, 'deleteUser');
    } catch (e) {
        console.log('Cloud Functions not available, using direct Firestore');
    }
    
    document.getElementById('pageLoader').style.display = 'none';
    document.getElementById('adminLayout').style.display = 'flex';
    
    updateAdminInfo(adminData);
    
    if (adminData.isSuperAdmin) {
        document.getElementById('adminSection').classList.remove('hidden');
    }
    
    // Use real-time listener instead of one-time load
    setupRealtimeUsersListener();
    loadPendingOrdersCount();
    setupEventListeners();
}

// Real-time users listener - automatically updates when new users register
function setupRealtimeUsersListener() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="9" class="loading-cell"><div class="loading-spinner"></div></td></tr>';
    
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('createdAt', 'desc'));
        
        // Set up real-time listener
        usersUnsubscribe = onSnapshot(q, (snapshot) => {
            allUsers = [];
            snapshot.forEach(doc => {
                allUsers.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Check for new users added
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added" && allUsers.length > 1) {
                    // New user was added (not initial load)
                    const newUser = change.doc.data();
                    showToast(`New user registered: ${newUser.name || newUser.email}`, 'success');
                }
            });
            
            updateStats();
            applyFilters();
            
        }, (error) => {
            console.error('Error in users listener:', error);
            tbody.innerHTML = '<tr><td colspan="9" class="error-cell">Error loading users</td></tr>';
            showToast('Error loading users', 'error');
        });
        
    } catch (error) {
        console.error('Error setting up users listener:', error);
        // Fallback to one-time load
        loadUsers();
    }
}

// Fallback: One-time load users (if real-time doesn't work)
async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="9" class="loading-cell"><div class="loading-spinner"></div></td></tr>';
    
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        allUsers = [];
        snapshot.forEach(doc => {
            allUsers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        updateStats();
        applyFilters();
        
    } catch (error) {
        console.error('Error loading users:', error);
        tbody.innerHTML = '<tr><td colspan="9" class="error-cell">Error loading users</td></tr>';
        showToast('Error loading users', 'error');
    }
}

// Update admin info
function updateAdminInfo(admin) {
    document.getElementById('adminEmail').textContent = admin.email;
    document.getElementById('adminRole').textContent = admin.isSuperAdmin ? 'Super Admin' : 'Admin';
    document.getElementById('adminAvatar').textContent = admin.email.substring(0, 2).toUpperCase();
}

// Load pending orders count for badge
async function loadPendingOrdersCount() {
    try {
        const ordersRef = collection(db, 'orders');
        const snapshot = await getDocs(ordersRef);
        
        let pending = 0;
        snapshot.forEach(doc => {
            const order = doc.data();
            if (['confirmed', 'packed', 'out_for_delivery'].includes(order.status)) {
                pending++;
            }
        });
        
        document.getElementById('pendingBadge').textContent = pending;
    } catch (error) {
        console.error('Error loading pending orders:', error);
    }
}

// Update stats
function updateStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let active = 0;
    let inactive = 0;
    let newToday = 0;
    
    allUsers.forEach(user => {
        if (user.status === 'active') active++;
        else inactive++;
        
        const createdAt = user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt)) : null;
        if (createdAt && createdAt >= today) newToday++;
    });
    
    document.getElementById('totalUsersStat').textContent = allUsers.length;
    document.getElementById('activeUsersStat').textContent = active;
    document.getElementById('inactiveUsersStat').textContent = inactive;
    document.getElementById('newTodayStat').textContent = newToday;
    document.getElementById('userCount').textContent = `(${allUsers.length})`;
}

// Apply filters
function applyFilters() {
    const search = document.getElementById('searchInput').value.toLowerCase().trim();
    const status = document.getElementById('statusFilter').value;
    
    filteredUsers = allUsers.filter(user => {
        const matchesSearch = !search || 
            (user.name && user.name.toLowerCase().includes(search)) ||
            (user.email && user.email.toLowerCase().includes(search)) ||
            (user.phone && user.phone.includes(search)) ||
            user.id.toLowerCase().includes(search);
        
        const matchesStatus = !status || user.status === status;
        
        return matchesSearch && matchesStatus;
    });
    
    currentPage = 1;
    renderTable();
}

// Render table
function renderTable() {
    const tbody = document.getElementById('usersTableBody');
    const tableInfo = document.getElementById('tableInfo');
    
    if (filteredUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-cell">
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                            </svg>
                        </div>
                        <h3 class="empty-state-title">No users found</h3>
                        <p class="empty-state-description">Try adjusting your search or filters</p>
                    </div>
                </td>
            </tr>
        `;
        tableInfo.textContent = 'Showing 0 users';
        document.getElementById('pagination').innerHTML = '';
        return;
    }
    
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, filteredUsers.length);
    const pageUsers = filteredUsers.slice(start, end);
    
    tableInfo.textContent = `Showing ${start + 1}-${end} of ${filteredUsers.length} users`;
    
    let html = '';
    pageUsers.forEach(user => {
        const joinedDate = formatDate(user.createdAt);
        const statusClass = user.status === 'active' ? 'active' : 'inactive';
        
        html += `
            <tr>
                <td><input type="checkbox" class="checkbox row-checkbox" data-id="${user.id}"></td>
                <td>
                    <span class="user-id" onclick="copyToClipboard('${user.id}')" title="Click to copy">
                        ${user.id.substring(0, 8)}...
                    </span>
                </td>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar-table">${getInitials(user.name)}</div>
                        <div class="user-details">
                            <span class="user-name">${escapeHtml(user.name || 'N/A')}</span>
                            <span class="user-email">${escapeHtml(user.email || '')}</span>
                        </div>
                    </div>
                </td>
                <td class="phone-cell">${escapeHtml(user.phone || 'N/A')}</td>
                <td><span class="orders-badge">${user.orderCount || 0}</span></td>
                <td>
                    <div class="city-cell">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                        </svg>
                        ${escapeHtml(user.city || 'N/A')}
                    </div>
                </td>
                <td><span class="status-badge ${statusClass}">${user.status || 'N/A'}</span></td>
                <td>${joinedDate}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon view" onclick="viewUser('${user.id}')" title="View">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        </button>
                        <button class="btn-icon edit" onclick="editUser('${user.id}')" title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="btn-icon delete" onclick="openDeleteModal('${user.id}', '${escapeHtml(user.name)}')" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
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

// View user
window.viewUser = function(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const content = document.getElementById('viewUserContent');
    content.innerHTML = `
        <div class="user-profile-header">
            <div class="user-profile-avatar">${getInitials(user.name)}</div>
            <h3 class="user-profile-name">${escapeHtml(user.name || 'N/A')}</h3>
            <p class="user-profile-email">${escapeHtml(user.email || '')}</p>
            <span class="status-badge ${user.status === 'active' ? 'active' : 'inactive'}">${user.status}</span>
        </div>
        
        <div class="user-info-grid">
            <div class="user-info-item">
                <div class="user-info-label">User ID</div>
                <div class="user-info-value" style="font-family: monospace; font-size: 0.75rem;">${user.id}</div>
            </div>
            <div class="user-info-item">
                <div class="user-info-label">Phone</div>
                <div class="user-info-value">${escapeHtml(user.phone || 'N/A')}</div>
            </div>
            <div class="user-info-item">
                <div class="user-info-label">City</div>
                <div class="user-info-value">${escapeHtml(user.city || 'N/A')}</div>
            </div>
            <div class="user-info-item">
                <div class="user-info-label">Orders</div>
                <div class="user-info-value">${user.orderCount || 0}</div>
            </div>
            <div class="user-info-item full">
                <div class="user-info-label">Joined</div>
                <div class="user-info-value">${formatDate(user.createdAt, true)}</div>
            </div>
        </div>
    `;
    
    document.getElementById('viewUserModal').classList.add('open');
};

// Edit user
window.editUser = function(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    editUserId = userId;
    
    document.getElementById('modalTitle').textContent = 'Edit User';
    document.getElementById('userId').value = userId;
    document.getElementById('userName').value = user.name || '';
    document.getElementById('userEmail').value = user.email || '';
    document.getElementById('userPhone').value = user.phone || '';
    document.getElementById('userStatus').value = user.status || 'active';
    document.getElementById('passwordGroup').style.display = 'none';
    document.getElementById('userPassword').required = false;
    document.getElementById('formError').classList.add('hidden');
    
    document.getElementById('userModal').classList.add('open');
};

// Add user modal
function openAddModal() {
    editUserId = null;
    
    document.getElementById('modalTitle').textContent = 'Add New User';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('passwordGroup').style.display = 'block';
    document.getElementById('userPassword').required = true;
    document.getElementById('formError').classList.add('hidden');
    
    document.getElementById('userModal').classList.add('open');
}

// Close modals
window.closeUserModal = function() {
    document.getElementById('userModal').classList.remove('open');
};

window.closeViewModal = function() {
    document.getElementById('viewUserModal').classList.remove('open');
};

window.closeDeleteModal = function() {
    document.getElementById('deleteModal').classList.remove('open');
    deleteUserId = null;
};

// Delete modal
window.openDeleteModal = function(userId, userName) {
    deleteUserId = userId;
    document.getElementById('deleteUserName').textContent = userName || 'this user';
    document.getElementById('deleteModal').classList.add('open');
};

// Confirm delete
async function confirmDelete() {
    if (!deleteUserId) return;
    
    const btn = document.getElementById('confirmDeleteBtn');
    btn.disabled = true;
    btn.textContent = 'Deleting...';
    
    try {
        // Try Cloud Function first
        if (deleteUserFn) {
            try {
                await deleteUserFn({ userId: deleteUserId });
            } catch (fnError) {
                console.log('Cloud function failed, using direct delete');
                await deleteDoc(doc(db, 'users', deleteUserId));
            }
        } else {
            await deleteDoc(doc(db, 'users', deleteUserId));
        }
        
        showToast('User deleted successfully', 'success');
        closeDeleteModal();
        // No need to reload - real-time listener will update automatically
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Error deleting user', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Delete User';
    }
}

// Form submit
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const formError = document.getElementById('formError');
    
    const userId = document.getElementById('userId').value;
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const phone = document.getElementById('userPhone').value.trim();
    const status = document.getElementById('userStatus').value;
    const password = document.getElementById('userPassword').value;
    
    // Validation
    if (!name || !email) {
        showFormError('Name and email are required');
        return;
    }
    
    if (!userId && (!password || password.length < 6)) {
        showFormError('Password must be at least 6 characters');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').classList.add('hidden');
    submitBtn.querySelector('.btn-loader').classList.remove('hidden');
    formError.classList.add('hidden');
    
    try {
        if (userId) {
            // Update existing user
            if (updateUserFn) {
                try {
                    await updateUserFn({ userId, name, phone, status });
                } catch (fnError) {
                    console.log('Cloud function failed, using direct update');
                    await updateDoc(doc(db, 'users', userId), {
                        name, 
                        phone, 
                        status,
                        updatedAt: serverTimestamp()
                    });
                }
            } else {
                await updateDoc(doc(db, 'users', userId), {
                    name, 
                    phone, 
                    status,
                    updatedAt: serverTimestamp()
                });
            }
            showToast('User updated successfully', 'success');
        } else {
            // Create new user - requires Cloud Function for Auth
            if (createUserFn) {
                await createUserFn({ name, email, phone, status, password });
                showToast('User created successfully', 'success');
            } else {
                showFormError('Cloud Function required to create users with authentication');
                return;
            }
        }
        
        closeUserModal();
        // No need to reload - real-time listener will update automatically
        
    } catch (error) {
        console.error('Error saving user:', error);
        showFormError(error.message || 'Error saving user');
    } finally {
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').classList.remove('hidden');
        submitBtn.querySelector('.btn-loader').classList.add('hidden');
    }
}

function showFormError(message) {
    const formError = document.getElementById('formError');
    formError.textContent = message;
    formError.classList.remove('hidden');
}

// Change page
window.changePage = function(page) {
    currentPage = page;
    renderTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Copy to clipboard
window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('User ID copied!', 'success');
    });
};

// Export functions
window.downloadReport = function(period) {
    const now = new Date();
    let startDate;
    
    switch (period) {
        case 'daily':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'weekly':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'monthly':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        default:
            startDate = new Date(0);
    }
    
    const reportUsers = allUsers.filter(user => {
        const createdAt = user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt)) : null;
        return createdAt && createdAt >= startDate;
    });
    
    if (reportUsers.length === 0) {
        showToast(`No users found for ${period} report`, 'warning');
        return;
    }
    
    generateCSV(reportUsers, `users_${period}_${now.toISOString().split('T')[0]}.csv`);
    showToast(`${period} report downloaded`, 'success');
};

window.exportToExcel = function() {
    if (filteredUsers.length === 0) {
        showToast('No users to export', 'warning');
        return;
    }
    
    generateCSV(filteredUsers, `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('Users exported successfully', 'success');
};

function generateCSV(users, filename) {
    let csv = '\ufeffUser ID,Name,Email,Phone,Status,City,Orders,Joined Date\n';
    
    users.forEach(user => {
        const joined = user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate().toISOString() : user.createdAt) : 'N/A';
        csv += `"${user.id}","${user.name || ''}","${user.email || ''}","${user.phone || ''}","${user.status || ''}","${user.city || ''}","${user.orderCount || 0}","${joined}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('addUserBtn').addEventListener('click', openAddModal);
    document.getElementById('userForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
    
    document.getElementById('refreshBtn').addEventListener('click', () => {
        showToast('Data syncs automatically in real-time!', 'info');
    });
    
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        if (confirm('Are you sure you want to logout?')) {
            // Cleanup listener before logout
            if (usersUnsubscribe) {
                usersUnsubscribe();
            }
            await logoutAdmin();
        }
    });
    
    document.getElementById('menuToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });
    
    // Modal overlays
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            closeUserModal();
            closeViewModal();
            closeDeleteModal();
        });
    });
    
    // Select all
    document.getElementById('selectAll').addEventListener('change', (e) => {
        document.querySelectorAll('.row-checkbox').forEach(cb => {
            cb.checked = e.target.checked;
        });
    });
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (usersUnsubscribe) {
            usersUnsubscribe();
        }
    });
}

// Utilities
function formatDate(timestamp, includeTime = false) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    if (includeTime) {
        return date.toLocaleString('en-IN', { 
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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

// Initialize
protectRoute(initUsersPage);