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
      /* eslint-disable @typescript-eslint/no-unused-vars */
      onDrag,
      onDragStart,
      onDragEnd,
      onDragEnter,
      onDragLeave,
      onDragOver,
      onAnimationStart,
      onAnimationEnd,
      onAnimationIteration,
      /* eslint-enable @typescript-eslint/no-unused-vars */
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
        "bg-linear-to-br from-primary-500 to-primary-600",
        "text-white shadow-primary",
        "hover:shadow-primary-lg hover:from-primary-400 hover:to-primary-500",
        "active:from-primary-600 active:to-primary-700",
        "border border-primary-400/20",
        "disabled:from-gray-700 disabled:to-gray-800 disabled:shadow-none",
        "disabled:border-gray-700 disabled:cursor-not-allowed disabled:opacity-50",
      ),
      secondary: clsx(
        "bg-linear-to-br from-secondary-500 to-secondary-600",
        "text-white shadow-secondary",
        "hover:shadow-secondary-lg hover:from-secondary-400 hover:to-secondary-500",
        "active:from-secondary-600 active:to-secondary-700",
        "border border-secondary-400/20",
        "disabled:from-gray-700 disabled:to-gray-800 disabled:shadow-none",
        "disabled:border-gray-700 disabled:cursor-not-allowed disabled:opacity-50",
      ),
      ghost: clsx(
        "bg-transparent",
        "text-gray-700 dark:text-gray-300",
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        "active:bg-gray-200 dark:active:bg-gray-700",
        "border border-gray-300 dark:border-gray-600",
        "disabled:bg-transparent disabled:cursor-not-allowed disabled:opacity-50",
      ),
      danger: clsx(
        "bg-linear-to-br from-red-500 to-red-600",
        "text-white shadow-red",
        "hover:shadow-red-lg hover:from-red-400 hover:to-red-500",
        "active:from-red-600 active:to-red-700",
        "border border-red-400/20",
        "disabled:from-gray-700 disabled:to-gray-800 disabled:shadow-none",
        "disabled:border-gray-700 disabled:cursor-not-allowed disabled:opacity-50",
      ),
    };

    // Size styles
    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    return (
      <motion.button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        className={clsx(
          "relative overflow-hidden rounded-lg font-medium transition-all duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className,
        )}
        onClick={handleClick}
        {...props}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            {icon && iconPosition === "left" && icon}
            {children}
            {icon && iconPosition === "right" && icon}
          </div>
        )}

        {/* Ripples */}
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full bg-white/30"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
            }}
            initial={{ scale: 0, opacity: 0.7 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        ))}
      </motion.button>
    );
  },
);
