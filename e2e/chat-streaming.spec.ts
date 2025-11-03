import { test, expect, _electron as electron } from '@playwright/test';
import { ElectronApplication, Page } from 'playwright';
import path from 'node:path';

/**
 * E2E Test: Chat Streaming with Groq
 *
 * Tests the complete chat flow:
 * 1. Configure Groq API key securely
 * 2. Navigate to Chat view
 * 3. Send a message
 * 4. Verify streaming response
 * 5. Verify legal disclaimer appended
 */

test.describe('Chat Streaming with Groq', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../electron/main.ts')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    });

    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('should configure Groq API key and stream chat responses', async () => {
    // Step 1: Login (session persistence should work)
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });

    const usernameInput = page.locator('input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginButton = page.locator('button:has-text("Sign In")');

    await usernameInput.fill('testuser');
    await passwordInput.fill('Test1234!');
    await loginButton.click();

    // Wait for dashboard
    await page.waitForSelector('text=Welcome back', { timeout: 5000 });

    // Step 2: Configure Groq API key
    const configResult = await page.evaluate(async () => {
      return await globalThis.window.justiceAPI.configureAI({
        apiKey: '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',
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
      });
    });

    expect(configResult.success).toBe(true);
    expect(configResult.data?.success).toBe(true);
    expect(configResult.data?.message).toContain('API key saved successfully');

    // Step 3: Navigate to Chat
    const chatButton = page.locator('button:has-text("Start Chat")').or(
      page.locator('a[href="/chat"]')
    );
    await chatButton.click();

    // Wait for chat view
    await page.waitForSelector('text=AI Legal Assistant', { timeout: 5000 });

    // Verify legal disclaimer is visible
    await expect(page.locator('text=This AI provides legal information, NOT legal advice')).toBeVisible();

    // Step 4: Send a test message
    const chatInput = page.locator('textarea[placeholder*="Ask me anything"]');
    const sendButton = page.locator('button:has([stroke])').last(); // The send button has an SVG icon

    await chatInput.fill('What are my rights if I\'m being bullied at work?');
    await sendButton.click();

    // Step 5: Verify user message appears
    await expect(page.locator('text=What are my rights if I\'m being bullied at work?')).toBeVisible({
      timeout: 3000,
    });

    // Step 6: Wait for streaming to start (AI response appears)
    // Look for the "AI Assistant" label with "Responding..." indicator
    await expect(page.locator('text=AI Assistant')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Responding...')).toBeVisible({ timeout: 5000 });

    // Step 7: Wait for streaming to complete (no more "Responding..." indicator)
    await expect(page.locator('text=Responding...')).not.toBeVisible({ timeout: 60000 });

    // Step 8: Verify response contains content (at least 50 characters means real response)
    const assistantMessages = page.locator('[class*="bg-gray-800"]').filter({
      has: page.locator('text=AI Assistant'),
    });
    const firstResponse = assistantMessages.first();
    const responseText = await firstResponse.textContent();

    expect(responseText).toBeTruthy();
    expect(responseText!.length).toBeGreaterThan(50); // Real AI response, not an error

    // Step 9: Verify legal disclaimer is appended to response
    // The disclaimer is added by the IPC handler, so it should be in the response
    expect(responseText).toContain('Legal Disclaimer');
    expect(responseText).toContain('information, not legal advice');

    console.log('[E2E Test] ✅ Chat streaming test passed!');
    console.log('[E2E Test] Response length:', responseText!.length, 'characters');
  });

  test('should handle chat errors gracefully', async () => {
    // Navigate to chat (should already be logged in from previous test)
    await page.goto('http://localhost:5176/chat');
    await page.waitForSelector('text=AI Legal Assistant', { timeout: 5000 });

    // Clear the API key to simulate misconfiguration
    await page.evaluate(async () => {
      // This will cause an error because no API key
      return await globalThis.window.justiceAPI.configureAI({
        apiKey: '',
        provider: 'groq',
      });
    });

    const chatInput = page.locator('textarea[placeholder*="Ask me anything"]');
    const sendButton = page.locator('button:has([stroke])').last();

    await chatInput.fill('This should fail');
    await sendButton.click();

    // Expect error message
    await expect(page.locator('text=Sorry, I hit an error')).toBeVisible({ timeout: 10000 });
  });

  test('should show thinking process when available', async () => {
    // Re-configure API key (in case previous test cleared it)
    await page.evaluate(async () => {
      return await globalThis.window.justiceAPI.configureAI({
        apiKey: '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',
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
      });
    });

    await page.goto('http://localhost:5176/chat');
    await page.waitForSelector('text=AI Legal Assistant', { timeout: 5000 });

    const chatInput = page.locator('textarea[placeholder*="Ask me anything"]');
    const sendButton = page.locator('button:has([stroke])').last();

    await chatInput.fill('Explain constructive dismissal in simple terms');
    await sendButton.click();

    // Wait for response
    await expect(page.locator('text=Responding...')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Responding...')).not.toBeVisible({ timeout: 60000 });

    // Check if thinking process is available (might not always be present)
    const thinkingToggle = page.locator('summary:has-text("View AI reasoning process")');
    if (await thinkingToggle.isVisible()) {
      await thinkingToggle.click();
      // Thinking content should be visible
      await expect(page.locator('text=thinking').or(page.locator('[class*="reasoning"]'))).toBeVisible();
    }

    console.log('[E2E Test] ✅ Thinking process test passed (or not available)');
  });

  test('should persist chat messages in conversation', async () => {
    await page.goto('http://localhost:5176/chat');
    await page.waitForSelector('text=AI Legal Assistant', { timeout: 5000 });

    const chatInput = page.locator('textarea[placeholder*="Ask me anything"]');
    const sendButton = page.locator('button:has([stroke])').last();

    // Send first message
    await chatInput.fill('What is unfair dismissal?');
    await sendButton.click();
    await expect(page.locator('text=Responding...')).not.toBeVisible({ timeout: 60000 });

    // Send follow-up message
    await chatInput.fill('How long do I have to file a claim?');
    await sendButton.click();
    await expect(page.locator('text=Responding...')).not.toBeVisible({ timeout: 60000 });

    // Both messages should be visible
    await expect(page.locator('text=What is unfair dismissal?')).toBeVisible();
    await expect(page.locator('text=How long do I have to file a claim?')).toBeVisible();

    // Should have at least 4 messages total (2 user + 2 assistant)
    const allMessages = page.locator('[class*="justify-start"], [class*="justify-end"]');
    const messageCount = await allMessages.count();
    expect(messageCount).toBeGreaterThanOrEqual(4);

    console.log('[E2E Test] ✅ Message persistence test passed!');
    console.log('[E2E Test] Total messages:', messageCount);
  });
});
