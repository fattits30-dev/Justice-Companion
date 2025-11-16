/**
 * TagColorPicker Component
 * Color picker for selecting tag colors from predefined palette
 */

import React from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

// 16-color palette matching backend validation
const TAG_COLORS = [
  { hex: "#EF4444", name: "Red" },
  { hex: "#F59E0B", name: "Amber" },
  { hex: "#10B981", name: "Green" },
  { hex: "#3B82F6", name: "Blue" },
  { hex: "#8B5CF6", name: "Violet" },
  { hex: "#EC4899", name: "Pink" },
  { hex: "#6B7280", name: "Gray" },
  { hex: "#14B8A6", name: "Teal" },
  { hex: "#F97316", name: "Orange" },
  { hex: "#A855F7", name: "Purple" },
  { hex: "#84CC16", name: "Lime" },
  { hex: "#06B6D4", name: "Cyan" },
  { hex: "#F43F5E", name: "Rose" },
  { hex: "#10B981", name: "Emerald" },
  { hex: "#6366F1", name: "Indigo" },
  { hex: "#64748B", name: "Slate" },
] as const;

export interface TagColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const TagColorPicker: React.FC<TagColorPickerProps> = ({
  selectedColor,
  onColorSelect,
  className = "",
  size = "md",
}) => {
  const sizeClasses = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  return (
    <div
      className={`grid grid-cols-8 gap-2 ${className}`}
      role="radiogroup"
      aria-label="Select tag color"
    >
      {TAG_COLORS.map(({ hex, name }) => {
        const isSelected = selectedColor.toUpperCase() === hex.toUpperCase();

        return (
          <motion.button
            key={hex}
            type="button"
            onClick={() => onColorSelect(hex)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`
              ${sizeClasses[size]}
              rounded-full
              flex items-center justify-center
              transition-all duration-200
              focus:outline-hidden
              focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              ${isSelected ? "ring-2 ring-offset-2 ring-white/30 scale-110" : "hover:ring-2 hover:ring-offset-2 hover:ring-white/20"}
            `}
            style={{ backgroundColor: hex }}
            aria-label={`Select ${name} color`}
            aria-checked={isSelected}
            role="radio"
          >
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Check
                  size={iconSizes[size]}
                  className="text-white drop-shadow-lg"
                  strokeWidth={3}
                />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

/**
 * Helper function to get color name from hex
 */
export function getColorName(hex: string): string {
  const color = TAG_COLORS.find(
    (c) => c.hex.toUpperCase() === hex.toUpperCase(),
  );
  return color?.name || "Custom";
}

/**
 * Helper function to validate if hex color is in predefined palette
 */
export function isValidTagColor(hex: string): boolean {
  return TAG_COLORS.some((c) => c.hex.toUpperCase() === hex.toUpperCase());
}
