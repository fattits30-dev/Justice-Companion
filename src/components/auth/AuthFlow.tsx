import { useAuth } from '@/contexts/AuthContext';
import { logger } from '../../utils/logger';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { ConsentBanner } from './ConsentBanner';
import { LoginScreen } from './LoginScreen';
import { RegistrationScreen } from './RegistrationScreen';

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
  const [showConsent, setShowConsent] = useState(false);
  const [consentCheckComplete, setConsentCheckComplete] = useState(false);

  // Check if user needs to see consent banner after authentication
  useEffect(() => {
    const checkConsent = async (): Promise<void> => {
      if (!isAuthenticated || consentCheckComplete) {
        return;
      }

      try {
        // Check if user already has required consent
        const result = await window.justiceAPI.hasConsent('data_processing');

        if (result.success && result.data) {
          // User already has consent - skip banner
          setShowConsent(false);
        } else {
          // User needs to grant consent
          setShowConsent(true);
        }
      } catch (error) {
        logger.error('AuthFlow', 'Failed to check consent:', { error: error });
        // On error, show consent banner to be safe
        setShowConsent(true);
      } finally {
        setConsentCheckComplete(true);
      }
    };

    void checkConsent();
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
