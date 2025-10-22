import { useAuth } from '@/contexts/AuthContext.tsx';
import { useReducedMotion } from '@/hooks/useReducedMotion.ts';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { ConsentBanner } from './ConsentBanner.tsx';
import { LoginScreen } from './LoginScreen.tsx';
import { RegistrationScreen } from './RegistrationScreen.tsx';

type AuthView = 'login' | 'register' | 'consent';

/**
 * Authentication Flow Component
 *
 * Manages the flow between:
 * 1. Login screen
 * 2. Registration screen
 * 3. Consent banner (shown after first login/registration if needed)
 */

export function AuthFlow(): JSX.Element | null {
  const { isAuthenticated } = useAuth();
  const prefersReducedMotion = useReducedMotion();
  const [view, setView] = useState<AuthView>('login');
  // FIX: Temporarily show consent banner for all authenticated users (Issue #4)
  // hasConsent IPC handler not yet implemented - will implement later
  const [showConsent, setShowConsent] = useState(true);
  const [consentCheckComplete, setConsentCheckComplete] = useState(false);

  // Mark consent check complete when authenticated
  useEffect(() => {
    if (isAuthenticated && !consentCheckComplete) {
      setConsentCheckComplete(true);
    }
  }, [isAuthenticated, consentCheckComplete]);

  // Memoize onComplete callback to prevent unnecessary re-renders
  const handleConsentComplete = useCallback(() => {
    setShowConsent(false);
  }, []);

  // If authenticated and still checking consent, show loading
  if (isAuthenticated && !consentCheckComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-blue-300">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Render consent banner if authenticated and consent needed
  if (isAuthenticated && showConsent) {
    return <ConsentBanner onComplete={handleConsentComplete} />;
  }

  // If authenticated and consent check complete and no consent needed, return null
  // (App.tsx will render the main app)
  if (isAuthenticated && consentCheckComplete && !showConsent) {
    return null;
  }

  // Render login or registration screen with smooth transitions
  return (
    <AnimatePresence mode="wait">
      {view === 'login' ? (
        <motion.div
          key="login"
          initial={prefersReducedMotion ? undefined : { opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0, x: 20 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeInOut' }}
        >
          <LoginScreen onSwitchToRegister={() => setView('register')} />
        </motion.div>
      ) : (
        <motion.div
          key="register"
          initial={prefersReducedMotion ? undefined : { opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0, x: -20 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeInOut' }}
        >
          <RegistrationScreen onSwitchToLogin={() => setView('login')} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
