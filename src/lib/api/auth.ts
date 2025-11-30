/**
 * Authentication API module.
 *
 * Provides authentication endpoints:
 * - register: Register new user
 * - login: Login user
 * - logout: Logout user
 * - getSession: Validate session
 * - changePassword: Change password
 * - forgotPassword: Request password reset
 * - resetPassword: Reset password with token
 *
 * @module api/auth
 */

import { BaseApiClient } from "./client";
import { ApiResponse, ApiError } from "./types";

// ====================
// Auth Types
// ====================

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface AuthSession {
  id: string;
  user_id: number;
  expires_at: string;
}

export interface AuthData {
  user: AuthUser;
  session: AuthSession;
}

// ====================
// Auth API Factory
// ====================

/**
 * Creates auth API methods bound to a client instance.
 */
export function createAuthApi(client: BaseApiClient) {
  return {
    /**
     * Register new user
     */
    register: async (
      username: string,
      email: string,
      password: string,
      firstName?: string,
      lastName?: string,
    ): Promise<ApiResponse<AuthData>> => {
      try {
        const wrappedResponse = await client.post<{
          success: true;
          data: AuthData;
        }>("/auth/register", {
          username,
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        });

        const data =
          wrappedResponse.data || (wrappedResponse as unknown as AuthData);

        // Store session ID after successful registration
        client.setSessionId(data.session.id);
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("sessionId", data.session.id);
        }

        return {
          success: true,
          data: data,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: error instanceof ApiError ? error.code : "UNKNOWN_ERROR",
            message:
              error instanceof Error ? error.message : "Registration failed",
          },
        };
      }
    },

    /**
     * Login user
     */
    login: async (
      identifier: string,
      password: string,
      remember_me: boolean = false,
    ): Promise<ApiResponse<AuthData>> => {
      try {
        const wrappedResponse = await client.post<{
          success: true;
          data: AuthData;
        }>("/auth/login", { identifier, password, remember_me });

        const directResponse = wrappedResponse.data;

        // Store session ID after successful login
        client.setSessionId(directResponse.session.id);
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("sessionId", directResponse.session.id);
        }

        return {
          success: true,
          data: directResponse,
        };
      } catch (error) {
        return {
          success: false,
          error: {
            code: error instanceof ApiError ? error.code : "UNKNOWN_ERROR",
            message: error instanceof Error ? error.message : "Login failed",
          },
        };
      }
    },

    /**
     * Logout user
     */
    logout: async (
      sessionId: string,
    ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
      const response = await client.post<
        ApiResponse<{ success: boolean; message: string }>
      >("/auth/logout", { session_id: sessionId });

      // Clear session ID after logout
      client.setSessionId(null);
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("sessionId");
      }

      return response;
    },

    /**
     * Get session and validate
     */
    getSession: async (sessionId: string): Promise<ApiResponse<AuthData>> => {
      return client.get<ApiResponse<AuthData>>(`/auth/session/${sessionId}`);
    },

    /**
     * Change password
     */
    changePassword: async (
      userId: number,
      oldPassword: string,
      newPassword: string,
    ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
      const response = await client.post<
        ApiResponse<{ success: boolean; message: string }>
      >("/auth/change-password", {
        user_id: userId,
        old_password: oldPassword,
        new_password: newPassword,
      });

      // Clear session after password change (all sessions invalidated)
      client.setSessionId(null);
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("sessionId");
      }

      return response;
    },

    /**
     * Request password reset (forgot password)
     */
    forgotPassword: async (
      email: string,
    ): Promise<
      ApiResponse<{
        success: boolean;
        message: string;
        data?: { token: string; expires_in_hours: number };
      }>
    > => {
      try {
        const response = await client.post<
          ApiResponse<{
            success: boolean;
            message: string;
            data?: { token: string; expires_in_hours: number };
          }>
        >("/auth/forgot-password", { email });
        return response;
      } catch (error) {
        return {
          success: false,
          error: {
            code: error instanceof ApiError ? error.code : "UNKNOWN_ERROR",
            message:
              error instanceof Error
                ? error.message
                : "Password reset request failed",
          },
        };
      }
    },

    /**
     * Reset password with token
     */
    resetPassword: async (
      token: string,
      newPassword: string,
    ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
      try {
        const response = await client.post<
          ApiResponse<{ success: boolean; message: string }>
        >("/auth/reset-password", { token, new_password: newPassword });
        return response;
      } catch (error) {
        return {
          success: false,
          error: {
            code: error instanceof ApiError ? error.code : "UNKNOWN_ERROR",
            message:
              error instanceof Error ? error.message : "Password reset failed",
          },
        };
      }
    },
  };
}

export type AuthApi = ReturnType<typeof createAuthApi>;
