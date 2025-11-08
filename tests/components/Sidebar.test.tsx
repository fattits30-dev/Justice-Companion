/**
 * Sidebar Component Tests
 *
 * TDD Cycle: RED (Write tests first - they will fail)
 *
 * Tests cover:
 * - Component rendering
 * - Navigation links
 * - Active route highlighting
 * - User info display
 * - Logout functionality
 * - Accessibility
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "react-router-dom";
import { Sidebar } from "../../src/components/Sidebar";

describe("Sidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * TEST 1: Renders navigation links
   */
  test("renders all navigation links", () => {
    render(<Sidebar currentRoute="/dashboard" />);

    // Check for main navigation items
    expect(
      screen.getByRole("link", { name: /dashboard/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /cases/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /documents|evidence/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /chat|assistant/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument();
  });

  /**
   * TEST 2: Highlights active route
   */
  test("highlights the active navigation link", () => {
    render(<Sidebar currentRoute="/cases" />);

    const casesLink = screen.getByRole("link", { name: /cases/i });
    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });

    // Active link should have aria-current
    expect(casesLink).toHaveAttribute("aria-current", "page");
    expect(dashboardLink).not.toHaveAttribute("aria-current");
  });

  /**
   * TEST 3: Displays user info when provided
   */
  test("displays user information", () => {
    const user = {
      username: "testuser",
      email: "test@example.com",
    };

    render(<Sidebar currentRoute="/dashboard" user={user} />);

    expect(screen.getByText("testuser")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  /**
   * TEST 4: Hides user info when not provided
   */
  test("does not show user info when user is null", () => {
    render(<Sidebar currentRoute="/dashboard" user={null} />);

    // Should not render user section
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });

  /**
   * TEST 5: Logout button calls onLogout
   */
  test("calls onLogout when logout button is clicked", () => {
    const mockLogout = vi.fn();
    const user = {
      username: "testuser",
      email: "test@example.com",
    };

    render(
      <Sidebar currentRoute="/dashboard" user={user} onLogout={mockLogout} />
    );

    const logoutButton = screen.getByRole("button", {
      name: /logout|sign out/i,
    });
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
  });

  /**
   * TEST 6: Navigation links have correct hrefs
   */
  test("navigation links have correct href attributes", () => {
    render(<Sidebar currentRoute="/dashboard" />);

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard"
    );
    expect(screen.getByRole("link", { name: /cases/i })).toHaveAttribute(
      "href",
      "/cases"
    );
    expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute(
      "href",
      "/settings"
    );
  });

  /**
   * TEST 7: onNavigate callback is called when link is clicked
   */
  test("calls onNavigate when navigation link is clicked", () => {
    const mockNavigate = vi.fn();

    render(<Sidebar currentRoute="/dashboard" onNavigate={mockNavigate} />);

    const casesLink = screen.getByRole("link", { name: /cases/i });
    fireEvent.click(casesLink);

    expect(mockNavigate).toHaveBeenCalledWith("/cases");
  });

  /**
   * TEST 8: Shows app title/logo
   */
  test("displays app title or logo", () => {
    render(<Sidebar currentRoute="/dashboard" />);

    // Should show app name
    expect(screen.getByText(/justice companion/i)).toBeInTheDocument();
  });

  /**
   * TEST 9: Accessible navigation structure
   */
  test("has proper navigation landmark", () => {
    render(<Sidebar currentRoute="/dashboard" />);

    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();
  });

  /**
   * TEST 10: All links have icons
   */
  test("navigation links include icons", () => {
    render(<Sidebar currentRoute="/dashboard" />);

    // Get all navigation links
    const links = screen.getAllByRole("link");

    // Each link should have an svg icon
    links.forEach((link) => {
      const svg = link.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  /**
   * TEST 11: Collapse/expand functionality
   */
  test("can be collapsed and expanded", () => {
    render(
      <Sidebar
        currentRoute="/dashboard"
        isCollapsed={false}
        onToggleCollapse={vi.fn()}
      />
    );

    // Should show full text when not collapsed
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
  });

  /**
   * TEST 12: Shows collapsed state
   */
  test("hides text labels when collapsed", () => {
    render(<Sidebar currentRoute="/dashboard" isCollapsed={true} />);

    // Navigation should still be present but text might be hidden
    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();
  });

  /**
   * TEST 13: Toggle button triggers collapse
   */
  test("calls onToggleCollapse when toggle button is clicked", () => {
    const mockToggle = vi.fn();

    render(
      <Sidebar
        currentRoute="/dashboard"
        isCollapsed={false}
        onToggleCollapse={mockToggle}
      />
    );

    const toggleButton = screen.getByRole("button", {
      name: /collapse|expand|toggle/i,
    });
    fireEvent.click(toggleButton);

    expect(mockToggle).toHaveBeenCalled();
  });

  /**
   * TEST 14: Keyboard navigation works
   */
  test("supports keyboard navigation", () => {
    render(<Sidebar currentRoute="/dashboard" />);

    const firstLink = screen.getByRole("link", { name: /dashboard/i });
    firstLink.focus();

    expect(firstLink).toHaveFocus();
  });

  /**
   * TEST 15: Shows notification badges (optional)
   */
  test("displays notification badge when provided", () => {
    const notifications = {
      cases: 3,
    };

    render(<Sidebar currentRoute="/dashboard" notifications={notifications} />);

    // Should show badge with count
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
