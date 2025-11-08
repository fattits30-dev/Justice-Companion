import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  within,
} from "../../test-utils/test-utils.tsx";
import userEvent from "@testing-library/user-event";
import { TimelineView } from "./TimelineView";
import type { DeadlineWithCase } from "../../domains/timeline/entities/Deadline";

// Mock the window.justiceAPI
const mockJusticeAPI = {
  getDeadlines: vi.fn(),
  getAllCases: vi.fn(),
  createDeadline: vi.fn(),
  updateDeadline: vi.fn(),
  deleteDeadline: vi.fn(),
  getSession: vi.fn(),
};

beforeEach(() => {
  // Clear mocks FIRST before setting up new values
  vi.clearAllMocks();

  // @ts-expect-error - Mocking window API
  window.justiceAPI = mockJusticeAPI;

  // Mock localStorage for session persistence
  localStorage.setItem("sessionId", mockSessionId);

  // Mock session for AuthProvider
  mockJusticeAPI.getSession.mockResolvedValue({
    success: true,
    data: {
      id: 1,
      sessionId: mockSessionId,
      user: {
        id: "1",
        username: "testuser",
        email: "test@example.com",
      },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  });
});

const mockSessionId = "test-session-123";

const createMockDeadline = (
  overrides: Partial<DeadlineWithCase> = {}
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

describe("TimelineView", () => {
  describe("Rendering", () => {
    it("should render timeline header with title and actions", async () => {
      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });

      render(<TimelineView />);

      // Wait for async auth + data loading to complete
      await waitFor(() => {
        expect(screen.getByText("Timeline Tracker")).toBeInTheDocument();
      });

      expect(
        screen.getByRole("button", { name: /add deadline/i })
      ).toBeInTheDocument();
    });

    it("should render empty state when no deadlines exist", async () => {
      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });

      render(<TimelineView />);

      await waitFor(() => {
        expect(screen.getByText(/no deadlines yet/i)).toBeInTheDocument();
      });
    });

    it("should render loading state initially", async () => {
      mockJusticeAPI.getDeadlines.mockReturnValue(new Promise(() => {})); // Never resolves
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });

      render(<TimelineView />);

      // Wait for AuthContext to load first
      await waitFor(() => {
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });
    });

    it("should render error state when API fails", async () => {
      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: false,
        error: "Failed to fetch deadlines",
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });

      render(<TimelineView />);

      await waitFor(() => {
        expect(
          screen.getByText(/failed to fetch deadlines/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Deadline List", () => {
    it("should render list of deadlines", async () => {
      const deadlines = [
        createMockDeadline({
          id: 1,
          title: "Submit ET1 Form",
          deadlineDate: "2025-02-01",
        }),
        createMockDeadline({
          id: 2,
          title: "Gather Evidence",
          deadlineDate: "2025-02-15",
        }),
        createMockDeadline({
          id: 3,
          title: "Tribunal Hearing",
          deadlineDate: "2025-03-01",
        }),
      ];

      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: deadlines,
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });

      render(<TimelineView />);

      await waitFor(() => {
        expect(screen.getByText("Submit ET1 Form")).toBeInTheDocument();
        expect(screen.getByText("Gather Evidence")).toBeInTheDocument();
        expect(screen.getByText("Tribunal Hearing")).toBeInTheDocument();
      });
    });

    it("should sort deadlines by date ascending (soonest first)", async () => {
      const deadlines = [
        createMockDeadline({
          id: 3,
          title: "Future",
          deadlineDate: "2025-03-01",
        }),
        createMockDeadline({
          id: 1,
          title: "Soonest",
          deadlineDate: "2025-02-01",
        }),
        createMockDeadline({
          id: 2,
          title: "Middle",
          deadlineDate: "2025-02-15",
        }),
      ];

      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: deadlines,
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });

      render(<TimelineView />);

      await waitFor(() => {
        const items = screen.getAllByTestId(/^timeline-item-/);
        expect(items).toHaveLength(3);
        // First item should be "Soonest"
        expect(items[0]).toHaveTextContent("Soonest");
        expect(items[1]).toHaveTextContent("Middle");
        expect(items[2]).toHaveTextContent("Future");
      });
    });

    it("should display case title for each deadline", async () => {
      const deadline = createMockDeadline({
        title: "Submit ET1 Form",
        caseId: 1,
      });

      // Provide the case so TimelineView can look it up and set caseTitle
      const mockCase = {
        id: 1,
        title: "Unfair Dismissal Case",
        status: "active",
      };

      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [deadline],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({
        success: true,
        data: [mockCase],
      });

      render(<TimelineView />);

      // Wait for both deadline title and case title
      await waitFor(() => {
        expect(screen.getByText("Submit ET1 Form")).toBeInTheDocument();

        // Find the timeline item and check for case title within it
        const timelineItem = screen.getByTestId("timeline-item-1");
        expect(
          within(timelineItem).getByText("Unfair Dismissal Case")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Color Coding", () => {
    beforeEach(() => {
      // Mock current date to 2025-02-01 (without freezing timers)
      vi.setSystemTime(new Date("2025-02-01T00:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should show red indicator for overdue deadlines", async () => {
      const deadline = createMockDeadline({
        deadlineDate: "2025-01-25", // 7 days ago
        status: "overdue",
      });

      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [deadline],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });

      render(<TimelineView />);

      await waitFor(() => {
        const item = screen.getByTestId("timeline-item-1");
        expect(item).toHaveAttribute("data-urgency", "overdue");
      });
    });

    it("should show yellow indicator for urgent deadlines (< 7 days)", async () => {
      const deadline = createMockDeadline({
        deadlineDate: "2025-02-05", // 4 days away
        status: "upcoming",
      });

      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [deadline],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });

      render(<TimelineView />);

      await waitFor(() => {
        const item = screen.getByTestId("timeline-item-1");
        expect(item).toHaveAttribute("data-urgency", "urgent");
      });
    });

    it("should show green indicator for future deadlines (>= 7 days)", async () => {
      const deadline = createMockDeadline({
        deadlineDate: "2025-03-01", // 28 days away
        status: "upcoming",
      });

      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [deadline],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });

      render(<TimelineView />);

      await waitFor(() => {
        const item = screen.getByTestId("timeline-item-1");
        expect(item).toHaveAttribute("data-urgency", "future");
      });
    });

    it("should show gray indicator for completed deadlines", async () => {
      const deadline = createMockDeadline({
        deadlineDate: "2025-02-15",
        status: "completed",
        completedAt: "2025-02-01T10:00:00Z",
      });

      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [deadline],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });

      render(<TimelineView />);

      await waitFor(() => {
        const item = screen.getByTestId("timeline-item-1");
        expect(item).toHaveAttribute("data-urgency", "completed");
      });
    });
  });

  describe("Add Deadline", () => {
    it("should open add deadline dialog when button clicked", async () => {
      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });

      const user = userEvent.setup();
      render(<TimelineView />);

      // Wait for component to load before clicking button
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add deadline/i })
        ).toBeInTheDocument();
      });

      const addButton = screen.getByRole("button", { name: /add deadline/i });
      await user.click(addButton);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/new deadline/i)).toBeInTheDocument();
    });

    it("should create new deadline via API", async () => {
      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({
        success: true,
        data: [{ id: 1, title: "Test Case", status: "active" }],
      });
      mockJusticeAPI.createDeadline.mockResolvedValue({
        success: true,
        data: createMockDeadline(),
      });

      const user = userEvent.setup();
      render(<TimelineView />);

      // Wait for component to load before clicking button
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /add deadline/i })
        ).toBeInTheDocument();
      });

      // Open dialog
      const addButton = screen.getByRole("button", { name: /add deadline/i });
      await user.click(addButton);

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      // Get dialog to scope queries
      const dialog = screen.getByRole("dialog");
      const { getByLabelText, getByRole } = within(dialog);

      // Fill form (all required fields)
      await user.type(getByLabelText(/title/i), "New Deadline");

      // Select case (required field) - use selectOptions for <select> elements
      const caseSelect = getByLabelText(/case/i);
      await user.selectOptions(caseSelect, "1"); // Select case with ID=1

      // Use future date to avoid validation error
      await user.type(getByLabelText(/date/i), "2026-03-15");

      const createButton = getByRole("button", { name: /create/i });
      await user.click(createButton);

      // Debug: Check if dialog is still open (which would indicate validation failure)
      await waitFor(
        () => {
          // If API was called, dialog should close
          expect(mockJusticeAPI.createDeadline).toHaveBeenCalledTimes(1);
        },
        { timeout: 3000 }
      );

      expect(mockJusticeAPI.createDeadline).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "New Deadline",
          deadlineDate: "2026-03-15",
        }),
        mockSessionId
      );
    });
  });

  describe("Edit Deadline", () => {
    it("should open edit dialog when edit button clicked", async () => {
      const deadline = createMockDeadline({ title: "Submit ET1 Form" });
      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [deadline],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });

      const user = userEvent.setup();
      render(<TimelineView />);

      await waitFor(() => {
        expect(screen.getByText("Submit ET1 Form")).toBeInTheDocument();
      });

      const editButton = screen.getByRole("button", { name: /edit/i });
      await user.click(editButton);

      // Wait for dialog to open and form to be populated
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Submit ET1 Form")).toBeInTheDocument();
      });
    });

    it("should update deadline via API", async () => {
      // Use future date to avoid validation error
      const deadline = createMockDeadline({
        id: 1,
        title: "Old Title",
        deadlineDate: "2026-03-15",
      });
      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [deadline],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });
      mockJusticeAPI.updateDeadline.mockResolvedValue({
        success: true,
        data: { ...deadline, title: "Updated Title" },
      });

      const user = userEvent.setup();
      render(<TimelineView />);

      await waitFor(() => {
        expect(screen.getByText("Old Title")).toBeInTheDocument();
      });

      const editButton = screen.getByRole("button", { name: /edit/i });
      await user.click(editButton);

      // Wait for dialog to open and form to be populated
      await waitFor(() => {
        expect(screen.getByDisplayValue("Old Title")).toBeInTheDocument();
      });

      const titleInput = screen.getByDisplayValue("Old Title");
      await user.clear(titleInput);
      await user.type(titleInput, "Updated Title");
      await user.click(screen.getByRole("button", { name: /update/i }));

      await waitFor(() => {
        expect(mockJusticeAPI.updateDeadline).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            title: "Updated Title",
          }),
          mockSessionId
        );
      });
    });
  });

  describe("Mark Complete", () => {
    it("should mark deadline as complete", async () => {
      const deadline = createMockDeadline({ id: 1, status: "upcoming" });
      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [deadline],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });
      mockJusticeAPI.updateDeadline.mockResolvedValue({
        success: true,
        data: { ...deadline, status: "completed" },
      });

      const user = userEvent.setup();
      render(<TimelineView />);

      await waitFor(() => {
        expect(screen.getByText("Submit ET1 Form")).toBeInTheDocument();
      });

      const completeButton = screen.getByRole("button", { name: /complete/i });
      await user.click(completeButton);

      await waitFor(() => {
        expect(mockJusticeAPI.updateDeadline).toHaveBeenCalledWith(
          1,
          { status: "completed" },
          mockSessionId
        );
      });
    });

    it("should toggle completed status back to upcoming", async () => {
      const deadline = createMockDeadline({ id: 1, status: "completed" });
      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [deadline],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });
      mockJusticeAPI.updateDeadline.mockResolvedValue({
        success: true,
        data: { ...deadline, status: "upcoming" },
      });

      const user = userEvent.setup();
      render(<TimelineView />);

      await waitFor(() => {
        expect(screen.getByText("Submit ET1 Form")).toBeInTheDocument();
      });

      const uncompleteButton = screen.getByRole("button", {
        name: /mark incomplete/i,
      });
      await user.click(uncompleteButton);

      await waitFor(() => {
        expect(mockJusticeAPI.updateDeadline).toHaveBeenCalledWith(
          1,
          { status: "upcoming" },
          mockSessionId
        );
      });
    });
  });

  describe("Delete Deadline", () => {
    it("should show confirmation dialog before deleting", async () => {
      const deadline = createMockDeadline({ id: 1 });
      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [deadline],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });

      const user = userEvent.setup();
      render(<TimelineView />);

      await waitFor(() => {
        expect(screen.getByText("Submit ET1 Form")).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    });

    it("should delete deadline via API when confirmed", async () => {
      const deadline = createMockDeadline({ id: 1 });
      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [deadline],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });
      mockJusticeAPI.deleteDeadline.mockResolvedValue({ success: true });

      const user = userEvent.setup();
      render(<TimelineView />);

      await waitFor(() => {
        expect(screen.getByText("Submit ET1 Form")).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole("button", { name: /delete/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockJusticeAPI.deleteDeadline).toHaveBeenCalledWith(
          1,
          mockSessionId
        );
      });
    });
  });

  describe("Filter by Case", () => {
    it("should show all cases in filter dropdown", async () => {
      const cases = [
        { id: 1, title: "Case A", status: "active" as const },
        { id: 2, title: "Case B", status: "active" as const },
      ];

      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({
        success: true,
        data: cases,
      });

      const user = userEvent.setup();
      render(<TimelineView />);

      await waitFor(() => {
        expect(screen.getByRole("combobox")).toBeInTheDocument();
      });

      const filterSelect = screen.getByRole("combobox");
      await user.click(filterSelect);

      expect(screen.getByText("All Cases")).toBeInTheDocument();
      expect(screen.getByText("Case A")).toBeInTheDocument();
      expect(screen.getByText("Case B")).toBeInTheDocument();
    });

    it("should filter deadlines by selected case", async () => {
      const deadlines = [
        createMockDeadline({
          id: 1,
          caseId: 1,
          title: "Deadline 1",
          caseTitle: "Case A",
        }),
        createMockDeadline({
          id: 2,
          caseId: 2,
          title: "Deadline 2",
          caseTitle: "Case B",
        }),
      ];
      const cases = [
        { id: 1, title: "Case A", status: "active" as const },
        { id: 2, title: "Case B", status: "active" as const },
      ];

      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: deadlines,
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({
        success: true,
        data: cases,
      });

      const user = userEvent.setup();
      render(<TimelineView />);

      await waitFor(() => {
        expect(screen.getByText("Deadline 1")).toBeInTheDocument();
        expect(screen.getByText("Deadline 2")).toBeInTheDocument();
      });

      // Filter to Case A - use selectOptions for <select> elements
      const filterSelect = screen.getByRole("combobox");
      await user.selectOptions(filterSelect, "1"); // Select case with ID=1

      // Wait for filter to apply - Only Deadline 1 should be visible
      await waitFor(() => {
        expect(screen.getByText("Deadline 1")).toBeInTheDocument();
        expect(screen.queryByText("Deadline 2")).not.toBeInTheDocument();
      });
    });

    it('should show all deadlines when "All Cases" is selected', async () => {
      const deadlines = [
        createMockDeadline({ id: 1, caseId: 1, title: "Deadline 1" }),
        createMockDeadline({ id: 2, caseId: 2, title: "Deadline 2" }),
      ];

      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: deadlines,
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });

      render(<TimelineView />);

      await waitFor(() => {
        expect(screen.getByText("Deadline 1")).toBeInTheDocument();
        expect(screen.getByText("Deadline 2")).toBeInTheDocument();
      });

      // Verify "All Cases" is selected by default
      const filterSelect = screen.getByRole("combobox");
      expect(filterSelect).toHaveTextContent("All Cases");
    });
  });

  describe("Priority Badges", () => {
    it("should display high priority badge", async () => {
      const deadline = createMockDeadline({ priority: "high" });
      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [deadline],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });

      render(<TimelineView />);

      await waitFor(() => {
        expect(screen.getByText("High")).toBeInTheDocument();
      });
    });

    it("should display medium priority badge", async () => {
      const deadline = createMockDeadline({ priority: "medium" });
      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [deadline],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });

      render(<TimelineView />);

      await waitFor(() => {
        expect(screen.getByText("Medium")).toBeInTheDocument();
      });
    });

    it("should display low priority badge", async () => {
      const deadline = createMockDeadline({ priority: "low" });
      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [deadline],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });

      render(<TimelineView />);

      await waitFor(() => {
        expect(screen.getByText("Low")).toBeInTheDocument();
      });
    });
  });

  describe("Days Until/Past Display", () => {
    beforeEach(() => {
      // Mock current date to 2025-02-01 (without freezing timers)
      vi.setSystemTime(new Date("2025-02-01T00:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should show "OVERDUE" with days past for overdue deadlines', async () => {
      const deadline = createMockDeadline({
        deadlineDate: "2025-01-28", // 4 days ago
        status: "overdue",
      });

      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [deadline],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });

      render(<TimelineView />);

      await waitFor(() => {
        expect(screen.getByText(/overdue by 4 days/i)).toBeInTheDocument();
      });
    });

    it("should show days away for upcoming deadlines", async () => {
      const deadline = createMockDeadline({
        deadlineDate: "2025-02-15", // 14 days away
        status: "upcoming",
      });

      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [deadline],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });

      render(<TimelineView />);

      await waitFor(() => {
        expect(screen.getByText(/14 days away/i)).toBeInTheDocument();
      });
    });

    it('should show "Completed" for completed deadlines', async () => {
      const deadline = createMockDeadline({
        deadlineDate: "2025-02-15",
        status: "completed",
      });

      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [deadline],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });

      render(<TimelineView />);

      await waitFor(() => {
        expect(screen.getByText(/completed/i)).toBeInTheDocument();
      });
    });
  });

  describe("Layout", () => {
    it("should have fixed header and scrollable content", async () => {
      mockJusticeAPI.getDeadlines.mockResolvedValue({
        success: true,
        data: [],
      });
      mockJusticeAPI.getAllCases.mockResolvedValue({ success: true, data: [] });

      const { container } = render(<TimelineView />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText("Timeline Tracker")).toBeInTheDocument();
      });

      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass("h-full");

      // Find the sticky header container
      const header = screen.getByText("Timeline Tracker");
      const stickyContainer = header.closest(".sticky");
      expect(stickyContainer).toHaveClass("sticky", "top-0");
    });
  });
});
