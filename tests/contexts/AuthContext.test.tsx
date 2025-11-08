/**
 * AuthContext Tests
 *
 * TDD Cycle: RED (Write tests first - they will fail)
 *
 * Tests cover:
 * - Provider rendering
 * - Initial state (unauthenticated)
 * - Login action (sets user & session)
 * - Logout action (clears state)
 * - Session persistence/restoration
 * - Loading states
 * - Error handling
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@/test-utils/test-utils.tsx";
import { AuthProvider, useAuth } from "../../src/contexts/AuthContext.tsx";

// Test component that consumes AuthContext
function TestComponent() {
  const { user, isAuthenticated, isLoading, login, logout, error } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? "authenticated" : "unauthenticated"}
      </div>
      <div data-testid="loading">{isLoading ? "loading" : "ready"}</div>
      {user && <div data-testid="username">{user.username}</div>}
      {error && <div data-testid="error">{error}</div>}
      <button onClick={() => login("testuser", "password", false)}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage for session management
    const localStorageMock = {
      getItem: vi.fn(() => null), // No session by default
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    Reflect.set(globalThis.window, "localStorage", localStorageMock);
    // Mock getSession to return no session by default (overridden per test)
    globalThis.window.justiceAPI.getSession = vi.fn().mockResolvedValue({
      success: true,
      data: null,
    });
  });

  /**
   * TEST 1: Provider renders children
   */
  test("renders children wrapped in AuthProvider", () => {
    render(
      <AuthProvider>
        <div data-testid="child">Test Child</div>
      </AuthProvider>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  /**
   * TEST 2: Initial state is unauthenticated
   */
  test("starts with unauthenticated state", () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId("auth-status")).toHaveTextContent(
      "unauthenticated"
    );
    expect(screen.queryByTestId("username")).not.toBeInTheDocument();
  });

  /**
   * TEST 3: Initial state is not loading
   */
  test("starts in ready state (not loading)", () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId("loading")).toHaveTextContent("ready");
  });

  /**
   * TEST 4: Login action sets user and session
   */
  test("sets authenticated state after successful login", async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      success: true,
      data: {
        user: { id: "1", username: "testuser", email: "test@example.com" },
        session: { id: "test-session-id" },
      },
    });
    globalThis.window.justiceAPI.login = mockLogin;

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByText("Login");
    await act(async () => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "authenticated"
      );
      expect(screen.getByTestId("username")).toHaveTextContent("testuser");
    });
  });

  /**
   * TEST 5: Login shows loading state
   */
  test("shows loading state during login", async () => {
    const mockLogin = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return {
        success: true,
        data: {
          user: { id: "1", username: "testuser" },
          session: { id: "test-session-123" },
        },
      };
    });
    globalThis.window.justiceAPI.login = mockLogin;

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByText("Login");
    await act(async () => {
      loginButton.click();
    });

    // Should show loading immediately
    expect(screen.getByTestId("loading")).toHaveTextContent("loading");

    // Wait for login to complete
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("ready");
    });
  });

  /**
   * TEST 6: Logout clears user and session
   */
  test("clears state after logout", async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      success: true,
      data: {
        user: { id: "1", username: "testuser", email: "test@example.com" },
        session: { id: "test-session-id" },
      },
    });
    const mockLogout = vi.fn().mockResolvedValue({ success: true });
    globalThis.window.justiceAPI.login = mockLogin;
    globalThis.window.justiceAPI.logout = mockLogout;

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Login first
    const loginButton = screen.getByText("Login");
    await act(async () => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "authenticated"
      );
    });

    // Now logout
    const logoutButton = screen.getByText("Logout");
    await act(async () => {
      logoutButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "unauthenticated"
      );
      expect(screen.queryByTestId("username")).not.toBeInTheDocument();
    });
  });

  /**
   * TEST 7: Login failure shows error
   */
  test("shows error message when login fails", async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      success: false,
      message: "Invalid credentials", // AuthContext uses 'message' not 'error'
    });
    const mockGetSession = vi.fn().mockResolvedValue({
      success: true,
      data: null, // No existing session
    });
    globalThis.window.justiceAPI.login = mockLogin;
    globalThis.window.justiceAPI.getSession = mockGetSession;

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for session restoration to complete
    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
    });

    const loginButton = screen.getByText("Login");
    await act(async () => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent(
        "Invalid credentials"
      );
      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "unauthenticated"
      );
    });
  });

  /**
   * TEST 8: Session restoration on mount
   */
  test("restores session from IPC on mount", async () => {
    // Mock localStorage to have a sessionId
    const localStorageMock = {
      getItem: vi.fn((key) =>
        key === "sessionId" ? "test-session-123" : null
      ),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    Reflect.set(globalThis.window, "localStorage", localStorageMock);

    const mockGetSession = vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: "session-123",
        user: {
          id: "1",
          username: "testuser",
          email: "test@example.com",
        },
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    globalThis.window.justiceAPI.getSession = mockGetSession;

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should call getSession on mount with the sessionId
    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalledWith("test-session-123");
    });

    // Should set authenticated state
    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "authenticated"
      );
      expect(screen.getByTestId("username")).toHaveTextContent("testuser");
    });
  });

  /**
   * TEST 9: No session restoration if getSession fails
   */
  test("stays unauthenticated if no session exists", async () => {
    const mockGetSession = vi.fn().mockResolvedValue({
      success: true,
      data: null,
    });
    globalThis.window.justiceAPI.getSession = mockGetSession;

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(mockGetSession).toHaveBeenCalled();
    });

    // Should remain unauthenticated
    expect(screen.getByTestId("auth-status")).toHaveTextContent(
      "unauthenticated"
    );
  });

  /**
   * TEST 10: useAuth hook throws error outside provider
   */
  test("throws error when useAuth is used outside AuthProvider", () => {
    // Suppress console.error for this test
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useAuth must be used within an AuthProvider"); // Match exact error message

    consoleError.mockRestore();
  });

  /**
   * TEST 11: Logout calls IPC handler
   */
  test("calls window.justiceAPI.logout when logging out", async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      success: true,
      data: {
        user: { id: "1", username: "testuser" },
        session: { id: "test-session" },
      },
    });
    const mockLogout = vi.fn().mockResolvedValue({ success: true });
    globalThis.window.justiceAPI.login = mockLogin;
    globalThis.window.justiceAPI.logout = mockLogout;

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Login first
    await act(async () => {
      screen.getByText("Login").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "authenticated"
      );
    });

    // Logout
    await act(async () => {
      screen.getByText("Logout").click();
    });

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });
  });

  /**
   * TEST 12: Error clears on successful login after failure
   */
  test("clears error on successful login after previous failure", async () => {
    let callCount = 0;
    const mockLogin = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          success: false,
          message: "First attempt failed",
        }); // AuthContext uses 'message' not 'error'
      }
      return Promise.resolve({
        success: true,
        data: {
          user: { id: "1", username: "testuser" },
          session: { id: "test-session-123" },
        },
      });
    });
    globalThis.window.justiceAPI.login = mockLogin;

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByText("Login");

    // First attempt - fails
    await act(async () => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent(
        "First attempt failed"
      );
    });

    // Second attempt - succeeds
    await act(async () => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(screen.queryByTestId("error")).not.toBeInTheDocument();
      expect(screen.getByTestId("auth-status")).toHaveTextContent(
        "authenticated"
      );
    });
  });
});
