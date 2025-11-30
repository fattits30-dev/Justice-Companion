/**
 * Unit tests for HTTP API Client
 *
 * Tests cover:
 * - Authentication flow (register, login, logout)
 * - Case CRUD operations
 * - Evidence management
 * - Chat streaming
 * - Error handling
 * - Token management
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ApiClient, ApiError } from "./apiClient.ts";
// ===== MOCK SETUP =====
/**
 * Mock fetch globally
 */
global.fetch = vi.fn();
const mockFetch = global.fetch;
/**
 * Mock localStorage
 */
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => {
            store[key] = value.toString();
        },
        removeItem: (key) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();
Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
});
// ===== TEST SUITE =====
describe("ApiClient", () => {
    let client;
    beforeEach(() => {
        // Reset mocks
        mockFetch.mockClear();
        localStorageMock.clear();
        // Create fresh client instance
        client = new ApiClient({
            baseURL: "http://localhost:8000",
        });
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    // ===== AUTHENTICATION TESTS =====
    describe("Authentication", () => {
        it("should register a new user", async () => {
            const mockResponse = {
                success: true,
                data: {
                    user: {
                        id: 1,
                        username: "testuser",
                        email: "test@example.com",
                        role: "user",
                        is_active: true,
                    },
                    session: {
                        id: "session-123",
                        user_id: 1,
                        expires_at: "2024-12-31T23:59:59Z",
                    },
                },
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 201,
                headers: new Headers({ "content-type": "application/json" }),
                json: async () => mockResponse,
            });
            const result = await client.auth.register("testuser", "test@example.com", "Password123!");
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.user.username).toBe("testuser");
            }
            expect(client.getSessionId()).toBe("session-123");
            expect(localStorageMock.getItem("sessionId")).toBe("session-123");
        });
        it("should login a user", async () => {
            const mockResponse = {
                success: true,
                data: {
                    user: {
                        id: 1,
                        username: "testuser",
                        email: "test@example.com",
                        role: "user",
                        is_active: true,
                    },
                    session: {
                        id: "session-456",
                        user_id: 1,
                        expires_at: "2024-12-31T23:59:59Z",
                    },
                },
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Headers({ "content-type": "application/json" }),
                json: async () => mockResponse,
            });
            const result = await client.auth.login("testuser", "Password123!");
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.user.username).toBe("testuser");
            }
            expect(client.getSessionId()).toBe("session-456");
        });
        it("should logout a user", async () => {
            // Set initial session
            client.setSessionId("session-789");
            localStorageMock.setItem("sessionId", "session-789");
            const mockResponse = {
                success: true,
                data: {
                    success: true,
                    message: "Logged out successfully",
                },
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Headers({ "content-type": "application/json" }),
                json: async () => mockResponse,
            });
            const result = await client.auth.logout("session-789");
            expect(result.success).toBe(true);
            expect(client.getSessionId()).toBeNull();
            expect(localStorageMock.getItem("sessionId")).toBeNull();
        });
        it("should handle login error", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                headers: new Headers({ "content-type": "application/json" }),
                json: async () => ({
                    error: {
                        code: "INVALID_CREDENTIALS",
                        message: "Invalid username or password",
                    },
                }),
            });
            const result = await client.auth.login("testuser", "wrongpassword");
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.code).toBe("INVALID_CREDENTIALS");
            }
        });
        it("should change password and clear session", async () => {
            client.setSessionId("session-123");
            localStorageMock.setItem("sessionId", "session-123");
            const mockResponse = {
                success: true,
                data: {
                    success: true,
                    message: "Password changed successfully",
                },
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Headers({ "content-type": "application/json" }),
                json: async () => mockResponse,
            });
            const result = await client.auth.changePassword(1, "OldPassword123!", "NewPassword123!");
            expect(result.success).toBe(true);
            expect(client.getSessionId()).toBeNull();
            expect(localStorageMock.getItem("sessionId")).toBeNull();
        });
    });
    // ===== CASE MANAGEMENT TESTS =====
    describe("Case Management", () => {
        beforeEach(() => {
            client.setSessionId("session-123");
        });
        it("should list cases", async () => {
            const mockResponse = {
                success: true,
                data: {
                    items: [
                        {
                            id: 1,
                            title: "Test Case 1",
                            description: "Description 1",
                            status: "active",
                            createdAt: "2024-01-01T00:00:00Z",
                            updatedAt: "2024-01-01T00:00:00Z",
                        },
                        {
                            id: 2,
                            title: "Test Case 2",
                            description: "Description 2",
                            status: "closed",
                            createdAt: "2024-01-02T00:00:00Z",
                            updatedAt: "2024-01-02T00:00:00Z",
                        },
                    ],
                    total: 2,
                    limit: 50,
                    offset: 0,
                    hasMore: false,
                },
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Headers({ "content-type": "application/json" }),
                json: async () => mockResponse,
            });
            const result = await client.cases.list();
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.items).toHaveLength(2);
                expect(result.data.items[0].title).toBe("Test Case 1");
            }
        });
        it("should get a single case", async () => {
            const mockResponse = {
                success: true,
                data: {
                    id: 1,
                    title: "Test Case",
                    description: "Test Description",
                    status: "active",
                    createdAt: "2024-01-01T00:00:00Z",
                    updatedAt: "2024-01-01T00:00:00Z",
                },
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Headers({ "content-type": "application/json" }),
                json: async () => mockResponse,
            });
            const result = await client.cases.get(1);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.id).toBe(1);
                expect(result.data.title).toBe("Test Case");
            }
        });
        it("should create a case", async () => {
            const mockResponse = {
                success: true,
                data: {
                    id: 3,
                    title: "New Case",
                    description: "New Description",
                    status: "active",
                    createdAt: "2024-01-03T00:00:00Z",
                    updatedAt: "2024-01-03T00:00:00Z",
                },
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 201,
                headers: new Headers({ "content-type": "application/json" }),
                json: async () => mockResponse,
            });
            const result = await client.cases.create({
                title: "New Case",
                description: "New Description",
                caseType: "employment",
            });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.id).toBe(3);
                expect(result.data.title).toBe("New Case");
            }
        });
        it("should update a case", async () => {
            const mockResponse = {
                success: true,
                data: {
                    id: 1,
                    title: "Updated Case",
                    description: "Updated Description",
                    status: "closed",
                    createdAt: "2024-01-01T00:00:00Z",
                    updatedAt: "2024-01-03T00:00:00Z",
                },
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Headers({ "content-type": "application/json" }),
                json: async () => mockResponse,
            });
            const result = await client.cases.update(1, {
                title: "Updated Case",
                status: "closed",
            });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.title).toBe("Updated Case");
                expect(result.data.status).toBe("closed");
            }
        });
        it("should delete a case", async () => {
            const mockResponse = {
                success: true,
                data: undefined,
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 204,
                headers: new Headers({ "content-type": "application/json" }),
                json: async () => mockResponse,
            });
            const result = await client.cases.delete(1);
            expect(result.success).toBe(true);
        });
        it("should handle case not found error", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                headers: new Headers({ "content-type": "application/json" }),
                json: async () => ({
                    error: {
                        code: "NOT_FOUND",
                        message: "Case not found",
                    },
                }),
            });
            await expect(client.cases.get(999)).rejects.toThrow(ApiError);
        });
    });
    // ===== EVIDENCE MANAGEMENT TESTS =====
    describe("Evidence Management", () => {
        beforeEach(() => {
            client.setSessionId("session-123");
        });
        it("should list evidence for a case", async () => {
            const mockResponse = {
                success: true,
                data: [
                    {
                        id: 1,
                        caseId: 1,
                        title: "evidence1.pdf",
                        filePath: "/evidence/evidence1.pdf",
                        content: null,
                        evidenceType: "document",
                        obtainedDate: null,
                        createdAt: "2024-01-01T00:00:00Z",
                    },
                ],
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Headers({ "content-type": "application/json" }),
                json: async () => mockResponse,
            });
            const result = await client.evidence.list(1);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data).toHaveLength(1);
                expect(result.data[0].title).toBe("evidence1.pdf");
            }
        });
        it("should create evidence", async () => {
            const mockResponse = {
                success: true,
                data: {
                    id: 2,
                    caseId: 1,
                    title: "Test Evidence",
                    filePath: "/evidence/evidence2.pdf",
                    content: null,
                    evidenceType: "document",
                    obtainedDate: null,
                    createdAt: "2024-01-02T00:00:00Z",
                },
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 201,
                headers: new Headers({ "content-type": "application/json" }),
                json: async () => mockResponse,
            });
            const result = await client.evidence.create({
                caseId: 1,
                title: "Test Evidence",
                filePath: "/evidence/evidence2.pdf",
                evidenceType: "document",
            });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.id).toBe(2);
            }
        });
    });
    // ===== ERROR HANDLING TESTS =====
    describe("Error Handling", () => {
        beforeEach(() => {
            client.setSessionId("session-123");
        });
        it("should handle network errors", async () => {
            // Create client without retries to avoid timeout
            const noRetryClient = new ApiClient({
                baseURL: "http://localhost:8000",
                maxRetries: 0,
            });
            noRetryClient.setSessionId("session-123");
            mockFetch.mockRejectedValueOnce(new TypeError("Network request failed"));
            await expect(noRetryClient.cases.list()).rejects.toThrow(ApiError);
        });
        it("should handle 500 server errors with retry", async () => {
            // First attempt fails
            mockFetch.mockRejectedValueOnce(new ApiError(500, "Internal server error", "SERVER_ERROR"));
            // Retry succeeds
            const mockResponse = {
                success: true,
                data: {
                    items: [],
                    total: 0,
                    limit: 50,
                    offset: 0,
                    hasMore: false,
                },
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Headers({ "content-type": "application/json" }),
                json: async () => mockResponse,
            });
            const result = await client.cases.list();
            expect(result.success).toBe(true);
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
        it("should handle timeout errors", async () => {
            mockFetch.mockImplementationOnce(() => new Promise((_, reject) => {
                setTimeout(() => reject(new DOMException("Timeout", "AbortError")), 100);
            }));
            await expect(client.cases.list()).rejects.toThrow();
        });
        it("should handle rate limiting errors", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 429,
                headers: new Headers({ "content-type": "application/json" }),
                json: async () => ({
                    error: {
                        code: "RATE_LIMIT_EXCEEDED",
                        message: "Too many requests",
                    },
                }),
            });
            await expect(client.cases.list()).rejects.toThrow(ApiError);
        });
    });
    // ===== CHAT STREAMING TESTS =====
    describe("Chat Streaming", () => {
        beforeEach(() => {
            client.setSessionId("session-123");
        });
        it("should stream chat messages", async () => {
            const mockStreamData = `data: ${JSON.stringify({ type: "token", data: "Hello " })}\n\n` +
                `data: ${JSON.stringify({ type: "token", data: "world" })}\n\n` +
                `data: ${JSON.stringify({ type: "complete", conversationId: 1 })}\n\n`;
            const mockBody = new ReadableStream({
                start(controller) {
                    controller.enqueue(new TextEncoder().encode(mockStreamData));
                    controller.close();
                },
            });
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Headers({ "content-type": "text/event-stream" }),
                body: mockBody,
            });
            const tokens = [];
            let conversationId = null;
            await client.chat.stream("Test message", {
                onToken: (token) => tokens.push(token),
                onComplete: (id) => {
                    conversationId = id;
                },
                onError: (error) => {
                    throw new Error(error);
                },
            }, {});
            expect(tokens).toEqual(["Hello ", "world"]);
            expect(conversationId).toBe(1);
        });
        it("should handle streaming errors", async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                headers: new Headers({ "content-type": "application/json" }),
                json: async () => ({
                    detail: "Streaming failed",
                }),
            });
            const errorCallback = vi.fn();
            await client.chat.stream("Test message", {
                onToken: () => { },
                onComplete: () => { },
                onError: errorCallback,
            }, {});
            expect(errorCallback).toHaveBeenCalled();
        });
    });
    // ===== SESSION MANAGEMENT TESTS =====
    describe("Session Management", () => {
        it("should set and get session ID", () => {
            client.setSessionId("test-session-123");
            expect(client.getSessionId()).toBe("test-session-123");
        });
        it("should clear session ID", () => {
            client.setSessionId("test-session-123");
            client.setSessionId(null);
            expect(client.getSessionId()).toBeNull();
        });
        it("should include session ID in request headers", async () => {
            client.setSessionId("test-session-456");
            const mockResponse = {
                success: true,
                data: { items: [], total: 0, limit: 50, offset: 0, hasMore: false },
            };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Headers({ "content-type": "application/json" }),
                json: async () => mockResponse,
            });
            await client.cases.list();
            expect(mockFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: "Bearer test-session-456",
                }),
            }));
        });
    });
    // ===== API ERROR CLASS TESTS =====
    describe("ApiError", () => {
        it("should create error with correct properties", () => {
            const error = new ApiError(404, "Not found", "NOT_FOUND", {
                resource: "case",
            });
            expect(error.status).toBe(404);
            expect(error.message).toBe("Not found");
            expect(error.code).toBe("NOT_FOUND");
            expect(error.details).toEqual({ resource: "case" });
        });
        it("should check status code", () => {
            const error = new ApiError(401, "Unauthorized", "AUTH_ERROR");
            expect(error.isStatus(401)).toBe(true);
            expect(error.isStatus(404)).toBe(false);
        });
        it("should check error code", () => {
            const error = new ApiError(400, "Bad request", "INVALID_INPUT");
            expect(error.isCode("INVALID_INPUT")).toBe(true);
            expect(error.isCode("NOT_FOUND")).toBe(false);
        });
    });
});
