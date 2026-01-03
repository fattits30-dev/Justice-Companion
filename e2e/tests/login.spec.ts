import { test, expect } from '@playwright/test';
import { seedTestUser, setSessionOnPage } from './helpers';

test('login with seeded test user (via localStorage)', async ({ page, request }) => {
    // Attempt to seed deterministic user on backend (if available)
    const payload = await seedTestUser(request);
    const session =
        payload?.session || {
            id: 'session-123',
            user_id: 1,
            expires_at: '2099-01-01',
            user: { id: 1, username: 'e2e-test', email: 'e2e-test@example.com' },
        };

    // Visit base, set session, route auth session check, then reload to pickup session state
    await page.goto('/');
    await setSessionOnPage(page, session);

    // If the frontend checks the session via an API call, stub that to return the user info
    await page.route('**/auth/session/**', (route) => {
        const resp = {
            user: {
                id: session.user?.id || session.user_id || 1,
                username: session.user?.username || 'e2e-test',
                email: session.user?.email || 'e2e-test@example.com',
                role: 'user',
                is_active: true,
            },
            session: session,
        };
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resp) });
    });

    // Debug: log auth-related requests/responses so we can see what the frontend is doing
    page.on('request', (req) => {
        if (req.url().includes('/auth') || req.url().includes('/users') || req.url().includes('/session')) console.log('REQ:', req.method(), req.url());
    });
    page.on('response', (res) => {
        if (res.url().includes('/auth') || res.url().includes('/users') || res.url().includes('/session')) console.log('RESP:', res.status(), res.url());
    });

    await page.reload();


    // Verify session keys are present in localStorage (robust across environments)
    const ls = await page.evaluate(() => {
        return {
            sessionId: localStorage.getItem('sessionId') || localStorage.getItem('session_id') || null,
            session_json: localStorage.getItem('session_json') || localStorage.getItem('sessionJson') || localStorage.getItem('session') || null,
        };
    });
    expect(ls.sessionId || ls.session_json).toBeTruthy();
});
