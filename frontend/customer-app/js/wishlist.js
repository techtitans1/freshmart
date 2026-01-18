// ==================== WISHLIST PAGE JAVASCRIPT ====================
// Fetches wishlist from Firestore 'wishlists' collection

// ==================== FIREBASE CONFIGURATION ====================
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

// ==================== STORAGE KEYS ====================
const STORAGE_KEYS = {
    CART: 'freshmart_cart',
    WISHLIST: 'freshmart_wishlist'
};

// ==================== STATE VARIABLES ====================
let wishlistItems = [];
let currentUserId = null;

// ==================== DOM ELEMENTS ====================
const DOM = {
    wishlistGrid: document.getElementById('wishlistGrid'),
    emptyWishlist: document.getElementById('emptyWishlist'),
    wishlistCount: document.getElementById('wishlistCount'),
    addAllToCart: document.getElementById('addAllToCart'),
    clearWishlist: document.getElementById('clearWishlist'),
    cartCount: document.getElementById('cartCount'),
    toast: document.getElementById('toast'),
    toastIcon: document.getElementById('toastIcon'),
    toastMessage: document.getElementById('toastMessage'),
    loadingOverlay: document.getElementById('loadingOverlay')
};

// ==================== AUTH STATE LISTENER ====================
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = 'login.html?redirect=wishlist';
        return;
    }
    
    currentUserId = user.uid;
    console.log('✅ User authenticated:', user.uid);
    await loadWishlistFromFirestore();
    updateCartCount();
});

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('❤️ Wishlist Page Initialized');
});

// ==================== LOAD WISHLIST FROM FIRESTORE ====================
async function loadWishlistFromFirestore() {
    showLoading();
    
    try {
        console.log('📂 Loading wishlist for user:', currentUserId);
        
        // Get from 'wishlists' collection
        const doc = await db.collection('wishlists').doc(currentUserId).get();
        
        if (doc.exists) {
            const data = doc.data();
            wishlistItems = data.items || [];
            console.log('❤️ Loaded from Firestore:', wishlistItems.length, 'items');
            console.log('📦 Wishlist data:', wishlistItems);
        } else {
            console.log('📭 No wishlist found in Firestore');
            wishlistItems = [];
            
            // Try localStorage as fallback
            try {
                const localWishlist = localStorage.getItem(STORAGE_KEYS.WISHLIST);
                if (localWishlist) {
                    const parsed = JSON.parse(localWishlist);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        wishlistItems = parsed;
                        console.log('📦 Loaded from localStorage:', wishlistItems.length, 'items');
                        
                        // Migrate to Firestore
                        await saveWishlistToFirestore();
                    }
                }
            } catch (e) {
                console.error('Error parsing localStorage:', e);
            }
        }
        
        // Sync with localStorage
        localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(wishlistItems));
        
        renderWishlist();
        updateWishlistCount();
        updateActionButtons();
        
    } catch (error) {
        console.error('❌ Error loading wishlist:', error);
        
        // Fallback to localStorage
        try {
            const localWishlist = localStorage.getItem(STORAGE_KEYS.WISHLIST);
            if (localWishlist) {
                wishlistItems = JSON.parse(localWishlist);
                if (!Array.isArray(wishlistItems)) wishlistItems = [];
            } else {
                wishlistItems = [];
            }
            renderWishlist();
            updateWishlistCount();
        } catch (e) {
            wishlistItems = [];
            renderWishlist();
        }
        
        showToast('Failed to load wishlist from cloud', 'error');
    } finally {
        hideLoading();
    }
}

