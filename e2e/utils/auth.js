import { TEST_CONFIG } from "../testConfig";
const BASE_URL = TEST_CONFIG.baseURL.replace(/\/$/, "");
const TEST_USER = TEST_CONFIG.credentials.e2eTest;
export const PROTECTED_PATH_REGEX = /\/(dashboard|cases|home|chat|documents)/;
async function fillFirstAvailable(locatorFactories, page, value, errorMessage) {
    for (const factory of locatorFactories) {
        const locator = factory(page);
        if ((await locator.count()) > 0) {
            await locator.first().fill(value);
            return;
        }
    }
    throw new Error(errorMessage);
}
export async function resetAuthState(page) {
    await page.context().clearCookies();
    // Try to clear localStorage/sessionStorage, but don't fail if access is denied
    try {
        // Wait for page to be ready before attempting storage access
        await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => { });
        await page.evaluate(() => {
            try {
                window.localStorage.clear();
                window.sessionStorage.clear();
            }
            catch (e) {
                // Ignore individual storage access errors
                console.debug("Storage access denied, continuing without clearing", e.message);
            }
        });
    }
    catch (error) {
        // Only log if it's more than just storage access denial
        if (!error.message?.includes("Access is denied")) {
            console.warn("resetAuthState: unexpected error", error);
        }
    }
}
export async function loginWithSeededUser(page) {
    await resetAuthState(page);
    await page.goto(`${BASE_URL}/login`, {
        waitUntil: "domcontentloaded",
        timeout: TEST_CONFIG.timeouts.navigation,
    });
    await fillFirstAvailable([
        (p) => p.getByLabel(/username|email/i),
        (p) => p.locator('input[name="username"]'),
        (p) => p.locator('input[name="email"]'),
        (p) => p.locator('input[type="text"]').first(),
    ], page, TEST_USER.username, "Unable to locate username/email field on login form");
    await fillFirstAvailable([
        (p) => p.locator('input[type="password"]').first(),
        (p) => p.locator('input[name="password"]'),
    ], page, TEST_USER.password, "Unable to locate password field on login form");
    await page.getByRole("button", { name: /sign in|login/i }).click();
    await page.waitForURL(PROTECTED_PATH_REGEX, {
        timeout: TEST_CONFIG.timeouts.navigation,
    });
}
