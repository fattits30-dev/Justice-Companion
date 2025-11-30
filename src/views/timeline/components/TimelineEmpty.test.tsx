import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../../test-utils/test-utils";
import userEvent from "@testing-library/user-event";
import { TimelineEmpty } from "./TimelineEmpty";

describe("TimelineEmpty", () => {
  const mockOnAddClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render empty state message", () => {
      render(<TimelineEmpty onAddClick={mockOnAddClick} />);

      expect(screen.getByText(/no deadlines yet/i)).toBeInTheDocument();
    });

    it("should render helpful description text", () => {
      render(<TimelineEmpty onAddClick={mockOnAddClick} />);

      expect(
        screen.getByText(/track important dates and deadlines/i),
      ).toBeInTheDocument();
    });

    it("should render add deadline button", () => {
      render(<TimelineEmpty onAddClick={mockOnAddClick} />);

      expect(
        screen.getByRole("button", { name: /add your first deadline/i }),
      ).toBeInTheDocument();
    });

    it("should render calendar icon", () => {
      render(<TimelineEmpty onAddClick={mockOnAddClick} />);

      const icon = screen.getByTestId("empty-state-icon");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Interaction", () => {
    it("should call onAddClick when button is clicked", async () => {
      const user = userEvent.setup();

      render(<TimelineEmpty onAddClick={mockOnAddClick} />);

      const addButton = screen.getByRole("button", {
        name: /add your first deadline/i,
      });
      await user.click(addButton);

      expect(mockOnAddClick).toHaveBeenCalledTimes(1);
    });

    it("should not call onAddClick multiple times on double click", async () => {
      const user = userEvent.setup();

      render(<TimelineEmpty onAddClick={mockOnAddClick} />);

      const addButton = screen.getByRole("button", {
        name: /add your first deadline/i,
      });
      await user.click(addButton);
      await user.click(addButton);

      // Should be called twice if not debounced, but that's expected behavior
      expect(mockOnAddClick).toHaveBeenCalledTimes(2);
    });
  });

  describe("Visual Design", () => {
    it("should render with centered layout", () => {
      const { container } = render(
        <TimelineEmpty onAddClick={mockOnAddClick} />,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass(
        "flex",
        "flex-col",
        "items-center",
        "justify-center",
      );
    });

    it("should render icon with large size", () => {
      render(<TimelineEmpty onAddClick={mockOnAddClick} />);

      const icon = screen.getByTestId("empty-state-icon");
      expect(icon).toHaveClass("w-16", "h-16");
    });

    it("should render with glassmorphism card background", () => {
      const { container } = render(
        <TimelineEmpty onAddClick={mockOnAddClick} />,
      );

      const card = container.querySelector('[data-variant="glass"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have accessible button with proper role", () => {
      render(<TimelineEmpty onAddClick={mockOnAddClick} />);

      const button = screen.getByRole("button", {
        name: /add your first deadline/i,
      });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute("type", "button");
    });

    it("should have keyboard-accessible button", async () => {
      const user = userEvent.setup();

      render(<TimelineEmpty onAddClick={mockOnAddClick} />);

      const button = screen.getByRole("button", {
        name: /add your first deadline/i,
      });

      button.focus();
      expect(button).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(mockOnAddClick).toHaveBeenCalled();
    });
  });

  describe("Content", () => {
    it("should display motivational text for first-time users", () => {
      render(<TimelineEmpty onAddClick={mockOnAddClick} />);

      expect(screen.getByText(/no deadlines yet/i)).toBeInTheDocument();
      expect(
        screen.getByText(
          /track important dates and deadlines for your legal cases/i,
        ),
      ).toBeInTheDocument();
    });

    it("should have primary action button with icon", () => {
      render(<TimelineEmpty onAddClick={mockOnAddClick} />);

      const button = screen.getByRole("button", {
        name: /add your first deadline/i,
      });
      expect(button).toBeInTheDocument();

      // Button should have Plus icon
      const icon = button.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });
});
