
// ==================== FRESHMART JAVASCRIPT ====================
// Main JavaScript file for FreshMart Online Grocery Store
// Firebase Authentication Integration

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

// Initialize Firebase (if not already initialized)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();

// ==================== PRODUCT DATA ====================
/*const products = [
    {
        id: 1,
        name: "Fresh Red Apples",
        category: "fruits",
        price: 149,
        originalPrice: 199,
        weight: "1 kg",
        image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400",
        discount: 25,
        inStock: true
    },
    {
        id: 2,
        name: "Organic Bananas",
        category: "fruits",
        price: 49,
        originalPrice: 60,
        weight: "1 dozen",
        image: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400",
        discount: 18,
        inStock: true
    },
    {
        id: 3,
        name: "Fresh Tomatoes",
        category: "vegetables",
        price: 35,
        originalPrice: 45,
        weight: "500 g",
        image: "https://i0.wp.com/images-prod.healthline.com/hlcmsresource/images/AN_images/tomatoes-1296x728-feature.jpg?w=1155&h=15280",
        discount: 22,
        inStock: true
    },
    {
        id: 4,
        name: "Green Spinach",
        category: "vegetables",
        price: 25,
        originalPrice: 30,
        weight: "250 g",
        image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400",
        discount: 17,
        inStock: true
    },
    {
        id: 5,
        name: "Farm Fresh Milk",
        category: "dairy",
        price: 62,
        originalPrice: 68,
        weight: "1 L",
        image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400",
        discount: 9,
        inStock: true
    },
    {
        id: 6,
        name: "Organic Eggs",
        category: "dairy",
        price: 89,
        originalPrice: 110,
        weight: "12 pcs",
        image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400",
        discount: 19,
        inStock: true
    },
    {
        id: 7,
        name: "Whole Wheat Bread",
        category: "bakery",
        price: 45,
        originalPrice: 55,
        weight: "400 g",
        image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
        discount: 18,
        inStock: true
    },
    {
        id: 8,
        name: "Fresh Orange Juice",
        category: "beverages",
        price: 120,
        originalPrice: 150,
        weight: "1 L",
        image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400",
        discount: 20,
        inStock: true
    },
    {
        id: 9,
        name: "Potato Chips",
        category: "snacks",
        price: 30,
        originalPrice: 35,
        weight: "150 g",
        image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400",
        discount: 14,
        inStock: true
    },
    {
        id: 10,
        name: "Chicken Breast",
        category: "meat",
        price: 280,
        originalPrice: 350,
        weight: "500 g",
        image: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400",
        discount: 20,
        inStock: true
    },
    {
        id: 11,
        name: "Frozen Peas",
        category: "frozen",
        price: 85,
        originalPrice: 100,
        weight: "500 g",
        image: "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=400",
        discount: 15,
        inStock: true
    },
    {
        id: 12,
        name: "Greek Yogurt",
        category: "dairy",
        price: 75,
        originalPrice: 90,
        weight: "400 g",
        image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400",
        discount: 17,
        inStock: true
    },
    {
        id: 13,
        name: "Fresh Mangoes",
        category: "fruits",
        price: 199,
        originalPrice: 250,
        weight: "1 kg",
        image: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400",
        discount: 20,
        inStock: true
    },
    {
        id: 14,
        name: "Broccoli",
        category: "vegetables",
        price: 65,
        originalPrice: 80,
        weight: "500 g",
        image: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400",
        discount: 19,
        inStock: true
    },
    {
        id: 15,
        name: "Chocolate Cookies",
        category: "snacks",
        price: 55,
        originalPrice: 70,
        weight: "200 g",
        image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400",
        discount: 21,
        inStock: true
    },
    {
        id: 16,
        name: "Green Tea",
        category: "beverages",
        price: 180,
        originalPrice: 220,
        weight: "100 bags",
        image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400",
        discount: 18,
        inStock: true
    }
];*/

