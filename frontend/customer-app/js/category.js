// ==================== CATEGORY.JS ====================
// Universal JavaScript for all FreshMart category pages
// Reads products from HTML, handles cart, filters, subcategories

// ==================== STATE VARIABLES ====================
let cart = [];
let wishlist = [];
let allProducts = [];
let selectedSubCategory = 'all';
let filters = {
    minPrice: 0,
    maxPrice: Infinity,
    discount: 0,
    inStockOnly: true,
    sort: 'relevance',
    search: ''
};

// ==================== DOM ELEMENTS ====================
const DOM = {
    // Navbar
    backBtn: document.getElementById('backBtn'),
    productCount: document.getElementById('productCount'),
    searchToggle: document.getElementById('searchToggle'),
    filterToggle: document.getElementById('filterToggle'),
    filterBadge: document.getElementById('filterBadge'),
    cartCount: document.getElementById('cartCount'),
    
    // Search
    searchBarContainer: document.getElementById('searchBarContainer'),
    searchInput: document.getElementById('searchInput'),
    clearSearch: document.getElementById('clearSearch'),
    
    // Filter Popup
    filterOverlay: document.getElementById('filterOverlay'),
    filterPopup: document.getElementById('filterPopup'),
    filterCloseBtn: document.getElementById('filterCloseBtn'),
    minPrice: document.getElementById('minPrice'),
    maxPrice: document.getElementById('maxPrice'),
    inStockOnly: document.getElementById('inStockOnly'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    applyFiltersBtn: document.getElementById('applyFiltersBtn'),
    
    // Sidebar
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    subcategoryList: document.getElementById('subcategoryList'),
    mobileCategoryBtn: document.getElementById('mobileCategoryBtn'),
    
    // Products
    productsGrid: document.getElementById('productsGrid'),
    emptyState: document.getElementById('emptyState'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    
    // Toast & Floating Cart
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    floatingCart: document.getElementById('floatingCart'),
    floatingCartCount: document.getElementById('floatingCartCount'),
    floatingCartTotal: document.getElementById('floatingCartTotal')
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // Load cart from localStorage
    loadCart();
    
    // Parse products from HTML
    parseProductsFromHTML();
    
    // Update product buttons based on cart/wishlist
    updateProductButtons();

    // Update subcategory counts
    updateSubcategoryCounts();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initial render
    applyFiltersAndRender();
    
    console.log('Category page initialized with', allProducts.length, 'products');
});

// ==================== PARSE PRODUCTS FROM HTML ====================
function parseProductsFromHTML() {
    const productCards = document.querySelectorAll('.product-card[data-id]');
    
    productCards.forEach(card => {
        const product = {
            id: parseInt(card.dataset.id),
            name: card.dataset.name || '',
            category: card.dataset.category || '',
            subcategory: card.dataset.subcategory || '',
            price: parseFloat(card.dataset.price) || 0,
            originalPrice: parseFloat(card.dataset.originalPrice) || 0,
            weight: card.dataset.weight || '',
            discount: parseInt(card.dataset.discount) || 0,
            inStock: card.dataset.stock === 'true',
            image: card.dataset.image || '',
            element: card
        };
        
        allProducts.push(product);
    });
}

// ==================== UPDATE SUBCATEGORY COUNTS ====================
function updateSubcategoryCounts() {
    const counts = { all: allProducts.length };
    
    allProducts.forEach(product => {
        if (!counts[product.subcategory]) {
            counts[product.subcategory] = 0;
        }
        counts[product.subcategory]++;
    });
    
    // Update count badges
    Object.keys(counts).forEach(subcat => {
        const countEl = document.getElementById(`count-${subcat}`);
        if (countEl) {
            countEl.textContent = counts[subcat];
        }
    });
}

// ==================== LOAD CART ====================
function loadCart() {
    try {
        const savedCart = localStorage.getItem('freshmart_cart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
        }
        
        const savedWishlist = localStorage.getItem('freshmart_wishlist');
        if (savedWishlist) {
            wishlist = JSON.parse(savedWishlist);
        }
    } catch (e) {
        console.error('Error loading cart:', e);
        cart = [];
        wishlist = [];
    }
    
    updateCartUI();
}

// ==================== SAVE CART ====================
function saveCart() {
    localStorage.setItem('freshmart_cart', JSON.stringify(cart));
    updateCartUI();
}

// ==================== UPDATE CART UI ====================
function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Update cart badge
    if (DOM.cartCount) {
        DOM.cartCount.textContent = totalItems;
        DOM.cartCount.style.display = totalItems > 0 ? 'flex' : 'none';
    }
    
    // Update floating cart
    if (DOM.floatingCart) {
        if (totalItems > 0) {
            DOM.floatingCart.classList.remove('hidden');
            DOM.floatingCartCount.textContent = `${totalItems} item${totalItems > 1 ? 's' : ''}`;
            DOM.floatingCartTotal.textContent = `₹${totalAmount}`;
        } else {
            DOM.floatingCart.classList.add('hidden');
        }
    }
    
    // Update add to cart buttons
    updateProductButtons();
}

