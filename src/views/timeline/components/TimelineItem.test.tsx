import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../../../test-utils/test-utils";
import userEvent from "@testing-library/user-event";
import { TimelineItem } from "./TimelineItem";
import type { DeadlineWithCase } from "../../../domains/timeline/entities/Deadline";

const createMockDeadline = (
  overrides: Partial<DeadlineWithCase> = {},
): DeadlineWithCase => ({
  id: 1,
  caseId: 1,
  userId: 1,
  title: "Submit ET1 Form",
  description: "Employment Tribunal claim form",
  deadlineDate: "2025-02-01",
  priority: "high",
  status: "upcoming",
  completedAt: null,
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
  deletedAt: null,
  caseTitle: "Unfair Dismissal Case",
  caseStatus: "active",
  ...overrides,
});

describe("TimelineItem", () => {
  const mockOnEdit = vi.fn();
  const mockOnComplete = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnCaseClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render deadline title and case title", () => {
      const deadline = createMockDeadline({
        title: "Submit ET1 Form",
        caseTitle: "Unfair Dismissal Case",
      });

      render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      expect(screen.getByText("Submit ET1 Form")).toBeInTheDocument();
      expect(screen.getByText("Unfair Dismissal Case")).toBeInTheDocument();
    });

    it("should render deadline date", () => {
      const deadline = createMockDeadline({ deadlineDate: "2025-02-01" });

      render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      expect(screen.getByText(/Feb 1, 2025/i)).toBeInTheDocument();
    });

    it("should render description when provided", () => {
      const deadline = createMockDeadline({
        description: "Important tribunal deadline",
      });

      render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      expect(
        screen.getByText("Important tribunal deadline"),
      ).toBeInTheDocument();
    });

    it("should not render description section when null", () => {
      const deadline = createMockDeadline({ description: null });

      const { container } = render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      expect(container.querySelector(".description")).not.toBeInTheDocument();
    });
  });

  describe("Priority Badge", () => {
    it("should render high priority badge with danger variant", () => {
      const deadline = createMockDeadline({ priority: "high" });

      render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      const badge = screen.getByText("High");
      expect(badge).toBeInTheDocument();
      expect(badge.closest('[data-variant="danger"]')).toBeInTheDocument();
    });

    it("should render medium priority badge with warning variant", () => {
      const deadline = createMockDeadline({ priority: "medium" });

      render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      const badge = screen.getByText("Medium");
      expect(badge).toBeInTheDocument();
      expect(badge.closest('[data-variant="warning"]')).toBeInTheDocument();
    });

    it("should render low priority badge with neutral variant", () => {
      const deadline = createMockDeadline({ priority: "low" });

      render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      const badge = screen.getByText("Low");
      expect(badge).toBeInTheDocument();
      expect(badge.closest('[data-variant="neutral"]')).toBeInTheDocument();
    });
  });

  describe("Urgency Indicator", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-02-01T00:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should show red (overdue) for overdue deadlines", () => {
      const deadline = createMockDeadline({
        deadlineDate: "2025-01-25",
        status: "overdue",
      });

      const { container } = render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      expect(container.firstChild).toHaveAttribute("data-urgency", "overdue");
    });

    it("should show yellow (urgent) for deadlines < 7 days away", () => {
      const deadline = createMockDeadline({
        deadlineDate: "2025-02-05", // 4 days away
        status: "upcoming",
      });

      const { container } = render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      expect(container.firstChild).toHaveAttribute("data-urgency", "urgent");
    });

    it("should show green (future) for deadlines >= 7 days away", () => {
      const deadline = createMockDeadline({
        deadlineDate: "2025-03-01", // 28 days away
        status: "upcoming",
      });

      const { container } = render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      expect(container.firstChild).toHaveAttribute("data-urgency", "future");
    });

    it("should show gray (completed) for completed deadlines", () => {
      const deadline = createMockDeadline({
        deadlineDate: "2025-02-15",
        status: "completed",
      });

      const { container } = render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      expect(container.firstChild).toHaveAttribute("data-urgency", "completed");
    });
  });

  describe("Status Display", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-02-01T00:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should show "Overdue by X days" for overdue deadlines', () => {
      const deadline = createMockDeadline({
        deadlineDate: "2025-01-28", // 4 days ago
        status: "overdue",
      });

      render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      expect(screen.getByText(/overdue by 4 days/i)).toBeInTheDocument();
    });

    it('should show "X days away" for upcoming deadlines', () => {
      const deadline = createMockDeadline({
        deadlineDate: "2025-02-15", // 14 days away
        status: "upcoming",
      });

      render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      expect(screen.getByText(/14 days away/i)).toBeInTheDocument();
    });

    it('should show "Completed" for completed deadlines', () => {
      const deadline = createMockDeadline({
        deadlineDate: "2025-02-15",
        status: "completed",
      });

      render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      expect(screen.getByText(/completed/i)).toBeInTheDocument();
    });

    it('should show "Due today" for deadlines on current date', () => {
      const deadline = createMockDeadline({
        deadlineDate: "2025-02-01", // today
        status: "upcoming",
      });

      render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      expect(screen.getByText(/due today/i)).toBeInTheDocument();
    });
  });

  describe("Actions", () => {
    it("should call onEdit when Edit button clicked", async () => {
      const deadline = createMockDeadline();
      const user = userEvent.setup();

      render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      const editButton = screen.getByRole("button", { name: /edit/i });
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(deadline);
    });

    it("should call onComplete when Complete button clicked", async () => {
      const deadline = createMockDeadline({ status: "upcoming" });
      const user = userEvent.setup();

      render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      const completeButton = screen.getByRole("button", { name: /complete/i });
      await user.click(completeButton);

      expect(mockOnComplete).toHaveBeenCalledWith(deadline);
    });

    it('should show "Mark Incomplete" for completed deadlines', async () => {
      const deadline = createMockDeadline({ status: "completed" });

      render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      expect(
        screen.getByRole("button", { name: /mark incomplete/i }),
      ).toBeInTheDocument();
    });

    it("should call onDelete when Delete button clicked", async () => {
      const deadline = createMockDeadline();
      const user = userEvent.setup();

      render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith(deadline);
    });

    it("should call onCaseClick when case title is clicked", async () => {
      const deadline = createMockDeadline({
        caseId: 42,
        caseTitle: "Test Case",
      });
      const user = userEvent.setup();

      render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      const caseLink = screen.getByText("Test Case");
      await user.click(caseLink);

      expect(mockOnCaseClick).toHaveBeenCalledWith(42);
    });
  });

  describe("Accessibility", () => {
    it("should have proper test-id for testing", () => {
      const deadline = createMockDeadline({ id: 42 });

      const { container } = render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      expect(container.firstChild).toHaveAttribute(
        "data-testid",
        "timeline-item-42",
      );
    });

    it("should have keyboard-accessible action buttons", () => {
      const deadline = createMockDeadline();

      render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      const editButton = screen.getByRole("button", { name: /edit/i });
      const completeButton = screen.getByRole("button", { name: /complete/i });
      const deleteButton = screen.getByRole("button", { name: /delete/i });

      expect(editButton).toBeInTheDocument();
      expect(completeButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });
  });

  describe("Visual Design", () => {
    it("should render with glass card variant", () => {
      const deadline = createMockDeadline();

      const { container } = render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      const card = container.querySelector('[data-variant="glass"]');
      expect(card).toBeInTheDocument();
    });

    it("should have timeline connector line", () => {
      const deadline = createMockDeadline();

      const { container } = render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      const connector = container.querySelector('[data-timeline="connector"]');
      expect(connector).toBeInTheDocument();
    });

    it("should have timeline dot indicator", () => {
      const deadline = createMockDeadline();

      const { container } = render(
        <TimelineItem
          deadline={deadline}
          onEdit={mockOnEdit}
          onComplete={mockOnComplete}
          onDelete={mockOnDelete}
          onCaseClick={mockOnCaseClick}
        />,
      );

      const dot = container.querySelector('[data-timeline="dot"]');
      expect(dot).toBeInTheDocument();
    });
  });
});