// ==================== TRANSLATION DATA ====================
const translations = {
    en: {
        searchPlaceholder: "Search for groceries...",
        deliverTo: "Deliver to",
        selectLocation: "Select Location",
        loginSignup: "Login/Signup",
        cart: "Cart",
        shopByCategory: "Shop by Category",
        browseCategories: "Browse through our wide range of categories",
        featuredProducts: "Featured Products",
        bestQuality: "Best quality groceries at best prices",
        addToCart: "Add",
        todaysBestDeals: "Today's Best Deals",
        dontMissOut: "Don't miss out on these amazing offers",
        whyChoose: "Why Choose FreshMart?",
        committed: "We're committed to bringing you the best shopping experience",
        freshProducts: "100% Fresh Products",
        expressDelivery: "Express Delivery",
        bestPrices: "Best Prices",
        support: "24/7 Support",
        myCart: "My Cart",
        items: "items",
        emptyCart: "Your cart is empty",
        addItems: "Add items to get started",
        subtotal: "Subtotal",
        deliveryFee: "Delivery Fee",
        discount: "Discount",
        total: "Total",
        checkout: "Proceed to Checkout",
        welcome: "Welcome to FreshMart",
        loginContinue: "Login or Signup to continue",
        fullName: "Full Name",
        emailAddress: "Email Address",
        deliveryAddress: "Delivery Address",
        saveAndContinue: "Save & Continue",
        selectDeliveryLocation: "Select Delivery Location",
        detectLocation: "Detect my location",
        enterAddress: "Enter your address",
        pincode: "Pincode",
        saveLocation: "Save Location",
        editProfile: "Edit Profile",
        myOrders: "My Orders",
        noOrders: "No orders yet",
        logout: "Logout"
    },
    hi: {
        searchPlaceholder: "किराना खोजें...",
        deliverTo: "यहाँ डिलीवर करें",
        selectLocation: "स्थान चुनें",
        loginSignup: "लॉगिन/साइनअप",
        cart: "कार्ट",
        shopByCategory: "श्रेणी के अनुसार खरीदारी करें",
        browseCategories: "हमारी विस्तृत श्रेणियों को ब्राउज़ करें",
        featuredProducts: "विशेष उत्पाद",
        bestQuality: "सर्वोत्तम मूल्यों पर सर्वोत्तम गुणवत्ता",
        addToCart: "जोड़ें",
        todaysBestDeals: "आज के सर्वश्रेष्ठ सौदे",
        dontMissOut: "इन शानदार ऑफर्स को न चूकें",
        whyChoose: "FreshMart क्यों चुनें?",
        committed: "हम आपको सर्वोत्तम खरीदारी अनुभव देने के लिए प्रतिबद्ध हैं",
        freshProducts: "100% ताज़ा उत्पाद",
        expressDelivery: "एक्सप्रेस डिलीवरी",
        bestPrices: "सर्वोत्तम मूल्य",
        support: "24/7 सहायता",
        myCart: "मेरी कार्ट",
        items: "आइटम",
        emptyCart: "आपकी कार्ट खाली है",
        addItems: "शुरू करने के लिए आइटम जोड़ें",
        subtotal: "उप-योग",
        deliveryFee: "डिलीवरी शुल्क",
        discount: "छूट",
        total: "कुल",
        checkout: "चेकआउट करें",
        welcome: "FreshMart में आपका स्वागत है",
        loginContinue: "जारी रखने के लिए लॉगिन या साइनअप करें",
        fullName: "पूरा नाम",
        emailAddress: "ईमेल पता",
        deliveryAddress: "डिलीवरी पता",
        saveAndContinue: "सहेजें और जारी रखें",
        selectDeliveryLocation: "डिलीवरी स्थान चुनें",
        detectLocation: "मेरा स्थान पता लगाएं",
        enterAddress: "अपना पता दर्ज करें",
        pincode: "पिनकोड",
        saveLocation: "स्थान सहेजें",
        editProfile: "प्रोफ़ाइल संपादित करें",
        myOrders: "मेरे ऑर्डर",
        noOrders: "अभी तक कोई ऑर्डर नहीं",
        logout: "लॉगआउट"
    },
    te: {
        searchPlaceholder: "కిరాణా కోసం వెతకండి...",
        deliverTo: "ఇక్కడ డెలివరీ చేయండి",
        selectLocation: "స్థానం ఎంచుకోండి",
        loginSignup: "లాగిన్/సైనప్",
        cart: "కార్ట్",
        shopByCategory: "వర్గం ద్వారా షాపింగ్ చేయండి",
        browseCategories: "మా విస్తృత వర్గాలను బ్రౌజ్ చేయండి",
        featuredProducts: "ఫీచర్డ్ ఉత్పత్తులు",
        bestQuality: "ఉత్తమ ధరలకు ఉత్తమ నాణ్యత",
        addToCart: "జోడించు",
        myCart: "నా కార్ట్",
        items: "ఐటెమ్స్",
        emptyCart: "మీ కార్ట్ ఖాళీగా ఉంది",
        checkout: "చెక్అవుట్ కొనసాగించండి"
    },
    ta: {
        searchPlaceholder: "மளிகை தேடுங்கள்...",
        deliverTo: "இங்கே டெலிவரி",
        selectLocation: "இடத்தைத் தேர்ந்தெடுக்கவும்",
        loginSignup: "உள்நுழை/பதிவு செய்",
        cart: "கார்ட்",
        shopByCategory: "வகை வாரியாக ஷாப்பிங்",
        browseCategories: "எங்கள் பரந்த வகைகளை உலாவுங்கள்",
        featuredProducts: "சிறப்பு தயாரிப்புகள்",
        bestQuality: "சிறந்த விலையில் சிறந்த தரம்",
        addToCart: "சேர்",
        myCart: "என் கார்ட்",
        items: "பொருட்கள்",
        emptyCart: "உங்கள் கார்ட் காலியாக உள்ளது",
        checkout: "செக்அவுட் செய்யவும்"
    },
    es: {
        searchPlaceholder: "Buscar comestibles...",
        deliverTo: "Entregar a",
        selectLocation: "Seleccionar ubicación",
        loginSignup: "Iniciar sesión/Registrarse",
        cart: "Carrito",
        shopByCategory: "Comprar por categoría",
        browseCategories: "Explora nuestra amplia gama de categorías",
        featuredProducts: "Productos Destacados",
        bestQuality: "La mejor calidad a los mejores precios",
        addToCart: "Añadir",
        myCart: "Mi Carrito",
        items: "artículos",
        emptyCart: "Tu carrito está vacío",
        checkout: "Proceder al pago"
    },
    fr: {
        searchPlaceholder: "Rechercher des produits...",
        deliverTo: "Livrer à",
        selectLocation: "Sélectionner l'emplacement",
        loginSignup: "Connexion/Inscription",
        cart: "Panier",
        shopByCategory: "Acheter par catégorie",
        browseCategories: "Parcourez notre large gamme de catégories",
        featuredProducts: "Produits en Vedette",
        bestQuality: "La meilleure qualité aux meilleurs prix",
        addToCart: "Ajouter",
        myCart: "Mon Panier",
        items: "articles",
        emptyCart: "Votre panier est vide",
        checkout: "Passer à la caisse"
    }
};

