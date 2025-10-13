import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useMemo } from 'react';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: 'At least 12 characters', test: (p) => p.length >= 12 },
  { label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Contains lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'Contains number', test: (p) => /[0-9]/.test(p) },
  { label: 'Contains special character', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

function calculateStrength(password: string): number {
  if (!password) {
    return 0;
  }
  let score = 0;
  const metRequirements = requirements.filter((req) => req.test(password)).length;
  score += metRequirements * 10;
  // Length bonuses (0-25 points) - OWASP requires minimum 12 chars
  if (password.length >= 12) {
    score += 5;
  }
  if (password.length >= 16) {
    score += 10;
  }
  if (password.length >= 20) {
    score += 10;
  }
  const hasUpperAndLower = /[A-Z]/.test(password) && /[a-z]/.test(password);
  const hasLettersAndNumbers = /[A-Za-z]/.test(password) && /[0-9]/.test(password);
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  if (hasUpperAndLower) {
    score += 5;
  }
  if (hasLettersAndNumbers) {
    score += 10;
  }
  if (hasSpecialChars) {
    score += 10;
  }
  return Math.min(100, score);
}

function getStrengthConfig(strength: number): {
  label: string;
  colorClass: string;
  bgClass: string;
  barClass: string;
} {
  if (strength < 40) {
    return {
      label: 'Weak',
      colorClass: 'text-red-400',
      bgClass: 'bg-red-500/20',
      barClass: 'bg-gradient-to-r from-red-600 to-red-500',
    };
  }
  if (strength < 60) {
    return {
      label: 'Fair',
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-500/20',
      barClass: 'bg-gradient-to-r from-amber-600 to-amber-500',
    };
  }
  if (strength < 80) {
    return {
      label: 'Good',
      colorClass: 'text-cyan-400',
      bgClass: 'bg-cyan-500/20',
      barClass: 'bg-gradient-to-r from-cyan-600 to-cyan-500',
    };
  }
  return {
    label: 'Strong',
    colorClass: 'text-green-400',
    bgClass: 'bg-green-500/20',
    barClass: 'bg-gradient-to-r from-green-600 to-green-500',
  };
}

export function PasswordStrength({ password, className = '' }: PasswordStrengthProps): JSX.Element {
  const strength = useMemo(() => calculateStrength(password), [password]);
  const config = useMemo(() => getStrengthConfig(strength), [strength]);

  if (!password) {
    return <></>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
      id="password-strength"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <motion.div
            className={config.barClass}
            initial={{ width: 0 }}
            animate={{ width: `${strength}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            role="progressbar"
            aria-valuenow={strength}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Password strength"
          />
        </div>
        <span
          className={`text-xs font-semibold min-w-[60px] ${config.colorClass}`}
          aria-live="polite"
        >
          {config.label}
        </span>
      </div>
      <motion.ul
        className="space-y-1.5 text-xs"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
        }}
        aria-label="Password requirements"
      >
        {requirements.map((req, index) => {
          const isMet = req.test(password);
          return (
            <motion.li
              key={index}
              className={`flex items-center gap-2 transition-colors ${
                isMet ? 'text-green-400' : 'text-slate-400'
              }`}
              variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}
            >
              {isMet ? (
                <Check className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
              ) : (
                <X className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
              )}
              <span>{req.label}</span>
            </motion.li>
          );
        })}
      </motion.ul>
      {strength >= 80 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`mt-3 px-3 py-2 rounded-lg ${config.bgClass} ${config.colorClass} text-xs font-medium`}
        >
          ✓ Your password is strong and secure
        </motion.div>
      )}
    </motion.div>
  );
}
