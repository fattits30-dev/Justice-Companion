/// <reference types="vitest/globals" />
/**
 * LoginScreen Component Tests
 *
 * Tests for the LoginScreen UI, form validation, and user interactions.
 * API calls are mocked to allow testing without backend.
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { LoginScreen } from "./LoginScreen";

// Mock the AuthContext
const mockLogin = vi.fn();
const mockAuthError = null;

vi.mock("../../contexts/AuthContext.tsx", () => ({
  useAuth: () => ({
    login: mockLogin,
    error: mockAuthError,
  }),
}));

describe("LoginScreen", () => {
  const defaultProps = {
    onSuccess: vi.fn(),
    onRegisterClick: vi.fn(),
    onForgotPasswordClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockReset();
  });

  describe("rendering", () => {
    it("renders the login form", () => {
      render(<LoginScreen {...defaultProps} />);

      expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    it("renders remember me checkbox", () => {
      render(<LoginScreen {...defaultProps} />);

      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
    });

    it("renders forgot password link", () => {
      render(<LoginScreen {...defaultProps} />);

      expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    });

    it("renders register link", () => {
      render(<LoginScreen {...defaultProps} />);

      expect(screen.getByText(/create account/i)).toBeInTheDocument();
    });
  });

  describe("form interactions", () => {
    it("allows typing in username field", async () => {
      const user = userEvent.setup();
      render(<LoginScreen {...defaultProps} />);

      const usernameInput = screen.getByLabelText(/username or email/i);
      await user.type(usernameInput, "testuser");

      expect(usernameInput).toHaveValue("testuser");
    });

    it("allows typing in password field", async () => {
      const user = userEvent.setup();
      render(<LoginScreen {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, "secret123");

      expect(passwordInput).toHaveValue("secret123");
    });

    it("password field is type password by default", () => {
      render(<LoginScreen {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toHaveAttribute("type", "password");
    });

    it("toggles password visibility", async () => {
      const user = userEvent.setup();
      render(<LoginScreen {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      const toggleButton = screen.getByRole("button", { name: /show password|toggle password/i });

      expect(passwordInput).toHaveAttribute("type", "password");

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "text");

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "password");
    });

    it("toggles remember me checkbox", async () => {
      const user = userEvent.setup();
      render(<LoginScreen {...defaultProps} />);

      const checkbox = screen.getByLabelText(/remember me/i);
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });

  describe("validation", () => {
    it("shows error when username is empty on submit", async () => {
      const user = userEvent.setup();
      render(<LoginScreen {...defaultProps} />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, "password123");

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      await user.click(submitButton);

      expect(screen.getByText(/username or email is required/i)).toBeInTheDocument();
    });

    it("shows error when password is empty on submit", async () => {
      const user = userEvent.setup();
      render(<LoginScreen {...defaultProps} />);

      const usernameInput = screen.getByLabelText(/username or email/i);
      await user.type(usernameInput, "testuser");

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      await user.click(submitButton);

      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    it("does not call login when form is invalid", async () => {
      const user = userEvent.setup();
      render(<LoginScreen {...defaultProps} />);

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      await user.click(submitButton);

      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe("form submission", () => {
    it("calls login with correct credentials", async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(undefined);

      render(<LoginScreen {...defaultProps} />);

      await user.type(screen.getByLabelText(/username or email/i), "testuser");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("testuser", "password123", false);
      });
    });

    it("calls login with rememberMe when checked", async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue(undefined);

      render(<LoginScreen {...defaultProps} />);

      await user.type(screen.getByLabelText(/username or email/i), "testuser");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.click(screen.getByLabelText(/remember me/i));
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith("testuser", "password123", true);
      });
    });

    it("calls onSuccess after successful login", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      mockLogin.mockResolvedValue(undefined);

      render(<LoginScreen {...defaultProps} onSuccess={onSuccess} />);

      await user.type(screen.getByLabelText(/username or email/i), "testuser");
      await user.type(screen.getByLabelText(/^password$/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it("shows error message on login failure", async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error("Invalid credentials"));

      render(<LoginScreen {...defaultProps} />);

      await user.type(screen.getByLabelText(/username or email/i), "testuser");
      await user.type(screen.getByLabelText(/^password$/i), "wrongpassword");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });
  });

  describe("navigation callbacks", () => {
    it("calls onRegisterClick when register link is clicked", async () => {
      const user = userEvent.setup();
      const onRegisterClick = vi.fn();

      render(<LoginScreen {...defaultProps} onRegisterClick={onRegisterClick} />);

      await user.click(screen.getByText(/create account/i));

      expect(onRegisterClick).toHaveBeenCalled();
    });

    it("calls onForgotPasswordClick when forgot password is clicked", async () => {
      const user = userEvent.setup();
      const onForgotPasswordClick = vi.fn();

      render(<LoginScreen {...defaultProps} onForgotPasswordClick={onForgotPasswordClick} />);

      await user.click(screen.getByText(/forgot password/i));

      expect(onForgotPasswordClick).toHaveBeenCalled();
    });
  });

  describe("loading state", () => {
    it("disables submit button while loading", async () => {
      const user = userEvent.setup();
      // Make login hang to keep loading state
      mockLogin.mockImplementation(() => new Promise(() => {}));

      render(<LoginScreen {...defaultProps} />);

      await user.type(screen.getByLabelText(/username or email/i), "testuser");
      await user.type(screen.getByLabelText(/^password$/i), "password123");

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });
});
