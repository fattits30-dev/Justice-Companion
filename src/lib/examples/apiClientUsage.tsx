/**
 * Example Usage of API Client
 *
 * This file demonstrates how to use the API client in React components.
 * Includes examples for:
 * - Authentication flow
 * - Case management
 * - Evidence handling
 * - Chat streaming
 * - Error handling
 */

import React, { useState, useEffect } from "react";
import { apiClient, ApiError } from "../apiClient";
import type { Case } from "../../domains/cases/entities/Case";

// ===== AUTHENTICATION EXAMPLE =====

/**
 * Login Form Component
 * Demonstrates authentication with error handling
 */
export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.auth.login(username, password, false);

      if (response.success) {
        console.log("Logged in as:", response.data.user.username);
        // Session ID is automatically stored in localStorage and apiClient
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isStatus(401)) {
          setError("Invalid username or password");
        } else if (err.isStatus(429)) {
          setError("Too many login attempts. Please try again later.");
        } else {
          setError(err.message);
        }
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <h2>Login</h2>

      {error && <div className="error">{error}</div>}

      <div>
        <label>Username:</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>

      <div>
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}

// ===== REGISTRATION EXAMPLE =====

/**
 * Registration Form Component
 * Demonstrates user registration with validation
 */
export function RegistrationForm() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.auth.register(
        formData.username,
        formData.email,
        formData.password,
      );

      if (response.success) {
        setSuccess(true);
        console.log("Registered successfully:", response.data.user);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isCode("USER_EXISTS")) {
          setError("Username or email already exists");
        } else if (err.isCode("INVALID_PASSWORD")) {
          setError("Password does not meet requirements");
        } else {
          setError(err.message);
        }
      } else {
        setError("Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="success">
        Registration successful! You are now logged in.
      </div>
    );
  }

  return (
    <form onSubmit={handleRegister}>
      <h2>Register</h2>

      {error && <div className="error">{error}</div>}

      <div>
        <label>Username:</label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value })
          }
          required
        />
      </div>

      <div>
        <label>Email:</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div>
        <label>Password:</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          required
        />
      </div>

      <div>
        <label>Confirm Password:</label>
        <input
          type="password"
          value={formData.confirmPassword}
          onChange={(e) =>
            setFormData({ ...formData, confirmPassword: e.target.value })
          }
          required
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? "Registering..." : "Register"}
      </button>
    </form>
  );
}

// ===== CASE MANAGEMENT EXAMPLE =====

/**
 * Case List Component
 * Demonstrates fetching and displaying cases with pagination
 */
