import { HTMLAttributes, forwardRef, ReactNode, useState } from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "elevated";
  hoverable?: boolean;
  gradientBorder?: boolean;
  shine?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "default",
      hoverable = true,
      gradientBorder = false,
      shine = false,
      header,
      footer,
      children,
      className,
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
    const [isHovered, setIsHovered] = useState(false);

    // Variant styles
    const variantStyles = {
      default: clsx(
        "bg-primary-900/60 border-gray-800",
        hoverable && "hover:bg-primary-900 hover:border-gray-700",
      ),
      glass: clsx(
        "bg-white/5 backdrop-blur-md border-white/10",
        hoverable && "hover:bg-white/10 hover:border-white/20",
      ),
      elevated: clsx(
        "bg-primary-900 border-gray-800 shadow-lg",
        hoverable && "hover:shadow-xl hover:border-gray-700",
      ),
    };

    return (
      <motion.div
        ref={ref}
        initial={false}
        whileHover={hoverable ? { y: -4 } : {}}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className={clsx(
          // Base styles
          "relative rounded-xl border overflow-hidden",
          "transition-all duration-300",
          // Variant
          variantStyles[variant],
          // Gradient border effect
          gradientBorder &&
            "before:absolute before:inset-0 before:rounded-xl before:p-[1px]",
          gradientBorder &&
            "before:bg-gradient-to-br before:from-primary-500/50 before:via-secondary-500/50 before:to-primary-500/50",
          gradientBorder && "before:-z-10",
          // Custom
          className,
        )}
        {...props}
      >
        {/* Shine effect overlay */}
        {shine && isHovered && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "200%" }}
              transition={{ duration: 1, ease: "easeInOut" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
            />
          </div>
        )}

        {/* Header */}
        {header && (
          <div className="px-6 py-4 border-b border-gray-800/50">{header}</div>
        )}

        {/* Content */}
        <div className={clsx("p-6", header && "pt-4", footer && "pb-4")}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-800/50 bg-primary-900/30">
            {footer}
          </div>
        )}
      </motion.div>
    );
  },
);

Card.displayName = "Card";

// CardHeader subcomponent
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, description, action, children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx("flex items-start justify-between", className)}
        {...props}
      >
        <div className="flex-1">
          {title && (
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-white/90">{description}</p>
          )}
          {children}
        </div>
        {action && <div className="ml-4">{action}</div>}
      </div>
    );
  },
);

CardHeader.displayName = "CardHeader";

// CardFooter subcomponent
export type CardFooterProps = HTMLAttributes<HTMLDivElement>;

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx("flex items-center gap-3", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardFooter.displayName = "CardFooter";

// Example usage:
// <Card variant="glass" gradientBorder shine>
//   <CardHeader title="Case Details" description="View and edit case information" />
//   <p>Card content goes here</p>
//   <CardFooter>
//     <Button>Save</Button>
//   </CardFooter>
// </Card>
