/// <reference types="vitest/globals" />
/**
 * Button Component Tests
 *
 * Tests for the Button component variants, sizes, states, and features.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { vi } from "vitest";
import { Plus } from "lucide-react";

import { Button, type ButtonProps } from "./Button";

type ButtonVariant = NonNullable<ButtonProps["variant"]>;
type ButtonSize = NonNullable<ButtonProps["size"]>;

describe("Button", () => {
  describe("rendering", () => {
    it("renders with default props", () => {
      render(<Button>Click me</Button>);
      const button = screen.getByRole("button", { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("type", "button");
    });

    it("renders children correctly", () => {
      render(<Button>Submit Form</Button>);
      expect(screen.getByText("Submit Form")).toBeInTheDocument();
    });

    it("merges custom classNames", () => {
      render(<Button className="custom-class">Button</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });
  });

  describe("variants", () => {
    const variants: ButtonVariant[] = ["primary", "secondary", "ghost", "danger"];

    variants.forEach((variant) => {
      it(`renders ${variant} variant`, () => {
        render(<Button variant={variant}>{variant} button</Button>);
        const button = screen.getByRole("button");
        expect(button).toBeInTheDocument();
      });
    });

    it("applies primary styles by default", () => {
      render(<Button>Primary</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("from-primary-500");
    });

    it("applies danger styles", () => {
      render(<Button variant="danger">Delete</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("from-red-500");
    });

    it("applies ghost styles", () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("bg-transparent");
    });
  });

  describe("sizes", () => {
    const sizeClasses: Record<ButtonSize, string[]> = {
      sm: ["px-3", "py-1.5", "text-xs"],
      md: ["px-4", "py-2", "text-sm"],
      lg: ["px-6", "py-3", "text-base"],
    };

    (Object.entries(sizeClasses) as Array<[ButtonSize, string[]]>).forEach(
      ([size, classes]) => {
        it(`applies ${size} size styles`, () => {
          render(<Button size={size}>Sized Button</Button>);
          const button = screen.getByRole("button");
          classes.forEach((cls) => {
            expect(button).toHaveClass(cls);
          });
        });
      }
    );

    it("uses medium size by default", () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("px-4", "py-2", "text-sm");
    });
  });

  describe("disabled state", () => {
    it("is disabled when disabled prop is true", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("does not call onClick when disabled", () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      );
      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it("applies disabled styles", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("disabled:cursor-not-allowed");
    });
  });

  describe("loading state", () => {
    it("is disabled when loading", () => {
      render(<Button loading>Loading</Button>);
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    it("shows loading spinner when loading", () => {
      render(<Button loading>Submit</Button>);
      // The Loader2 icon from lucide-react should be present
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("hides children when loading", () => {
      render(<Button loading>Submit</Button>);
      expect(screen.queryByText("Submit")).not.toBeInTheDocument();
    });

    it("does not call onClick when loading", () => {
      const handleClick = vi.fn();
      render(
        <Button loading onClick={handleClick}>
          Submit
        </Button>
      );
      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("icon support", () => {
    it("renders icon on the left by default", () => {
      render(
        <Button icon={<Plus data-testid="icon" />}>Add Item</Button>
      );
      const icon = screen.getByTestId("icon");
      expect(icon).toBeInTheDocument();
      expect(screen.getByText("Add Item")).toBeInTheDocument();
    });

    it("renders icon on the right when specified", () => {
      render(
        <Button icon={<Plus data-testid="icon" />} iconPosition="right">
          Next
        </Button>
      );
      const icon = screen.getByTestId("icon");
      expect(icon).toBeInTheDocument();
      expect(screen.getByText("Next")).toBeInTheDocument();
    });
  });

  describe("fullWidth", () => {
    it("applies full width when fullWidth is true", () => {
      render(<Button fullWidth>Full Width</Button>);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("w-full");
    });

    it("does not apply full width by default", () => {
      render(<Button>Normal Width</Button>);
      const button = screen.getByRole("button");
      expect(button).not.toHaveClass("w-full");
    });
  });

  describe("click handling", () => {
    it("calls onClick when clicked", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("receives mouse event in onClick", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      fireEvent.click(screen.getByRole("button"));
      expect(handleClick).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "click",
        })
      );
    });
  });

  describe("accessibility", () => {
    it("can receive focus", () => {
      render(<Button>Focusable</Button>);
      const button = screen.getByRole("button");
      button.focus();
      expect(button).toHaveFocus();
    });

    it("forwards aria attributes", () => {
      render(
        <Button aria-label="custom-label" aria-pressed="true">
          Toggle
        </Button>
      );
      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "custom-label");
      expect(button).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("forwardRef", () => {
    it("forwards ref to the button element", () => {
      const ref = createRef<HTMLButtonElement>();
      render(<Button ref={ref}>Ref Button</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });
});