// ==================== SAVE WISHLIST TO FIRESTORE ====================
async function saveWishlistToFirestore() {
    try {
        await db.collection('wishlists').doc(currentUserId).set({
            userId: currentUserId,
            items: wishlistItems,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log('✅ Wishlist saved to Firestore');
    } catch (error) {
        console.error('❌ Error saving wishlist:', error);
    }
}

// ==================== RENDER WISHLIST ====================
function renderWishlist() {
    if (!DOM.wishlistGrid) return;
    
    console.log('🎨 Rendering wishlist, items:', wishlistItems.length);
    
    if (wishlistItems.length === 0) {
        DOM.wishlistGrid.innerHTML = '';
        if (DOM.emptyWishlist) {
            DOM.emptyWishlist.classList.remove('hidden');
        }
        return;
    }
    
    if (DOM.emptyWishlist) {
        DOM.emptyWishlist.classList.add('hidden');
    }
    
    DOM.wishlistGrid.innerHTML = wishlistItems.map((item, index) => {
        console.log(`📦 Item ${index + 1}:`, item);
        return createWishlistItemHTML(item);
    }).join('');
    
    console.log('✅ Rendered', wishlistItems.length, 'wishlist items');
}

function createWishlistItemHTML(item) {
    // Extract data with fallbacks
    const productId = item.productId || item.id || 'unknown';
    const name = item.name || `Product #${productId}`;
    const price = parseFloat(item.price) || 0;
    const originalPrice = parseFloat(item.originalPrice) || parseFloat(item.mrp) || price;
    const category = item.category || 'Grocery';
    const unit = item.unit || item.weight || '';
    
    // Handle image path - make sure it's correct
    let image = item.image || item.imageUrl || '';
    
    // If image is empty or undefined, use placeholder
    if (!image || image === 'undefined' || image === 'null') {
        image = 'assests/images/placeholder.jpg';
    }
    
    // Log for debugging
    console.log(`🖼️ Image for ${name}:`, image);
    
    const hasDiscount = originalPrice > price && price > 0;
    const discountPercent = hasDiscount 
        ? Math.round(((originalPrice - price) / originalPrice) * 100) 
        : (item.discount || 0);
    
    const isInCart = checkItemInCart(productId);
    
    return `
        <div class="wishlist-item" data-id="${productId}">
            <div class="item-image">
                <img src="${image}" 
                     alt="${name}" 
                     onerror="this.onerror=null; this.src='assests/images/placeholder.jpg'; console.log('Image failed to load:', '${image}');"
                     loading="lazy">
                <button class="remove-btn" onclick="removeFromWishlist('${productId}')" title="Remove from wishlist">
                    <i class="fas fa-heart"></i>
                </button>
                ${discountPercent > 0 ? `<span class="discount-badge">${discountPercent}% OFF</span>` : ''}
            </div>
            
            <div class="item-details">
                <span class="item-category">${category}</span>
                <h3 class="item-name">${name}</h3>
                ${unit ? `<span class="item-unit">${unit}</span>` : ''}
                
                <div class="item-price">
                    <span class="current-price">₹${price}</span>
                    ${hasDiscount ? `<span class="original-price">₹${originalPrice}</span>` : ''}
                </div>
                
                <div class="item-actions">
                    <button class="add-to-cart-btn ${isInCart ? 'added' : ''}" 
                            onclick="addToCart('${productId}')"
                            ${isInCart ? 'disabled' : ''}>
                        <i class="fas ${isInCart ? 'fa-check' : 'fa-cart-plus'}"></i>
                        ${isInCart ? 'Added' : 'Add to Cart'}
                    </button>
                    <button class="view-btn" onclick="viewProduct('${productId}')" title="View Product">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ==================== UPDATE COUNTS ====================
function updateWishlistCount() {
    if (DOM.wishlistCount) {
        const count = wishlistItems.length;
        DOM.wishlistCount.textContent = `${count} Item${count !== 1 ? 's' : ''}`;
    }
}

function updateActionButtons() {
    const hasItems = wishlistItems.length > 0;
    
    if (DOM.addAllToCart) {
        DOM.addAllToCart.style.display = hasItems ? 'flex' : 'none';
    }
    if (DOM.clearWishlist) {
        DOM.clearWishlist.style.display = hasItems ? 'flex' : 'none';
    }
}

function updateCartCount() {
    try {
        const cartData = localStorage.getItem(STORAGE_KEYS.CART);
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

// ==================== WISHLIST ACTIONS ====================
async function removeFromWishlist(productId) {
    showLoading();
    
    try {
        // Convert to string for comparison
        const idString = String(productId);
        
        // Find and remove item
        const itemIndex = wishlistItems.findIndex(item => 
            String(item.productId) === idString || String(item.id) === idString
        );
        
        if (itemIndex === -1) {
            console.warn('Item not found in wishlist:', productId);
            hideLoading();
            return;
        }
        
        const removedItem = wishlistItems[itemIndex];
        wishlistItems.splice(itemIndex, 1);
        
        // Save to Firestore
        await saveWishlistToFirestore();
        
        // Sync localStorage
        localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(wishlistItems));
        
        renderWishlist();
        updateWishlistCount();
        updateActionButtons();
        
        const itemName = removedItem.name || `Product #${productId}`;
        showToast(`${itemName} removed from wishlist`, 'success');
        
    } catch (error) {
        console.error('❌ Error removing from wishlist:', error);
        showToast('Failed to remove item', 'error');
    } finally {
        hideLoading();
    }
}

async function clearWishlist() {
    if (wishlistItems.length === 0) {
        showToast('Wishlist is already empty', 'info');
        return;
    }
    
    if (!confirm('Are you sure you want to clear your entire wishlist?')) {
        return;
    }
    
    showLoading();
    
    try {
        wishlistItems = [];
        
        // Save to Firestore
        await saveWishlistToFirestore();
        
        // Sync localStorage
        localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify([]));
        
        renderWishlist();
        updateWishlistCount();
        updateActionButtons();
        
        showToast('Wishlist cleared', 'success');
        
    } catch (error) {
        console.error('❌ Error clearing wishlist:', error);
        showToast('Failed to clear wishlist', 'error');
    } finally {
        hideLoading();
    }
}