// ==================== SEARCH SUGGESTIONS ====================
const searchSuggestions = [
    "🍎 Fresh Apples",
    "🥛 Farm Fresh Milk",
    "🍞 Whole Wheat Bread",
    "🥬 Organic Vegetables",
    "🧀 Dairy Products",
    "🍊 Juicy Oranges",
    "🥚 Free Range Eggs",
    "🍌 Organic Bananas"
];

// ==================== STATE MANAGEMENT ====================
let cart = [];
let wishlist = [];
let currentUser = null;
let currentLanguage = 'en';
let currentLocation = null;
let isFirebaseLoggedIn = false;
let allProducts = [];  // To hold all products for filtering/searching

// ==================== DOM ELEMENTS ====================
const DOM = {
    navbar: document.getElementById('navbar'),
    locationBtn: document.getElementById('locationBtn'),
    currentLocationSpan: document.getElementById('currentLocation'),
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    voiceBtn: document.getElementById('voiceBtn'),
    translateBtn: document.getElementById('translateBtn'),
    languageDropdown: document.getElementById('languageDropdown'),
    authBtn: document.getElementById('authBtn'),
    profileBtn: document.getElementById('profileBtn'),
    cartBtn: document.getElementById('cartBtn'),
    cartCount: document.getElementById('cartCount'),
    scrollingText: document.getElementById('scrollingText'),
    
    locationModal: document.getElementById('locationModal'),
    closeLocationModal: document.getElementById('closeLocationModal'),
    detectLocationBtn: document.getElementById('detectLocationBtn'),
    manualAddress: document.getElementById('manualAddress'),
    pincode: document.getElementById('pincode'),
    saveLocationBtn: document.getElementById('saveLocationBtn'),
    
    cartModal: document.getElementById('cartModal'),
    closeCartModal: document.getElementById('closeCartModal'),
    cartItemsCount: document.getElementById('cartItemsCount'),
    cartItems: document.getElementById('cartItems'),
    emptyCart: document.getElementById('emptyCart'),
    cartSummary: document.getElementById('cartSummary'),
    subtotal: document.getElementById('subtotal'),
    deliveryFee: document.getElementById('deliveryFee'),
    discount: document.getElementById('discount'),
    totalAmount: document.getElementById('totalAmount'),
    checkoutBtn: document.getElementById('checkoutBtn'),
    
    voiceModal: document.getElementById('voiceModal'),
    closeVoiceModal: document.getElementById('closeVoiceModal'),
    voiceStatus: document.getElementById('voiceStatus'),
    voiceResult: document.getElementById('voiceResult'),
    voiceAnimation: document.getElementById('voiceAnimation'),
    
    productsGrid: document.getElementById('productsGrid'),
    categoryCards: document.querySelectorAll('.category-card'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    shopNowBtn: document.getElementById('shopNowBtn'),
    offerBtns: document.querySelectorAll('.offer-btn')
};

// ==================== AUTH STATE MANAGEMENT ====================
auth.onAuthStateChanged((user) => {
    const currentPage = window.location.pathname;
    if (currentPage.includes('login.html') || currentPage.includes('signup.html')) {
        return;
    }
    
    if (user) {
        isFirebaseLoggedIn = true;
        console.log('✅ Firebase User logged in:', user.email);
        
        const savedUser = localStorage.getItem('freshmart_user');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
        } else {
            currentUser = {
                uid: user.uid,
                name: user.displayName || 'User',
                email: user.email,
                phone: '',
                photo: user.photoURL || ''
            };
            localStorage.setItem('freshmart_user', JSON.stringify(currentUser));
        }
        
        // Force immediate UI update
        requestAnimationFrame(() => {
            updateAuthUI();
            updateCartCount();
             loadWishlistState();
        });
        
        // Show welcome message if coming from login
        const referrer = document.referrer;
        if (referrer && (referrer.includes('login.html') || referrer.includes('signup.html'))) {
            setTimeout(() => {
                showToast(`Welcome, ${currentUser?.name || 'User'}!`, 'success');
            }, 300);
        }
        
    } else {
        isFirebaseLoggedIn = false;
        currentUser = null;
        console.log('❌ Firebase User not logged in');
        
        requestAnimationFrame(() => {
            updateAuthUI();
            updateCartCount();
        });
    }
});

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
    initScrollingText();
    parseProductsFromHTML(); // Parse products from existing HTML
    //renderProducts();
    bindHomeAddToCartButtons();
    updateProductButtons();
    updateCartCount();

    // Check auth state immediately on page load
    const user = auth.currentUser;
    if (user) {
        isFirebaseLoggedIn = true;
        const savedUser = localStorage.getItem('freshmart_user');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
        }
    }
    
    updateUI();
    updateAuthUI();
    setupEventListeners();
    
    console.log('FreshMart initialized successfully!');
});

