import { CARD_HOVER } from '@/lib/animations';
import { cn } from '@/lib/utils';
import type { BaseComponentProps, Size, Variant } from '@/types/ui.types';
import { motion, type HTMLMotionProps } from 'framer-motion';
import * as React from 'react';

/**
 * Card Component - Reusable card container with glassmorphism effect
 *
 * Features:
 * - Multiple variants (default, ghost, gradient)
 * - Size options (sm, md, lg, xl)
 * - Hover animations (optional)
 * - Glassmorphism styling
 * - Full accessibility support
 * - Ref forwarding
 *
 * Usage:
 * ```tsx
 * <Card variant="default" size="md" hoverable>
 *   <CardHeader>
 *     <CardTitle>Title</CardTitle>
 *   </CardHeader>
 *   <CardContent>Content here</CardContent>
 * </Card>
 * ```
 */

export interface CardProps extends BaseComponentProps, Omit<HTMLMotionProps<'div'>, 'children'> {
  /** Visual style variant */
  variant?: Extract<Variant, 'default' | 'ghost' | 'secondary'>;
  /** Size preset */
  size?: Size;
  /** Enable hover animation */
  hoverable?: boolean;
  /** Apply gradient background */
  gradient?: boolean;
  /** Make card interactive (cursor pointer) */
  interactive?: boolean;
  /** Children elements */
  children?: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      hoverable = false,
      gradient = false,
      interactive = false,
      children,
      'aria-label': ariaLabel,
      'data-testid': testId,
      ...props
    },
    ref,
  ) => {
    // Size-based padding
    const sizeClasses = {
      xs: 'p-3',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-10',
    };

    // Variant-based styling
    const variantClasses = {
      default: 'bg-slate-900/40 backdrop-blur-md border-slate-700/50',
      ghost: 'bg-transparent border-transparent',
      secondary: 'bg-slate-800/60 backdrop-blur-sm border-slate-600/50',
    };

    // Gradient overlay (optional)
    const gradientClass = gradient
      ? 'bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10'
      : '';

    return (
      <motion.div
        ref={ref}
        className={cn(
          // Base styles
          'rounded-xl border transition-all duration-200',
          // Glassmorphism
          'shadow-lg shadow-black/20',
          // Variant
          variantClasses[variant],
          // Size
          sizeClasses[size],
          // Gradient
          gradientClass,
          // Interactive
          interactive && 'cursor-pointer',
          // Hover styles
          hoverable && 'hover:shadow-xl hover:shadow-black/30 hover:border-slate-600/70',
          className,
        )}
        whileHover={hoverable ? CARD_HOVER : undefined}
        aria-label={ariaLabel}
        data-testid={testId}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);

Card.displayName = 'Card';

/**
 * CardHeader - Header section for Card
 */
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex flex-col space-y-1.5', className)} {...props}>
        {children}
      </div>
    );
  },
);

CardHeader.displayName = 'CardHeader';

/**
 * CardTitle - Title element for CardHeader
 */
export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode;
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn(
          'text-2xl font-semibold leading-none tracking-tight text-slate-100',
          className,
        )}
        {...props}
      >
        {children}
      </h3>
    );
  },
);

CardTitle.displayName = 'CardTitle';

/**
 * CardDescription - Description text for CardHeader
 */
export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode;
}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p ref={ref} className={cn('text-sm text-slate-400', className)} {...props}>
        {children}
      </p>
    );
  },
);

CardDescription.displayName = 'CardDescription';

/**
 * CardContent - Main content area of Card
 */
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('pt-4', className)} {...props}>
        {children}
      </div>
    );
  },
);

CardContent.displayName = 'CardContent';

/**
 * CardFooter - Footer section for Card (actions, buttons, etc.)
 */
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex items-center pt-4', className)} {...props}>
        {children}
      </div>
    );
  },
);

CardFooter.displayName = 'CardFooter';

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
