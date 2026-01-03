/// <reference types="vitest/globals" />
/**
 * Badge Component Tests
 *
 * Tests for the Badge component variants, sizes, and features.
 */

import { render, screen } from "@testing-library/react";
import { createRef } from "react";

import { Badge, type BadgeProps } from "./Badge";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;
type BadgeSize = NonNullable<BadgeProps["size"]>;

const variantExpectations: Array<[BadgeVariant, string[]]> = [
  [
    "success",
    ["bg-success-500/10", "text-success-400", "border-success-500/20"],
  ],
  [
    "warning",
    ["bg-warning-500/10", "text-warning-400", "border-warning-500/20"],
  ],
  ["danger", ["bg-danger-500/10", "text-danger-400", "border-danger-500/20"]],
  ["info", ["bg-primary-500/10", "text-primary-400", "border-primary-500/20"]],
  [
    "primary",
    ["bg-primary-500/10", "text-primary-400", "border-primary-500/20"],
  ],
  [
    "secondary",
    ["bg-secondary-500/10", "text-secondary-400", "border-secondary-500/20"],
  ],
  ["neutral", ["bg-gray-500/10", "text-white/90", "border-gray-500/20"]],
];

const sizeExpectations: Record<BadgeSize, string[]> = {
  sm: ["h-5", "px-2", "text-xs", "gap-1"],
  md: ["h-6", "px-2.5", "text-sm", "gap-1.5"],
  lg: ["h-7", "px-3", "text-base", "gap-2"],
};

const dotColorExpectations: Array<[BadgeVariant, string]> = [
  ["success", "bg-success-500"],
  ["warning", "bg-warning-500"],
  ["danger", "bg-danger-500"],
  ["info", "bg-primary-500"],
  ["primary", "bg-primary-500"],
  ["secondary", "bg-secondary-500"],
  ["neutral", "bg-gray-500"],
];

const dotSizeExpectations: Record<BadgeSize, string[]> = {
  sm: ["w-1.5", "h-1.5"],
  md: ["w-2", "h-2"],
  lg: ["w-2.5", "h-2.5"],
};

const iconWrapperExpectations: Record<BadgeSize, string[]> = {
  sm: ["w-3", "h-3"],
  md: ["w-3.5", "h-3.5"],
  lg: ["w-4", "h-4"],
};

const neutralVariantClasses =
  variantExpectations.find(([variant]) => variant === "neutral")?.[1] ?? [];

