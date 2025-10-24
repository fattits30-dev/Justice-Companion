import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  dot?: boolean;
  glow?: boolean;
  pulse?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'neutral',
      size = 'md',
      icon,
      dot = false,
      glow = false,
      pulse = false,
      children,
      className,
      ...props
    },
    ref
  ) => {
    // Variant styles
    const variantStyles = {
      success: clsx(
        'bg-success-500/10 text-success-400',
        'border-success-500/20',
        glow && 'shadow-success'
      ),
      warning: clsx(
        'bg-warning-500/10 text-warning-400',
        'border-warning-500/20',
        glow && 'shadow-warning'
      ),
      danger: clsx(
        'bg-danger-500/10 text-danger-400',
        'border-danger-500/20',
        glow && 'shadow-danger'
      ),
      info: clsx(
        'bg-primary-500/10 text-primary-400',
        'border-primary-500/20',
        glow && 'shadow-primary'
      ),
      primary: clsx(
        'bg-primary-500/10 text-primary-400',
        'border-primary-500/20',
        glow && 'shadow-primary'
      ),
      secondary: clsx(
        'bg-secondary-500/10 text-secondary-400',
        'border-secondary-500/20',
        glow && 'shadow-secondary'
      ),
      neutral: clsx(
        'bg-gray-500/10 text-gray-400',
        'border-gray-500/20'
      )
    };

    // Dot color
    const dotColor = {
      success: 'bg-success-500',
      warning: 'bg-warning-500',
      danger: 'bg-danger-500',
      info: 'bg-primary-500',
      primary: 'bg-primary-500',
      secondary: 'bg-secondary-500',
      neutral: 'bg-gray-500'
    };

    // Size styles
    const sizeStyles = {
      sm: 'h-5 px-2 text-xs gap-1',
      md: 'h-6 px-2.5 text-sm gap-1.5',
      lg: 'h-7 px-3 text-base gap-2'
    };

    // Icon size
    const iconSize = {
      sm: 'w-3 h-3',
      md: 'w-3.5 h-3.5',
      lg: 'w-4 h-4'
    };

    // Dot size
    const dotSize = {
      sm: 'w-1.5 h-1.5',
      md: 'w-2 h-2',
      lg: 'w-2.5 h-2.5'
    };

    return (
      <span
        ref={ref}
        className={clsx(
          // Base styles
          'inline-flex items-center justify-center',
          'font-medium rounded-md border',
          'transition-all duration-200',
          'backdrop-blur-sm',
          // Variant
          variantStyles[variant],
          // Size
          sizeStyles[size],
          // Custom
          className
        )}
        {...props}
      >
        {/* Dot indicator */}
        {dot && (
          <span
            className={clsx(
              'rounded-full',
              dotColor[variant],
              dotSize[size],
              pulse && 'animate-pulse'
            )}
          />
        )}

        {/* Icon */}
        {icon && <span className={iconSize[size]}>{icon}</span>}

        {/* Content */}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// Example usage:
// <Badge variant="success" dot pulse>Active</Badge>
// <Badge variant="warning" icon={<AlertTriangle />}>Warning</Badge>
// <Badge variant="danger" glow>Critical</Badge>
