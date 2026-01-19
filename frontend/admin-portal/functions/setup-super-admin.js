// functions/setup-super-admin.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // You need to download this

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

// ⚠️ CHANGE THESE VALUES
const SUPER_ADMIN_UID = 'EJTaLUuGCjNbpcYgbuQsLutIpit1';
const SUPER_ADMIN_EMAIL = 'narasimhamno.131415@gmail.com';
const SUPER_ADMIN_NAME = 'Super Admin';

async function setupSuperAdmin() {
    try {
        console.log('Setting up Super Admin...');
        
        // 1. Set custom claims
        await auth.setCustomUserClaims(SUPER_ADMIN_UID, { 
            role: 'super_admin' 
        });
        console.log('✓ Custom claims set');
        
        // 2. Add to admins collection in Firestore
        await db.collection('admins').doc(SUPER_ADMIN_UID).set({
            email: SUPER_ADMIN_EMAIL,
            name: SUPER_ADMIN_NAME,
            role: 'super_admin',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            disabled: false
        });
        console.log('✓ Admin document created in Firestore');
        
        // 3. Verify
        const user = await auth.getUser(SUPER_ADMIN_UID);
        console.log('✓ Super Admin setup complete!');
        console.log('\nAdmin Details:');
        console.log('  Email:', user.email);
        console.log('  UID:', user.uid);
        console.log('  Role:', 'super_admin');
        console.log('\n⚠️  IMPORTANT: The user must sign out and sign back in for claims to take effect!');
        
        process.exit(0);
        
    } catch (error) {
        console.error('Error setting up Super Admin:', error);
        process.exit(1);
    }
}

setupSuperAdmin();