// ==================== UPDATE PRODUCT BUTTONS ====================
function updateProductButtons() {
    allProducts.forEach(product => {
        // Find cart item that matches this product's ID
        const cartItem = cart.find(item => item.id === product.id);
        const isInWishlist = wishlist.includes(product.id);
        const priceRow = product.element.querySelector('.product-price-row');
        const wishlistBtn = product.element.querySelector('.wishlist-btn');
        
        // Update wishlist button
        if (wishlistBtn) {
            wishlistBtn.classList.toggle('active', isInWishlist);
            const icon = wishlistBtn.querySelector('i');
            if (icon) {
                icon.className = isInWishlist ? 'fas fa-heart' : 'far fa-heart';
            }
        }
        
        // Update add to cart / quantity controls
        if (priceRow) {
            // Keep the price div
            const priceDiv = priceRow.querySelector('.product-price');
            const existingBtn = priceRow.querySelector('.add-to-cart-btn');
            const existingQty = priceRow.querySelector('.quantity-controls');
            
            if (cartItem) {
                // Show quantity controls
                if (existingBtn) {
                    existingBtn.remove();
                }
                if (!existingQty) {
                    const qtyControls = document.createElement('div');
                    qtyControls.className = 'quantity-controls';
                    qtyControls.innerHTML = `
                        <button class="qty-btn qty-minus" data-id="${product.id}">−</button>
                        <span class="qty-value">${cartItem.quantity}</span>
                        <button class="qty-btn qty-plus" data-id="${product.id}">+</button>
                    `;
                    priceRow.appendChild(qtyControls);
                    
                    // Add event listeners
                    qtyControls.querySelector('.qty-minus').addEventListener('click', (e) => {
                        e.stopPropagation();
                        decreaseQuantity(product.id);
                    });
                    qtyControls.querySelector('.qty-plus').addEventListener('click', (e) => {
                        e.stopPropagation();
                        increaseQuantity(product.id);
                    });
                } else {
                    existingQty.querySelector('.qty-value').textContent = cartItem.quantity;
                }
            } else {
                // Show add button
                if (existingQty) {
                    existingQty.remove();
                }
                if (!existingBtn && product.inStock) {
                    const addBtn = document.createElement('button');
                    addBtn.className = 'add-to-cart-btn';
                    addBtn.textContent = 'ADD';
                    addBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        addToCart(product.id);
                    });
                    priceRow.appendChild(addBtn);
                }
            }
        }
    });
}
// ==================== CART FUNCTIONS ====================
function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        console.error('Product not found:', productId);
        return;
    }
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            originalPrice: product.originalPrice,
            image: product.image,
            weight: product.weight,
            category: product.category || '',
            subcategory: product.subcategory || '',
            quantity: 1
        });
    }
    
    saveCart();
    showToast(`${product.name} added to cart`);
}

function increaseQuantity(productId) {
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
        cartItem.quantity += 1;
        saveCart();
    }
}

function decreaseQuantity(productId) {
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
        cartItem.quantity -= 1;
        
        if (cartItem.quantity <= 0) {
            cart = cart.filter(item => item.id !== productId);
            const product = allProducts.find(p => p.id === productId);
            showToast(`${product?.name || 'Item'} removed from cart`);
        }
        
        saveCart();
    }
}

// ==================== WISHLIST FUNCTIONS ====================
function toggleWishlist(productId) {
    const product = allProducts.find(p => p.id === productId);
    const index = wishlist.indexOf(productId);
    
    if (index > -1) {
        wishlist.splice(index, 1);
        showToast(`${product?.name || 'Item'} removed from wishlist`);
    } else {
        wishlist.push(productId);
        showToast(`${product?.name || 'Item'} added to wishlist!`);
    }
    
    localStorage.setItem('freshmart_wishlist', JSON.stringify(wishlist));
    updateProductButtons();
}

