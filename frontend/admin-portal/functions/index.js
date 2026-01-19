const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

// ============================================
// HELPER FUNCTIONS
// ============================================

// Verify caller is super_admin
async function verifySuperAdmin(context) {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const token = context.auth.token;
    if (token.role !== 'super_admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only super admins can perform this action');
    }
    
    return true;
}

// Verify caller is admin or super_admin
async function verifyAdmin(context) {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const token = context.auth.token;
    if (token.role !== 'super_admin' && token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can perform this action');
    }
    
    return true;
}

// Get date range based on period
function getDateRange(period) {
    const now = new Date();
    let startDate;
    
    switch (period) {
        case 'daily':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
        case 'weekly':
            const dayOfWeek = now.getDay();
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
            break;
        case 'monthly':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'yearly':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        default:
            startDate = new Date(0); // All time
    }
    
    return { startDate, endDate: now };
}

// ============================================
// ADMIN MANAGEMENT FUNCTIONS
// ============================================

/**
 * Create a new admin account
 * Only super_admin can call this
 */
exports.createAdmin = functions.https.onCall(async (data, context) => {
    await verifySuperAdmin(context);
    
    const { email, password, name, role } = data;
    
    // Validate input
    if (!email || !password) {
        throw new functions.https.HttpsError('invalid-argument', 'Email and password are required');
    }
    
    if (password.length < 8) {
        throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 8 characters');
    }
    
    const validRoles = ['admin', 'super_admin'];
    if (!validRoles.includes(role)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid role');
    }
    
    try {
        // Create the user in Firebase Auth
        const userRecord = await auth.createUser({
            email: email,
            password: password,
            displayName: name || email.split('@')[0],
            emailVerified: true
        });
        
        // Set custom claims for role
        await auth.setCustomUserClaims(userRecord.uid, { role: role });
        
        // Store admin in Firestore
        await db.collection('admins').doc(userRecord.uid).set({
            name: name || email.split('@')[0],
            email: email,
            role: role,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: context.auth.uid,
            disabled: false
        });
        
        return { 
            success: true, 
            uid: userRecord.uid,
            message: 'Admin created successfully' 
        };
        
    } catch (error) {
        console.error('Error creating admin:', error);
        
        if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'Email already in use');
        }
        
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Toggle admin status (enable/disable)
 * Only super_admin can call this
 */
exports.toggleAdminStatus = functions.https.onCall(async (data, context) => {
    await verifySuperAdmin(context);
    
    const { adminId, disable } = data;
    
    if (!adminId) {
        throw new functions.https.HttpsError('invalid-argument', 'Admin ID is required');
    }
    
    // Prevent disabling yourself
    if (adminId === context.auth.uid) {
        throw new functions.https.HttpsError('invalid-argument', 'Cannot disable your own account');
    }
    
    try {
        // Update Firebase Auth user
        await auth.updateUser(adminId, { disabled: disable });
        
        // Update Firestore
        await db.collection('admins').doc(adminId).update({
            disabled: disable,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: context.auth.uid
        });
        
        return { 
            success: true, 
            message: `Admin ${disable ? 'disabled' : 'enabled'} successfully` 
        };
        
    } catch (error) {
        console.error('Error toggling admin status:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Delete an admin account
 * Only super_admin can call this
 */
exports.deleteAdmin = functions.https.onCall(async (data, context) => {
    await verifySuperAdmin(context);
    
    const { adminId } = data;
    
    if (!adminId) {
        throw new functions.https.HttpsError('invalid-argument', 'Admin ID is required');
    }
    
    // Prevent deleting yourself
    if (adminId === context.auth.uid) {
        throw new functions.https.HttpsError('invalid-argument', 'Cannot delete your own account');
    }
    
    try {
        // Check if target is super_admin
        const adminDoc = await db.collection('admins').doc(adminId).get();
        if (adminDoc.exists && adminDoc.data().role === 'super_admin') {
            // Count remaining super_admins
            const superAdmins = await db.collection('admins')
                .where('role', '==', 'super_admin')
                .where('disabled', '==', false)
                .get();
            
            if (superAdmins.size <= 1) {
                throw new functions.https.HttpsError(
                    'failed-precondition', 
                    'Cannot delete the last super admin'
                );
            }
        }
        
        // Delete from Firebase Auth
        await auth.deleteUser(adminId);
        
        // Delete from Firestore
        await db.collection('admins').doc(adminId).delete();
        
        return { 
            success: true, 
            message: 'Admin deleted successfully' 
        };
        
    } catch (error) {
        console.error('Error deleting admin:', error);
        
        if (error.code === 'auth/user-not-found') {
            await db.collection('admins').doc(adminId).delete();
            return { success: true, message: 'Admin deleted from database' };
        }
        
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Get all admins
 * Only super_admin can call this
 */
exports.getAdmins = functions.https.onCall(async (data, context) => {
    await verifySuperAdmin(context);
    
    try {
        const adminsSnapshot = await db.collection('admins')
            .orderBy('createdAt', 'desc')
            .get();
        
        const admins = [];
        adminsSnapshot.forEach(doc => {
            const adminData = doc.data();
            admins.push({
                id: doc.id,
                name: adminData.name,
                email: adminData.email,
                role: adminData.role,
                disabled: adminData.disabled || false,
                createdAt: adminData.createdAt ? adminData.createdAt.toDate().toISOString() : null
            });
        });
        
        return { success: true, admins };
        
    } catch (error) {
        console.error('Error fetching admins:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// ============================================
// USER MANAGEMENT FUNCTIONS
// ============================================

/**
 * Create a new user (called by admin)
 * Both admin and super_admin can call this
 */
exports.createUser = functions.https.onCall(async (data, context) => {
    await verifyAdmin(context);
    
    const { name, email, phone, status, password } = data;
    
    if (!email || !password || !name) {
        throw new functions.https.HttpsError('invalid-argument', 'Name, email and password are required');
    }
    
    if (password.length < 6) {
        throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters');
    }
    
    try {
        // Create user in Firebase Auth
        const userRecord = await auth.createUser({
            email: email,
            password: password,
            displayName: name
        });
        
        // Set custom claims (regular user)
        await auth.setCustomUserClaims(userRecord.uid, { role: 'user' });
        
        // Store user in Firestore
        await db.collection('users').doc(userRecord.uid).set({
            name: name,
            email: email,
            phone: phone || '',
            status: status || 'active',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: context.auth.uid
        });
        
        return { 
            success: true, 
            uid: userRecord.uid,
            message: 'User created successfully' 
        };
        
    } catch (error) {
        console.error('Error creating user:', error);
        
        if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'Email already in use');
        }
        
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Update user details
 */
exports.updateUser = functions.https.onCall(async (data, context) => {
    await verifyAdmin(context);
    
    const { userId, name, phone, status } = data;
    
    if (!userId) {
        throw new functions.https.HttpsError('invalid-argument', 'User ID is required');
    }
    
    try {
        const updateData = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: context.auth.uid
        };
        
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (status !== undefined) updateData.status = status;
        
        // Update display name in Auth if name is provided
        if (name) {
            await auth.updateUser(userId, { displayName: name });
        }
        
        // Update Firestore
        await db.collection('users').doc(userId).update(updateData);
        
        return { 
            success: true, 
            message: 'User updated successfully' 
        };
        
    } catch (error) {
        console.error('Error updating user:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Update user status
 */
exports.updateUserStatus = functions.https.onCall(async (data, context) => {
    await verifyAdmin(context);
    
    const { userId, status } = data;
    
    if (!userId || !status) {
        throw new functions.https.HttpsError('invalid-argument', 'User ID and status are required');
    }
    
    const validStatuses = ['active', 'inactive', 'suspended', 'pending'];
    if (!validStatuses.includes(status)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid status');
    }
    
    try {
        // Disable/enable user in Auth based on status
        const shouldDisable = status === 'suspended' || status === 'inactive';
        await auth.updateUser(userId, { disabled: shouldDisable });
        
        // Update Firestore
        await db.collection('users').doc(userId).update({
            status: status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: context.auth.uid
        });
        
        return { 
            success: true, 
            message: 'User status updated successfully' 
        };
        
    } catch (error) {
        console.error('Error updating user status:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Delete a user
 * Both admin and super_admin can call this
 */
exports.deleteUser = functions.https.onCall(async (data, context) => {
    await verifyAdmin(context);
    
    const { userId } = data;
    
    if (!userId) {
        throw new functions.https.HttpsError('invalid-argument', 'User ID is required');
    }
    
    try {
        // Delete from Firebase Auth
        await auth.deleteUser(userId);
        
        // Delete from Firestore
        await db.collection('users').doc(userId).delete();
        
        return { 
            success: true, 
            message: 'User deleted successfully' 
        };
        
    } catch (error) {
        console.error('Error deleting user:', error);
        
        if (error.code === 'auth/user-not-found') {
            await db.collection('users').doc(userId).delete();
            return { success: true, message: 'User deleted from database' };
        }
        
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Get all users with optional filtering
 */
exports.getUsers = functions.https.onCall(async (data, context) => {
    await verifyAdmin(context);
    
    const { status, limit: queryLimit, startAfter, period } = data || {};
    
    try {
        let query = db.collection('users');
        
        // Filter by status if provided
        if (status && status !== 'all') {
            query = query.where('status', '==', status);
        }
        
        // Filter by date range if period is provided
        if (period) {
            const { startDate } = getDateRange(period);
            query = query.where('createdAt', '>=', startDate);
        }
        
        // Order by creation date
        query = query.orderBy('createdAt', 'desc');
        
        // Pagination
        if (queryLimit) {
            query = query.limit(queryLimit);
        }
        
        if (startAfter) {
            const startDoc = await db.collection('users').doc(startAfter).get();
            if (startDoc.exists) {
                query = query.startAfter(startDoc);
            }
        }
        
        const usersSnapshot = await query.get();
        
        const users = [];
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            users.push({
                id: doc.id,
                name: userData.name,
                email: userData.email,
                phone: userData.phone || '',
                status: userData.status || 'active',
                createdAt: userData.createdAt ? userData.createdAt.toDate().toISOString() : null
            });
        });
        
        return { success: true, users };
        
    } catch (error) {
        console.error('Error fetching users:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// ============================================
// DASHBOARD & STATISTICS FUNCTIONS
// ============================================

/**
 * Get dashboard statistics
 */
exports.getDashboardStats = functions.https.onCall(async (data, context) => {
    await verifyAdmin(context);
    
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Get all users count
        const allUsersSnapshot = await db.collection('users').count().get();
        const totalUsers = allUsersSnapshot.data().count;
        
        // Get active users count
        const activeUsersSnapshot = await db.collection('users')
            .where('status', '==', 'active')
            .count()
            .get();
        const activeUsers = activeUsersSnapshot.data().count;
        
        // Get inactive/suspended users count
        const inactiveUsersSnapshot = await db.collection('users')
            .where('status', 'in', ['inactive', 'suspended'])
            .count()
            .get();
        const inactiveUsers = inactiveUsersSnapshot.data().count;
        
        // Get today's new users
        const todayUsersSnapshot = await db.collection('users')
            .where('createdAt', '>=', today)
            .count()
            .get();
        const todayUsers = todayUsersSnapshot.data().count;
        
        // Get this week's new users
        const weekUsersSnapshot = await db.collection('users')
            .where('createdAt', '>=', thisWeekStart)
            .count()
            .get();
        const weekUsers = weekUsersSnapshot.data().count;
        
        // Get this month's new users
        const monthUsersSnapshot = await db.collection('users')
            .where('createdAt', '>=', thisMonthStart)
            .count()
            .get();
        const monthUsers = monthUsersSnapshot.data().count;
        
        // Get admins count
        const adminsSnapshot = await db.collection('admins').count().get();
        const totalAdmins = adminsSnapshot.data().count;
        
        return {
            success: true,
            stats: {
                totalUsers,
                activeUsers,
                inactiveUsers,
                todayUsers,
                weekUsers,
                monthUsers,
                totalAdmins
            }
        };
        
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// ============================================
// REPORT FUNCTIONS
// ============================================

/**
 * Generate user report for download
 */
exports.generateUserReport = functions.https.onCall(async (data, context) => {
    await verifyAdmin(context);
    
    const { period, status } = data || {};
    
    try {
        let query = db.collection('users');
        
        // Filter by period
        if (period && period !== 'all') {
            const { startDate } = getDateRange(period);
            query = query.where('createdAt', '>=', startDate);
        }
        
        // Filter by status
        if (status && status !== 'all') {
            query = query.where('status', '==', status);
        }
        
        query = query.orderBy('createdAt', 'desc');
        
        const usersSnapshot = await query.get();
        
        const users = [];
        usersSnapshot.forEach(doc => {
            const userData = doc.data();
            users.push({
                id: doc.id,
                name: userData.name || '',
                email: userData.email || '',
                phone: userData.phone || '',
                status: userData.status || 'active',
                createdAt: userData.createdAt ? userData.createdAt.toDate().toISOString() : '',
                createdBy: userData.createdBy || ''
            });
        });
        
        // Generate report metadata
        const reportMeta = {
            generatedAt: new Date().toISOString(),
            generatedBy: context.auth.uid,
            period: period || 'all',
            status: status || 'all',
            totalRecords: users.length
        };
        
        return { 
            success: true, 
            users,
            meta: reportMeta
        };
        
    } catch (error) {
        console.error('Error generating report:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Generate admin activity report
 * Only super_admin can call this
 */
exports.generateAdminReport = functions.https.onCall(async (data, context) => {
    await verifySuperAdmin(context);
    
    try {
        const adminsSnapshot = await db.collection('admins')
            .orderBy('createdAt', 'desc')
            .get();
        
        const admins = [];
        adminsSnapshot.forEach(doc => {
            const adminData = doc.data();
            admins.push({
                id: doc.id,
                name: adminData.name || '',
                email: adminData.email || '',
                role: adminData.role || '',
                disabled: adminData.disabled || false,
                createdAt: adminData.createdAt ? adminData.createdAt.toDate().toISOString() : '',
                createdBy: adminData.createdBy || ''
            });
        });
        
        return { 
            success: true, 
            admins,
            meta: {
                generatedAt: new Date().toISOString(),
                totalRecords: admins.length
            }
        };
        
    } catch (error) {
        console.error('Error generating admin report:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Verify admin role (used by frontend to check permissions)
 */
exports.verifyAdminRole = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        return { isAdmin: false, role: null };
    }
    
    const token = context.auth.token;
    const role = token.role;
    
    if (role === 'super_admin' || role === 'admin') {
        return { 
            isAdmin: true, 
            role: role,
            uid: context.auth.uid
        };
    }
    
    return { isAdmin: false, role: null };
});

/**
 * Set custom claims for a user (initial setup helper)
 * This should only be called once to set up the first super_admin
 * Can be triggered via Firebase Console or using Admin SDK directly
 */
exports.setupInitialSuperAdmin = functions.https.onCall(async (data, context) => {
    // This function should be protected or removed after initial setup
    // For security, we check if any super_admin exists
    
    const { secretKey, userId } = data;
    
    // Simple secret key protection (change this in production!)
    if (secretKey !== 'YOUR_INITIAL_SETUP_SECRET_KEY_CHANGE_ME') {
        throw new functions.https.HttpsError('permission-denied', 'Invalid secret key');
    }
    
    try {
        // Check if any super_admin exists
        const existingSuperAdmins = await db.collection('admins')
            .where('role', '==', 'super_admin')
            .limit(1)
            .get();
        
        if (!existingSuperAdmins.empty) {
            throw new functions.https.HttpsError(
                'already-exists', 
                'Super admin already exists. Use the admin panel to manage admins.'
            );
        }
        
        // Get user details
        const userRecord = await auth.getUser(userId);
        
        // Set super_admin claims
        await auth.setCustomUserClaims(userId, { role: 'super_admin' });
        
        // Add to admins collection
        await db.collection('admins').doc(userId).set({
            email: userRecord.email,
            name: userRecord.displayName || userRecord.email.split('@')[0],
            role: 'super_admin',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            disabled: false
        });
        
        return { 
            success: true, 
            message: 'Super admin created successfully. Please sign out and sign in again.' 
        };
        
    } catch (error) {
        console.error('Error setting up super admin:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Search users by name or email
 */
exports.searchUsers = functions.https.onCall(async (data, context) => {
    await verifyAdmin(context);
    
    const { searchTerm } = data;
    
    if (!searchTerm || searchTerm.length < 2) {
        throw new functions.https.HttpsError('invalid-argument', 'Search term must be at least 2 characters');
    }
    
    try {
        // Search by email (exact prefix match)
        const emailSearchSnapshot = await db.collection('users')
            .where('email', '>=', searchTerm.toLowerCase())
            .where('email', '<=', searchTerm.toLowerCase() + '\uf8ff')
            .limit(20)
            .get();
        
        // Search by name (exact prefix match)
        const nameSearchSnapshot = await db.collection('users')
            .where('name', '>=', searchTerm)
            .where('name', '<=', searchTerm + '\uf8ff')
            .limit(20)
            .get();
        
        const usersMap = new Map();
        
        emailSearchSnapshot.forEach(doc => {
            usersMap.set(doc.id, {
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt ? doc.data().createdAt.toDate().toISOString() : null
            });
        });
        
        nameSearchSnapshot.forEach(doc => {
            if (!usersMap.has(doc.id)) {
                usersMap.set(doc.id, {
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt ? doc.data().createdAt.toDate().toISOString() : null
                });
            }
        });
        
        const users = Array.from(usersMap.values());
        
        return { success: true, users };
        
    } catch (error) {
        console.error('Error searching users:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// ============================================
// FIRESTORE TRIGGERS (Optional - for logging/audit)
// ============================================

/**
 * Log when a user is created
 */
exports.onUserCreated = functions.firestore
    .document('users/{userId}')
    .onCreate(async (snap, context) => {
        const userId = context.params.userId;
        const userData = snap.data();
        
        await db.collection('audit_logs').add({
            action: 'USER_CREATED',
            targetId: userId,
            targetEmail: userData.email,
            performedBy: userData.createdBy || 'system',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return null;
    });

/**
 * Log when a user is deleted
 */
exports.onUserDeleted = functions.firestore
    .document('users/{userId}')
    .onDelete(async (snap, context) => {
        const userId = context.params.userId;
        const userData = snap.data();
        
        await db.collection('audit_logs').add({
            action: 'USER_DELETED',
            targetId: userId,
            targetEmail: userData.email,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        return null;
    });

/**
 * Log when user data is updated
 */
exports.onUserUpdated = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
        const userId = context.params.userId;
        const before = change.before.data();
        const after = change.after.data();
        
        // Only log significant changes
        if (before.status !== after.status) {
            await db.collection('audit_logs').add({
                action: 'USER_STATUS_CHANGED',
                targetId: userId,
                targetEmail: after.email,
                oldStatus: before.status,
                newStatus: after.status,
                performedBy: after.updatedBy || 'system',
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        }
        
        return null;
    });