// ==================== ADDRESSES PAGE JAVASCRIPT ====================
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

// ==================== STATE VARIABLES ====================
let addresses = [];
let currentEditId = null;
let currentUserId = null;

// ==================== DOM ELEMENTS ====================
const DOM = {
    addressesList: document.getElementById('addressesList'),
    emptyAddresses: document.getElementById('emptyAddresses'),
    addressCount: document.getElementById('addressCount'),
    addressModal: document.getElementById('addressModal'),
    addressModalTitle: document.getElementById('addressModalTitle'),
    addressForm: document.getElementById('addressForm'),
    cartCount: document.getElementById('cartCount'),
    toast: document.getElementById('toast'),
    toastIcon: document.getElementById('toastIcon'),
    toastMessage: document.getElementById('toastMessage'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    
    // Form fields
    addressLabel: document.getElementById('addressLabel'),
    fullName: document.getElementById('fullName'),
    phone: document.getElementById('phone'),
    streetAddress: document.getElementById('streetAddress'),
    city: document.getElementById('city'),
    state: document.getElementById('state'),
    pincode: document.getElementById('pincode'),
    landmark: document.getElementById('landmark'),
    isDefault: document.getElementById('isDefault')
};

// ==================== AUTH STATE LISTENER ====================
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html?redirect=addresses';
        return;
    }
    
    currentUserId = user.uid;
    console.log('✅ User authenticated:', user.uid);
    await loadAddresses();
    updateCartCount();
});

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📍 Addresses Page Initialized');
    setupEventListeners();
});

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Form submission
    if (DOM.addressForm) {
        DOM.addressForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Label buttons
    document.querySelectorAll('.label-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.label-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            DOM.addressLabel.value = this.dataset.label;
        });
    });
    
    // Phone input validation
    if (DOM.phone) {
        DOM.phone.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
        });
    }
    
    // Pincode validation
    if (DOM.pincode) {
        DOM.pincode.addEventListener('input', function() {
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 6);
        });
    }
    
    // Close modal on backdrop click
    if (DOM.addressModal) {
        DOM.addressModal.addEventListener('click', function(e) {
            if (e.target === DOM.addressModal) {
                closeAddressModal();
            }
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && DOM.addressModal?.classList.contains('active')) {
            closeAddressModal();
        }
    });
}

// ==================== LOAD ADDRESSES FROM FIRESTORE ====================
async function loadAddresses() {
    showLoading();
    
    try {
        const doc = await db.collection('users').doc(currentUserId).get();
        
        if (doc.exists) {
            const data = doc.data();
            addresses = data.savedAddresses || [];
            console.log('📍 Loaded addresses:', addresses);
        } else {
            addresses = [];
        }
        
        renderAddresses();
        updateAddressCount();
        
    } catch (error) {
        console.error('Error loading addresses:', error);
        showToast('Failed to load addresses', 'error');
    } finally {
        hideLoading();
    }
}

// ==================== RENDER ADDRESSES ====================
function renderAddresses() {
    if (!DOM.addressesList) return;
    
    if (addresses.length === 0) {
        DOM.addressesList.innerHTML = '';
        if (DOM.emptyAddresses) {
            DOM.emptyAddresses.classList.remove('hidden');
        }
        return;
    }
    
    if (DOM.emptyAddresses) {
        DOM.emptyAddresses.classList.add('hidden');
    }
    
    DOM.addressesList.innerHTML = addresses.map(address => createAddressCardHTML(address)).join('');
}

function createAddressCardHTML(address) {
    const labelIcons = {
        home: 'fa-home',
        work: 'fa-briefcase',
        other: 'fa-map-pin'
    };
    
    const labelNames = {
        home: 'Home',
        work: 'Work',
        other: 'Other'
    };
    
    const iconClass = labelIcons[address.label] || 'fa-map-pin';
    const labelName = labelNames[address.label] || 'Other';
    
    const fullAddress = [
        address.streetAddress,
        address.landmark,
        address.city,
        address.state,
        address.pincode
    ].filter(Boolean).join(', ');
    
    return `
        <div class="address-card ${address.isDefault ? 'default' : ''}" data-id="${address.id}">
            <div class="address-header">
                <div class="address-label-section">
                    <div class="label-icon ${address.label}">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <div class="address-label-info">
                        <h3>
                            ${labelName}
                            ${address.isDefault ? '<span class="default-badge">Default</span>' : ''}
                        </h3>
                        <p class="address-name">${address.fullName}</p>
                    </div>
                </div>
                <div class="address-actions">
                    <button class="action-icon-btn" onclick="editAddress('${address.id}')" title="Edit">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="action-icon-btn delete" onclick="deleteAddress('${address.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            <div class="address-details">
                <p class="address-text">${fullAddress}</p>
                <p class="address-phone">
                    <i class="fas fa-phone"></i>
                    +91 ${formatPhone(address.phone)}
                </p>
            </div>
            
            <div class="address-footer">
                ${!address.isDefault ? `
                    <button class="set-default-btn" onclick="setDefaultAddress('${address.id}')">
                        <i class="fas fa-check-circle"></i> Set as Default
                    </button>
                ` : ''}
                <button class="deliver-here-btn" onclick="deliverHere('${address.id}')">
                    <i class="fas fa-truck"></i> Deliver Here
                </button>
            </div>
        </div>
    `;
}

function formatPhone(phone) {
    if (!phone) return '';
    return phone.replace(/(\d{5})(\d{5})/, '$1 $2');
}

function updateAddressCount() {
    if (DOM.addressCount) {
        DOM.addressCount.textContent = `${addresses.length} Address${addresses.length !== 1 ? 'es' : ''}`;
    }
}

