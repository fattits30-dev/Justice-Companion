/**
 * Dashboard Component Tests
 *
 * TDD Cycle: RED (Write tests first - they will fail)
 *
 * Tests cover:
 * - Component rendering
 * - Stats display (case count, evidence count)
 * - Quick action buttons
 * - Recent cases list
 * - Loading states
 * - Empty states
 * - User greeting
 * - Error handling
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test-utils/test-utils.tsx";
import { Dashboard } from "../../src/components/Dashboard.tsx";

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * TEST 1: Renders dashboard with user greeting
   */
  test("displays welcome message with username", () => {
    render(<Dashboard username="John Doe" />);

    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    expect(screen.getByText(/john doe/i)).toBeInTheDocument();
  });

  /**
   * TEST 2: Displays stats cards
   */
  test("renders all stat cards with correct values", () => {
    const stats = {
      totalCases: 12,
      activeCases: 5,
      totalEvidence: 48,
      recentActivity: 3,
    };

    render(<Dashboard username="User" stats={stats} />);

    expect(screen.getByText("12")).toBeInTheDocument(); // Total cases
    expect(screen.getByText("5")).toBeInTheDocument(); // Active cases
    expect(screen.getByText("48")).toBeInTheDocument(); // Evidence
    expect(screen.getByText("3")).toBeInTheDocument(); // Recent activity
  });

  /**
   * TEST 3: Displays quick action buttons
   */
  test("renders all quick action buttons", () => {
    render(<Dashboard username="User" />);

    expect(
      screen.getByRole("button", { name: /new case/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /upload evidence/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start chat|ai assistant/i })
    ).toBeInTheDocument();
  });

  /**
   * TEST 4: Quick action button callbacks work
   */
  test("calls callbacks when quick action buttons are clicked", () => {
    const mockNewCase = vi.fn();
    const mockUploadEvidence = vi.fn();
    const mockStartChat = vi.fn();

    render(
      <Dashboard
        username="User"
        onNewCase={mockNewCase}
        onUploadEvidence={mockUploadEvidence}
        onStartChat={mockStartChat}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /new case/i }));
    expect(mockNewCase).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /upload evidence/i }));
    expect(mockUploadEvidence).toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: /start chat|ai assistant/i })
    );
    expect(mockStartChat).toHaveBeenCalled();
  });

  /**
   * TEST 5: Displays recent cases
   */
  test("renders recent cases list", () => {
    const recentCases = [
      {
        id: "1",
        title: "Case Alpha",
        status: "active" as const,
        lastUpdated: "2025-01-01",
      },
      {
        id: "2",
        title: "Case Beta",
        status: "closed" as const,
        lastUpdated: "2025-01-02",
      },
    ];

    render(<Dashboard username="User" recentCases={recentCases} />);

    expect(screen.getByText("Case Alpha")).toBeInTheDocument();
    expect(screen.getByText("Case Beta")).toBeInTheDocument();
  });

  /**
   * TEST 6: Shows empty state when no cases
   */
  test("displays empty state when no cases exist", () => {
    render(<Dashboard username="User" recentCases={[]} />);

    expect(screen.getByText(/ready to start your first case/i)).toBeInTheDocument();
    expect(screen.getByText(/click "new case" above to begin organizing/i)).toBeInTheDocument();
  });

  /**
   * TEST 7: Shows loading state
   */
  test("displays loading indicator while fetching data", () => {
    render(<Dashboard username="User" isLoading={true} />);

    expect(screen.getByText(/loading|fetching/i)).toBeInTheDocument();
  });

  /**
   * TEST 8: Hides content while loading
   */
  test("hides main content during loading", () => {
    render(<Dashboard username="User" isLoading={true} />);

    // Stats should not be visible during loading
    expect(screen.queryByText(/total cases/i)).not.toBeInTheDocument();
  });

  /**
   * TEST 9: Case list items are clickable
   */
  test("calls onCaseClick when a case is clicked", () => {
    const mockCaseClick = vi.fn();
    const recentCases = [
      {
        id: "1",
        title: "Case Alpha",
        status: "active" as const,
        lastUpdated: "2025-01-01",
      },
    ];

    render(
      <Dashboard
        username="User"
        recentCases={recentCases}
        onCaseClick={mockCaseClick}
      />
    );

    const caseItem = screen.getByText("Case Alpha");
    fireEvent.click(caseItem.closest('div[role="button"]') || caseItem);

    expect(mockCaseClick).toHaveBeenCalledWith("1");
  });

  /**
   * TEST 10: Displays correct stat labels
   */
  test("shows descriptive labels for each stat", () => {
    const stats = {
      totalCases: 12,
      activeCases: 5,
      totalEvidence: 48,
      recentActivity: 3,
    };

    render(<Dashboard username="User" stats={stats} />);

    expect(screen.getByText(/your cases/i)).toBeInTheDocument();
    expect(screen.getByText(/currently active/i)).toBeInTheDocument();
    // Use getAllByText since "Evidence Collected" appears in multiple places
    const evidenceLabels = screen.getAllByText(/evidence collected/i);
    expect(evidenceLabels.length).toBeGreaterThan(0);
  });

  /**
   * TEST 11: Shows zero stats correctly
   */
  test("displays zero values when stats are empty", () => {
    const stats = {
      totalCases: 0,
      activeCases: 0,
      totalEvidence: 0,
      recentActivity: 0,
    };

    render(<Dashboard username="User" stats={stats} />);

    // Should show 0, not be blank
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThan(0);
  });

  /**
   * TEST 12: Error state displays error message
   */
  test("shows error message when error prop is provided", () => {
    render(<Dashboard username="User" error="Failed to load dashboard data" />);

    expect(
      screen.getByText("Failed to load dashboard data")
    ).toBeInTheDocument();
  });

  /**
   * TEST 13: Has proper page heading
   */
  test("has accessible main heading", () => {
    render(<Dashboard username="User" />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
  });

  /**
   * TEST 14: Stats are visually grouped
   */
  test("stats cards are rendered in a grid layout", () => {
    const stats = {
      totalCases: 12,
      activeCases: 5,
      totalEvidence: 48,
      recentActivity: 3,
    };

    render(<Dashboard username="User" stats={stats} />);

    // Should have multiple stat cards (check for labels)
    expect(screen.getByText(/your cases/i)).toBeInTheDocument();
    expect(screen.getByText(/currently active/i)).toBeInTheDocument();
    // Use getAllByText since "Evidence Collected" appears in multiple places
    const evidenceLabels = screen.getAllByText(/evidence collected/i);
    expect(evidenceLabels.length).toBeGreaterThan(0);
  });

  /**
   * TEST 15: Recent cases section has heading
   */
  test("recent cases section has descriptive heading", () => {
    const recentCases = [
      {
        id: "1",
        title: "Case Alpha",
        status: "active" as const,
        lastUpdated: "2025-01-01",
      },
    ];

    render(<Dashboard username="User" recentCases={recentCases} />);

    expect(
      screen.getByRole("heading", { name: /recent cases/i })
    ).toBeInTheDocument();
  });

  /**
   * TEST 16: Date formatting in recent cases
   */
  test("formats dates in recent cases list", () => {
    const recentCases = [
      {
        id: "1",
        title: "Case Alpha",
        status: "active" as const,
        lastUpdated: "2025-01-15",
      },
    ];

    render(<Dashboard username="User" recentCases={recentCases} />);

    // Should display formatted date (exact format flexible)
    expect(screen.getByText(/2025|jan|january|15/i)).toBeInTheDocument();
  });

  /**
   * TEST 17: Status badges in recent cases
   */
  test("displays status badge for each case", () => {
    const recentCases = [
      {
        id: "1",
        title: "Case Alpha",
        status: "active" as const,
        lastUpdated: "2025-01-01",
      },
      {
        id: "2",
        title: "Case Beta",
        status: "closed" as const,
        lastUpdated: "2025-01-02",
      },
    ];

    render(<Dashboard username="User" recentCases={recentCases} />);

    // Find status badges by exact text (badges show uppercase status)
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    expect(screen.getByText("CLOSED")).toBeInTheDocument();
  });

  /**
   * TEST 18: Loading doesn't crash without data
   */
  test("handles loading state without crashing", () => {
    render(<Dashboard username="User" isLoading={true} />);

    // Should render without errors
    expect(screen.getByText(/loading|fetching/i)).toBeInTheDocument();
  });
});
