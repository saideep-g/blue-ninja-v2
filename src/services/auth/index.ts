import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User as FirebaseUser,
    setPersistence,
    browserLocalPersistence,
} from 'firebase/auth';
import { auth } from '../db/firebase';
import * as idb from '../db/idb';
import { logger } from '../logging';

// Enable persistence
setPersistence(auth, browserLocalPersistence).catch((error) => {
    logger.error('Error setting persistence:', error);
});

// ===== AUTH STATE MANAGEMENT =====

let currentUser: FirebaseUser | null = null;

export function getCurrentUser(): FirebaseUser | null {
    return currentUser;
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, (firebaseUser) => {
        currentUser = firebaseUser;
        callback(firebaseUser);
    });
}

// ===== SIGNUP =====

export async function signup(
    email: string,
    password: string,
    displayName: string
): Promise<FirebaseUser> {
    try {
        logger.info('📝 Creating account...');

        // Create Firebase user
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save to IndexedDB
        await idb.saveUser({
            id: user.uid,
            email: user.email || '',
            displayName,
            photoURL: user.photoURL || undefined,
            role: 'student',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            offline: false,
        });

        // Create default profile
        await idb.saveUserProfile({
            userId: user.uid,
            preferredLanguage: 'en',
            theme: 'system',
            notifications: true,
            updatedAt: Date.now(),
        });

        logger.info('✅ Account created successfully');
        return user;
    } catch (error) {
        logger.error('❌ Signup error:', error);
        throw error;
    }
}

// ===== LOGIN =====

export async function login(email: string, password: string): Promise<FirebaseUser> {
    try {
        logger.info('🔑 Logging in...');

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save/update in IndexedDB
        const existingUser = await idb.getUser(user.uid);
        if (existingUser) {
            existingUser.updatedAt = Date.now();
            await idb.saveUser(existingUser);
        } else {
            await idb.saveUser({
                id: user.uid,
                email: user.email || '',
                displayName: user.displayName || '',
                photoURL: user.photoURL || undefined,
                role: 'student',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                offline: false,
            });
        }

        logger.info('✅ Logged in successfully');
        return user;
    } catch (error) {
        logger.error('❌ Login error:', error);
        throw error;
    }
}

// ===== LOGOUT =====

export async function logout(): Promise<void> {
    try {
        logger.info('👋 Logging out...');
        await signOut(auth);
        currentUser = null;
        logger.info('✅ Logged out successfully');
    } catch (error) {
        logger.error('❌ Logout error:', error);
        throw error;
    }
}

// ===== SESSION RECOVERY =====

export async function recoverSession(): Promise<FirebaseUser | null> {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Update in IndexedDB
                await idb.saveUser({
                    id: user.uid,
                    email: user.email || '',
                    displayName: user.displayName || '',
                    photoURL: user.photoURL || undefined,
                    role: 'student',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    offline: false,
                });
            }
            unsubscribe();
            resolve(user);
        });
    });
}
