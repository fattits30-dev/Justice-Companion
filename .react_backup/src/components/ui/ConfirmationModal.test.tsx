/// <reference types="vitest/globals" />
/**
 * ConfirmationModal Component Tests
 *
 * Tests for the ConfirmationModal component variants, actions, and accessibility.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

import { ConfirmationModal } from "./ConfirmationModal";

describe("ConfirmationModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: "Confirm Action",
    message: "Are you sure you want to proceed?",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders when isOpen is true", () => {
      render(<ConfirmationModal {...defaultProps} />);
      expect(screen.getByText("Confirm Action")).toBeInTheDocument();
      expect(screen.getByText("Are you sure you want to proceed?")).toBeInTheDocument();
    });

    it("does not render when isOpen is false", () => {
      render(<ConfirmationModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText("Confirm Action")).not.toBeInTheDocument();
    });

    it("renders title and message", () => {
      render(
        <ConfirmationModal
          {...defaultProps}
          title="Delete Item"
          message="This action cannot be undone."
        />
      );
      expect(screen.getByText("Delete Item")).toBeInTheDocument();
      expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
    });
  });

  describe("buttons", () => {
    it("renders default button text", () => {
      render(<ConfirmationModal {...defaultProps} />);
      expect(screen.getByText("Confirm")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("renders custom button text", () => {
      render(
        <ConfirmationModal
          {...defaultProps}
          confirmText="Yes, delete"
          cancelText="No, keep it"
        />
      );
      expect(screen.getByText("Yes, delete")).toBeInTheDocument();
      expect(screen.getByText("No, keep it")).toBeInTheDocument();
    });
  });

  describe("actions", () => {
    it("calls onClose with true when confirm is clicked", () => {
      const onClose = vi.fn();
      render(<ConfirmationModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText("Confirm"));

      expect(onClose).toHaveBeenCalledWith(true);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose with false when cancel is clicked", () => {
      const onClose = vi.fn();
      render(<ConfirmationModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText("Cancel"));

      expect(onClose).toHaveBeenCalledWith(false);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose with false when X button is clicked", () => {
      const onClose = vi.fn();
      render(<ConfirmationModal {...defaultProps} onClose={onClose} />);

      const closeButton = screen.getByLabelText("Close modal");
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledWith(false);
    });

    it("calls onClose with false when backdrop is clicked", () => {
      const onClose = vi.fn();
      render(<ConfirmationModal {...defaultProps} onClose={onClose} />);

      // Click on the backdrop (the outer fixed div)
      const backdrop = document.querySelector(".fixed.inset-0");
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalledWith(false);
      }
    });

    it("does not close when clicking inside the modal", () => {
      const onClose = vi.fn();
      render(<ConfirmationModal {...defaultProps} onClose={onClose} />);

      // Click on the modal content
      fireEvent.click(screen.getByText("Are you sure you want to proceed?"));

      // onClose should not be called from clicking content
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("variants", () => {
    it("applies warning variant styles by default", () => {
      const { container } = render(<ConfirmationModal {...defaultProps} />);
      const icon = container.querySelector(".text-yellow-400");
      expect(icon).toBeInTheDocument();
    });

    it("applies danger variant styles", () => {
      const { container } = render(
        <ConfirmationModal {...defaultProps} variant="danger" />
      );
      const icon = container.querySelector(".text-red-400");
      expect(icon).toBeInTheDocument();
    });

    it("applies info variant styles", () => {
      const { container } = render(
        <ConfirmationModal {...defaultProps} variant="info" />
      );
      const icon = container.querySelector(".text-blue-400");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has close button with aria-label", () => {
      render(<ConfirmationModal {...defaultProps} />);
      expect(screen.getByLabelText("Close modal")).toBeInTheDocument();
    });

    it("renders semantic heading", () => {
      render(<ConfirmationModal {...defaultProps} />);
      const heading = screen.getByRole("heading", { level: 3 });
      expect(heading).toHaveTextContent("Confirm Action");
    });
  });

  describe("overlay", () => {
    it("has backdrop blur", () => {
      render(<ConfirmationModal {...defaultProps} />);
      const backdrop = document.querySelector(".backdrop-blur-sm");
      expect(backdrop).toBeInTheDocument();
    });

    it("has dark overlay", () => {
      render(<ConfirmationModal {...defaultProps} />);
      const backdrop = document.querySelector(".bg-black\\/50");
      expect(backdrop).toBeInTheDocument();
    });
  });
});