// ==================== LOCAL STORAGE FUNCTIONS ====================
function loadFromLocalStorage() {
    try {
        const savedCart = localStorage.getItem('freshmart_cart');
        if (savedCart) cart = JSON.parse(savedCart);
        
        const savedWishlist = localStorage.getItem('freshmart_wishlist');
        if (savedWishlist) wishlist = JSON.parse(savedWishlist);
        
        const savedUser = localStorage.getItem('freshmart_user');
        if (savedUser) currentUser = JSON.parse(savedUser);
        
        const savedLocation = localStorage.getItem('freshmart_location');
        if (savedLocation) currentLocation = JSON.parse(savedLocation);
        
        const savedLanguage = localStorage.getItem('freshmart_language');
        if (savedLanguage) currentLanguage = savedLanguage;
    } catch (e) {
        console.error('Error loading from localStorage:', e);
    }
}

// ==================== PARSE PRODUCTS FROM HTML ====================
function parseProductsFromHTML() {
    allProducts = [];
    const productCards = document.querySelectorAll('.product-card[data-id]');
    
    productCards.forEach(card => {
        const product = {
            id: parseInt(card.dataset.id),
            name: card.dataset.name || card.querySelector('.product-name')?.textContent || 'Product',
            category: card.dataset.category || '',
            subcategory: card.dataset.subcategory || '',
            price: parseFloat(card.dataset.price) || 0,
            originalPrice: parseFloat(card.dataset.originalPrice) || parseFloat(card.dataset.price) || 0,
            weight: card.dataset.weight || '',
            discount: parseInt(card.dataset.discount) || 0,
            inStock: card.dataset.stock !== 'false',
            image: card.dataset.image || card.querySelector('.product-image')?.src || '',
            element: card
        };
        
        allProducts.push(product);
    });
    
    console.log('Parsed', allProducts.length, 'products from HTML');
}

function saveCartToLocalStorage() {
    localStorage.setItem('freshmart_cart', JSON.stringify(cart));
}

function saveWishlistToLocalStorage() {
    localStorage.setItem('freshmart_wishlist', JSON.stringify(wishlist));
}

function saveUserToLocalStorage() {
    localStorage.setItem('freshmart_user', JSON.stringify(currentUser));
}

function saveLocationToLocalStorage() {
    localStorage.setItem('freshmart_location', JSON.stringify(currentLocation));
}

function saveLanguageToLocalStorage() {
    localStorage.setItem('freshmart_language', currentLanguage);
}

// ==================== EVENT LISTENERS SETUP ====================
function setupEventListeners() {
    // Location button
    DOM.locationBtn?.addEventListener('click', openLocationModal);
    
    // Search
    DOM.searchBtn?.addEventListener('click', performSearch);
    DOM.searchInput?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performSearch();
    });
    
    // Voice search
    DOM.voiceBtn?.addEventListener('click', startVoiceSearch);
    
    // Language
    DOM.translateBtn?.addEventListener('click', toggleLanguageDropdown);
    document.querySelectorAll('.language-option').forEach(option => {
        option.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            changeLanguage(lang);
        });
    });
    
    // Auth button - go to login page
    DOM.authBtn?.addEventListener('click', () => {
        window.location.href = 'login.html';
    });
    
    // Profile button - go to profile page
    DOM.profileBtn?.addEventListener('click', () => {
        if (isFirebaseLoggedIn) {
            window.location.href = 'profile.html';
        } else {
            window.location.href = 'login.html';
        }
    });
    
    // Cart button - check login first
    DOM.cartBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        if (isFirebaseLoggedIn) {
            window.location.href = 'cart.html';
        } else {
            showToast('Please login to view your cart', 'info');
            setTimeout(() => {
                window.location.href = 'login.html?redirect=cart';
            }, 1000);
        }
    });
    
    // Location Modal
    DOM.closeLocationModal?.addEventListener('click', closeLocationModal);
    DOM.detectLocationBtn?.addEventListener('click', detectLocation);
    DOM.saveLocationBtn?.addEventListener('click', saveLocation);
    DOM.pincode?.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    });
    
    // Cart Modal
    DOM.closeCartModal?.addEventListener('click', closeCartModal);
    DOM.checkoutBtn?.addEventListener('click', checkout);
    
    // Voice Modal
    DOM.closeVoiceModal?.addEventListener('click', closeVoiceModal);
    
    // Category Cards
    DOM.categoryCards.forEach(card => {
        card.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            filterByCategory(category);
        });
    });
    
    // Hero Section
    DOM.shopNowBtn?.addEventListener('click', function() {
        document.getElementById('productsSection')?.scrollIntoView({ behavior: 'smooth' });
    });
    
    // Offer Buttons
    DOM.offerBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('productsSection')?.scrollIntoView({ behavior: 'smooth' });
        });
    });
    
    // Modal Close on Outside Click
    window.addEventListener('click', function(e) {
        if (e.target === DOM.locationModal) closeLocationModal();
        if (e.target === DOM.cartModal) closeCartModal();
        if (e.target === DOM.voiceModal) closeVoiceModal();
        
        if (!e.target.closest('.translate-btn') && !e.target.closest('.language-dropdown')) {
            DOM.languageDropdown?.classList.remove('show');
        }
    });
    
    // Navbar Scroll Effect
    window.addEventListener('scroll', function() {
        if (DOM.navbar) {
            if (window.scrollY > 100) {
                DOM.navbar.style.background = 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)';
            } else {
                DOM.navbar.style.background = 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)';
            }
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeLocationModal();
            closeCartModal();
            closeVoiceModal();
            DOM.languageDropdown?.classList.remove('show');
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            DOM.searchInput?.focus();
        }
    });
}