describe("Badge", () => {
  describe("rendering", () => {
    it("renders with default props", () => {
      render(<Badge>Default Badge</Badge>);
      const badge = screen.getByText("Default Badge");
      expect(badge).toHaveClass(
        "inline-flex",
        "items-center",
        "justify-center",
        "font-medium",
        "rounded-md",
        "border",
        "transition-all",
        "duration-200",
        "backdrop-blur-sm",
        ...sizeExpectations.md,
        ...neutralVariantClasses,
      );
    });

    it("renders children", () => {
      render(<Badge>Hello World</Badge>);
      expect(screen.getByText("Hello World")).toBeInTheDocument();
    });

    it("merges custom classNames", () => {
      render(<Badge className="custom-class">Badge</Badge>);
      const badge = screen.getByText("Badge");
      expect(badge).toHaveClass("custom-class");
    });
  });

  describe("variants", () => {
    variantExpectations.forEach(([variant, classes]) => {
      it(`applies ${variant} styles`, () => {
        render(<Badge variant={variant}>Variant Badge</Badge>);
        const badge = screen.getByText("Variant Badge");
        expect(badge).toHaveClass(...classes);
      });
    });

    it("applies glow shadow when enabled", () => {
      render(
        <Badge variant="success" glow>
          Glowing Badge
        </Badge>,
      );
      const badge = screen.getByText("Glowing Badge");
      expect(badge).toHaveClass("shadow-success");
    });
  });

  describe("sizes", () => {
    it("uses medium size by default", () => {
      render(<Badge>Sized Badge</Badge>);
      const badge = screen.getByText("Sized Badge");
      expect(badge).toHaveClass(...sizeExpectations.md);
    });

    (Object.entries(sizeExpectations) as Array<[BadgeSize, string[]]>).forEach(
      ([size, classes]) => {
        it(`applies ${size} size styles`, () => {
          render(<Badge size={size}>Sized Badge</Badge>);
          const badge = screen.getByText("Sized Badge");
          expect(badge).toHaveClass(...classes);
        });
      },
    );
  });

  describe("dot indicator", () => {
    it("does not render dot by default", () => {
      render(<Badge>Dotless</Badge>);
      const badge = screen.getByText("Dotless");
      expect(badge.querySelector(".rounded-full")).toBeNull();
    });

    it("renders dot when enabled", () => {
      render(<Badge dot>With Dot</Badge>);
      const badge = screen.getByText("With Dot");
      const dot = badge.querySelector(".rounded-full") as HTMLElement;
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveClass(
        "rounded-full",
        ...dotSizeExpectations.md,
        "bg-gray-500",
      );
    });

    dotColorExpectations.forEach(([variant, color]) => {
      it(`applies ${variant} dot color`, () => {
        render(
          <Badge dot variant={variant}>
            {variant}
          </Badge>,
        );
        const badge = screen.getByText(variant);
        const dot = badge.querySelector(".rounded-full") as HTMLElement;
        expect(dot).toHaveClass(color);
      });
    });

    (
      Object.entries(dotSizeExpectations) as Array<[BadgeSize, string[]]>
    ).forEach(([size, classes]) => {
      it(`applies ${size} dot size`, () => {
        render(
          <Badge dot size={size}>
            Dot Size
          </Badge>,
        );
        const badge = screen.getByText("Dot Size");
        const dot = badge.querySelector(".rounded-full") as HTMLElement;
        expect(dot).toHaveClass(...classes);
      });
    });
  });

  describe("pulse animation", () => {
    it("applies animate-pulse when pulse and dot are set", () => {
      render(
        <Badge dot pulse>
          Pulsing
        </Badge>,
      );
      const badge = screen.getByText("Pulsing");
      const dot = badge.querySelector(".rounded-full") as HTMLElement;
      expect(dot).toHaveClass("animate-pulse");
    });
  });

  describe("glow effect", () => {
    it("does not apply glow by default", () => {
      render(<Badge>Plain Badge</Badge>);
      const badge = screen.getByText("Plain Badge");
      expect(badge).not.toHaveClass(
        "shadow-success",
        "shadow-warning",
        "shadow-danger",
      );
    });

    it("applies variant-specific glow class", () => {
      render(
        <Badge glow variant="warning">
          Warning Glow
        </Badge>,
      );
      const badge = screen.getByText("Warning Glow");
      expect(badge).toHaveClass("shadow-warning");
    });
  });

  describe("icon", () => {
    it("does not render icon by default", () => {
      render(<Badge>No Icon</Badge>);
      expect(screen.queryByTestId("badge-icon")).toBeNull();
    });

    it("renders provided icon", () => {
      const TestIcon = () => <svg data-testid="badge-icon" />;
      render(<Badge icon={<TestIcon />}>Has Icon</Badge>);
      expect(screen.getByTestId("badge-icon")).toBeInTheDocument();
    });

    (
      Object.entries(iconWrapperExpectations) as Array<[BadgeSize, string[]]>
    ).forEach(([size, classes]) => {
      it(`applies ${size} icon wrapper size`, () => {
        const TestIcon = () => <svg data-testid="badge-icon" />;
        render(
          <Badge icon={<TestIcon />} size={size}>
            Icon Wrapper
          </Badge>,
        );
        const icon = screen.getByTestId("badge-icon");
        const wrapper = icon.parentElement as HTMLElement;
        expect(wrapper).toHaveClass(...classes);
      });
    });
  });

  describe("accessibility", () => {
    it("forwards aria props", () => {
      render(
        <Badge aria-label="status-badge" role="status">
          Accessible Badge
        </Badge>,
      );
      const badge = screen.getByLabelText("status-badge");
      expect(badge).toHaveAttribute("role", "status");
    });
  });

  describe("forwardRef", () => {
    it("forwards refs to the span element", () => {
      const ref = createRef<HTMLSpanElement>();
      render(<Badge ref={ref}>Ref Badge</Badge>);
      expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    });
  });
});
