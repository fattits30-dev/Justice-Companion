/**
 * RegistrationScreen Component Tests
 *
 * TDD Cycle: RED (Write tests first - they will fail)
 *
 * Tests cover:
 * - Component rendering
 * - Form validation (username, email, password, confirm password)
 * - IPC communication
 * - Error handling
 * - Loading states
 * - Terms & Conditions checkbox
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@/test-utils/test-utils.tsx";
import { RegistrationScreen } from "../../src/components/auth/RegistrationScreen.tsx";

describe("RegistrationScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * TEST 1: Component renders with all required fields
   */
  test("renders registration form with all required fields", () => {
    render(<RegistrationScreen />);

    // Check for all form inputs
    expect(
      screen.getByPlaceholderText(/enter your username/i)
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/enter your email/i)
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/enter your password/i)
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/confirm your password/i)
    ).toBeInTheDocument();

    // Check for terms checkbox
    expect(screen.getByLabelText(/i agree to the terms/i)).toBeInTheDocument();

    // Check for submit button
    expect(
      screen.getByRole("button", { name: /sign up|register|create account/i })
    ).toBeInTheDocument();
  });

  /**
   * TEST 2: Form validation - empty username
   */
  test("shows validation error when username is empty", async () => {
    render(<RegistrationScreen />);

    const submitButton = screen.getByRole("button", {
      name: /sign up|register|create account/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
    });
  });

  /**
   * TEST 3: Form validation - username too short
   */
  test("shows validation error when username is too short", async () => {
    render(<RegistrationScreen />);

    const usernameInput = screen.getByPlaceholderText(/enter your username/i);
    fireEvent.change(usernameInput, { target: { value: "ab" } });

    const submitButton = screen.getByRole("button", {
      name: /sign up|register|create account/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/username must be at least 3 characters/i)
      ).toBeInTheDocument();
    });
  });

  /**
   * TEST 4: Form validation - empty email
   */
  test("shows validation error when email is empty", async () => {
    render(<RegistrationScreen />);

    const usernameInput = screen.getByPlaceholderText(/enter your username/i);
    fireEvent.change(usernameInput, { target: { value: "testuser" } });

    const submitButton = screen.getByRole("button", {
      name: /sign up|register|create account/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  /**
   * TEST 5: Form validation - invalid email format
   */
  test("shows validation error when email format is invalid", async () => {
    render(<RegistrationScreen />);

    const usernameInput = screen.getByPlaceholderText(/enter your username/i);
    const emailInput = screen.getByPlaceholderText(/enter your email/i);

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });

    const submitButton = screen.getByRole("button", {
      name: /sign up|register|create account/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/invalid email format|please enter a valid email/i)
      ).toBeInTheDocument();
    });
  });

  /**
   * TEST 6: Form validation - empty password
   */
  test("shows validation error when password is empty", async () => {
    render(<RegistrationScreen />);

    const usernameInput = screen.getByPlaceholderText(/enter your username/i);
    const emailInput = screen.getByPlaceholderText(/enter your email/i);

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByRole("button", {
      name: /sign up|register|create account/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  /**
   * TEST 7: Form validation - weak password
   */
  test("shows validation error when password is too weak", async () => {
    render(<RegistrationScreen />);

    const usernameInput = screen.getByPlaceholderText(/enter your username/i);
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "weak" } });

    const submitButton = screen.getByRole("button", {
      name: /sign up|register|create account/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/password must be at least 8 characters/i)
      ).toBeInTheDocument();
    });
  });

  /**
   * TEST 8: Form validation - passwords don't match
   */
  test("shows validation error when passwords do not match", async () => {
    render(<RegistrationScreen />);

    const usernameInput = screen.getByPlaceholderText(/enter your username/i);
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(
      /confirm your password/i
    );

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "StrongPass123!" } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "DifferentPass123!" },
    });

    const submitButton = screen.getByRole("button", {
      name: /sign up|register|create account/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/passwords do not match|passwords must match/i)
      ).toBeInTheDocument();
    });
  });

  /**
   * TEST 9: Form validation - terms not accepted
   */
  test("shows validation error when terms are not accepted", async () => {
    render(<RegistrationScreen />);

    const usernameInput = screen.getByPlaceholderText(/enter your username/i);
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(
      /confirm your password/i
    );

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "StrongPass123!" } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "StrongPass123!" },
    });

    const submitButton = screen.getByRole("button", {
      name: /sign up|register|create account/i,
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/you must accept the terms/i)
      ).toBeInTheDocument();
    });
  });

  /**
   * TEST 10: IPC communication - successful registration
   */
  test("calls window.justiceAPI.register with correct data", async () => {
    const mockRegister = vi.fn().mockResolvedValue({
      success: true,
      data: {
        user: { id: "1", username: "testuser", email: "test@example.com" },
      },
    });
    globalThis.window.justiceAPI.register = mockRegister;

    render(<RegistrationScreen />);

    // Fill in form
    fireEvent.change(screen.getByPlaceholderText(/enter your username/i), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { value: "StrongPass123!" },
    });
    fireEvent.change(screen.getByPlaceholderText(/confirm your password/i), {
      target: { value: "StrongPass123!" },
    });

    // Accept terms
    const termsCheckbox = screen.getByLabelText(/i agree to the terms/i);
    fireEvent.click(termsCheckbox);

    // Submit form
    const submitButton = screen.getByRole("button", {
      name: /sign up|register|create account/i,
    });
    fireEvent.click(submitButton);

    // Verify IPC call
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        "testuser",
        "test@example.com",
        "StrongPass123!"
      );
    });
  });

  /**
   * TEST 11: Loading state during registration
   */
  test("shows loading state while registering", async () => {
    const mockRegister = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { success: true, data: { user: {} } };
    });
    globalThis.window.justiceAPI.register = mockRegister;

    render(<RegistrationScreen />);

    // Fill form and submit
    fireEvent.change(screen.getByPlaceholderText(/enter your username/i), {
      target: { value: "testuser" },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { value: "StrongPass123!" },
    });
    fireEvent.change(screen.getByPlaceholderText(/confirm your password/i), {
      target: { value: "StrongPass123!" },
    });
    fireEvent.click(screen.getByLabelText(/i agree to the terms/i));
    fireEvent.click(
      screen.getByRole("button", { name: /sign up|register|create account/i })
    );

    // Check loading state
    await waitFor(() => {
      expect(
        screen.getByText(/creating account|registering|loading/i)
      ).toBeInTheDocument();
    });
  });

  /**
   * TEST 12: Error handling - registration fails
   */
  test("shows error message when registration fails", async () => {
    const mockRegister = vi.fn().mockResolvedValue({
      success: false,
      error: "Username already exists",
    });
    globalThis.window.justiceAPI.register = mockRegister;

    render(<RegistrationScreen />);

    // Fill and submit form
    fireEvent.change(screen.getByPlaceholderText(/enter your username/i), {
      target: { value: "existinguser" },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter your email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter your password/i), {
      target: { value: "StrongPass123!" },
    });
    fireEvent.change(screen.getByPlaceholderText(/confirm your password/i), {
      target: { value: "StrongPass123!" },
    });
    fireEvent.click(screen.getByLabelText(/i agree to the terms/i));
    fireEvent.click(
      screen.getByRole("button", { name: /sign up|register|create account/i })
    );

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/username already exists/i)).toBeInTheDocument();
    });
  });

  /**
   * TEST 13: Password visibility toggle
   */
  test("toggles password visibility when eye icon is clicked", () => {
    render(<RegistrationScreen />);

    const passwordInput =
      screen.getByPlaceholderText<HTMLInputElement>(/enter your password/i);
    expect(passwordInput.type).toBe("password");

    // Find and click toggle button for password field
    const toggleButtons = screen.getAllByRole("button", {
      name: /show password|hide password/i,
    });
    fireEvent.click(toggleButtons[0]); // First toggle is for password field

    // Password should now be visible
    expect(passwordInput.type).toBe("text");

    // Click again to hide
    fireEvent.click(toggleButtons[0]);
    expect(passwordInput.type).toBe("password");
  });

  /**
   * TEST 14: Confirm password visibility toggle
   */
  test("toggles confirm password visibility independently", () => {
    render(<RegistrationScreen />);

    const confirmPasswordInput = screen.getByPlaceholderText<HTMLInputElement>(
      /confirm your password/i
    );
    expect(confirmPasswordInput.type).toBe("password");

    // Find and click toggle button for confirm password field
    const toggleButtons = screen.getAllByRole("button", {
      name: /show password|hide password/i,
    });
    fireEvent.click(toggleButtons[1]); // Second toggle is for confirm password field

    // Confirm password should now be visible
    expect(confirmPasswordInput.type).toBe("text");
  });

  /**
   * TEST 15: Navigation back to login
   */
  test("shows link to go back to login screen", () => {
    render(<RegistrationScreen />);

    const loginLink = screen.getByRole("button", {
      name: /already have an account|sign in|login/i,
    });
    expect(loginLink).toBeInTheDocument();
  });

  /**
   * TEST 16: Form clears after successful registration
   */
  test("clears form after successful registration", async () => {
    const mockRegister = vi.fn().mockResolvedValue({
      success: true,
      data: {
        user: { id: "1", username: "testuser", email: "test@example.com" },
      },
    });
    globalThis.window.justiceAPI.register = mockRegister;

    const mockOnSuccess = vi.fn();
    render(<RegistrationScreen onSuccess={mockOnSuccess} />);

    // Fill and submit
    const usernameInput =
      screen.getByPlaceholderText<HTMLInputElement>(/enter your username/i);
    const emailInput =
      screen.getByPlaceholderText<HTMLInputElement>(/enter your email/i);
    const passwordInput =
      screen.getByPlaceholderText<HTMLInputElement>(/enter your password/i);
    const confirmPasswordInput = screen.getByPlaceholderText<HTMLInputElement>(
      /confirm your password/i
    );

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "StrongPass123!" } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "StrongPass123!" },
    });
    fireEvent.click(screen.getByLabelText(/i agree to the terms/i));
    fireEvent.click(
      screen.getByRole("button", { name: /sign up|register|create account/i })
    );

    // Verify form is cleared and success callback is called
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(usernameInput.value).toBe("");
      expect(emailInput.value).toBe("");
      expect(passwordInput.value).toBe("");
      expect(confirmPasswordInput.value).toBe("");
    });
  });

  /**
   * TEST 17: Accessibility - form has proper labels
   */
  test("has accessible form labels and IDs", () => {
    render(<RegistrationScreen />);

    // Check ARIA labels and IDs
    const usernameInput = screen.getByPlaceholderText(/enter your username/i);
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const confirmPasswordInput = screen.getByPlaceholderText(
      /confirm your password/i
    );

    expect(usernameInput).toHaveAttribute("id", "username");
    expect(emailInput).toHaveAttribute("id", "email");
    expect(passwordInput).toHaveAttribute("id", "password");
    expect(confirmPasswordInput).toHaveAttribute("id", "confirm-password");
  });
});
