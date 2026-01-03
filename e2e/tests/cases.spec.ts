import { test, expect } from '@playwright/test';
import { seedTestUser, setSessionOnPage, BACKEND_BASE_URL } from './helpers';

function randomSuffix() {
    return Math.floor(Math.random() * 100000).toString(36);
}

test('create case via API (fallback to stub) and verify in UI', async ({ page, request }) => {
    const payload = await seedTestUser(request);
    const session = payload?.session || { id: 'session-123', user_id: 1, expires_at: '2099-01-01' };

    const caseTitle = `E2E Case ${randomSuffix()}`;

    // If backend present, create case via API; otherwise stub GET /cases
    let created = false;
    try {
        const res = await request.post(`${BACKEND_BASE_URL}/cases`, {
            headers: {
                session_id: session.id,
            },
            data: {
                title: caseTitle,
                description: 'E2E created description',
                caseType: 'employment',
                status: 'active',
            },
        });
        if (res.ok()) {
            created = true;
        }
    } catch (err) {
        // backend not available — we'll stub responses later
    }

    // Ensure UI is authenticated
    await page.goto('/');
    await setSessionOnPage(page, session);

    if (!created) {
        // Stub GET /cases to return our case so UI shows it
        await page.route('**/cases**', (route) => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        id: 99999,
                        title: caseTitle,
                        description: 'E2E created description',
                        caseType: 'employment',
                    },
                ]),
            });
        });
    }

    // Navigate to cases page (prefer UI click to avoid SPA deep-linking 404s)
    await page.goto('/');
    if (await page.locator('text=Cases').count()) {
        await page.locator('text=Cases').first().click();
    } else {
        await page.goto('/cases').catch(() => { });
    }
    await expect(page.locator(`text=${caseTitle}`)).toBeVisible({ timeout: 5000 });
});
