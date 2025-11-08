import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from "@playwright/test";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { spawn } from "child_process";
import Database from "better-sqlite3";

/**
 * E2E GDPR Deletion Tests for Justice Companion
 *
 * Tests GDPR Article 17 (Right to Erasure) compliance:
 * - User registration and authentication
 * - Creating test data (cases, evidence, chat messages)
 * - GDPR consent management
 * - Data export before deletion
 * - Complete data deletion
 * - Verification that audit logs and consents are preserved
 *
 * Uses Playwright Electron support to test the actual desktop app
 */

let electronApp: ElectronApplication;
let window: Page;
let devServer: ReturnType<typeof spawn> | null = null;

// Test database path
const TEST_DB_PATH = path.join(
  process.cwd(),
  ".test-e2e-gdpr",
  "justice-test.db"
);
const EXPORTS_PATH = path.join(process.cwd(), "exports");

/**
 * Generate a random 32-byte encryption key for testing
 */
function generateTestEncryptionKey(): string {
  return crypto.randomBytes(32).toString("base64");
}

test.describe.serial("GDPR Article 17 - Right to Erasure", () => {
  let testUsername: string;
  let testEmail: string;
  let testPassword: string;
  let sessionId: string;
  let userId: number;

  test.beforeAll(async () => {
    // Clean up test database and exports before starting
    const testDbDir = path.dirname(TEST_DB_PATH);
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true });
    }
    fs.mkdirSync(testDbDir, { recursive: true });

    if (fs.existsSync(EXPORTS_PATH)) {
      fs.rmSync(EXPORTS_PATH, { recursive: true });
    }

    // Generate test encryption key and write to .env
    const testEncryptionKey = generateTestEncryptionKey();
    const envPath = path.join(process.cwd(), ".env");
    fs.writeFileSync(
      envPath,
      `ENCRYPTION_KEY_BASE64=${testEncryptionKey}\n`,
      "utf8"
    );
    console.log("[E2E GDPR] Created .env with test encryption key");

    // Start Vite dev server (required for Electron to load React app)
    console.log("[E2E GDPR] Starting Vite dev server...");
    devServer = spawn("pnpm", ["dev"], {
      cwd: process.cwd(),
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Wait for dev server to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Dev server failed to start within 30 seconds"));
      }, 30000);

      devServer!.stdout?.on("data", (data: Buffer) => {
        const output = data.toString();
        console.log(`[E2E GDPR][DevServer] ${output.trim()}`);
        if (
          output.includes("ready in") ||
          (output.includes("localhost") && output.includes("5176"))
        ) {
          clearTimeout(timeout);
          console.log("[E2E GDPR] Dev server is ready");
          resolve();
        }
      });

      devServer!.stderr?.on("data", (data: Buffer) => {
        console.error(`[E2E GDPR][DevServerError] ${data.toString().trim()}`);
      });

      devServer!.on("error", (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start dev server: ${error.message}`));
      });
    });

    // Launch Electron app
    console.log("[E2E GDPR] Launching Electron app...");
    electronApp = await electron.launch({
      args: ["--no-sandbox"],
      env: {
        ...process.env,
        NODE_ENV: "test",
        VITE_DEV_SERVER_HOST: "localhost",
        VITE_DEV_SERVER_PORT: "5176",
        DB_PATH: TEST_DB_PATH,
      },
    });
    window = await electronApp.firstWindow();
    console.log("[E2E GDPR] Electron app launched successfully");

    // Wait for app to be ready
    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000); // Allow time for IPC handlers to register
  });

  test.afterAll(async () => {
    // Close dev server
    if (devServer) {
      devServer.kill();
    }

    // Close Electron app
    if (electronApp) {
      await electronApp.close();
    }

    // Clean up test database
    const testDbDir = path.dirname(TEST_DB_PATH);
    if (fs.existsSync(testDbDir)) {
      fs.rmSync(testDbDir, { recursive: true });
    }

    // Clean up exports
    if (fs.existsSync(EXPORTS_PATH)) {
      fs.rmSync(EXPORTS_PATH, { recursive: true });
    }

    console.log("[E2E GDPR] Cleanup completed");
  });

  test("Step 1: Register a new user", async () => {
    // Generate unique test credentials
    testUsername = `gdprtest_${Date.now()}`;
    testEmail = `gdpr${Date.now()}@example.com`;
    testPassword = `SecurePass${Date.now()}${Math.floor(Math.random() * 1000)}!`;

    console.log("[E2E GDPR] Registering user:", testUsername);

    // Call registration via Electron API
    const response = await window.evaluate(
      async ({ username, email, password }) => {
        return await (window as any).justiceAPI.register(
          username,
          email,
          password
        );
      },
      { username: testUsername, email: testEmail, password: testPassword }
    );

    console.log("[E2E GDPR] Registration response:", response);

    expect(response.success).toBe(true);
    expect(response.data).toBeDefined();
    expect(response.data.user).toBeDefined();
    expect(response.data.session).toBeDefined();

    // Store session ID and user ID for subsequent tests
    sessionId = response.data.session.id;
    userId = response.data.user.id;

    console.log("[E2E GDPR] User registered successfully:", {
      userId,
      sessionId,
    });
  });

  test("Step 2: Create consent records", async () => {
    console.log("[E2E GDPR] Creating consent records for user:", userId);

    // Open test database directly to insert consent records
    const db = new Database(TEST_DB_PATH);

    // Insert data_processing consent (required for export)
    db.prepare(
      `INSERT INTO consent_records (userId, consentType, consentGiven, timestamp) VALUES (?, ?, ?, ?)`
    ).run(userId, "data_processing", 1, new Date().toISOString());

    // Insert data_erasure_request consent (required for deletion)
    db.prepare(
      `INSERT INTO consent_records (userId, consentType, consentGiven, timestamp) VALUES (?, ?, ?, ?)`
    ).run(userId, "data_erasure_request", 1, new Date().toISOString());

    // Verify consents were created
    const consents = db
      .prepare("SELECT * FROM consent_records WHERE userId = ?")
      .all(userId);

    db.close();

    console.log("[E2E GDPR] Consent records created:", consents.length);
    expect(consents.length).toBe(2);
  });

  test("Step 3: Create test data (cases, evidence, chat messages)", async () => {
    console.log("[E2E GDPR] Creating test data for user:", userId);

    // Create 2 test cases
    const case1Response = await window.evaluate(
      async ({ sessionId }) => {
        return await (window as any).justiceAPI.createCase(
          {
            title: "Test Case 1",
            description: "GDPR test case description",
            status: "active",
          },
          sessionId
        );
      },
      { sessionId }
    );

    expect(case1Response.success).toBe(true);
    const case1Id = case1Response.data.id;
    console.log("[E2E GDPR] Created case 1:", case1Id);

    const case2Response = await window.evaluate(
      async ({ sessionId }) => {
        return await (window as any).justiceAPI.createCase(
          {
            title: "Test Case 2",
            description: "Another GDPR test case",
            status: "active",
          },
          sessionId
        );
      },
      { sessionId }
    );

    expect(case2Response.success).toBe(true);
    const case2Id = case2Response.data.id;
    console.log("[E2E GDPR] Created case 2:", case2Id);

    // Open database to insert additional test data
    const db = new Database(TEST_DB_PATH);

    // Insert evidence for case 1
    db.prepare(
      `INSERT INTO evidence (caseId, title, evidenceType, content) VALUES (?, ?, ?, ?)`
    ).run(case1Id, "Evidence 1", "document", "Evidence content 1");

    // Insert chat conversation
    const conversationResult = db
      .prepare(`INSERT INTO chat_conversations (userId, title) VALUES (?, ?)`)
      .run(userId, "Test Chat Conversation");
    const conversationId = conversationResult.lastInsertRowid;

    // Insert chat messages
    db.prepare(
      `INSERT INTO chat_messages (conversationId, message, response) VALUES (?, ?, ?)`
    ).run(conversationId, "Test question", "Test response");

    // Verify data was created
    const cases = db
      .prepare("SELECT * FROM cases WHERE userId = ?")
      .all(userId);
    const evidence = db
      .prepare(
        "SELECT * FROM evidence WHERE caseId IN (SELECT id FROM cases WHERE userId = ?)"
      )
      .all(userId);
    const conversations = db
      .prepare("SELECT * FROM chat_conversations WHERE userId = ?")
      .all(userId);
    const messages = db
      .prepare(
        "SELECT * FROM chat_messages WHERE conversationId IN (SELECT id FROM chat_conversations WHERE userId = ?)"
      )
      .all(userId);

    db.close();

    console.log("[E2E GDPR] Test data created:", {
      cases: cases.length,
      evidence: evidence.length,
      conversations: conversations.length,
      messages: messages.length,
    });

    expect(cases.length).toBe(2);
    expect(evidence.length).toBe(1);
    expect(conversations.length).toBe(1);
    expect(messages.length).toBe(1);
  });

  test("Step 4: Export user data (GDPR Article 20)", async () => {
    console.log("[E2E GDPR] Exporting user data for:", userId);

    const exportResponse = await window.evaluate(
      async ({ sessionId }) => {
        return await (window as any).electronAPI.gdpr.exportData(sessionId, {
          format: "json",
        });
      },
      { sessionId }
    );

    console.log("[E2E GDPR] Export response:", exportResponse);

    expect(exportResponse.success).toBe(true);
    expect(exportResponse.data).toBeDefined();
    expect(exportResponse.data.filePath).toBeDefined();
    expect(exportResponse.data.totalRecords).toBeGreaterThan(0);

    // Verify export file was created
    const exportFilePath = exportResponse.data.filePath;
    expect(fs.existsSync(exportFilePath)).toBe(true);

    // Read and verify export contents
    const exportData = JSON.parse(fs.readFileSync(exportFilePath, "utf-8"));
    expect(exportData.metadata).toBeDefined();
    expect(exportData.metadata.userId).toBe(userId);
    expect(exportData.userData).toBeDefined();
    expect(exportData.userData.user).toBeDefined();
    expect(exportData.userData.cases).toBeDefined();
    expect(exportData.userData.cases.length).toBe(2);

    console.log("[E2E GDPR] Export file verified:", exportFilePath);
  });

  test("Step 5: Delete user data (GDPR Article 17)", async () => {
    console.log("[E2E GDPR] Deleting all user data for:", userId);

    const deleteResponse = await window.evaluate(
      async ({ sessionId }) => {
        return await (window as any).electronAPI.gdpr.deleteData(sessionId, {
          confirmed: true,
          exportBeforeDelete: false,
          reason: "E2E test - GDPR Article 17 compliance verification",
        });
      },
      { sessionId }
    );

    console.log("[E2E GDPR] Deletion response:", deleteResponse);

    expect(deleteResponse.success).toBe(true);
    expect(deleteResponse.data).toBeDefined();
    expect(deleteResponse.data.success).toBe(true);
    expect(deleteResponse.data.deletedCounts).toBeDefined();
    expect(deleteResponse.data.preservedAuditLogs).toBeGreaterThan(0);
    expect(deleteResponse.data.preservedConsents).toBe(2);

    // Verify specific deletions
    expect(deleteResponse.data.deletedCounts.cases).toBe(2);
    expect(deleteResponse.data.deletedCounts.evidence).toBe(1);
    expect(deleteResponse.data.deletedCounts.chat_conversations).toBe(1);
    expect(deleteResponse.data.deletedCounts.chat_messages).toBe(1);
    expect(deleteResponse.data.deletedCounts.users).toBe(1);

    console.log("[E2E GDPR] Deletion completed:", {
      deletedTables: Object.keys(deleteResponse.data.deletedCounts).length,
      preservedAuditLogs: deleteResponse.data.preservedAuditLogs,
      preservedConsents: deleteResponse.data.preservedConsents,
    });
  });

  test("Step 6: Verify data is deleted from database", async () => {
    console.log("[E2E GDPR] Verifying data deletion for user:", userId);

    const db = new Database(TEST_DB_PATH);

    // Verify user is deleted
    const users = db.prepare("SELECT * FROM users WHERE id = ?").all(userId);
    expect(users.length).toBe(0);

    // Verify cases are deleted
    const cases = db
      .prepare("SELECT * FROM cases WHERE userId = ?")
      .all(userId);
    expect(cases.length).toBe(0);

    // Verify evidence is deleted
    const evidence = db
      .prepare(
        "SELECT * FROM evidence WHERE caseId IN (SELECT id FROM cases WHERE userId = ?)"
      )
      .all(userId);
    expect(evidence.length).toBe(0);

    // Verify chat conversations are deleted
    const conversations = db
      .prepare("SELECT * FROM chat_conversations WHERE userId = ?")
      .all(userId);
    expect(conversations.length).toBe(0);

    // Verify chat messages are deleted
    const messages = db
      .prepare(
        "SELECT * FROM chat_messages WHERE conversationId IN (SELECT id FROM chat_conversations WHERE userId = ?)"
      )
      .all(userId);
    expect(messages.length).toBe(0);

    console.log("[E2E GDPR] All user data verified as deleted");

    // Verify audit logs are PRESERVED (legal requirement)
    const auditLogs = db
      .prepare("SELECT * FROM audit_logs WHERE user_id = ?")
      .all(userId.toString());
    expect(auditLogs.length).toBeGreaterThan(0);
    console.log("[E2E GDPR] Audit logs preserved:", auditLogs.length);

    // Verify consent records are PRESERVED (legal requirement)
    const consents = db
      .prepare("SELECT * FROM consent_records WHERE userId = ?")
      .all(userId);
    expect(consents.length).toBe(2);
    console.log("[E2E GDPR] Consent records preserved:", consents.length);

    db.close();
  });

  test("Step 7: Verify user cannot login after deletion", async () => {
    console.log(
      "[E2E GDPR] Attempting to login as deleted user:",
      testUsername
    );

    const loginResponse = await window.evaluate(
      async ({ username, password }) => {
        return await (window as any).justiceAPI.login(
          username,
          password,
          false
        );
      },
      { username: testUsername, password: testPassword }
    );

    console.log("[E2E GDPR] Login response for deleted user:", loginResponse);

    // Login should fail because user is deleted
    expect(loginResponse.success).toBe(false);
    expect(loginResponse.error).toBeDefined();

    console.log("[E2E GDPR] Confirmed: deleted user cannot login");
  });
});

test.describe.serial("GDPR Article 17 - Error Scenarios", () => {
  let testUsername: string;
  let testPassword: string;
  let sessionId: string;
  let userId: number;

  test.beforeAll(async () => {
    // Reuse existing Electron app from previous test suite
    if (!electronApp) {
      throw new Error(
        "Electron app not initialized. Run main test suite first."
      );
    }
  });

  test("Error 1: Deletion without consent should fail", async () => {
    // Register new user without GDPR consents
    testUsername = `gdprtest_noconsent_${Date.now()}`;
    testPassword = `SecurePass${Date.now()}${Math.floor(Math.random() * 1000)}!`;

    const response = await window.evaluate(
      async ({ username, password }) => {
        return await (window as any).justiceAPI.register(
          username,
          `${username}@example.com`,
          password
        );
      },
      { username: testUsername, password: testPassword }
    );

    sessionId = response.data.session.id;
    userId = response.data.user.id;

    console.log("[E2E GDPR] Registered user without consents:", userId);

    // Attempt deletion without data_erasure_request consent
    const deleteResponse = await window.evaluate(
      async ({ sessionId }) => {
        return await (window as any).electronAPI.gdpr.deleteData(sessionId, {
          confirmed: true,
          reason: "Test deletion without consent",
        });
      },
      { sessionId }
    );

    console.log("[E2E GDPR] Deletion response (no consent):", deleteResponse);

    // Should fail with consent error
    expect(deleteResponse.success).toBe(false);
    expect(deleteResponse.error).toBeDefined();
    expect(deleteResponse.error.toLowerCase()).toContain("consent");
  });

  test("Error 2: Deletion without confirmation should fail", async () => {
    // Create data_erasure_request consent
    const db = new Database(TEST_DB_PATH);
    db.prepare(
      `INSERT INTO consent_records (userId, consentType, consentGiven, timestamp) VALUES (?, ?, ?, ?)`
    ).run(userId, "data_erasure_request", 1, new Date().toISOString());
    db.close();

    // Attempt deletion without confirmed flag (if API enforces it)
    // Note: This test depends on how the frontend API is structured
    // If the preload always sends confirmed: true, this test may need adjustment
    console.log("[E2E GDPR] Testing deletion confirmation requirement");

    // For now, we'll skip this test as the preload API may not expose the confirmed flag
    test.skip();
  });
});
