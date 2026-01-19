// Authentication Module
import { 
    auth, 
    db,
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    doc,
    getDoc
} from './firebase-config.js';

// Admin roles
const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin'
};

// Check if user has admin privileges
async function checkAdminRole(user) {
    if (!user) return null;
    
    try {
        // Force token refresh to get latest claims
        const tokenResult = await user.getIdTokenResult(true);
        const role = tokenResult.claims.role;
        
        if (role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN) {
            return {
                uid: user.uid,
                email: user.email,
                role: role,
                isSuperAdmin: role === ROLES.SUPER_ADMIN
            };
        }
        return null;
    } catch (error) {
        console.error('Error checking admin role:', error);
        return null;
    }
}

// Login function
async function loginAdmin(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Verify admin role
        const adminData = await checkAdminRole(user);
        
        if (!adminData) {
            // Not an admin - sign out immediately
            await signOut(auth);
            throw new Error('Access denied. Admin privileges required.');
        }
        
        return adminData;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Logout function
async function logoutAdmin() {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

// Protect route - redirect if not authenticated
function protectRoute(callback) {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        const adminData = await checkAdminRole(user);
        
        if (!adminData) {
            await signOut(auth);
            window.location.href = 'login.html';
            return;
        }
        
        // Execute callback with admin data
        if (callback) {
            callback(adminData);
        }
    });
}

// Get current admin data
async function getCurrentAdmin() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe();
            if (user) {
                const adminData = await checkAdminRole(user);
                resolve(adminData);
            } else {
                resolve(null);
            }
        });
    });
}

// Get auth instance (for external use if needed)
function getAuthInstance() {
    return auth;
}

// Get db instance (for external use if needed)
function getDbInstance() {
    return db;
}

export { 
    ROLES, 
    loginAdmin, 
    logoutAdmin, 
    protectRoute, 
    getCurrentAdmin, 
    checkAdminRole,
    getAuthInstance,
    getDbInstance
};