/**
 * TagBadge Component
 * Displays a tag with color and optional remove button
 */

import React from "react";
import { X } from "lucide-react";

export interface TagBadgeProps {
  name: string;
  color: string;
  onRemove?: () => void;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outlined";
  className?: string;
}

export const TagBadge: React.FC<TagBadgeProps> = ({
  name,
  color,
  onRemove,
  size = "md",
  variant = "default",
  className = "",
}) => {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-2.5 py-1 gap-1.5",
    lg: "text-base px-3 py-1.5 gap-2",
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  const baseClasses = `
    inline-flex items-center rounded-full font-medium
    transition-all duration-200 whitespace-nowrap
    ${sizeClasses[size]}
    ${className}
  `;

  const variantStyles =
    variant === "default"
      ? {
          backgroundColor: color,
          color: getContrastColor(color),
          border: "none",
        }
      : {
          backgroundColor: "transparent",
          borderColor: color,
          color: color,
          borderWidth: "1.5px",
          borderStyle: "solid",
        };

  return (
    <span className={baseClasses} style={variantStyles}>
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-70 transition-opacity focus:outline-hidden focus:ring-2 focus:ring-offset-1 rounded-full"
          style={{ color: variantStyles.color }}
          aria-label={`Remove ${name} tag`}
        >
          <X size={iconSizes[size]} />
        </button>
      )}
    </span>
  );
};

/**
 * Helper function to determine contrast color for text
 * Uses WCAG luminance formula to ensure readability
 */
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace("#", "");

  // Convert to RGB
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  // Calculate relative luminance (WCAG formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return white for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}