// ==================== FILTER & RENDER ====================
function applyFiltersAndRender() {
    let visibleCount = 0;
    
    allProducts.forEach(product => {
        let visible = true;
        
        // Subcategory filter
        if (selectedSubCategory !== 'all' && product.subcategory !== selectedSubCategory) {
            visible = false;
        }
        
        // Price filter
        if (product.price < filters.minPrice || product.price > filters.maxPrice) {
            visible = false;
        }
        
        // Discount filter
        if (filters.discount > 0 && product.discount < filters.discount) {
            visible = false;
        }
        
        // Stock filter
        if (filters.inStockOnly && !product.inStock) {
            visible = false;
        }
        
        // Search filter
        if (filters.search) {
            const query = filters.search.toLowerCase();
            if (!product.name.toLowerCase().includes(query)) {
                visible = false;
            }
        }
        
        // Apply visibility
        product.element.classList.toggle('hidden', !visible);
        
        if (visible) visibleCount++;
    });
    
    // Sort visible products
    sortProducts();
    
    // Update product count
    DOM.productCount.textContent = `${visibleCount} products`;
    
    // Show/hide empty state
    if (visibleCount === 0) {
        DOM.emptyState?.classList.remove('hidden');
    } else {
        DOM.emptyState?.classList.add('hidden');
    }
    
    // Update filter badge
    updateFilterBadge();
}

function sortProducts() {
    const grid = DOM.productsGrid;
    const visibleCards = Array.from(grid.querySelectorAll('.product-card:not(.hidden)'));
    
    visibleCards.sort((a, b) => {
        const productA = allProducts.find(p => p.id === parseInt(a.dataset.id));
        const productB = allProducts.find(p => p.id === parseInt(b.dataset.id));
        
        switch (filters.sort) {
            case 'price-low':
                return productA.price - productB.price;
            case 'price-high':
                return productB.price - productA.price;
            case 'discount':
                return productB.discount - productA.discount;
            default:
                return 0;
        }
    });
    
    // Reorder in DOM
    visibleCards.forEach(card => grid.appendChild(card));
}

function updateFilterBadge() {
    let activeFilters = 0;
    
    if (filters.minPrice > 0 || filters.maxPrice < Infinity) activeFilters++;
    if (filters.discount > 0) activeFilters++;
    if (filters.sort !== 'relevance') activeFilters++;
    if (!filters.inStockOnly) activeFilters++;
    
    if (DOM.filterBadge) {
        if (activeFilters > 0) {
            DOM.filterBadge.textContent = activeFilters;
            DOM.filterBadge.classList.remove('hidden');
        } else {
            DOM.filterBadge.classList.add('hidden');
        }
    }
}

function resetFilters() {
    selectedSubCategory = 'all';
    filters = {
        minPrice: 0,
        maxPrice: Infinity,
        discount: 0,
        inStockOnly: true,
        sort: 'relevance',
        search: ''
    };
    
    // Reset UI
    if (DOM.minPrice) DOM.minPrice.value = '';
    if (DOM.maxPrice) DOM.maxPrice.value = '';
    if (DOM.searchInput) DOM.searchInput.value = '';
    if (DOM.inStockOnly) DOM.inStockOnly.checked = true;
    
    // Reset radio buttons
    document.querySelectorAll('input[name="discount"]').forEach(radio => {
        radio.checked = radio.value === '0';
    });
    document.querySelectorAll('input[name="sort"]').forEach(radio => {
        radio.checked = radio.value === 'relevance';
    });
    
    // Reset subcategory selection
    document.querySelectorAll('.subcategory-item').forEach(item => {
        item.classList.toggle('active', item.dataset.subcategory === 'all');
    });
    
    applyFiltersAndRender();
    showToast('Filters reset');
}

// ==================== SUBCATEGORY SELECTION ====================
function selectSubcategory(subcategory) {
    selectedSubCategory = subcategory;
    
    // Update UI
    document.querySelectorAll('.subcategory-item').forEach(item => {
        item.classList.toggle('active', item.dataset.subcategory === subcategory);
    });
    
    applyFiltersAndRender();
    closeSidebar();
}

// ==================== UI FUNCTIONS ====================
function showToast(message, type = 'success') {
    if (!DOM.toast || !DOM.toastMessage) return;
    
    DOM.toastMessage.textContent = message;
    DOM.toast.className = 'toast show' + (type === 'error' ? ' error' : '');
    
    const icon = DOM.toast.querySelector('i');
    if (icon) {
        icon.className = type === 'error' ? 'fas fa-times-circle' : 'fas fa-check-circle';
    }
    
    setTimeout(() => {
        DOM.toast.classList.remove('show');
    }, 2500);
}

