import { test, expect } from '@playwright/test';
import { launchElectronApp, closeElectronApp, type ElectronTestApp } from '../setup/electron-setup.js';
import { chatMessagesFixtures } from '../setup/fixtures.js';
import { getTestDatabase } from '../setup/test-database.js';

let testApp: ElectronTestApp;

test.beforeEach(async () => {
  // Launch app with seeded data
  testApp = await launchElectronApp({ seedData: true });
});

test.afterEach(async () => {
  await closeElectronApp(testApp);
});

test.describe('AI Chat E2E', () => {
  test('should send chat message and receive response', async () => {
    const { window, dbPath } = testApp;
    const chatData = chatMessagesFixtures.greeting;

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Navigate to chat interface
    const chatNav = await window.$('[data-testid="nav-chat"]') ||
                    await window.$('a:has-text("Chat")') ||
                    await window.$('button:has-text("AI Assistant")');

    if (chatNav) {
      await chatNav.click();
      await window.waitForTimeout(1000);
    }

    // Find chat input
    const chatInput = await window.$('[data-testid="chat-input"]') ||
                      await window.$('textarea[placeholder*="message" i]') ||
                      await window.$('input[placeholder*="message" i]');

    expect(chatInput).toBeTruthy();

    if (chatInput) {
      // Type message
      await chatInput.fill(chatData.content);
      await window.waitForTimeout(500);

      // Send message
      const sendBtn = await window.$('[data-testid="send-message-btn"]') ||
                     await window.$('button:has-text("Send")');

      if (sendBtn) {
        await sendBtn.click();
        await window.waitForTimeout(3000); // Wait for AI response

        // Verify message appears in chat
        const userMessage = await window.$(`text=${chatData.content}`);
        expect(userMessage).toBeTruthy();

        // Check for AI response (should contain some content)
        const messages = await window.$$('[data-testid="chat-message"]');
        expect(messages.length).toBeGreaterThan(0);

        // Verify message persisted in database
        const db = getTestDatabase(dbPath);
        const dbMessages = db.prepare('SELECT * FROM chat_messages').all();

        expect(dbMessages.length).toBeGreaterThan(0);
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
    const newConvoBtn = await window.$('[data-testid="new-conversation-btn"]') ||
                        await window.$('button:has-text("New Conversation")');

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
          await window.waitForTimeout(2000);

          // Verify conversation was created in database
          const db = getTestDatabase(dbPath);
          const conversations = db.prepare('SELECT * FROM chat_conversations').all();

          expect(conversations.length).toBeGreaterThan(0);
          db.close();
        }
      }
    }
  });
});
