/**
 * FreshMart API Client
 * Connects frontend to FastAPI backend
 */
const API_BASE = "https://freshmart-2-sltg.onrender.com";


// Storage keys
const STORAGE_KEYS = {
    TOKEN: 'freshmart_token',
    USER: 'freshmart_user',
    CART: 'freshmart_cart',
    WISHLIST: 'freshmart_wishlist'
};

/**
 * API Client Class
 */
class FreshMartAPI {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    }

    // Get headers with auth token
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    // Generic fetch wrapper
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    // Set auth token
    setToken(token) {
        this.token = token;
        localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    }

    // Clear auth
    clearAuth() {
        this.token = null;
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
    }

    // ==================== AUTH ====================

    async register(name, email, phone, password) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, phone, password })
        });
        this.setToken(data.access_token);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
        return data;
    }

    async login(email, phone, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, phone, password })
        });
        this.setToken(data.access_token);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
        return data;
    }

    async sendOTP(phone) {
        return await this.request('/auth/send-otp', {
            method: 'POST',
            body: JSON.stringify({ phone })
        });
    }

    async verifyOTP(phone, otp) {
        const data = await this.request('/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ phone, otp })
        });
        this.setToken(data.access_token);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
        return data;
    }

    logout() {
        this.clearAuth();
        window.location.href = '/index.html';
    }

    // ==================== USER ====================

    async getProfile() {
        return await this.request('/users/me');
    }

    async updateProfile(data) {
        return await this.request('/users/me', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async getStats() {
        return await this.request('/users/me/stats');
    }

    // ==================== PRODUCTS ====================

    async getProducts(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/products?${queryString}`);
    }

    async getFeaturedProducts(limit = 20) {
        return await this.request(`/products/featured?limit=${limit}`);
    }

    async getProduct(id) {
        return await this.request(`/products/${id}`);
    }

    async getCategories() {
        return await this.request('/products/categories');
    }

    // ==================== CART ====================

    async getCart() {
        return await this.request('/cart');
    }

    async addToCart(productId, quantity = 1) {
        return await this.request('/cart/add', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId, quantity })
        });
    }

    async updateCartItem(itemId, quantity) {
        return await this.request(`/cart/item/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify({ quantity })
        });
    }

    async removeCartItem(itemId) {
        return await this.request(`/cart/item/${itemId}`, {
            method: 'DELETE'
        });
    }

    async clearCart() {
        return await this.request('/cart/clear', {
            method: 'DELETE'
        });
    }

    // ==================== WISHLIST ====================

    async getWishlist() {
        return await this.request('/wishlist');
    }

    async toggleWishlist(productId) {
        return await this.request('/wishlist/toggle', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId })
        });
    }

    async checkInWishlist(productId) {
        return await this.request(`/wishlist/check/${productId}`);
    }

    async removeFromWishlist(itemId) {
        return await this.request(`/wishlist/${itemId}`, {
            method: 'DELETE'
        });
    }

    async clearWishlist() {
        return await this.request('/wishlist/clear', {
            method: 'DELETE'
        });
    }

    // ==================== ORDERS ====================

    async getOrders() {
        return await this.request('/orders');
    }

    async getOrder(orderId) {
        return await this.request(`/orders/${orderId}`);
    }

    async createOrder(orderData) {
        return await this.request('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    }

    // ==================== HELPERS ====================

    isAuthenticated() {
        return !!this.token;
    }

    getStoredUser() {
        const user = localStorage.getItem(STORAGE_KEYS.USER);
        return user ? JSON.parse(user) : null;
    }
}

// Create global instance
const api = new FreshMartAPI();

// Export for use in other files
window.FreshMartAPI = api;

window.api = api;