// ==================== CART FUNCTIONS ====================
function checkItemInCart(productId) {
    try {
        const cartData = localStorage.getItem(STORAGE_KEYS.CART);
        const cart = cartData ? JSON.parse(cartData) : [];
        const idString = String(productId);
        return cart.some(item => String(item.id) === idString || String(item.productId) === idString);
    } catch (error) {
        return false;
    }
}

function addToCart(productId) {
    try {
        const idString = String(productId);
        
        // Find the item in wishlist
        const item = wishlistItems.find(i => 
            String(i.productId) === idString || String(i.id) === idString
        );
        
        if (!item) {
            showToast('Item not found', 'error');
            return;
        }
        
        // Get current cart
        const cartData = localStorage.getItem(STORAGE_KEYS.CART);
        let cart = cartData ? JSON.parse(cartData) : [];
        
        // Check if already in cart
        const existingIndex = cart.findIndex(i => 
            String(i.id) === idString || String(i.productId) === idString
        );
        
        if (existingIndex !== -1) {
            cart[existingIndex].quantity += 1;
            showToast('Item quantity updated in cart!', 'success');
        } else {
            cart.push({
                id: parseInt(productId) || productId,
                productId: productId,
                name: item.name || `Product #${productId}`,
                price: parseFloat(item.price) || 0,
                originalPrice: parseFloat(item.originalPrice) || parseFloat(item.price) || 0,
                image: item.image || 'assests/images/placeholder.jpg',
                category: item.category || '',
                weight: item.unit || item.weight || '',
                quantity: 1,
                addedAt: new Date().toISOString()
            });
            showToast(`${item.name || 'Item'} added to cart!`, 'success');
        }
        
        // Save cart
        localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
        
        // Update UI
        renderWishlist();
        updateCartCount();
        
    } catch (error) {
        console.error('❌ Error adding to cart:', error);
        showToast('Failed to add to cart', 'error');
    }
}

