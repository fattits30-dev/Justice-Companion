import { useState } from 'react';
import { LoginScreen } from './LoginScreen';
import { RegistrationScreen } from './RegistrationScreen';
import { ConsentBanner } from './ConsentBanner';
import { useAuth } from '@/contexts/AuthContext';

type AuthView = 'login' | 'register' | 'consent';

/**
 * Authentication Flow Component
 *
 * Manages the flow between:
 * 1. Login screen
 * 2. Registration screen
 * 3. Consent banner (shown after first login/registration)
 */

export function AuthFlow() {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState<AuthView>('login');
  const [showConsent, setShowConsent] = useState(false);

  // After successful login/registration, check if we need consent
  if (isAuthenticated && !showConsent) {
    // Trigger consent check
    setShowConsent(true);
  }

  // Render consent banner if authenticated and consent needed
  if (isAuthenticated && showConsent) {
    return <ConsentBanner onComplete={() => setShowConsent(false)} />;
  }

  // Render login or registration screen
  if (view === 'login') {
    return <LoginScreen onSwitchToRegister={() => setView('register')} />;
  }

  return <RegistrationScreen onSwitchToLogin={() => setView('login')} />;
}