// ==================== AUTH UI FUNCTIONS ====================
function updateAuthUI() {
    if (isFirebaseLoggedIn && currentUser) {
        // User is logged in - hide login, show profile
        if (DOM.authBtn) {
            DOM.authBtn.style.display = 'none';
            DOM.authBtn.classList.add('hidden');
        }
        if (DOM.profileBtn) {
            DOM.profileBtn.style.display = 'flex';
            DOM.profileBtn.classList.remove('hidden');
        }
        console.log('🔄 UI Updated: Profile button visible');
    } else {
        // User is not logged in - show login, hide profile
        if (DOM.authBtn) {
            DOM.authBtn.style.display = 'flex';
            DOM.authBtn.classList.remove('hidden');
        }
        if (DOM.profileBtn) {
            DOM.profileBtn.style.display = 'none';
            DOM.profileBtn.classList.add('hidden');
        }
        console.log('🔄 UI Updated: Login button visible');
    }
}

function logout() {
    auth.signOut().then(() => {
        localStorage.removeItem('freshmart_user');
        localStorage.removeItem('freshmart_address');
        currentUser = null;
        isFirebaseLoggedIn = false;
        updateAuthUI();
        showToast('Logged out successfully!');
    }).catch((error) => {
        console.error('Logout error:', error);
        showToast('Error logging out', 'error');
    });
}

// ==================== SCROLLING TEXT ====================
function initScrollingText() {
    const text = searchSuggestions.join('   •   ');
    if (DOM.scrollingText) {
        DOM.scrollingText.textContent = text + '   •   ' + text;
    }
}

// ==================== PRODUCT FUNCTIONS ====================
function renderProducts(productsToRender = products) {
    if (!DOM.productsGrid) return;
    
    DOM.productsGrid.innerHTML = '';
    
    productsToRender.forEach(product => {
        const productCard = createProductCard(product);
        DOM.productsGrid.appendChild(productCard);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-id', product.id);
    
    const isInWishlist = wishlist.includes(product.id);
    const cartItem = cart.find(item => item.id === product.id);
    
    card.innerHTML = `
        ${product.discount > 0 ? `<span class="product-badge">${product.discount}% OFF</span>` : ''}
        <button class="wishlist-btn ${isInWishlist ? 'active' : ''}" data-id="${product.id}">
            <i class="${isInWishlist ? 'fas' : 'far'} fa-heart"></i>
        </button>
        <img src="${product.image}" alt="${product.name}" class="product-image">
        <div class="product-info">
            <span class="product-category">${product.category}</span>
            <h3 class="product-name">${product.name}</h3>
            <span class="product-weight">${product.weight}</span>
            <div class="product-price-row">
                <div class="product-price">
                    <span class="current-price">₹${product.price}</span>
                    ${product.originalPrice > product.price ? `<span class="original-price">₹${product.originalPrice}</span>` : ''}
                </div>
                ${cartItem ? `
                    <div class="quantity-controls">
                        <button class="quantity-btn minus" data-id="${product.id}">-</button>
                        <span class="quantity">${cartItem.quantity}</span>
                        <button class="quantity-btn plus" data-id="${product.id}">+</button>
                    </div>
                ` : `
                    <button class="add-to-cart" data-id="${product.id}">${translations[currentLanguage].addToCart || 'Add'}</button>
                `}
            </div>
        </div>
    `;
    
    // Event listeners
    const wishlistBtn = card.querySelector('.wishlist-btn');
    wishlistBtn?.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleWishlist(product.id);
    });
    
    const addToCartBtn = card.querySelector('.add-to-cart');
    addToCartBtn?.addEventListener('click', function(e) {
        e.stopPropagation();
        addToCart(product.id);
    });
    
    const minusBtn = card.querySelector('.quantity-btn.minus');
    minusBtn?.addEventListener('click', function(e) {
        e.stopPropagation();
        decreaseQuantity(product.id);
    });
    
    const plusBtn = card.querySelector('.quantity-btn.plus');
    plusBtn?.addEventListener('click', function(e) {
        e.stopPropagation();
        increaseQuantity(product.id);
    });
    
    return card;
}