function addAllToCart() {
    if (wishlistItems.length === 0) {
        showToast('Wishlist is empty', 'info');
        return;
    }
    
    try {
        const cartData = localStorage.getItem(STORAGE_KEYS.CART);
        let cart = cartData ? JSON.parse(cartData) : [];
        
        let addedCount = 0;
        
        wishlistItems.forEach(item => {
            const productId = item.productId || item.id;
            const idString = String(productId);
            
            const existingIndex = cart.findIndex(i => 
                String(i.id) === idString || String(i.productId) === idString
            );
            
            if (existingIndex !== -1) {
                cart[existingIndex].quantity += 1;
            } else {
                cart.push({
                    id: parseInt(productId) || productId,
                    productId: productId,
                    name: item.name || `Product #${productId}`,
                    price: parseFloat(item.price) || 0,
                    originalPrice: parseFloat(item.originalPrice) || parseFloat(item.price) || 0,
                    image: item.image || 'assests/images/placeholder.jpg',
                    category: item.category || '',
                    weight: item.unit || item.weight || '',
                    quantity: 1,
                    addedAt: new Date().toISOString()
                });
                addedCount++;
            }
        });
        
        localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
        
        renderWishlist();
        updateCartCount();
        
        showToast(`${wishlistItems.length} item${wishlistItems.length !== 1 ? 's' : ''} added to cart!`, 'success');
        
    } catch (error) {
        console.error('❌ Error adding all to cart:', error);
        showToast('Failed to add items to cart', 'error');
    }
}

function viewProduct(productId) {
    window.location.href = `product.html?id=${productId}`;
}

// ==================== LOADING & TOAST ====================
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
window.removeFromWishlist = removeFromWishlist;
window.clearWishlist = clearWishlist;
window.addToCart = addToCart;
window.addAllToCart = addAllToCart;
window.viewProduct = viewProduct;
window.hideToast = hideToast;

// ==================== DEBUG FUNCTIONS ====================
window.debugWishlist = function() {
    console.log('========== WISHLIST DEBUG ==========');
    console.log('Current User ID:', currentUserId);
    console.log('Wishlist Items:', wishlistItems);
    console.log('Items Count:', wishlistItems.length);
    
    wishlistItems.forEach((item, i) => {
        console.log(`Item ${i + 1}:`, {
            id: item.productId || item.id,
            name: item.name,
            image: item.image,
            price: item.price
        });
    });
    console.log('====================================');
};

window.addTestWishlistItems = async function() {
    const testItems = [
        {
            productId: '101',
            id: '101',
            name: 'Fresh Tomatoes',
            price: 35,
            originalPrice: 45,
            image: 'assests/images/vegetables/tomato.jpeg',
            category: 'Vegetables',
            unit: '500g',
            discount: 22
        },
        {
            productId: '701',
            id: '701',
            name: 'Taj Mahal Tea',
            price: 25,
            originalPrice: 30,
            image: 'assests/images/Home/tajmahal.jpeg',
            category: 'Tea & Coffee',
            unit: '250g',
            discount: 17
        },
        {
            productId: '210',
            id: '210',
            name: 'White Eggs',
            price: 40,
            originalPrice: 50,
            image: 'assests/images/dairy/whiteeggs.jpeg',
            category: 'Dairy Products',
            unit: '1kg',
            discount: 20
        }
    ];
    
    wishlistItems = testItems;
    
    await saveWishlistToFirestore();
    
    localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(wishlistItems));
    
    renderWishlist();
    updateWishlistCount();
    updateActionButtons();
    
    console.log('✅ Test items added!');
    showToast('Test items added to wishlist!', 'success');
};

// Force refresh wishlist from Firestore
window.refreshWishlist = async function() {
    await loadWishlistFromFirestore();
    console.log('✅ Wishlist refreshed!');
};

console.log('%c❤️ Wishlist Page Ready', 'color: #e91e63; font-size: 14px; font-weight: bold;');
console.log('%c💡 Debug Commands:', 'color: #1976d2;');
console.log('  debugWishlist() - Show current wishlist data');
console.log('  addTestWishlistItems() - Add test items');
console.log('  refreshWishlist() - Reload from Firestore');