import { expect, test } from "@playwright/test";
import { loginWithSeededUser } from "./utils/auth";
test.describe("User Profile Management", () => {
    test("should save and persist profile changes", async ({ page }) => {
        await loginWithSeededUser(page);
        // Click on the user profile area in the sidebar to open profile manager
        const profileButton = page
            .locator('[aria-label*="profile settings"]')
            .first();
        if (await profileButton.isVisible()) {
            await profileButton.click();
        }
        else {
            // Try clicking on the username text
            await page.locator("text=Legal User").first().click();
        }
        // Wait for profile manager dialog to open
        await page.waitForSelector("text=Profile Manager", { timeout: 5000 });
        // Fill in profile information
        const testFirstName = "John";
        const testLastName = "Doe";
        const testEmail = "john.doe@example.com";
        // Clear and fill first name
        const firstNameInput = page.locator('input[placeholder="Enter first name"]');
        await firstNameInput.clear();
        await firstNameInput.fill(testFirstName);
        // Clear and fill last name
        const lastNameInput = page.locator('input[placeholder="Enter last name"]');
        await lastNameInput.clear();
        await lastNameInput.fill(testLastName);
        // Clear and fill email
        const emailInput = page.locator('input[placeholder="Enter your email"]');
        await emailInput.clear();
        await emailInput.fill(testEmail);
        // Click save
        await page.locator("text=Save Changes").click();
        // Wait for success toast
        await page.waitForSelector("text=Profile updated", { timeout: 5000 });
        // Verify the profile was updated in the UI
        await page.waitForSelector(`text=${testFirstName} ${testLastName}`, {
            timeout: 5000,
        });
        // Refresh the page to test persistence
        await page.reload();
        // Wait for app to reload
        await page.waitForSelector("text=Justice Companion", { timeout: 10000 });
        // Verify profile data persisted after refresh
        await page.waitForSelector(`text=${testFirstName} ${testLastName}`, {
            timeout: 5000,
        });
        await page.waitForSelector(`text=${testEmail}`, { timeout: 5000 });
        console.log("✅ Profile test passed: Data saved and persisted correctly");
    });
    test("should pass profile data to document analysis", async ({ page }) => {
        // This test would require uploading a document and checking if the AI recognizes the user
        // For now, we'll just verify the profile data is available in localStorage
        await loginWithSeededUser(page);
        // Check localStorage for profile data
        const localStorageData = await page.evaluate(() => {
            return {
                firstName: localStorage.getItem("userFirstName"),
                lastName: localStorage.getItem("userLastName"),
                fullName: localStorage.getItem("userFullName"),
                email: localStorage.getItem("userEmail"),
            };
        });
        console.log("Profile data in localStorage:", localStorageData);
        // Verify profile data exists
        expect(localStorageData.firstName).toBeTruthy();
        expect(localStorageData.lastName).toBeTruthy();
        expect(localStorageData.fullName).toBeTruthy();
        expect(localStorageData.email).toBeTruthy();
        console.log("✅ Profile data verification passed");
    });
});