function openFilterPopup() {
    DOM.filterOverlay?.classList.add('show');
    DOM.filterPopup?.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeFilterPopup() {
    DOM.filterOverlay?.classList.remove('show');
    DOM.filterPopup?.classList.remove('show');
    document.body.style.overflow = '';
}

function toggleSidebar() {
    DOM.sidebar?.classList.toggle('show');
    DOM.sidebarOverlay?.classList.toggle('show');
    document.body.style.overflow = DOM.sidebar?.classList.contains('show') ? 'hidden' : '';
}

function closeSidebar() {
    DOM.sidebar?.classList.remove('show');
    DOM.sidebarOverlay?.classList.remove('show');
    document.body.style.overflow = '';
}

function goBack() {
    if (document.referrer && document.referrer.includes(window.location.host)) {
        window.history.back();
    } else {
        window.location.href = 'index.html';
    }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Back button
    DOM.backBtn?.addEventListener('click', goBack);
    
    // Search toggle
    DOM.searchToggle?.addEventListener('click', () => {
        DOM.searchBarContainer?.classList.toggle('show');
        if (DOM.searchBarContainer?.classList.contains('show')) {
            DOM.searchInput?.focus();
        }
    });
    
    // Search input
    DOM.searchInput?.addEventListener('input', debounce(function() {
        filters.search = this.value.trim();
        DOM.clearSearch?.classList.toggle('show', filters.search.length > 0);
        applyFiltersAndRender();
    }, 300));
    
    // Clear search
    DOM.clearSearch?.addEventListener('click', () => {
        DOM.searchInput.value = '';
        filters.search = '';
        DOM.clearSearch.classList.remove('show');
        applyFiltersAndRender();
    });
    
    // Filter toggle
    DOM.filterToggle?.addEventListener('click', openFilterPopup);
    
    // Filter close
    DOM.filterCloseBtn?.addEventListener('click', closeFilterPopup);
    DOM.filterOverlay?.addEventListener('click', closeFilterPopup);
    
    // Apply filters
    DOM.applyFiltersBtn?.addEventListener('click', () => {
        // Get values from popup
        filters.minPrice = parseFloat(DOM.minPrice?.value) || 0;
        filters.maxPrice = parseFloat(DOM.maxPrice?.value) || Infinity;
        filters.inStockOnly = DOM.inStockOnly?.checked ?? true;
        
        // Get discount radio
        const discountRadio = document.querySelector('input[name="discount"]:checked');
        filters.discount = parseInt(discountRadio?.value) || 0;
        
        // Get sort radio
        const sortRadio = document.querySelector('input[name="sort"]:checked');
        filters.sort = sortRadio?.value || 'relevance';
        
        applyFiltersAndRender();
        closeFilterPopup();
        showToast('Filters applied');
    });
    
    // Clear filters
    DOM.clearFiltersBtn?.addEventListener('click', () => {
        resetFilters();
        closeFilterPopup();
    });
    
    DOM.resetFiltersBtn?.addEventListener('click', resetFilters);
    
    // Subcategory clicks
    document.querySelectorAll('.subcategory-item').forEach(item => {
        item.addEventListener('click', function() {
            selectSubcategory(this.dataset.subcategory);
        });
    });
    
    // Mobile category button
    DOM.mobileCategoryBtn?.addEventListener('click', toggleSidebar);
    
    // Sidebar overlay
    DOM.sidebarOverlay?.addEventListener('click', closeSidebar);
    
    // Wishlist buttons
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = this.closest('.product-card');
            if (card) {
                toggleWishlist(parseInt(card.dataset.id));
            }
        });
    });
    
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const card = this.closest('.product-card');
            if (card) {
                addToCart(parseInt(card.dataset.id));
            }
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeFilterPopup();
            closeSidebar();
            DOM.searchBarContainer?.classList.remove('show');
        }
    });
    
    // Handle image errors
    document.querySelectorAll('.product-image').forEach(img => {
        img.addEventListener('error', function() {
            this.src = 'https://via.placeholder.com/200x200?text=Product';
        });
    });
}

// ==================== UTILITY FUNCTIONS ====================
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// ==================== CONSOLE LOG ====================
console.log('%c🛒 FreshMart Category Page', 'color: #2e7d32; font-size: 16px; font-weight: bold;');