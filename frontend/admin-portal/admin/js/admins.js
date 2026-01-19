// ================================================
// ADMINS MODULE - Complete Admin Management
// ================================================

import { 
    db,
    functions,
    collection, 
    getDocs, 
    query, 
    orderBy,
    httpsCallable
} from './firebase-config.js';
import { protectRoute, logoutAdmin } from './auth.js';

// State
let currentAdmin = null;
let allAdmins = [];

// Cloud Functions
let createAdminFn = null;
let toggleAdminStatusFn = null;

// Initialize
function initAdminsPage(adminData) {
    // Only super admins can access
    if (!adminData.isSuperAdmin) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    currentAdmin = adminData;
    
    // Initialize Cloud Functions
    createAdminFn = httpsCallable(functions, 'createAdmin');
    toggleAdminStatusFn = httpsCallable(functions, 'toggleAdminStatus');
    
    document.getElementById('pageLoader').style.display = 'none';
    document.getElementById('adminLayout').style.display = 'flex';
    
    updateAdminInfo(adminData);
    loadAdmins();
    setupEventListeners();
}

// Update admin info
function updateAdminInfo(admin) {
    document.getElementById('adminEmail').textContent = admin.email;
    document.getElementById('adminRole').textContent = 'Super Admin';
    document.getElementById('adminAvatar').textContent = admin.email.substring(0, 2).toUpperCase();
}

// Load admins
async function loadAdmins() {
    const tbody = document.getElementById('adminsTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="loading-cell"><div class="loading-spinner"></div></td></tr>';
    
    try {
        const adminsRef = collection(db, 'admins');
        const q = query(adminsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        allAdmins = [];
        snapshot.forEach(doc => {
            allAdmins.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        updateStats();
        renderTable();
        
    } catch (error) {
        console.error('Error loading admins:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="error-cell">Error loading admins</td></tr>';
        showToast('Error loading admins', 'error');
    }
}

// Update stats
function updateStats() {
    let superAdmins = 0;
    let activeAdmins = 0;
    
    allAdmins.forEach(admin => {
        if (admin.role === 'super_admin') superAdmins++;
        if (!admin.disabled) activeAdmins++;
    });
    
    document.getElementById('totalAdminsStat').textContent = allAdmins.length;
    document.getElementById('superAdminsStat').textContent = superAdmins;
    document.getElementById('activeAdminsStat').textContent = activeAdmins;
    document.getElementById('adminCount').textContent = `(${allAdmins.length})`;
}

// Render table
function renderTable() {
    const tbody = document.getElementById('adminsTableBody');
    
    if (allAdmins.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-cell">
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                        </div>
                        <h3 class="empty-state-title">No admins found</h3>
                        <p class="empty-state-description">Create your first admin account</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    allAdmins.forEach(admin => {
        const createdDate = formatDate(admin.createdAt);
        const roleLabel = admin.role === 'super_admin' ? 'Super Admin' : 'Admin';
        const roleClass = admin.role === 'super_admin' ? 'super_admin' : 'admin';
        const statusClass = admin.disabled ? 'inactive' : 'active';
        const statusLabel = admin.disabled ? 'Disabled' : 'Active';
        
        html += `
            <tr>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar-table">${admin.email.substring(0, 2).toUpperCase()}</div>
                        <div class="user-details">
                            <span class="user-name">${escapeHtml(admin.email)}</span>
                        </div>
                    </div>
                </td>
                <td><span class="role-badge ${roleClass}">${roleLabel}</span></td>
                <td>${createdDate}</td>
                <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <div class="action-buttons">
                        ${admin.role !== 'super_admin' ? `
                            <button class="btn-icon ${admin.disabled ? 'view' : 'delete'}" 
                                    onclick="toggleAdminStatus('${admin.id}', ${admin.disabled})" 
                                    title="${admin.disabled ? 'Enable' : 'Disable'}">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    ${admin.disabled ? 
                                        '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' : 
                                        '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
                                    }
                                </svg>
                            </button>
                        ` : '<span style="color: var(--gray-400); font-size: 0.75rem;">Protected</span>'}
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Toggle admin status
window.toggleAdminStatus = async function(adminId, currentlyDisabled) {
    const action = currentlyDisabled ? 'enable' : 'disable';
    if (!confirm(`Are you sure you want to ${action} this admin?`)) return;
    
    showToast(`${currentlyDisabled ? 'Enabling' : 'Disabling'} admin...`, 'info');
    
    try {
        await toggleAdminStatusFn({ adminId, disable: !currentlyDisabled });
        showToast(`Admin ${currentlyDisabled ? 'enabled' : 'disabled'} successfully`, 'success');
        loadAdmins();
    } catch (error) {
        console.error('Error toggling admin status:', error);
        showToast('Error updating admin status', 'error');
    }
};

// Create admin
async function handleCreateAdmin(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const formError = document.getElementById('formError');
    
    const email = document.getElementById('adminEmailInput').value.trim();
    const password = document.getElementById('adminPassword').value;
    const role = document.getElementById('adminRoleSelect').value;
    
    if (!email || !password || password.length < 8) {
        showFormError('Please fill all fields. Password must be at least 8 characters.');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.querySelector('.btn-text').classList.add('hidden');
    submitBtn.querySelector('.btn-loader').classList.remove('hidden');
    formError.classList.add('hidden');
    
    try {
        await createAdminFn({ email, password, role });
        showToast('Admin created successfully', 'success');
        closeAdminModal();
        loadAdmins();
    } catch (error) {
        console.error('Error creating admin:', error);
        showFormError(error.message || 'Error creating admin');
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

// Modal
function openAdminModal() {
    document.getElementById('adminForm').reset();
    document.getElementById('formError').classList.add('hidden');
    document.getElementById('adminModal').classList.add('open');
}

window.closeAdminModal = function() {
    document.getElementById('adminModal').classList.remove('open');
};

// Setup event listeners
function setupEventListeners() {
    document.getElementById('addAdminBtn').addEventListener('click', openAdminModal);
    document.getElementById('adminForm').addEventListener('submit', handleCreateAdmin);
    document.querySelector('#adminModal .modal-overlay').addEventListener('click', closeAdminModal);
    
    document.getElementById('refreshBtn').addEventListener('click', () => {
        showToast('Refreshing...', 'info');
        loadAdmins();
    });
    
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        if (confirm('Are you sure you want to logout?')) {
            await logoutAdmin();
        }
    });
    
    document.getElementById('menuToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });
}

// Utilities
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

// Initialize
protectRoute(initAdminsPage);