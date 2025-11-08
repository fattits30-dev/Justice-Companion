/**
 * LoginScreen Component Tests
 *
 * TDD Cycle: RED (Write tests first - they will fail)
 *
 * Tests cover:
 * - Component rendering
 * - Form validation
 * - IPC communication
 * - Error handling
 * - Loading states
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@/test-utils/test-utils.tsx";
import { LoginScreen } from "../../src/components/auth/LoginScreen.tsx";

describe("LoginScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * TEST 1: Component renders with all required elements
   */
  test("renders login form with username, password, and submit button", () => {
    render(<LoginScreen />);

    // Check for form inputs
    expect(
      screen.getByPlaceholderText(/enter your username/i)
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/enter your password/i)
    ).toBeInTheDocument();

    // Check for submit button
    expect(
      screen.getByRole("button", { name: /login|sign in/i })
    ).toBeInTheDocument();
  });

  /**
   * TEST 2: Form validation - empty fields
   */
  test("shows validation error when username is empty", async () => {
    render(<LoginScreen />);

    const submitButton = screen.getByRole("button", { name: /login|sign in/i });
    fireEvent.click(submitButton);

    // Wait for validation error
    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
    });
  });

  test("shows validation error when password is empty", async () => {
    render(<LoginScreen />);

    const usernameInput = screen.getByPlaceholderText(/enter your username/i);
    fireEvent.change(usernameInput, { target: { value: "testuser" } });

    const submitButton = screen.getByRole("button", { name: /login|sign in/i });
    fireEvent.click(submitButton);

    // Wait for validation error
    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  /**
   * TEST 3: IPC communication - successful login
   */
  test("calls window.justiceAPI.login with correct credentials", async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      success: true,
      data: {
        user: { id: "1", username: "testuser", email: "test@example.com" },
        session: { sessionId: "test-session" },
      },
    });
    globalThis.window.justiceAPI.login = mockLogin;

    render(<LoginScreen />);

    // Fill in form
    const usernameInput = screen.getByPlaceholderText(/enter your username/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(passwordInput, { target: { value: "TestPassword123!" } });

    // Submit form
    const submitButton = screen.getByRole("button", { name: /login|sign in/i });
    fireEvent.click(submitButton);

    // Verify IPC call (includes rememberMe parameter - defaults to false)
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        "testuser",
        "TestPassword123!",
        false
      );
    });
  });

  /**
   * TEST 4: Loading state during login
   */
  test("shows loading state while logging in", async () => {
    const mockLogin = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { success: true };
    });
    globalThis.window.justiceAPI.login = mockLogin;

    render(<LoginScreen />);

    // Fill and submit form
    fireEvent.change(screen.getByPlaceholderText(/enter your username/i), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login|sign in/i }));

    // Check loading state
    await waitFor(() => {
      expect(screen.getByText(/logging in|loading/i)).toBeInTheDocument();
    });
  });

  /**
   * TEST 5: Error handling - failed login
   */
  test("shows error message when login fails", async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      success: false,
      message: "Invalid credentials", // AuthContext uses 'message' not 'error'
    });
    globalThis.window.justiceAPI.login = mockLogin;

    render(<LoginScreen />);

    // Fill and submit form
    fireEvent.change(screen.getByPlaceholderText(/enter your username/i), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { value: "wrongpassword" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login|sign in/i }));

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  /**
   * TEST 6: Password visibility toggle
   */
  test("toggles password visibility when eye icon is clicked", () => {
    render(<LoginScreen />);

    const passwordInput =
      screen.getByPlaceholderText<HTMLInputElement>(/enter your password/i);
    expect(passwordInput.type).toBe("password");

    // Click toggle button
    const toggleButton = screen.getByRole("button", { name: /show password/i });
    fireEvent.click(toggleButton);

    // Password should now be visible
    expect(passwordInput.type).toBe("text");

    // Click again to hide
    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe("password");
  });

  /**
   * TEST 7: Navigation to registration
   */
  test("shows link to registration screen", () => {
    render(<LoginScreen />);

    const registerButton = screen.getByRole("button", {
      name: /create account/i,
    });
    expect(registerButton).toBeInTheDocument();
  });

  /**
   * TEST 8: Remember Me checkbox
   */
  test("renders Remember Me checkbox", () => {
    render(<LoginScreen />);

    const rememberMeCheckbox = screen.getByLabelText(/remember me/i);
    expect(rememberMeCheckbox).toBeInTheDocument();
    expect(rememberMeCheckbox).not.toBeChecked();
  });

  test("includes rememberMe in login call when checked", async () => {
    const mockLogin = vi.fn().mockResolvedValue({ success: true });
    globalThis.window.justiceAPI.login = mockLogin;

    render(<LoginScreen />);

    // Check Remember Me
    const rememberMeCheckbox = screen.getByLabelText(/remember me/i);
    fireEvent.click(rememberMeCheckbox);

    // Fill and submit form
    fireEvent.change(screen.getByPlaceholderText(/enter your username/i), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /login|sign in/i }));

    // Verify rememberMe is true
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("testuser", "password", true);
    });
  });

  /**
   * TEST 9: Clears form on successful login
   */
  test("clears form after successful login", async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      success: true,
      data: { user: {}, session: {} },
    });
    globalThis.window.justiceAPI.login = mockLogin;

    const mockOnSuccess = vi.fn();
    render(<LoginScreen onSuccess={mockOnSuccess} />);

    // Fill and submit
    const usernameInput =
      screen.getByPlaceholderText<HTMLInputElement>(/enter your username/i);
    const passwordInput =
      screen.getByPlaceholderText<HTMLInputElement>(/enter your password/i);

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(passwordInput, { target: { value: "password" } });
    fireEvent.click(screen.getByRole("button", { name: /login|sign in/i }));

    // Verify form is cleared and success callback is called
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(usernameInput.value).toBe("");
      expect(passwordInput.value).toBe("");
    });
  });

  /**
   * TEST 10: Accessibility - form has proper labels
   */
  test("has accessible form labels", () => {
    render(<LoginScreen />);

    // Check ARIA labels and IDs
    const usernameInput = screen.getByPlaceholderText(/enter your username/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);

    expect(usernameInput).toHaveAttribute("id", "username");
    expect(passwordInput).toHaveAttribute("id", "password");
  });
});