export function CaseList() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "closed">("all");

  useEffect(() => {
    loadCases();
  }, [filter]);

  const loadCases = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.cases.list({
        status: filter !== "all" ? filter : undefined,
        limit: 50,
        offset: 0,
      });

      if (response.success) {
        setCases(response.data.items);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isStatus(401)) {
          setError("Please log in to view cases");
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to load cases");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading cases...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div>
      <h2>My Cases</h2>

      <div className="filters">
        <button onClick={() => setFilter("all")}>All</button>
        <button onClick={() => setFilter("active")}>Active</button>
        <button onClick={() => setFilter("closed")}>Closed</button>
      </div>

      <div className="case-list">
        {cases.length === 0 ? (
          <p>No cases found</p>
        ) : (
          cases.map((c) => (
            <div key={c.id} className="case-card">
              <h3>{c.title}</h3>
              <p>{c.description}</p>
              <span className="status">{c.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ===== CREATE CASE EXAMPLE =====

/**
 * Create Case Form Component
 * Demonstrates creating a new case
 */
export function CreateCaseForm() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "active" as const,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.cases.create({
        ...formData,
        caseType: "other",
      });

      if (response.success) {
        setSuccess(true);
        console.log("Case created:", response.data);

        // Reset form
        setFormData({ title: "", description: "", status: "active" });

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to create case");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create New Case</h2>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">Case created successfully!</div>}

      <div>
        <label>Title:</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div>
        <label>Description:</label>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          rows={5}
        />
      </div>

      <div>
        <label>Status:</label>
        <select
          value={formData.status}
          onChange={(e) =>
            setFormData({ ...formData, status: e.target.value as "active" })
          }
        >
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <button type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create Case"}
      </button>
    </form>
  );
}

// ===== CHAT STREAMING EXAMPLE =====

/**
 * Chat Interface Component
 * Demonstrates real-time chat streaming with AI
 */
export function ChatInterface() {
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [streaming, setStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      return;
    }

    const userMessage = message;
    setMessage("");
    setStreaming(true);
    setError(null);
    setCurrentResponse("");

    // Add user message to conversation
    setConversation((prev) => [
      ...prev,
      { role: "user", content: userMessage },
    ]);

    try {
      await apiClient.chat.stream(
        userMessage,
        {
          onToken: (token) => {
            setCurrentResponse((prev) => prev + token);
          },
          onComplete: (conversationId) => {
            console.log("Conversation ID:", conversationId);
            setConversation((prev) => [
              ...prev,
              { role: "assistant", content: currentResponse },
            ]);
            setCurrentResponse("");
            setStreaming(false);
          },
          onError: (err) => {
            setError(err);
            setStreaming(false);
          },
        },
        {},
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Chat failed");
      }
      setStreaming(false);
    }
  };

  return (
    <div className="chat-interface">
      <h2>AI Chat Assistant</h2>

      {error && <div className="error">{error}</div>}

      <div className="conversation">
        {conversation.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <strong>{msg.role === "user" ? "You" : "AI"}:</strong>
            <p>{msg.content}</p>
          </div>
        ))}

        {streaming && currentResponse && (
          <div className="message assistant streaming">
            <strong>AI:</strong>
            <p>{currentResponse}</p>
          </div>
        )}

        {streaming && !currentResponse && (
          <div className="message assistant">
            <strong>AI:</strong>
            <p>Thinking...</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={streaming}
        />
        <button type="submit" disabled={streaming || !message.trim()}>
          {streaming ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}

// ===== ERROR HANDLING PATTERNS =====

/**
 * Centralized error handler function
 * Shows how to handle different types of API errors
 */
export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    // Handle specific error codes
    if (error.isCode("INVALID_CREDENTIALS")) {
      return "Invalid username or password";
    }

    if (error.isCode("USER_EXISTS")) {
      return "Username or email already exists";
    }

    if (error.isCode("NOT_FOUND")) {
      return "The requested resource was not found";
    }

    // Handle specific status codes
    if (error.isStatus(401)) {
      return "Please log in to continue";
    }

    if (error.isStatus(403)) {
      return "You do not have permission to perform this action";
    }

    if (error.isStatus(429)) {
      return "Too many requests. Please wait and try again.";
    }

    if (error.isStatus(500)) {
      return "Server error. Please try again later.";
    }

    // Default to error message
    return error.message;
  }

  // Handle network errors
  if (error instanceof TypeError) {
    return "Network connection error. Please check your internet connection.";
  }

  // Unknown error
  return "An unexpected error occurred";
}

// ===== SESSION CHECK EXAMPLE =====

/**
 * Protected Route Component
 * Demonstrates checking authentication status
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      // Try to restore session from localStorage
      const sessionId = localStorage.getItem("sessionId");

      if (!sessionId) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }

      // Validate session with backend
      apiClient.setSessionId(sessionId);
      const response = await apiClient.auth.getSession(sessionId);

      if (response.success) {
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
        localStorage.removeItem("sessionId");
      }
    } catch (err) {
      setAuthenticated(false);
      localStorage.removeItem("sessionId");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!authenticated) {
    return <div>Please log in to access this page</div>;
  }

  return <>{children}</>;
}

// ===== USAGE NOTES =====

/**
 * QUICK START GUIDE
 *
 * 1. Authentication:
 *    - Login: await apiClient.auth.login(username, password)
 *    - Register: await apiClient.auth.register(username, email, password)
 *    - Logout: await apiClient.auth.logout(sessionId)
 *    - Check Auth: await apiClient.auth.getSession(sessionId)
 *
 * 2. Case Management:
 *    - List: await apiClient.cases.list({ status: 'active' })
 *    - Get: await apiClient.cases.get(caseId)
 *    - Create: await apiClient.cases.create({ title, description, status })
 *    - Update: await apiClient.cases.update(caseId, { title, status })
 *    - Delete: await apiClient.cases.delete(caseId)
 *
 * 3. Evidence:
 *    - List: await apiClient.evidence.list(caseId)
 *    - Get: await apiClient.evidence.get(evidenceId)
 *    - Create: await apiClient.evidence.create({ caseId, ... })
 *    - Update: await apiClient.evidence.update(evidenceId, { ... })
 *    - Delete: await apiClient.evidence.delete(evidenceId)
 *
 * 4. Chat:
 *    - Stream: await apiClient.chat.stream(message, callbacks, options)
 *    - List Conversations: await apiClient.chat.getConversations(caseId, limit)
 *    - Get Conversation: await apiClient.chat.getConversation(conversationId)
 *    - Delete: await apiClient.chat.deleteConversation(conversationId)
 *
 * 5. Error Handling:
 *    try {
 *      const response = await apiClient.cases.list();
 *      if (response.success) {
 *        // Handle success
 *      }
 *    } catch (error) {
 *      if (error instanceof ApiError) {
 *        // Handle API error
 *        console.error(error.status, error.code, error.message);
 *      }
 *    }
 *
 * 6. Session Management:
 *    - apiClient.setSessionId(sessionId)  // Set session
 *    - apiClient.getSessionId()           // Get current session
 *    - localStorage.setItem('sessionId', sessionId)  // Persist session
 *    - localStorage.removeItem('sessionId')  // Clear session
 */
