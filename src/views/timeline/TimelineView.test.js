import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../lib/apiClient.ts";
import { render, screen, waitFor, within, } from "../../test-utils/test-utils.tsx";
import { TimelineView } from "./TimelineView.tsx";
vi.mock("../../lib/apiClient.ts", () => ({
    apiClient: {
        auth: {
            getSession: vi.fn(),
            login: vi.fn(),
            logout: vi.fn(),
        },
        deadlines: {
            list: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        cases: {
            list: vi.fn(),
        },
    },
}));
const mockSessionId = "test-session-123";
const createMockDeadline = (overrides = {}) => ({
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
const createMockCase = (overrides = {}) => ({
    id: 1,
    title: "Unfair Dismissal Case",
    description: null,
    caseType: "employment",
    status: "active",
    userId: 1,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
});
const createDeadlinesResponse = (deadlines = []) => ({
    success: true,
    data: {
        items: deadlines.map((deadline) => ({
            id: deadline.id,
            caseId: deadline.caseId,
            userId: deadline.userId,
            title: deadline.title,
            description: deadline.description ?? undefined,
            deadlineDate: deadline.deadlineDate,
            priority: deadline.priority,
            status: deadline.status,
            completed: deadline.status === "completed",
            completedAt: deadline.completedAt ?? undefined,
            reminderEnabled: false,
            reminderDaysBefore: 7,
            createdAt: deadline.createdAt,
            updatedAt: deadline.updatedAt,
            caseTitle: deadline.caseTitle,
            caseStatus: deadline.caseStatus,
        })),
        total: deadlines.length,
        overdueCount: deadlines.filter((d) => d.status === "overdue").length,
        hasMore: false,
        limit: Math.max(deadlines.length, 10),
        offset: 0,
    },
});
const createCasesResponse = (cases = []) => ({
    success: true,
    data: {
        items: cases,
        total: cases.length,
        hasMore: false,
        limit: Math.max(cases.length, 10),
        offset: 0,
    },
});
const toApiDeadline = (deadline) => ({
    id: deadline.id,
    caseId: deadline.caseId,
    userId: deadline.userId,
    title: deadline.title,
    description: deadline.description ?? undefined,
    deadlineDate: deadline.deadlineDate,
    priority: deadline.priority,
    status: deadline.status,
    completed: deadline.status === "completed",
    completedAt: deadline.completedAt ?? undefined,
    reminderEnabled: false,
    reminderDaysBefore: 7,
    createdAt: deadline.createdAt,
    updatedAt: deadline.updatedAt,
});
const createMutationResponse = (deadline = createMockDeadline()) => ({
    success: true,
    data: toApiDeadline(deadline),
});
const setDeadlinesResponse = (deadlines) => {
    vi.mocked(apiClient.deadlines.list).mockResolvedValue(createDeadlinesResponse(deadlines));
};
const setDeadlinesError = (message) => {
    vi.mocked(apiClient.deadlines.list).mockResolvedValue({
        success: false,
        error: {
            code: "TEST_ERROR",
            message,
        },
    });
};
const setCasesResponse = (cases) => {
    vi.mocked(apiClient.cases.list).mockResolvedValue(createCasesResponse(cases));
};
beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("sessionId", mockSessionId);
    vi.mocked(apiClient.auth.getSession).mockResolvedValue({
        success: true,
        data: {
            user: {
                id: 1,
                username: "testuser",
                email: "test@example.com",
                role: "user",
                is_active: true,
            },
            session: {
                id: mockSessionId,
                user_id: 1,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            },
        },
    });
    setDeadlinesResponse([]);
    setCasesResponse([]);
    vi.mocked(apiClient.deadlines.create).mockResolvedValue(createMutationResponse());
    vi.mocked(apiClient.deadlines.update).mockResolvedValue(createMutationResponse());
    vi.mocked(apiClient.deadlines.delete).mockResolvedValue({
        success: true,
        data: undefined,
    });
});
describe("TimelineView", () => {
    describe("Rendering", () => {
        it("should render timeline header with title and actions", async () => {
            setDeadlinesResponse([]);
            setCasesResponse([]);
            render(<TimelineView />);
            // Wait for async auth + data loading to complete
            await waitFor(() => {
                expect(screen.getByText("Timeline Tracker")).toBeInTheDocument();
            });
            expect(screen.getByRole("button", { name: /add deadline/i })).toBeInTheDocument();
        });
        it("should render empty state when no deadlines exist", async () => {
            setDeadlinesResponse([]);
            setCasesResponse([]);
            render(<TimelineView />);
            await waitFor(() => {
                expect(screen.getByText(/no deadlines yet/i)).toBeInTheDocument();
            });
        });
        it("should render loading state initially", async () => {
            vi.mocked(apiClient.deadlines.list).mockReturnValue(new Promise(() => { })); // Never resolves
            setCasesResponse([]);
            render(<TimelineView />);
            // Wait for AuthContext to load first
            await waitFor(() => {
                expect(screen.getByText(/loading/i)).toBeInTheDocument();
            });
        });
        it("should render error state when API fails", async () => {
            setDeadlinesError("Failed to fetch deadlines");
            setCasesResponse([]);
            render(<TimelineView />);
            await waitFor(() => {
                expect(screen.getByText(/failed to fetch deadlines/i)).toBeInTheDocument();
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
            setDeadlinesResponse(deadlines);
            setCasesResponse([]);
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
            setDeadlinesResponse(deadlines);
            setCasesResponse([]);
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
            const mockCase = createMockCase({
                id: 1,
                title: "Unfair Dismissal Case",
                status: "active",
            });
            setDeadlinesResponse([deadline]);
            setCasesResponse([mockCase]);
            render(<TimelineView />);
            // Wait for both deadline title and case title
            await waitFor(() => {
                expect(screen.getByText("Submit ET1 Form")).toBeInTheDocument();
                // Find the timeline item and check for case title within it
                const timelineItem = screen.getByTestId("timeline-item-1");
                expect(within(timelineItem).getByText("Unfair Dismissal Case")).toBeInTheDocument();
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
            setDeadlinesResponse([deadline]);
            setCasesResponse([]);
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
            setDeadlinesResponse([deadline]);
            setCasesResponse([]);
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
            setDeadlinesResponse([deadline]);
            setCasesResponse([]);
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
            setDeadlinesResponse([deadline]);
            setCasesResponse([]);
            render(<TimelineView />);
            await waitFor(() => {
                const item = screen.getByTestId("timeline-item-1");
                expect(item).toHaveAttribute("data-urgency", "completed");
            });
        });
    });
    describe("Add Deadline", () => {
        it("should open add deadline dialog when button clicked", async () => {
            setDeadlinesResponse([]);
            setCasesResponse([]);
            const user = userEvent.setup();
            render(<TimelineView />);
            // Wait for component to load before clicking button
            await waitFor(() => {
                expect(screen.getByRole("button", { name: /add deadline/i })).toBeInTheDocument();
            });
            const addButton = screen.getByRole("button", { name: /add deadline/i });
            await user.click(addButton);
            expect(screen.getByRole("dialog")).toBeInTheDocument();
            expect(screen.getByText(/new deadline/i)).toBeInTheDocument();
        });
        it("should create new deadline via API", async () => {
            setDeadlinesResponse([]);
            setCasesResponse([
                createMockCase({ id: 1, title: "Test Case", status: "active" }),
            ]);
            vi.mocked(apiClient.deadlines.create).mockResolvedValue(createMutationResponse());
            const user = userEvent.setup();
            render(<TimelineView />);
            // Wait for component to load before clicking button
            await waitFor(() => {
                expect(screen.getByRole("button", { name: /add deadline/i })).toBeInTheDocument();
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
            await waitFor(() => {
                // If API was called, dialog should close
                expect(vi.mocked(apiClient.deadlines.create)).toHaveBeenCalledTimes(1);
            }, { timeout: 3000 });
            expect(vi.mocked(apiClient.deadlines.create)).toHaveBeenCalledWith(expect.objectContaining({
                title: "New Deadline",
                deadlineDate: "2026-03-15",
                caseId: 1,
            }));
        });
    });
    describe("Edit Deadline", () => {
        it("should open edit dialog when edit button clicked", async () => {
            const deadline = createMockDeadline({ title: "Submit ET1 Form" });
            setDeadlinesResponse([deadline]);
            setCasesResponse([]);
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
            setDeadlinesResponse([deadline]);
            setCasesResponse([]);
            vi.mocked(apiClient.deadlines.update).mockResolvedValue(createMutationResponse({ ...deadline, title: "Updated Title" }));
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
                expect(vi.mocked(apiClient.deadlines.update)).toHaveBeenCalledWith(1, expect.objectContaining({
                    title: "Updated Title",
                }));
            });
        });
    });
    describe("Mark Complete", () => {
        it("should mark deadline as complete", async () => {
            const deadline = createMockDeadline({ id: 1, status: "upcoming" });
            setDeadlinesResponse([deadline]);
            setCasesResponse([]);
            vi.mocked(apiClient.deadlines.update).mockResolvedValue(createMutationResponse({ ...deadline, status: "completed" }));
            const user = userEvent.setup();
            render(<TimelineView />);
            await waitFor(() => {
                expect(screen.getByText("Submit ET1 Form")).toBeInTheDocument();
            });
            const completeButton = screen.getByRole("button", { name: /complete/i });
            await user.click(completeButton);
            await waitFor(() => {
                expect(vi.mocked(apiClient.deadlines.update)).toHaveBeenCalledWith(1, {
                    status: "completed",
                });
            });
        });
        it("should toggle completed status back to upcoming", async () => {
            const deadline = createMockDeadline({ id: 1, status: "completed" });
            setDeadlinesResponse([deadline]);
            setCasesResponse([]);
            vi.mocked(apiClient.deadlines.update).mockResolvedValue(createMutationResponse({ ...deadline, status: "upcoming" }));
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
                expect(vi.mocked(apiClient.deadlines.update)).toHaveBeenCalledWith(1, {
                    status: "upcoming",
                });
            });
        });
    });
    describe("Delete Deadline", () => {
        it("should show confirmation dialog before deleting", async () => {
            const deadline = createMockDeadline({ id: 1 });
            setDeadlinesResponse([deadline]);
            setCasesResponse([]);
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
            setDeadlinesResponse([deadline]);
            setCasesResponse([]);
            vi.mocked(apiClient.deadlines.delete).mockResolvedValue({
                success: true,
                data: undefined,
            });
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
                expect(vi.mocked(apiClient.deadlines.delete)).toHaveBeenCalledWith(1);
            });
        });
    });
    describe("Filter by Case", () => {
        it("should show all cases in filter dropdown", async () => {
            const cases = [
                createMockCase({ id: 1, title: "Case A", status: "active" }),
                createMockCase({ id: 2, title: "Case B", status: "active" }),
            ];
            setDeadlinesResponse([]);
            setCasesResponse(cases);
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
                createMockCase({ id: 1, title: "Case A", status: "active" }),
                createMockCase({ id: 2, title: "Case B", status: "active" }),
            ];
            setDeadlinesResponse(deadlines);
            setCasesResponse(cases);
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
            setDeadlinesResponse(deadlines);
            setCasesResponse([]);
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
            setDeadlinesResponse([deadline]);
            setCasesResponse([]);
            render(<TimelineView />);
            await waitFor(() => {
                expect(screen.getByText("High")).toBeInTheDocument();
            });
        });
        it("should display medium priority badge", async () => {
            const deadline = createMockDeadline({ priority: "medium" });
            setDeadlinesResponse([deadline]);
            setCasesResponse([]);
            render(<TimelineView />);
            await waitFor(() => {
                expect(screen.getByText("Medium")).toBeInTheDocument();
            });
        });
        it("should display low priority badge", async () => {
            const deadline = createMockDeadline({ priority: "low" });
            setDeadlinesResponse([deadline]);
            setCasesResponse([]);
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
            setDeadlinesResponse([deadline]);
            setCasesResponse([]);
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
            setDeadlinesResponse([deadline]);
            setCasesResponse([]);
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
            setDeadlinesResponse([deadline]);
            setCasesResponse([]);
            render(<TimelineView />);
            await waitFor(() => {
                expect(screen.getByText(/completed/i)).toBeInTheDocument();
            });
        });
    });
    describe("Layout", () => {
        it("should have fixed header and scrollable content", async () => {
            setDeadlinesResponse([]);
            setCasesResponse([]);
            const { container } = render(<TimelineView />);
            // Wait for component to load
            await waitFor(() => {
                expect(screen.getByText("Timeline Tracker")).toBeInTheDocument();
            });
            const mainContainer = container.firstChild;
            expect(mainContainer).toHaveClass("h-full");
            // Find the sticky header container
            const header = screen.getByText("Timeline Tracker");
            const stickyContainer = header.closest(".sticky");
            expect(stickyContainer).toHaveClass("sticky", "top-0");
        });
    });
});
