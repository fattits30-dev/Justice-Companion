import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "../../../test-utils/test-utils.tsx";
import { AddDeadlineDialog } from "./AddDeadlineDialog.tsx";
describe("AddDeadlineDialog", () => {
    const mockOnClose = vi.fn();
    const mockOnSubmit = vi.fn();
    const mockCases = [
        { id: 1, title: "Unfair Dismissal Case", status: "active" },
        { id: 2, title: "Discrimination Case", status: "active" },
    ];
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe("Rendering", () => {
        it("should render dialog when open", () => {
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            expect(screen.getByRole("dialog")).toBeInTheDocument();
            expect(screen.getByText(/new deadline/i)).toBeInTheDocument();
        });
        it("should not render when closed", () => {
            render(<AddDeadlineDialog open={false} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });
        it("should render all form fields", () => {
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/case/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
        });
        it("should render action buttons", () => {
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
        });
    });
    describe("Form Validation", () => {
        it("should require title field", async () => {
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            const createButton = screen.getByRole("button", { name: /create/i });
            await userEvent.click(createButton);
            expect(screen.getByText(/title is required/i)).toBeInTheDocument();
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });
        it("should require case selection", async () => {
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            await userEvent.type(screen.getByLabelText(/title/i), "Test Deadline");
            await userEvent.click(screen.getByRole("button", { name: /create/i }));
            expect(screen.getByText(/case is required/i)).toBeInTheDocument();
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });
        it("should require deadline date", async () => {
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            await userEvent.type(screen.getByLabelText(/title/i), "Test Deadline");
            // Select case
            const caseSelect = screen.getByLabelText(/case/i);
            await userEvent.selectOptions(caseSelect, "1"); // Select case with ID=1
            await userEvent.click(screen.getByRole("button", { name: /create/i }));
            expect(screen.getByText(/date is required/i)).toBeInTheDocument();
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });
        it("should not allow past dates", async () => {
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            await userEvent.type(screen.getByLabelText(/title/i), "Test Deadline");
            // Select case
            const caseSelect = screen.getByLabelText(/case/i);
            await userEvent.selectOptions(caseSelect, "1"); // Select case with ID=1
            // Try to set past date (relative to today, will always be in past)
            await userEvent.type(screen.getByLabelText(/date/i), "2020-01-15");
            await userEvent.click(screen.getByRole("button", { name: /create/i }));
            expect(screen.getByText(/date cannot be in the past/i)).toBeInTheDocument();
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });
        it("should validate title length (max 200 characters)", async () => {
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            const longTitle = "A".repeat(201);
            fireEvent.input(screen.getByLabelText(/title/i), {
                target: { value: longTitle },
            });
            await userEvent.click(screen.getByRole("button", { name: /create/i }));
            expect(screen.getByText(/title must be 200 characters or less/i)).toBeInTheDocument();
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });
    });
    describe("Case Selection", () => {
        it("should display all available cases in dropdown", async () => {
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            // Options are rendered in the DOM, no need to click
            expect(screen.getByText("Unfair Dismissal Case")).toBeInTheDocument();
            expect(screen.getByText("Discrimination Case")).toBeInTheDocument();
        });
        it("should show message when no cases available", () => {
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={[]} userId={1}/>);
            expect(screen.getByText(/no cases available/i)).toBeInTheDocument();
        });
        it("should disable submit when no cases available", () => {
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={[]} userId={1}/>);
            const createButton = screen.getByRole("button", { name: /create/i });
            expect(createButton).toBeDisabled();
        });
    });
    describe("Priority Selection", () => {
        it("should default to medium priority", () => {
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            const prioritySelect = screen.getByLabelText(/priority/i);
            expect(prioritySelect).toHaveValue("medium");
        });
        it("should allow changing priority", async () => {
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            const prioritySelect = screen.getByLabelText(/priority/i);
            await userEvent.selectOptions(prioritySelect, "high"); // Select high priority
            expect(prioritySelect).toHaveValue("high");
        });
        it("should display all priority options", async () => {
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            // Options are rendered in the DOM, no need to click
            expect(screen.getByText("High")).toBeInTheDocument();
            expect(screen.getByText("Medium")).toBeInTheDocument();
            expect(screen.getByText("Low")).toBeInTheDocument();
        });
    });
    describe("Form Submission", () => {
        it("should submit valid form data", async () => {
            const user = userEvent.setup();
            mockOnSubmit.mockResolvedValue({ success: true });
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            await user.type(screen.getByLabelText(/title/i), "Submit ET1 Form");
            const caseSelect = screen.getByLabelText(/case/i);
            await user.selectOptions(caseSelect, "1"); // Select case with ID=1
            fireEvent.input(screen.getByLabelText(/date/i), {
                target: { value: "2026-03-15" },
            });
            const prioritySelect = screen.getByLabelText(/priority/i);
            await user.selectOptions(prioritySelect, "high"); // Select high priority
            await user.type(screen.getByLabelText(/description/i), "Important tribunal deadline");
            await user.click(screen.getByRole("button", { name: /create/i }));
            await waitFor(() => {
                expect(mockOnSubmit).toHaveBeenCalledWith({
                    caseId: 1,
                    userId: 1,
                    title: "Submit ET1 Form",
                    deadlineDate: "2026-03-15",
                    priority: "high",
                    description: "Important tribunal deadline",
                });
            });
        });
        it("should close dialog after successful submission", async () => {
            const user = userEvent.setup();
            mockOnSubmit.mockResolvedValue({ success: true });
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            await user.type(screen.getByLabelText(/title/i), "Test Deadline");
            const caseSelect = screen.getByLabelText(/case/i);
            await user.selectOptions(caseSelect, "1"); // Select case with ID=1
            await user.type(screen.getByLabelText(/date/i), "2026-03-15");
            await user.click(screen.getByRole("button", { name: /create/i }));
            await waitFor(() => {
                expect(mockOnClose).toHaveBeenCalled();
            });
        });
        it("should show error message on submission failure", async () => {
            const user = userEvent.setup();
            mockOnSubmit.mockResolvedValue({
                success: false,
                error: "Database error",
            });
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            await user.type(screen.getByLabelText(/title/i), "Test Deadline");
            const caseSelect = screen.getByLabelText(/case/i);
            await user.selectOptions(caseSelect, "1"); // Select case with ID=1
            await user.type(screen.getByLabelText(/date/i), "2026-03-15");
            await user.click(screen.getByRole("button", { name: /create/i }));
            await waitFor(() => {
                expect(screen.getByText(/database error/i)).toBeInTheDocument();
            });
            expect(mockOnClose).not.toHaveBeenCalled();
        });
        it("should disable submit button while submitting", async () => {
            const user = userEvent.setup();
            mockOnSubmit.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1000)));
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            await user.type(screen.getByLabelText(/title/i), "Test Deadline");
            const caseSelect = screen.getByLabelText(/case/i);
            await user.selectOptions(caseSelect, "1"); // Select case with ID=1
            await user.type(screen.getByLabelText(/date/i), "2026-03-15");
            const createButton = screen.getByRole("button", { name: /create/i });
            // Click submit
            await user.click(createButton);
            // Button should be disabled while submitting (loading shows spinner, not text)
            expect(createButton).toBeDisabled();
            // Wait for submission to complete
            await waitFor(() => {
                expect(mockOnSubmit).toHaveBeenCalled();
            });
        });
    });
    describe("Cancel Action", () => {
        it("should close dialog when cancel button clicked", async () => {
            const user = userEvent.setup();
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            const cancelButton = screen.getByRole("button", { name: /cancel/i });
            await user.click(cancelButton);
            expect(mockOnClose).toHaveBeenCalled();
            expect(mockOnSubmit).not.toHaveBeenCalled();
        });
        it("should reset form when reopened after cancel", async () => {
            const user = userEvent.setup();
            const { rerender } = render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            // Fill form
            await user.type(screen.getByLabelText(/title/i), "Test Deadline");
            await user.type(screen.getByLabelText(/description/i), "Test description");
            // Close dialog (triggers reset)
            rerender(<AddDeadlineDialog open={false} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            // Reopen
            rerender(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            // Form should be empty
            expect(screen.getByLabelText(/title/i)).toHaveValue("");
            expect(screen.getByLabelText(/description/i)).toHaveValue("");
        });
    });
    describe("Accessibility", () => {
        it("should have proper ARIA labels", () => {
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            expect(screen.getByRole("dialog")).toHaveAttribute("aria-labelledby");
            expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/case/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
        });
        it("should trap focus within dialog", () => {
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            const dialog = screen.getByRole("dialog");
            expect(dialog).toHaveAttribute("data-focus-trap", "true");
        });
        it("should close on Escape key", async () => {
            const user = userEvent.setup();
            render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            await user.keyboard("{Escape}");
            expect(mockOnClose).toHaveBeenCalled();
        });
    });
    describe("Visual Design", () => {
        it("should render with glassmorphism styling", () => {
            const { container } = render(<AddDeadlineDialog open={true} onClose={mockOnClose} onSubmit={mockOnSubmit} cases={mockCases} userId={1}/>);
            const dialog = container.querySelector('[data-variant="glass"]');
            expect(dialog).toBeInTheDocument();
        });
    });
});
