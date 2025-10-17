import { expect, test } from '@playwright/test';
import {
  authenticateTestUser,
  closeElectronApp,
  launchElectronApp,
  type ElectronTestApp,
} from '../setup/electron-setup.js';
import { chatMessagesFixtures } from '../setup/fixtures.js';
import { getTestDatabase, TEST_USER_CREDENTIALS } from '../setup/test-database.js';

let testApp: ElectronTestApp;

test.beforeEach(async () => {
  // ✅ FIX #2: Launch app WITHOUT seeded data to avoid session management mismatch
  // The app uses runtime-only session variable (currentSessionId) that's only set during IPC login,
  // not from database. Going through actual login flow ensures proper session state.
  testApp = await launchElectronApp({ seedData: false });

  // Authenticate test user through actual login flow (sets currentSessionId properly)
  await authenticateTestUser(testApp.window, {
    username: TEST_USER_CREDENTIALS.username,
    password: TEST_USER_CREDENTIALS.password,
  });
});

test.afterEach(async () => {
  await closeElectronApp(testApp);
});

test.describe('AI Chat E2E', () => {
  test('should send chat message and save to database', async () => {
    const { window, dbPath } = testApp;
    const chatData = chatMessagesFixtures.greeting;

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Navigate to chat interface
    const chatNav =
      (await window.$('[data-testid="nav-chat"]')) ||
      (await window.$('a:has-text("Chat")')) ||
      (await window.$('button:has-text("AI Assistant")'));

    if (chatNav) {
      await chatNav.click();
      await window.waitForTimeout(1000);
    }

    // Find chat input
    const chatInput =
      (await window.$('[data-testid="chat-input"]')) ||
      (await window.$('textarea[placeholder*="message" i]')) ||
      (await window.$('input[placeholder*="message" i]'));

    expect(chatInput).toBeTruthy();

    if (chatInput) {
      // Type message
      await chatInput.fill(chatData.content);
      await window.waitForTimeout(500);

      // Send message
      const sendBtn =
        (await window.$('[data-testid="send-message-btn"]')) ||
        (await window.$('button:has-text("Send")'));

      if (sendBtn) {
        await sendBtn.click();

        // Wait for user message to appear (not AI response)
        // AI response may not come if OpenAI isn't configured or local model isn't available
        await window.waitForTimeout(1000);

        // Verify user message appears in chat
        const userMessage = await window.$(`text=${chatData.content}`);
        expect(userMessage).toBeTruthy();

        // Check for chat messages (at least the user's message should be there)
        const messages = await window.$$('[data-testid="chat-message"]');
        expect(messages.length).toBeGreaterThanOrEqual(1); // At least user message

        // Verify message persisted in database
        const db = getTestDatabase(dbPath);
        const dbMessages = db.prepare('SELECT * FROM chat_messages WHERE role = ?').all('user');

        expect(dbMessages.length).toBeGreaterThan(0);

        // Check if user's message was saved
        const userMsg = dbMessages.find((msg: any) => msg.content === chatData.content);
        expect(userMsg).toBeTruthy();

        db.close();
      }
    }
  });

  test('should display conversation history', async () => {
    const { window, dbPath } = testApp;

    // Seed some chat messages
    const db = getTestDatabase(dbPath);
    db.exec(`
      INSERT INTO chat_conversations (id, case_id, title, created_at)
      VALUES (1, 1, 'Test Conversation', datetime('now'));

      INSERT INTO chat_messages (conversation_id, role, content, created_at)
      VALUES
        (1, 'user', 'Hello', datetime('now')),
        (1, 'assistant', 'Hi! How can I help?', datetime('now'));
    `);
    db.close();

    // Reload page
    await window.reload();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Navigate to chat
    const chatNav = await window.$('[data-testid="nav-chat"]');
    if (chatNav) {
      await chatNav.click();
      await window.waitForTimeout(1000);
    }

    // Verify messages are displayed
    const userMsg = await window.$('text=Hello');
    const assistantMsg = await window.$('text=Hi! How can I help?');

    expect(userMsg).toBeTruthy();
    expect(assistantMsg).toBeTruthy();
  });

  // This test requires AI to be configured (OpenAI API key or local model)
  // Skip it in CI/CD if AI isn't set up
  test.skip('should receive AI response', async () => {
    const { window } = testApp;
    const chatData = chatMessagesFixtures.greeting;

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Navigate to chat interface
    const chatNav =
      (await window.$('[data-testid="nav-chat"]')) || (await window.$('a:has-text("Chat")'));

    if (chatNav) {
      await chatNav.click();
      await window.waitForTimeout(1000);
    }

    // Send message
    const chatInput = await window.$('[data-testid="chat-input"]');
    if (chatInput) {
      await chatInput.fill(chatData.content);

      const sendBtn = await window.$('[data-testid="send-message-btn"]');
      if (sendBtn) {
        await sendBtn.click();

        // Wait for AI response (up to 10 seconds)
        const aiResponse = await window
          .waitForSelector('[data-testid="chat-message"][data-role="assistant"]', {
            timeout: 10000,
            state: 'visible',
          })
          .catch(() => null);

        // If AI is configured, we should get a response
        if (aiResponse) {
          const responseText = await aiResponse.textContent();
          expect(responseText).toBeTruthy();
          expect(responseText!.length).toBeGreaterThan(0);
        } else {
          console.log('⚠️  AI not configured - skipping AI response check');
        }
      }
    }
  });

  test('should create new conversation', async () => {
    const { window, dbPath } = testApp;

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Navigate to chat
    const chatNav = await window.$('[data-testid="nav-chat"]');
    if (chatNav) {
      await chatNav.click();
      await window.waitForTimeout(1000);
    }

    // Click new conversation button
    const newConvoBtn =
      (await window.$('[data-testid="new-conversation-btn"]')) ||
      (await window.$('button:has-text("New Conversation")'));

    if (newConvoBtn) {
      await newConvoBtn.click();
      await window.waitForTimeout(1000);

      // Send a message to create the conversation
      const chatInput = await window.$('[data-testid="chat-input"]');
      if (chatInput) {
        await chatInput.fill('Start new conversation');

        const sendBtn = await window.$('[data-testid="send-message-btn"]');
        if (sendBtn) {
          await sendBtn.click();

          // Wait for message to be sent (not AI response)
          await window.waitForTimeout(1000);

          // Verify conversation was created in database
          const db = getTestDatabase(dbPath);
          const conversations = db.prepare('SELECT * FROM chat_conversations').all();

          expect(conversations.length).toBeGreaterThan(0);

          // Verify the message was saved
          const messages = db.prepare('SELECT * FROM chat_messages WHERE role = ?').all('user');
          expect(messages.length).toBeGreaterThan(0);

          db.close();
        }
      }
    }
  });
});
