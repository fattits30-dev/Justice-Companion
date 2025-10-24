import { ButtonHTMLAttributes, forwardRef, useState, MouseEvent } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

interface Ripple {
  x: number;
  y: number;
  size: number;
  id: number;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      icon,
      iconPosition = "left",
      fullWidth = false,
      children,
      className,
      onClick,
      onDrag,
      onDragStart,
      onDragEnd,
      onDragEnter,
      onDragLeave,
      onDragOver,
      onAnimationStart,
      onAnimationEnd,
      onAnimationIteration,
      ...props
    },
    ref,
  ) => {
    const [ripples, setRipples] = useState<Ripple[]>([]);

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) {
        return;
      }

      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const newRipple: Ripple = {
        x,
        y,
        size,
        id: Date.now(),
      };

      setRipples((prev) => [...prev, newRipple]);

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 600);

      onClick?.(e);
    };

    // Variant styles
    const variantStyles = {
      primary: clsx(
        "bg-gradient-to-br from-primary-500 to-primary-600",
        "text-white shadow-primary",
        "hover:shadow-primary-lg hover:from-primary-400 hover:to-primary-500",
        "active:from-primary-600 active:to-primary-700",
        "border border-primary-400/20",
        "disabled:from-gray-700 disabled:to-gray-800 disabled:shadow-none",
        "disabled:border-gray-700 disabled:cursor-not-allowed disabled:opacity-50",
      ),
      secondary: clsx(
        "bg-gradient-to-br from-secondary-500 to-secondary-600",
        "text-white shadow-secondary",
        "hover:shadow-secondary-lg hover:from-secondary-400 hover:to-secondary-500",
        "active:from-secondary-600 active:to-secondary-700",
        "border border-secondary-400/20",
        "disabled:from-gray-700 disabled:to-gray-800 disabled:shadow-none",
        "disabled:border-gray-700 disabled:cursor-not-allowed disabled:opacity-50",
      ),
      ghost: clsx(
        "bg-white/5 backdrop-blur-sm",
        "text-white border border-white/10",
        "hover:bg-white/10 hover:border-white/20",
        "active:bg-white/5",
        "disabled:bg-white/5 disabled:border-white/5",
        "disabled:cursor-not-allowed disabled:opacity-50",
      ),
      danger: clsx(
        "bg-gradient-to-br from-danger-500 to-danger-600",
        "text-white shadow-danger",
        "hover:shadow-danger hover:from-danger-400 hover:to-danger-500",
        "active:from-danger-600 active:to-danger-700",
        "border border-danger-400/20",
        "disabled:from-gray-700 disabled:to-gray-800 disabled:shadow-none",
        "disabled:border-gray-700 disabled:cursor-not-allowed disabled:opacity-50",
      ),
    };

    // Size styles
    const sizeStyles = {
      sm: "h-8 px-3 text-sm gap-1.5",
      md: "h-10 px-4 text-base gap-2",
      lg: "h-12 px-6 text-lg gap-2.5",
    };

    // Icon size
    const iconSize = {
      sm: "w-4 h-4",
      md: "w-5 h-5",
      lg: "w-6 h-6",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className={clsx(
          // Base styles
          "relative inline-flex items-center justify-center",
          "font-medium rounded-lg",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900",
          "overflow-hidden",
          // Variant
          variantStyles[variant],
          // Size
          sizeStyles[size],
          // Full width
          fullWidth && "w-full",
          // Custom
          className,
        )}
        disabled={disabled || loading}
        onClick={handleClick}
        {...props}
      >
        {/* Ripple effect */}
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="absolute rounded-full bg-white/30 pointer-events-none animate-ping"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
            }}
          />
        ))}

        {/* Content */}
        <span className="relative flex items-center justify-center gap-inherit">
          {loading && (
            <Loader2 className={clsx("animate-spin", iconSize[size])} />
          )}
          {!loading && icon && iconPosition === "left" && (
            <span className={iconSize[size]}>{icon}</span>
          )}
          {children}
          {!loading && icon && iconPosition === "right" && (
            <span className={iconSize[size]}>{icon}</span>
          )}
        </span>
      </motion.button>
    );
  },
);

Button.displayName = "Button";

// Example usage:
// <Button variant="secondary" size="md" loading={false} icon={<Plus />}>
//   Create Case
// </Button>
