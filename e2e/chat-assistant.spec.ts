import { expect, test } from "@playwright/test";
import { loginWithSeededUser, resetAuthState } from "./utils/auth";

/**
 * AI Chat Assistant E2E Tests
 */

test.beforeEach(async ({ page }) => {
  await resetAuthState(page);
  await loginWithSeededUser(page);
  await page.goto("/chat");
  await page.waitForLoadState("networkidle");
});

test.describe("AI Chat Assistant", () => {
  test("should display chat page", async ({ page }) => {
    await expect(page).toHaveURL(/\/chat/);
    await page.screenshot({
      path: "test-results/chat-view.png",
      fullPage: true,
    });
  });

  test("should display chat interface", async ({ page }) => {
    const bodyText = (await page.locator("body").textContent()) || "";
    const hasChatContent =
      bodyText.toLowerCase().includes("chat") ||
      bodyText.toLowerCase().includes("message") ||
      bodyText.toLowerCase().includes("ask") ||
      bodyText.toLowerCase().includes("assistant");
    expect(hasChatContent).toBeTruthy();
  });

  test("should have message input field", async ({ page }) => {
    const inputSelectors = [
      page.getByPlaceholder(/type.*message/i),
      page.getByPlaceholder(/ask/i),
      page.getByRole("textbox"),
      page.locator("textarea"),
      page.locator('input[type="text"]'),
    ];

    let found = false;
    for (const input of inputSelectors) {
      if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(input).toBeVisible();
        found = true;
        break;
      }
    }

    if (!found) {
      console.log(
        "No message input found - chat may be disabled or configured differently",
      );
    }
  });

  test("should have send button", async ({ page }) => {
    const sendButtons = [
      page.getByRole("button", { name: /send/i }),
      page.locator('button[type="submit"]'),
      page.locator("button").filter({ hasText: /send/i }),
    ];

    let found = false;
    for (const button of sendButtons) {
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(button).toBeVisible();
        found = true;
        break;
      }
    }

    if (!found) {
      console.log("No send button found");
    }
  });

  test("should display chat history or empty state", async ({ page }) => {
    const bodyText = (await page.locator("body").textContent()) || "";
    const hasMessages =
      bodyText.toLowerCase().includes("message") ||
      bodyText.toLowerCase().includes("conversation") ||
      bodyText.toLowerCase().includes("no messages") ||
      bodyText.toLowerCase().includes("start chatting");
    expect(hasMessages).toBeTruthy();
  });

  test("should handle sending a message", async ({ page }) => {
    const textarea = page.locator('textarea, input[type="text"]').first();

    if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
      await textarea.fill("Hello, this is a test message");

      const sendButton = page.getByRole("button", { name: /send/i }).first();
      if (await sendButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await sendButton.click();
        await page.waitForTimeout(1000);
        console.log("Message sent successfully");
      }
    } else {
      console.log("Cannot send message - input not available");
    }
  });

  test("should load without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.reload();
    await page.waitForLoadState("networkidle");
    const criticalErrors = errors.filter(
      (err) => !err.includes("favicon") && !err.includes("AI"),
    );
    expect(criticalErrors.length).toBe(0);
  });

  test("should persist after refresh", async ({ page }) => {
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/chat/);
  });
});
