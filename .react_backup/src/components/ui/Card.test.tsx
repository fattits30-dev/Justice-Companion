/// <reference types="vitest/globals" />
/**
 * Card Component Tests
 *
 * Tests for the Card component variants, sections, and features.
 */

import { render, screen } from "@testing-library/react";
import { createRef } from "react";

import { Card, type CardProps } from "./Card";

type CardVariant = NonNullable<CardProps["variant"]>;

describe("Card", () => {
  describe("rendering", () => {
    it("renders with default props", () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText("Card content")).toBeInTheDocument();
    });

    it("renders children in content area", () => {
      render(
        <Card>
          <p>Paragraph 1</p>
          <p>Paragraph 2</p>
        </Card>
      );
      expect(screen.getByText("Paragraph 1")).toBeInTheDocument();
      expect(screen.getByText("Paragraph 2")).toBeInTheDocument();
    });

    it("merges custom classNames", () => {
      render(
        <Card className="custom-card" data-testid="card">
          Content
        </Card>
      );
      const card = screen.getByTestId("card");
      expect(card).toHaveClass("custom-card");
    });
  });

  describe("variants", () => {
    const variants: CardVariant[] = ["default", "glass", "elevated"];

    variants.forEach((variant) => {
      it(`renders ${variant} variant`, () => {
        render(
          <Card variant={variant} data-testid="card">
            {variant} card
          </Card>
        );
        expect(screen.getByTestId("card")).toBeInTheDocument();
      });
    });

    it("applies default variant styles", () => {
      render(<Card data-testid="card">Default</Card>);
      const card = screen.getByTestId("card");
      expect(card).toHaveClass("bg-primary-900/60");
    });

    it("applies glass variant styles", () => {
      render(
        <Card variant="glass" data-testid="card">
          Glass
        </Card>
      );
      const card = screen.getByTestId("card");
      expect(card).toHaveClass("backdrop-blur-md");
    });

    it("applies elevated variant styles", () => {
      render(
        <Card variant="elevated" data-testid="card">
          Elevated
        </Card>
      );
      const card = screen.getByTestId("card");
      expect(card).toHaveClass("shadow-lg");
    });
  });

  describe("sections", () => {
    it("renders header when provided", () => {
      render(
        <Card header={<h2>Card Header</h2>}>Content</Card>
      );
      expect(screen.getByText("Card Header")).toBeInTheDocument();
    });

    it("renders footer when provided", () => {
      render(
        <Card footer={<button>Action</button>}>Content</Card>
      );
      expect(screen.getByText("Action")).toBeInTheDocument();
    });

    it("renders header, content, and footer in correct order", () => {
      render(
        <Card
          header={<div data-testid="header">Header</div>}
          footer={<div data-testid="footer">Footer</div>}
          data-testid="card"
        >
          <div data-testid="content">Content</div>
        </Card>
      );

      const header = screen.getByTestId("header");
      const content = screen.getByTestId("content");
      const footer = screen.getByTestId("footer");

      // Header before content
      expect(header.compareDocumentPosition(content)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      );
      // Content before footer
      expect(content.compareDocumentPosition(footer)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      );
    });
  });

  describe("hoverable", () => {
    it("is hoverable by default", () => {
      render(<Card data-testid="card">Hoverable</Card>);
      const card = screen.getByTestId("card");
      // Default variant with hover styles - check for border hover
      expect(card).toHaveClass("hover:border-gray-700");
    });

    it("does not apply hover styles when hoverable is false", () => {
      render(
        <Card hoverable={false} data-testid="card">
          Not hoverable
        </Card>
      );
      const card = screen.getByTestId("card");
      expect(card).not.toHaveClass("hover:border-gray-700");
    });
  });

  describe("gradientBorder", () => {
    it("does not have gradient border by default", () => {
      render(<Card data-testid="card">No gradient</Card>);
      const card = screen.getByTestId("card");
      expect(card).not.toHaveClass("before:bg-gradient-to-br");
    });

    it("applies gradient border when enabled", () => {
      render(
        <Card gradientBorder data-testid="card">
          With gradient
        </Card>
      );
      const card = screen.getByTestId("card");
      expect(card).toHaveClass("before:bg-gradient-to-br");
    });
  });

  describe("base styles", () => {
    it("has rounded corners", () => {
      render(<Card data-testid="card">Rounded</Card>);
      const card = screen.getByTestId("card");
      expect(card).toHaveClass("rounded-xl");
    });

    it("has border", () => {
      render(<Card data-testid="card">Bordered</Card>);
      const card = screen.getByTestId("card");
      expect(card).toHaveClass("border");
    });

    it("has overflow hidden for effects", () => {
      render(<Card data-testid="card">Overflow</Card>);
      const card = screen.getByTestId("card");
      expect(card).toHaveClass("overflow-hidden");
    });
  });

  describe("forwardRef", () => {
    it("forwards ref to the div element", () => {
      const ref = createRef<HTMLDivElement>();
      render(<Card ref={ref}>Ref Card</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe("additional props", () => {
    it("passes through additional HTML attributes", () => {
      render(
        <Card data-testid="card" id="my-card" role="article">
          Content
        </Card>
      );
      const card = screen.getByTestId("card");
      expect(card).toHaveAttribute("id", "my-card");
      expect(card).toHaveAttribute("role", "article");
    });
  });
});
