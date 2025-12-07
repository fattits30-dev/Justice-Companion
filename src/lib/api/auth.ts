import { ApiError, type ApiClient } from "./client.ts";
import type { ApiResponse } from "./types.ts";

export function createAuthApi(client: ApiClient) {
  return {
    register: async (
      username: string,
      email: string,
      password: string,
      firstName?: string,
      lastName?: string
    ): Promise<
      ApiResponse<{
        user: {
          id: number;
          username: string;
          email: string;
          role: string;
          is_active: boolean;
        };
        session: {
          id: string;
          user_id: number;
          expires_at: string;
        };
      }>
    > => {
      try {
        const wrappedResponse = await client.post<{
          success: true;
          data: {
            user: {
              id: number;
              username: string;
              email: string;
              role: string;
              is_active: boolean;
            };
            session: {
              id: string;
              user_id: number;
              expires_at: string;
            };
          };
        }>("/auth/register", {
          username,
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        });

        const data = wrappedResponse.data || (wrappedResponse as any);

        client.setSessionId(data.session.id);
        localStorage.setItem("sessionId", data.session.id);

        return {
          success: true,
          data,
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

    login: async (
      identifier: string,
      password: string,
      remember_me: boolean = false
    ): Promise<
      ApiResponse<{
        user: {
          id: number;
          username: string;
          email: string;
          role: string;
          is_active: boolean;
        };
        session: {
          id: string;
          user_id: number;
          expires_at: string;
        };
      }>
    > => {
      try {
        const wrappedResponse = await client.post<{
          success: true;
          data: {
            user: {
              id: number;
              username: string;
              email: string;
              role: string;
              is_active: boolean;
            };
            session: {
              id: string;
              user_id: number;
              expires_at: string;
            };
          };
        }>("/auth/login", { identifier, password, remember_me });

        const directResponse = wrappedResponse.data;

        client.setSessionId(directResponse.session.id);
        localStorage.setItem("sessionId", directResponse.session.id);

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

    logout: async (
      sessionId: string
    ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
      const response = await client.post<
        ApiResponse<{ success: boolean; message: string }>
      >("/auth/logout", { session_id: sessionId });

      client.setSessionId(null);
      localStorage.removeItem("sessionId");

      return response;
    },

    getSession: async (
      sessionId: string
    ): Promise<
      ApiResponse<{
        user: {
          id: number;
          username: string;
          email: string;
          role: string;
          is_active: boolean;
        };
        session: {
          id: string;
          user_id: number;
          expires_at: string;
        };
      }>
    > => {
      return client.get<
        ApiResponse<{
          user: {
            id: number;
            username: string;
            email: string;
            role: string;
            is_active: boolean;
          };
          session: {
            id: string;
            user_id: number;
            expires_at: string;
          };
        }>
      >(`/auth/session/${sessionId}`);
    },

    changePassword: async (
      userId: number,
      oldPassword: string,
      newPassword: string
    ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
      const response = await client.post<
        ApiResponse<{ success: boolean; message: string }>
      >("/auth/change-password", {
        user_id: userId,
        old_password: oldPassword,
        new_password: newPassword,
      });

      client.setSessionId(null);
      localStorage.removeItem("sessionId");

      return response;
    },

    forgotPassword: async (
      email: string
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

    resetPassword: async (
      token: string,
      newPassword: string
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