// ==================== MODAL FUNCTIONS ====================
function openAddressModal(editId = null) {
    currentEditId = editId;
    
    if (DOM.addressModalTitle) {
        DOM.addressModalTitle.textContent = editId ? 'Edit Address' : 'Add New Address';
    }
    
    // Reset form
    if (DOM.addressForm) {
        DOM.addressForm.reset();
    }
    
    // Reset label buttons
    document.querySelectorAll('.label-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.label === 'home') btn.classList.add('active');
    });
    DOM.addressLabel.value = 'home';
    
    // If editing, populate form
    if (editId) {
        const address = addresses.find(a => a.id === editId);
        if (address) {
            populateForm(address);
        }
    }
    
    if (DOM.addressModal) {
        DOM.addressModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeAddressModal() {
    if (DOM.addressModal) {
        DOM.addressModal.classList.remove('active');
        document.body.style.overflow = '';
    }
    currentEditId = null;
}

function populateForm(address) {
    DOM.fullName.value = address.fullName || '';
    DOM.phone.value = address.phone || '';
    DOM.streetAddress.value = address.streetAddress || '';
    DOM.city.value = address.city || '';
    DOM.state.value = address.state || '';
    DOM.pincode.value = address.pincode || '';
    DOM.landmark.value = address.landmark || '';
    DOM.isDefault.checked = address.isDefault || false;
    DOM.addressLabel.value = address.label || 'home';
    
    // Update label buttons
    document.querySelectorAll('.label-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.label === address.label) {
            btn.classList.add('active');
        }
    });
}

// ==================== FORM SUBMISSION ====================
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const addressData = {
        id: currentEditId || Date.now().toString(),
        label: DOM.addressLabel.value,
        fullName: DOM.fullName.value.trim(),
        phone: DOM.phone.value.trim(),
        streetAddress: DOM.streetAddress.value.trim(),
        city: DOM.city.value.trim(),
        state: DOM.state.value.trim(),
        pincode: DOM.pincode.value.trim(),
        landmark: DOM.landmark.value.trim(),
        isDefault: DOM.isDefault.checked,
        createdAt: currentEditId ? undefined : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Validation
    if (!addressData.fullName || !addressData.phone || !addressData.streetAddress || 
        !addressData.city || !addressData.state || !addressData.pincode) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    
    if (addressData.phone.length !== 10) {
        showToast('Please enter a valid 10-digit phone number', 'error');
        return;
    }
    
    if (addressData.pincode.length !== 6) {
        showToast('Please enter a valid 6-digit pincode', 'error');
        return;
    }
    
    showLoading();
    
    try {
        if (currentEditId) {
            // Update existing address
            const index = addresses.findIndex(a => a.id === currentEditId);
            if (index !== -1) {
                addressData.createdAt = addresses[index].createdAt;
                addresses[index] = addressData;
            }
        } else {
            // Add new address
            addresses.push(addressData);
        }
        
        // If setting as default, remove default from others
        if (addressData.isDefault) {
            addresses = addresses.map(a => ({
                ...a,
                isDefault: a.id === addressData.id
            }));
        }
        
        // Save to Firestore
        await db.collection('users').doc(currentUserId).update({
            savedAddresses: addresses,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        renderAddresses();
        updateAddressCount();
        closeAddressModal();
        
        showToast(currentEditId ? 'Address updated successfully!' : 'Address added successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving address:', error);
        showToast('Failed to save address. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// ==================== ADDRESS ACTIONS ====================
function editAddress(id) {
    openAddressModal(id);
}

async function deleteAddress(id) {
    if (!confirm('Are you sure you want to delete this address?')) return;
    
    showLoading();
    
    try {
        addresses = addresses.filter(a => a.id !== id);
        
        await db.collection('users').doc(currentUserId).update({
            savedAddresses: addresses,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        renderAddresses();
        updateAddressCount();
        showToast('Address deleted successfully!', 'success');
        
    } catch (error) {
        console.error('Error deleting address:', error);
        showToast('Failed to delete address', 'error');
    } finally {
        hideLoading();
    }
}

async function setDefaultAddress(id) {
    showLoading();
    
    try {
        addresses = addresses.map(a => ({
            ...a,
            isDefault: a.id === id
        }));
        
        await db.collection('users').doc(currentUserId).update({
            savedAddresses: addresses,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        renderAddresses();
        showToast('Default address updated!', 'success');
        
    } catch (error) {
        console.error('Error setting default address:', error);
        showToast('Failed to update default address', 'error');
    } finally {
        hideLoading();
    }
}

function deliverHere(id) {
    const address = addresses.find(a => a.id === id);
    if (address) {
        // Store selected address for checkout
        localStorage.setItem('selectedDeliveryAddress', JSON.stringify(address));
        showToast('Delivery address selected!', 'success');
        
        // Redirect to cart or checkout if needed
        // window.location.href = 'cart.html';
    }
}

// ==================== UTILITY FUNCTIONS ====================
function updateCartCount() {
    try {
        const cartData = localStorage.getItem('freshmart_cart');
        const cart = cartData ? JSON.parse(cartData) : [];
        const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
        
        if (DOM.cartCount) {
            DOM.cartCount.textContent = totalItems;
            DOM.cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    } catch (error) {
        console.error('Error updating cart count:', error);
    }
}

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
}

// ==================== GLOBAL EXPORTS ====================
window.openAddressModal = openAddressModal;
window.closeAddressModal = closeAddressModal;
window.editAddress = editAddress;
window.deleteAddress = deleteAddress;
window.setDefaultAddress = setDefaultAddress;
window.deliverHere = deliverHere;
window.hideToast = hideToast;

console.log('%c📍 Addresses Page Ready', 'color: #00897b; font-size: 14px; font-weight: bold;');