function filterByCategory(category) {
    const filteredProducts = products.filter(product => product.category === category);
    renderProducts(filteredProducts);
    document.getElementById('productsSection')?.scrollIntoView({ behavior: 'smooth' });
    showToast(`Showing ${category} products`);
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
    
    saveCartToLocalStorage();
    updateCartCount();
    updateProductButtons();
    showToast(`${product.name} added to cart`);
}

function increaseQuantity(productId) {
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
        cartItem.quantity += 1;
        saveCartToLocalStorage();
        updateCartCount();
        updateProductButtons();
        const product = allProducts.find(p => p.id === productId);
        showToast(`${product?.name || 'Item'} quantity: ${cartItem.quantity}`);
    }
}

function decreaseQuantity(productId) {
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
        cartItem.quantity -= 1;
        
        // If quantity is 0 or less, remove from cart
        if (cartItem.quantity <= 0) {
            cart = cart.filter(item => item.id !== productId);
            const product = allProducts.find(p => p.id === productId);
            showToast(`${product?.name || 'Item'} removed from cart`);
        } else {
            const product = allProducts.find(p => p.id === productId);
            showToast(`${product?.name || 'Item'} quantity: ${cartItem.quantity}`);
        }
        
        saveCartToLocalStorage();
        updateCartCount();
        updateProductButtons();
    }
}

function removeFromCart(productId) {
    const product = products.find(p => p.id === productId);
    cart = cart.filter(item => item.id !== productId);
    
    saveCartToLocalStorage();
    updateCartCount();
    //renderProducts();
    updateProductButtons();
    renderCartItems();
    
    if (product) showToast(`${product.name} removed from cart`);
}

function updateCartCount() {
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (DOM.cartCount) {
        DOM.cartCount.textContent = totalQty;
        DOM.cartCount.style.display = totalQty > 0 ? 'flex' : 'none';
    }
}

function renderCartItems() {
    if (!DOM.cartItems) return;
    
    if (cart.length === 0) {
        DOM.emptyCart?.classList.remove('hidden');
        DOM.cartSummary?.classList.add('hidden');
        DOM.cartItems.innerHTML = '';
        if (DOM.cartItemsCount) DOM.cartItemsCount.textContent = '0 items';
        return;
    }
    
    DOM.emptyCart?.classList.add('hidden');
    DOM.cartSummary?.classList.remove('hidden');
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (DOM.cartItemsCount) DOM.cartItemsCount.textContent = `${totalItems} items`;
    
    DOM.cartItems.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
            <img src="${item.image}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-details">
                <h4 class="cart-item-name">${item.name}</h4>
                <span class="cart-item-weight">${item.weight || ''}</span>
                <div class="cart-item-price">₹${item.price}</div>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-controls">
                    <button class="quantity-btn minus" onclick="decreaseQuantity(${item.id})">-</button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="quantity-btn plus" onclick="increaseQuantity(${item.id})">+</button>
                </div>
                <button class="remove-item" onclick="removeFromCart(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    updateCartSummary();
}

function updateCartSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = subtotal > 500 ? 0 : 40;
    const discount = cart.reduce((sum, item) => {
        const product = products.find(p => p.id === item.id);
        if (product && product.originalPrice > product.price) {
            return sum + ((product.originalPrice - product.price) * item.quantity);
        }
        return sum;
    }, 0);
    const total = subtotal + deliveryFee;
    
    if (DOM.subtotal) DOM.subtotal.textContent = `₹${subtotal}`;
    if (DOM.deliveryFee) DOM.deliveryFee.textContent = deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`;
    if (DOM.discount) DOM.discount.textContent = `-₹${discount}`;
    if (DOM.totalAmount) DOM.totalAmount.textContent = `₹${total}`;
}

function bindHomeAddToCartButtons() {
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const card = this.closest('.product-card');
            const productId = parseInt(card.dataset.id);
            addToCart(productId);
        });
    });
}

function updateProductButtons() {
    document.querySelectorAll('.product-card').forEach(card => {
        const productId = parseInt(card.dataset.id);
        const row = card.querySelector('.product-price-row');
        if (!row) return;

        // ✅ KEEP price intact
        let actionArea = row.querySelector('.add-to-cart-btn, .quantity-controls');

        const cartItem = cart.find(item => item.id === productId);

        if (cartItem) {
            if (!row.querySelector('.quantity-controls')) {
                if (actionArea) actionArea.remove();

                row.insertAdjacentHTML('beforeend', `
                    <div class="quantity-controls">
                        <button class="quantity-btn minus" data-id="${productId}">-</button>
                        <span class="quantity">${cartItem.quantity}</span>
                        <button class="quantity-btn plus" data-id="${productId}">+</button>
                    </div>
                `);
            } else {
                row.querySelector('.quantity').textContent = cartItem.quantity;
            }
        } else {
            if (!row.querySelector('.add-to-cart-btn')) {
                if (actionArea) actionArea.remove();

                row.insertAdjacentHTML('beforeend', `
                    <button class="add-to-cart-btn">ADD</button>
                `);
            }
        }
    });

    bindHomeAddToCartButtons();
    bindQuantityButtons();
}


function bindQuantityButtons() {
    document.querySelectorAll('.quantity-btn.minus').forEach(btn => {
        btn.addEventListener('click', function () {
            const productId = parseInt(this.dataset.id);
            decreaseQuantity(productId);
        });
    });

    document.querySelectorAll('.quantity-btn.plus').forEach(btn => {
        btn.addEventListener('click', function () {
            const productId = parseInt(this.dataset.id);
            increaseQuantity(productId);
        });
    });
}




// ==================== WISHLIST FUNCTIONS ====================
// Replace your existing toggleWishlist function with this:
function toggleWishlist(productId) {
    if (!isFirebaseLoggedIn) {
        showToast('Please login to add to wishlist', 'info');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
        return;
    }
    
    toggleWishlistFirestore(productId);
}
// ==================== SEARCH FUNCTIONS ====================
function performSearch() {
    const searchTerm = DOM.searchInput?.value.trim().toLowerCase();
    
    if (!searchTerm) {
        renderProducts(filteredProducts);
        return;
    }
    
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm)
    );
    
    if (filteredProducts.length === 0) {
        if (DOM.productsGrid) {
            DOM.productsGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 50px;">
                    <i class="fas fa-search" style="font-size: 3rem; color: #ccc; margin-bottom: 20px;"></i>
                    <p style="font-size: 1.2rem; color: #666;">No products found for "${searchTerm}"</p>
                </div>
            `;
        }
    } else {
        renderProducts(filteredProducts);
    }
    
    document.getElementById('productsSection')?.scrollIntoView({ behavior: 'smooth' });
}

