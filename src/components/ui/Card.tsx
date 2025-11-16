import { forwardRef, ReactNode, useState } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { clsx } from "clsx";

export interface CardProps
  extends Omit<HTMLMotionProps<"div">, "ref" | "children"> {
  variant?: "default" | "glass" | "elevated";
  hoverable?: boolean;
  gradientBorder?: boolean;
  shine?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
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
            "before:absolute before:inset-0 before:rounded-xl before:p-px",
          gradientBorder &&
            "before:bg-linear-to-br before:from-primary-500/50 before:via-secondary-500/50 before:to-primary-500/50",
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
              animate={{ x: "100%" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent"
            />
          </div>
        )}

        {/* Header */}
        {header && <div className="p-4">{header}</div>}

        {/* Content */}
        <div className="p-4">{children}</div>

        {/* Footer */}
        {footer && <div className="p-4">{footer}</div>}
      </motion.div>
    );
  },
);
