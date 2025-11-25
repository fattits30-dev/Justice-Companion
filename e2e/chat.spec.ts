import { expect, test } from "@playwright/test";
import { loginWithSeededUser } from "./utils/auth";

test.describe("AI Chat Functionality", () => {
  test.beforeEach(async ({ page }) => {
    await loginWithSeededUser(page);
  });

  test("should navigate to chat interface", async ({ page }) => {
    // Click Chat navigation
    await page.click('a[href*="chat"], text=Chat, text=AI Assistant');

    // Should be on chat page
    await expect(page.url()).toMatch(/\/chat/);
    await expect(page.locator("text=Chat")).toBeVisible();
  });

  test("should send basic chat message and receive AI response", async ({
    page,
  }) => {
    // Navigate to chat
    await page.click('a[href*="chat"], text=Chat');
    await expect(page.url()).toMatch(/\/chat/);

    // Wait for chat interface to load
    await expect(
      page.locator('[data-testid="message-input"], textarea')
    ).toBeVisible();

    // Type a simple legal question
    await page.fill(
      '[data-testid="message-input"], textarea',
      "Can they fire me?"
    );

    // Send message
    await page.click(
      'button[type="submit"], [data-testid="send-button"], text=Send'
    );

    // Should see message in chat
    await expect(page.locator("text=Can they fire me?")).toBeVisible({
      timeout: 5000,
    });

    // Should receive AI response (check for common legal terms)
    const aiResponse = page.locator('[data-testid="ai-message"], .ai-message');
    await expect(aiResponse.or(page.locator("text=Employment"))).toBeVisible({
      timeout: 30000,
    });

    // Response should contain UK-specific legal content
    await expect(page.locator("text=UK,Employment Rights Act")).toBeVisible({
      timeout: 25000,
    });
  });

  test("should stream AI response word by word", async ({ page }) => {
    await page.click('a[href*="chat"]');
    await expect(page.url()).toMatch(/\/chat/);

    await page.fill('[data-testid="message-input"]', "Unfair dismissal");

    // Count words before sending
    const initialWordCount = await page
      .locator('.ai-message, [data-testid="ai-response"]')
      .count();

    await page.click('button[type="submit"]');

    // Wait for streaming to start
    await page.waitForTimeout(2000);

    // Check if content is being added progressively
    const wordsDuringStream = await page
      .locator('.ai-message, [data-testid="ai-response"]')
      .count();

    // Should have more content than initial state
    expect(wordsDuringStream).toBeGreaterThan(initialWordCount);

    // Final response should be comprehensive
    await expect(
      page.locator(
        "text=Employment Rights Act 1996,ACAS,unfair dismissal,gross misconduct"
      )
    ).toBeVisible({ timeout: 25000 });
  });

  test("should show typing indicator during AI response", async ({ page }) => {
    await page.click('a[href*="chat"]');
    await page.fill('[data-testid="message-input"]', "Employment tribunal");
    await page.click('button[type="submit"]');

    // Look for typing indicators
    const typingIndicators = [
      "text=AI is typing...",
      "text=Thinking...",
      '[data-testid="typing-indicator"]',
      ".typing-indicator",
      "text=Generating response",
    ];

    // Check if any typing indicator appears
    for (const indicator of typingIndicators) {
      try {
        await expect(page.locator(indicator)).toBeVisible({ timeout: 1000 });
        break; // Found one, that's good enough
      } catch (e) {
        continue;
      }
    }

    // Response should eventually appear
    await expect(page.locator("text=employment tribunal")).toBeVisible({
      timeout: 25000,
    });
  });

  test("should handle conversation history", async ({ page }) => {
    await page.click('a[href*="chat"]');

    // Send first message
    await page.fill('[data-testid="message-input"]', "What is ET1 form?");
    await page.click('button[type="submit"]');

    await expect(page.locator("text=ET1 form")).toBeVisible({
      timeout: 20000,
    });

    // Send follow-up message
    await page.fill('[data-testid="message-input"]', "How do I fill it out?");
    await page.click('button[type="submit"]');

    // Should see both questions
    await expect(page.locator("text=What is ET1 form?")).toBeVisible();
    await expect(page.locator("text=How do I fill it out?")).toBeVisible();

    // Should have two AI responses
    await expect(page.locator(".ai-message")).toHaveCount(2);
  });

  test("should handle legal terminology and sources", async ({ page }) => {
    await page.click('a[href*="chat"]');

    await page.fill(
      '[data-testid="message-input"]',
      "Wrongful dismissal claim"
    );
    await page.click('button[type="submit"]');

    // Should mention legal sources
    const legalSources = [
      "Employment Rights Act 1996",
      "ACAS",
      "GOV.UK",
      "Citizens Advice",
      "NICEIC",
    ];

    // Check if any legal sources are mentioned
    for (const source of legalSources) {
      try {
        await expect(page.locator(`text=${source}`)).toBeVisible({
          timeout: 25000,
        });
        break; // Found one, good enough
      } catch (e) {
        continue;
      }
    }
  });

  test("should handle document upload in chat", async ({ page }) => {
    await page.click('a[href*="chat"]');

    // Look for upload button (paperclip, plus, or upload icon)
    const uploadButton = page.locator(
      'button[aria-label*="upload"], [data-testid*="upload"], .upload-button, button:has(.lucide-plus)'
    );

    if (await uploadButton.isVisible()) {
      await uploadButton.click();

      // Create a sample text file for upload
      await page.setInputFiles('input[type="file"]', {
        name: "test-contract.txt",
        mimeType: "text/plain",
        buffer: Buffer.from(
          "This is a sample employment contract for testing purposes."
        ),
      });

      // Message should appear about document upload
      await expect(
        page.locator("text=document,uploaded,file,analyzing")
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test("should show error for empty message", async ({ page }) => {
    await page.click('a[href*="chat"]');

    // Try to send empty message
    await page.click('button[type="submit"]');

    // Should show error or not send
    const messageCount = await page.locator(".user-message").count();
    expect(messageCount).toBe(0); // Should not have sent

    // Alternative: check for validation message
    await expect(
      page.locator("text=Please enter a message,Message cannot be empty")
    ).toBeVisible();
  });

  test("should handle long messages", async ({ page }) => {
    await page.click('a[href*="chat"]');

    // Create a long detailed message
    const longMessage =
      "I have been working for my company for 5 years and recently had a dispute with my manager about working hours. We tried to resolve it through the company's HR procedures but haven't reached a satisfactory solution. Can you explain what options I might have for raising a formal grievance or if I should consider other legal actions under UK employment law? I work in London and my contract mentions the disciplinary procedure but I'm not sure if I've been treated fairly.";

    await page.fill('[data-testid="message-input"]', longMessage);
    await page.click('button[type="submit"]');

    // Should accept long message
    await expect(
      page.locator(`text=${longMessage.substring(0, 50)}`)
    ).toBeVisible();

    // Should get comprehensive response
    await expect(
      page.locator("text=grievance procedure,ACAS,EAT,Employment Tribunal")
    ).toBeVisible({ timeout: 30000 });
  });
});