// ==================== VOICE SEARCH FUNCTIONS ====================
function startVoiceSearch() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        showToast('Voice search is not supported in your browser');
        return;
    }
    
    openVoiceModal();
    
    const recognition = new SpeechRecognition();
    recognition.lang = currentLanguage === 'hi' ? 'hi-IN' : 
                       currentLanguage === 'te' ? 'te-IN' :
                       currentLanguage === 'ta' ? 'ta-IN' :
                       currentLanguage === 'es' ? 'es-ES' :
                       currentLanguage === 'fr' ? 'fr-FR' : 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = function() {
        if (DOM.voiceStatus) DOM.voiceStatus.textContent = 'Listening...';
        if (DOM.voiceResult) DOM.voiceResult.textContent = '';
        DOM.voiceAnimation?.classList.add('active');
    };
    
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        if (DOM.voiceResult) DOM.voiceResult.textContent = transcript;
        
        if (event.results[0].isFinal) {
            if (DOM.searchInput) DOM.searchInput.value = transcript;
            setTimeout(() => {
                closeVoiceModal();
                performSearch();
            }, 1000);
        }
    };
    
    recognition.onerror = function(event) {
        if (DOM.voiceStatus) DOM.voiceStatus.textContent = 'Error: ' + event.error;
        setTimeout(closeVoiceModal, 2000);
    };
    
    recognition.onend = function() {
        DOM.voiceAnimation?.classList.remove('active');
        if (DOM.voiceResult && !DOM.voiceResult.textContent) {
            if (DOM.voiceStatus) DOM.voiceStatus.textContent = 'No speech detected. Try again.';
            setTimeout(closeVoiceModal, 2000);
        }
    };
    
    recognition.start();
}

// ==================== LANGUAGE FUNCTIONS ====================
function toggleLanguageDropdown() {
    DOM.languageDropdown?.classList.toggle('show');
}

function changeLanguage(lang) {
    currentLanguage = lang;
    saveLanguageToLocalStorage();
    
    const t = translations[lang];
    
    if (t.searchPlaceholder && DOM.searchInput) DOM.searchInput.placeholder = t.searchPlaceholder;
    if (t.selectLocation && !currentLocation && DOM.currentLocationSpan) {
        DOM.currentLocationSpan.textContent = t.selectLocation;
    }
    
    const categoryHeader = document.querySelector('#categoriesSection .section-header');
    if (categoryHeader && t.shopByCategory) {
        const h2 = categoryHeader.querySelector('h2');
        const p = categoryHeader.querySelector('p');
        if (h2) h2.textContent = t.shopByCategory;
        if (p) p.textContent = t.browseCategories;
    }
    
    const productsHeader = document.querySelector('#productsSection .section-header');
    if (productsHeader && t.featuredProducts) {
        const h2 = productsHeader.querySelector('h2');
        const p = productsHeader.querySelector('p');
        if (h2) h2.textContent = t.featuredProducts;
        if (p) p.textContent = t.bestQuality;
    }
    
    updateProductButtons(); // ✅ ADD

    DOM.languageDropdown?.classList.remove('show');
    showToast(`Language changed to ${lang.toUpperCase()}`);
}

// ==================== LOCATION MODAL FUNCTIONS ====================
function openLocationModal() {
    DOM.locationModal?.classList.add('show');
}

function closeLocationModal() {
    DOM.locationModal?.classList.remove('show');
}

function detectLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser');
        return;
    }
    
    if (DOM.detectLocationBtn) {
        DOM.detectLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detecting...';
        DOM.detectLocationBtn.disabled = true;
    }
    
    navigator.geolocation.getCurrentPosition(
        async function(position) {
            const { latitude, longitude } = position.coords;
            
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                );
                const data = await response.json();
                
                const address = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                const pincode = data.address?.postcode || '';
                
                if (DOM.manualAddress) DOM.manualAddress.value = address;
                if (DOM.pincode) DOM.pincode.value = pincode;
                
                showToast('Location detected successfully!');
            } catch (error) {
                if (DOM.manualAddress) {
                    DOM.manualAddress.value = `Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)}`;
                }
                showToast('Location detected!');
            }
            
            if (DOM.detectLocationBtn) {
                DOM.detectLocationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Detect my location';
                DOM.detectLocationBtn.disabled = false;
            }
        },
        function(error) {
            let message = 'Unable to detect location';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    message = 'Location permission denied';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message = 'Location information unavailable';
                    break;
                case error.TIMEOUT:
                    message = 'Location request timed out';
                    break;
            }
            showToast(message);
            if (DOM.detectLocationBtn) {
                DOM.detectLocationBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Detect my location';
                DOM.detectLocationBtn.disabled = false;
            }
        }
    );
}

function saveLocation() {
    const address = DOM.manualAddress?.value.trim();
    const pincode = DOM.pincode?.value.trim();
    
    if (!address) {
        showToast('Please enter an address');
        return;
    }
    
    currentLocation = { address, pincode };
    saveLocationToLocalStorage();
    
    const shortAddress = address.length > 20 ? address.substring(0, 20) + '...' : address;
    if (DOM.currentLocationSpan) DOM.currentLocationSpan.textContent = shortAddress;
    
    closeLocationModal();
    showToast('Location saved successfully!');
}

// ==================== CART MODAL FUNCTIONS ====================
function openCartModal() {
    renderCartItems();
    DOM.cartModal?.classList.add('show');
}

function closeCartModal() {
    DOM.cartModal?.classList.remove('show');
}

function checkout() {
    if (cart.length === 0) {
        showToast('Your cart is empty!');
        return;
    }
    
    if (!isFirebaseLoggedIn) {
        closeCartModal();
        showToast('Please login to continue');
        setTimeout(() => {
            window.location.href = 'login.html?redirect=cart';
        }, 1000);
        return;
    }
    
    if (!currentLocation) {
        closeCartModal();
        openLocationModal();
        showToast('Please select a delivery location');
        return;
    }
    
    // Redirect to cart page for checkout
    window.location.href = 'cart.html';
}

// ==================== VOICE MODAL FUNCTIONS ====================
function openVoiceModal() {
    DOM.voiceModal?.classList.add('show');
    if (DOM.voiceStatus) DOM.voiceStatus.textContent = 'Listening...';
    if (DOM.voiceResult) DOM.voiceResult.textContent = '';
}

function closeVoiceModal() {
    DOM.voiceModal?.classList.remove('show');
}

// ==================== TOAST NOTIFICATION ====================
function showToast(message, type = 'success') {
    if (!DOM.toastMessage || !DOM.toast) return;
    
    DOM.toastMessage.textContent = message;
    
    const icon = DOM.toast.querySelector('i');
    if (icon) {
        icon.className = type === 'error' ? 'fas fa-times-circle' :
                         type === 'info' ? 'fas fa-info-circle' :
                         'fas fa-check-circle';
    }
    
    DOM.toast.style.background = type === 'error' ? '#e53935' :
                                  type === 'info' ? '#1976d2' :
                                  '#2e7d32';
    
    DOM.toast.classList.add('show');
    
    setTimeout(() => {
        DOM.toast.classList.remove('show');
    }, 3000);
}

// ==================== UI UPDATE FUNCTIONS ====================
function updateUI() {
    updateCartCount();
    
    if (currentLocation && DOM.currentLocationSpan) {
        const shortAddress = currentLocation.address.length > 20 
            ? currentLocation.address.substring(0, 20) + '...' 
            : currentLocation.address;
        DOM.currentLocationSpan.textContent = shortAddress;
    }
}

// ==================== UTILITY FUNCTIONS ====================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Scroll shadow effect
window.addEventListener('scroll', debounce(function() {
    if (DOM.navbar) {
        DOM.navbar.style.boxShadow = window.scrollY > 50 
            ? '0 4px 20px rgba(0, 0, 0, 0.15)' 
            : '0 4px 12px rgba(0, 0, 0, 0.15)';
    }
}, 10));

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        target?.scrollIntoView({ behavior: 'smooth' });
    });
});

// Scroll animations
function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.category-card, .product-card, .why-us-card, .offer-card');
    
    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        animationObserver.observe(el);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initScrollAnimations, 100);
});

// Console message
console.log('%c🥬 FreshMart - Your Online Grocery Store 🛒', 
    'color: #2e7d32; font-size: 20px; font-weight: bold;');
console.log('%cBuilt with ❤️ for fresh groceries delivery', 
    'color: #666; font-size: 12px;');
