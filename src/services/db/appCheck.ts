import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { app } from './firebase';

/**
 * Firebase App Check Configuration
 * 
 * Protects backend resources (Cloud Functions, Firestore) from abuse
 * by verifying requests come from your authentic app.
 * 
 * Setup Instructions:
 * 1. Go to Firebase Console > App Check
 * 2. Register your app with reCAPTCHA v3
 * 3. Copy the site key and add it to .env as VITE_RECAPTCHA_SITE_KEY
 * 4. Enable enforcement for Cloud Functions and Firestore
 */

// Only initialize in production or when explicitly enabled
const isAppCheckEnabled = import.meta.env.VITE_APP_CHECK_ENABLED === 'true';
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

if (isAppCheckEnabled && recaptchaSiteKey) {
    try {
        const appCheck = initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(recaptchaSiteKey),
            isTokenAutoRefreshEnabled: true
        });

        console.log('[App Check] Initialized successfully');
    } catch (error) {
        console.error('[App Check] Initialization failed:', error);
    }
} else {
    console.warn('[App Check] Disabled - set VITE_APP_CHECK_ENABLED=true and VITE_RECAPTCHA_SITE_KEY in .env to enable');
}

export { };
