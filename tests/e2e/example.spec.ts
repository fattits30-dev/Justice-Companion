import { expect, test } from "@playwright/test";

test("has title", async ({ page }) => {
  await page.goto("/");

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Justice Companion/);
});

test("has login form", async ({ page }) => {
  await page.goto("/");

  // Expect to see the login form
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  await expect(page.getByLabel("Remember me")).toBeVisible();
});
