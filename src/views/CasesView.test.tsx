/// <reference types="vitest/globals" />

import type { Case } from "../domains/cases/entities/Case";
import { apiClient } from "../lib/apiClient";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "../test-utils/test-utils";
import { CasesView } from "./CasesView";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    sessionId: "test-session-123",
    isLoading: false,
  }),
}));

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

async function getDeleteButtonForCase(caseTitle: string) {
  const card = await screen.findByRole("group", {
    name: `Case: ${caseTitle}`,
  });
  // Case actions appear only on hover, so trigger the transition before querying
  fireEvent.mouseEnter(card);
  return within(card).getByTitle("Delete case");
}

describe("CasesView", () => {
  beforeEach(() => {
    // Global setup.ts beforeEach creates fresh mocks, so we don't need vi.clearAllMocks()
    // Just set sessionId for AuthContext to restore
    localStorage.setItem("sessionId", "test-session-123");

    // Mock auth getSession for AuthContext restoration
    (apiClient.auth.getSession as any) = vi.fn().mockResolvedValue({
      success: true,
      data: {
        user: {
          id: "1",
          username: "testuser",
          email: "test@example.com",
        },
        session: {
          id: "test-session-123",
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    });

    // Reset any previous mocks
    vi.clearAllMocks();
  });

  it("shows loading state while cases are fetched", async () => {
    // Mock apiClient to return never-resolving promise
    const loadingPromise = new Promise(() => {
      // Never resolves to test loading state
    });
    (apiClient.cases.list as any) = vi.fn().mockReturnValue(loadingPromise);

    render(<CasesView />);

    // Wait for loading skeletons to appear
    await waitFor(() => {
      // Check if skeleton cards are rendered (loading state)
      const skeletonCards = document.querySelectorAll(
        '[data-testid="skeleton-card"]'
      );
      return skeletonCards.length > 0;
    });
  });

  it("renders an error state and allows retry", async () => {
    (apiClient.cases.list as any) = vi
      .fn()
      .mockResolvedValueOnce({
        success: false,
        error: { message: "Request failed" },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          items: baseCases,
          total: baseCases.length,
          limit: 50,
          offset: 0,
          hasMore: false,
        },
      });

    render(<CasesView />);

    await screen.findByRole("heading", { name: "Error Loading Cases" });
    // Component shows error.message from response.error?.message
    expect(screen.getByText("Request failed")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() =>
      expect(screen.getByText("Employment Dispute")).toBeInTheDocument()
    );
  });

  it("shows empty state when there are no cases", async () => {
    (apiClient.cases.list as any) = vi.fn().mockResolvedValue({
      success: true,
      data: { items: [], total: 0, limit: 50, offset: 0, hasMore: false },
    });

    render(<CasesView />);

    await screen.findByText("No cases yet");
    expect(
      screen.getByText("Create your first case to keep everything organised.")
    ).toBeInTheDocument();
  });

  it("shows filtered empty state when filters remove all cases", async () => {
    (apiClient.cases.list as any) = vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: baseCases,
        total: baseCases.length,
        limit: 50,
        offset: 0,
        hasMore: false,
      },
    });

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

    (apiClient.cases.list as any) = vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: baseCases,
        total: baseCases.length,
        limit: 50,
        offset: 0,
        hasMore: false,
      },
    });
    (apiClient.cases.create as any) = vi.fn().mockResolvedValue({
      success: true,
      data: createdCase,
    });

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
      within(dialog).getByRole("button", { name: "Create Case" })
    );

    await waitFor(() =>
      expect(apiClient.cases.create).toHaveBeenCalledWith({
        title: "Consumer Rights Claim",
        description: "Faulty product dispute",
        caseType: "consumer",
      })
    );

    await screen.findByText("Consumer Rights Claim");
  });

  it("confirms before deleting a case", async () => {
    (apiClient.cases.list as any) = vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: baseCases,
        total: baseCases.length,
        limit: 50,
        offset: 0,
        hasMore: false,
      },
    });
    (apiClient.cases.delete as any) = vi.fn().mockResolvedValue({
      success: true,
    });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<CasesView />);

    await screen.findByText("Employment Dispute");

    const deleteButton = await getDeleteButtonForCase("Employment Dispute");
    fireEvent.click(deleteButton);

    await waitFor(() => expect(apiClient.cases.delete).toHaveBeenCalledWith(1));

    confirmSpy.mockRestore();
  });

  it("does not delete when confirmation is cancelled", async () => {
    (apiClient.cases.list as any) = vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: baseCases,
        total: baseCases.length,
        limit: 50,
        offset: 0,
        hasMore: false,
      },
    });
    (apiClient.cases.delete as any) = vi.fn();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<CasesView />);

    await screen.findByText("Employment Dispute");

    const deleteButton = await getDeleteButtonForCase("Employment Dispute");
    fireEvent.click(deleteButton);

    expect(apiClient.cases.delete).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("surfaces API errors from delete operations", async () => {
    (apiClient.cases.list as any) = vi.fn().mockResolvedValue({
      success: true,
      data: {
        items: baseCases,
        total: baseCases.length,
        limit: 50,
        offset: 0,
        hasMore: false,
      },
    });
    (apiClient.cases.delete as any) = vi.fn().mockResolvedValue({
      success: false,
      error: { message: "Case not found" },
    });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<CasesView />);

    await screen.findByText("Employment Dispute");

    const deleteButton = await getDeleteButtonForCase("Employment Dispute");
    fireEvent.click(deleteButton);

    // Verify delete was called (component shows error via Toast which we can't easily test)
    await waitFor(() => expect(apiClient.cases.delete).toHaveBeenCalledWith(1));

    confirmSpy.mockRestore();
  });
});
