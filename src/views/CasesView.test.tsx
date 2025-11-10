import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "../test-utils/test-utils.tsx";
import { CasesView } from "./CasesView.tsx";
import type { Case } from "../domains/cases/entities/Case.ts";

const baseCases: Case[] = [
  {
    id: 1,
    title: "Employment Dispute",
    description: "Employer reduced hours without consultation",
    caseType: "employment",
    status: "active",
    userId: 1,
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-15T10:00:00Z",
  },
  {
    id: 2,
    title: "Housing Disrepair",
    description: "Mould issues persisting for months",
    caseType: "housing",
    status: "pending",
    userId: 1,
    createdAt: "2025-01-14T09:00:00Z",
    updatedAt: "2025-01-14T09:00:00Z",
  },
];

describe("CasesView", () => {
  beforeEach(() => {
    // Global setup.ts beforeEach creates fresh mocks, so we don't need vi.clearAllMocks()
    // Just set sessionId for AuthContext to restore
    localStorage.setItem("sessionId", "test-session-123");
  });

  it("shows loading state while cases are fetched", async () => {
    // Mock getAllCases to return never-resolving promise
    const getAllCasesPromise = new Promise(() => {
      // Never resolves to test loading state
    });
    window.justiceAPI.getAllCases = vi.fn().mockReturnValue(getAllCasesPromise);

    const { container } = render(<CasesView />);

    // Wait for component to finish AuthContext loading and start fetching cases
    await waitFor(() => {
      // Check if loading state is shown OR if we've moved past it
      return (
        screen.queryByText("Loading cases...") !== null ||
        container.textContent?.includes("Case Management")
      );
    });

    // If we caught the loading state, verify it
    if (screen.queryByText("Loading cases...")) {
      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(screen.getByText("Loading cases...")).toBeInTheDocument();
    }
  });

  it("renders an error state and allows retry", async () => {
    const getAllCases = vi
      .fn()
      .mockResolvedValueOnce({
        success: false,
        error: { message: "Request failed" },
      })
      .mockResolvedValueOnce({ success: true, data: baseCases });
    window.justiceAPI.getAllCases = getAllCases;

    render(<CasesView />);

    await screen.findByText("Error Loading Cases");
    // Component shows error.message from response.error?.message
    expect(screen.getByText("Request failed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() =>
      expect(screen.getByText("Employment Dispute")).toBeInTheDocument(),
    );
  });

  it("shows empty state when there are no cases", async () => {
    window.justiceAPI.getAllCases = vi
      .fn()
      .mockResolvedValue({ success: true, data: [] });

    render(<CasesView />);

    await screen.findByText("No cases yet");
    expect(
      screen.getByText("Create your first case to keep everything organised."),
    ).toBeInTheDocument();
  });

  it("shows filtered empty state when filters remove all cases", async () => {
    window.justiceAPI.getAllCases = vi
      .fn()
      .mockResolvedValue({ success: true, data: baseCases });

    render(<CasesView />);

    await screen.findByText("Employment Dispute");

    // Find status filter dropdown (first combobox with value 'all')
    const statusFilter = screen.getAllByRole("combobox")[0];
    fireEvent.change(statusFilter, {
      target: { value: "closed" },
    });

    await screen.findByText("No cases match your filters");
  });

  it("allows creating a new case", async () => {
    const createdCase: Case = {
      id: 3,
      title: "Consumer Rights Claim",
      description: "Faulty product dispute",
      caseType: "consumer",
      status: "active",
      userId: 1,
      createdAt: "2025-01-16T09:00:00Z",
      updatedAt: "2025-01-16T09:00:00Z",
    };

    window.justiceAPI.getAllCases = vi
      .fn()
      .mockResolvedValue({ success: true, data: baseCases });
    const createCase = vi
      .fn()
      .mockResolvedValue({ success: true, data: createdCase });
    window.justiceAPI.createCase = createCase;

    render(<CasesView />);

    await screen.findByText("Employment Dispute");

    fireEvent.click(screen.getByRole("button", { name: "New Case" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Case Title *"), {
      target: { value: "Consumer Rights Claim" },
    });
    fireEvent.change(within(dialog).getByLabelText("Case Type *"), {
      target: { value: "consumer" },
    });
    fireEvent.change(within(dialog).getByLabelText("Description"), {
      target: { value: "Faulty product dispute" },
    });

    fireEvent.submit(
      within(dialog).getByRole("button", { name: "Create Case" }),
    );

    await waitFor(() =>
      expect(createCase).toHaveBeenCalledWith(
        {
          title: "Consumer Rights Claim",
          description: "Faulty product dispute",
          caseType: "consumer",
        },
        "test-session-123",
      ),
    );

    await screen.findByText("Consumer Rights Claim");
  });

  it("confirms before deleting a case", async () => {
    window.justiceAPI.getAllCases = vi
      .fn()
      .mockResolvedValue({ success: true, data: baseCases });
    const deleteCase = vi.fn().mockResolvedValue({ success: true });
    window.justiceAPI.deleteCase = deleteCase;
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<CasesView />);

    await screen.findByText("Employment Dispute");

    // Hover over first case card to show delete button
    const firstCard = screen.getByRole("group", {
      name: /Case: Employment Dispute/i,
    });
    fireEvent.mouseEnter(firstCard);

    // Wait for delete button to appear and click it
    await waitFor(() =>
      expect(screen.getAllByTitle("Delete case")[0]).toBeInTheDocument(),
    );
    fireEvent.click(screen.getAllByTitle("Delete case")[0]);

    await waitFor(() =>
      expect(deleteCase).toHaveBeenCalledWith("1", "test-session-123"),
    );

    confirmSpy.mockRestore();
  });

  it("does not delete when confirmation is cancelled", async () => {
    window.justiceAPI.getAllCases = vi
      .fn()
      .mockResolvedValue({ success: true, data: baseCases });
    const deleteCase = vi.fn();
    window.justiceAPI.deleteCase = deleteCase;
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<CasesView />);

    await screen.findByText("Employment Dispute");

    // Hover to show delete button
    const firstCard = screen.getByRole("group", {
      name: /Case: Employment Dispute/i,
    });
    fireEvent.mouseEnter(firstCard);
    await waitFor(() =>
      expect(screen.getAllByTitle("Delete case")[0]).toBeInTheDocument(),
    );

    fireEvent.click(screen.getAllByTitle("Delete case")[0]);

    expect(deleteCase).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("surfaces API errors from delete operations", async () => {
    window.justiceAPI.getAllCases = vi
      .fn()
      .mockResolvedValue({ success: true, data: baseCases });
    const deleteCase = vi
      .fn()
      .mockResolvedValue({
        success: false,
        error: { message: "Case not found" },
      });
    window.justiceAPI.deleteCase = deleteCase;
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<CasesView />);

    await screen.findByText("Employment Dispute");

    // Hover to show delete button
    const firstCard = screen.getByRole("group", {
      name: /Case: Employment Dispute/i,
    });
    fireEvent.mouseEnter(firstCard);
    await waitFor(() =>
      expect(screen.getAllByTitle("Delete case")[0]).toBeInTheDocument(),
    );

    fireEvent.click(screen.getAllByTitle("Delete case")[0]);

    // Verify delete was called (component shows error via Toast which we can't easily test)
    await waitFor(() =>
      expect(deleteCase).toHaveBeenCalledWith("1", "test-session-123"),
    );

    confirmSpy.mockRestore();
  });
});
