/// <reference types="vitest/globals" />
/**
 * Skeleton Component Tests
 *
 * Tests for Skeleton and preset components (SkeletonText, SkeletonAvatar, etc.)
 */

import { render, screen } from "@testing-library/react";
import { createRef } from "react";

import {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonList,
  type SkeletonProps,
  type SkeletonAvatarProps,
} from "./Skeleton";

type SkeletonVariant = NonNullable<SkeletonProps["variant"]>;
type SkeletonAnimation = NonNullable<SkeletonProps["animation"]>;
type AvatarSize = NonNullable<SkeletonAvatarProps["size"]>;

describe("Skeleton", () => {
  describe("rendering", () => {
    it("renders with default props", () => {
      render(<Skeleton data-testid="skeleton" />);
      expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    });

    it("merges custom classNames", () => {
      render(<Skeleton className="custom-skeleton" data-testid="skeleton" />);
      expect(screen.getByTestId("skeleton")).toHaveClass("custom-skeleton");
    });
  });

  describe("variants", () => {
    const variantClasses: Record<SkeletonVariant, string> = {
      text: "rounded",
      circular: "rounded-full",
      rectangular: "rounded-none",
      rounded: "rounded-lg",
    };

    (Object.entries(variantClasses) as Array<[SkeletonVariant, string]>).forEach(
      ([variant, expectedClass]) => {
        it(`applies ${variant} variant styles`, () => {
          render(<Skeleton variant={variant} data-testid="skeleton" />);
          expect(screen.getByTestId("skeleton")).toHaveClass(expectedClass);
        });
      }
    );

    it("uses rectangular variant by default", () => {
      render(<Skeleton data-testid="skeleton" />);
      expect(screen.getByTestId("skeleton")).toHaveClass("rounded-none");
    });
  });

  describe("dimensions", () => {
    it("applies custom width", () => {
      render(<Skeleton width="200px" data-testid="skeleton" />);
      expect(screen.getByTestId("skeleton")).toHaveStyle({ width: "200px" });
    });

    it("applies custom height", () => {
      render(<Skeleton height="100px" data-testid="skeleton" />);
      expect(screen.getByTestId("skeleton")).toHaveStyle({ height: "100px" });
    });

    it("applies numeric width", () => {
      render(<Skeleton width={150} data-testid="skeleton" />);
      expect(screen.getByTestId("skeleton")).toHaveStyle({ width: "150px" });
    });

    it("text variant defaults to 100% width", () => {
      render(<Skeleton variant="text" data-testid="skeleton" />);
      expect(screen.getByTestId("skeleton")).toHaveStyle({ width: "100%" });
    });
  });

  describe("animation", () => {
    it("applies shimmer animation by default", () => {
      render(<Skeleton data-testid="skeleton" />);
      expect(screen.getByTestId("skeleton")).toHaveClass("overflow-hidden");
    });

    it("applies pulse animation", () => {
      render(<Skeleton animation="pulse" data-testid="skeleton" />);
      expect(screen.getByTestId("skeleton")).toHaveClass("animate-pulse");
    });

    it("applies no animation when specified", () => {
      render(<Skeleton animation="none" data-testid="skeleton" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).not.toHaveClass("animate-pulse");
      expect(skeleton).not.toHaveClass("overflow-hidden");
    });
  });

  describe("count", () => {
    it("renders single skeleton by default", () => {
      render(<Skeleton data-testid="skeleton" />);
      expect(screen.getAllByTestId("skeleton")).toHaveLength(1);
    });

    it("renders multiple skeletons when count > 1", () => {
      const { container } = render(<Skeleton count={3} />);
      // Each skeleton is wrapped in a div, so we check the space-y-2 container children
      const wrapper = container.querySelector(".space-y-2");
      expect(wrapper).toBeInTheDocument();
      expect(wrapper?.children.length).toBe(3);
    });
  });

  describe("forwardRef", () => {
    it("forwards ref for single skeleton", () => {
      const ref = createRef<HTMLDivElement>();
      render(<Skeleton ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it("forwards ref for multiple skeletons container", () => {
      const ref = createRef<HTMLDivElement>();
      render(<Skeleton ref={ref} count={3} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });
});

describe("SkeletonText", () => {
  it("renders 3 lines by default", () => {
    const { container } = render(<SkeletonText />);
    const lines = container.querySelectorAll('[class*="rounded"]');
    expect(lines.length).toBe(3);
  });

  it("renders specified number of lines", () => {
    const { container } = render(<SkeletonText lines={5} />);
    const lines = container.querySelectorAll('[class*="rounded"]');
    expect(lines.length).toBe(5);
  });

  it("applies last line width", () => {
    const { container } = render(<SkeletonText lines={2} lastLineWidth="50%" />);
    const lines = container.querySelectorAll('[class*="rounded"]');
    const lastLine = lines[lines.length - 1];
    expect(lastLine).toHaveStyle({ width: "50%" });
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<SkeletonText ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe("SkeletonAvatar", () => {
  const sizeClasses: Record<AvatarSize, string[]> = {
    sm: ["w-8", "h-8"],
    md: ["w-10", "h-10"],
    lg: ["w-12", "h-12"],
    xl: ["w-16", "h-16"],
  };

  it("renders circular skeleton", () => {
    render(<SkeletonAvatar data-testid="avatar" />);
    expect(screen.getByTestId("avatar")).toHaveClass("rounded-full");
  });

  it("uses medium size by default", () => {
    render(<SkeletonAvatar data-testid="avatar" />);
    const avatar = screen.getByTestId("avatar");
    expect(avatar).toHaveClass("w-10", "h-10");
  });

  (Object.entries(sizeClasses) as Array<[AvatarSize, string[]]>).forEach(
    ([size, classes]) => {
      it(`applies ${size} size`, () => {
        render(<SkeletonAvatar size={size} data-testid="avatar" />);
        const avatar = screen.getByTestId("avatar");
        classes.forEach((cls) => {
          expect(avatar).toHaveClass(cls);
        });
      });
    }
  );

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<SkeletonAvatar ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe("SkeletonCard", () => {
  it("renders without avatar by default", () => {
    const { container } = render(<SkeletonCard />);
    const avatars = container.querySelectorAll(".rounded-full");
    expect(avatars.length).toBe(0);
  });

  it("renders with avatar when showAvatar is true", () => {
    const { container } = render(<SkeletonCard showAvatar />);
    const avatar = container.querySelector(".rounded-full");
    expect(avatar).toBeInTheDocument();
  });

  it("renders specified number of description lines", () => {
    const { container } = render(<SkeletonCard lines={5} />);
    // SkeletonCard uses SkeletonText for lines
    const textContainer = container.querySelector(".space-y-2");
    expect(textContainer).toBeInTheDocument();
  });

  it("has card styling", () => {
    render(<SkeletonCard data-testid="card" />);
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("rounded-xl", "border", "p-6");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<SkeletonCard ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe("SkeletonList", () => {
  it("renders 3 items by default", () => {
    const { container } = render(<SkeletonList />);
    const items = container.querySelectorAll(".flex.items-center.gap-3");
    expect(items.length).toBe(3);
  });

  it("renders specified number of items", () => {
    const { container } = render(<SkeletonList items={5} />);
    const items = container.querySelectorAll(".flex.items-center.gap-3");
    expect(items.length).toBe(5);
  });

  it("renders without avatars by default", () => {
    const { container } = render(<SkeletonList />);
    const avatars = container.querySelectorAll(".rounded-full");
    expect(avatars.length).toBe(0);
  });

  it("renders with avatars when showAvatar is true", () => {
    const { container } = render(<SkeletonList items={3} showAvatar />);
    const avatars = container.querySelectorAll(".rounded-full");
    expect(avatars.length).toBe(3);
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<SkeletonList ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
