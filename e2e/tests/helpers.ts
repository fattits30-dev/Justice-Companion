import type { APIRequestContext, Page } from '@playwright/test';

export const BACKEND_BASE_URL = process.env.E2E_BACKEND_URL || 'http://127.0.0.1:8000';

export type AuthPayload = { user: any; session: { id: string;[k: string]: any } } | null;

export async function seedTestUser(request: APIRequestContext): Promise<AuthPayload> {
    const payload = {
        username: process.env.E2E_TEST_USERNAME || 'e2e-test',
        email: process.env.E2E_TEST_EMAIL || 'e2e-test@example.com',
        password: process.env.E2E_TEST_PASSWORD || 'E2eTestPass123!',
    };

    try {
        const res = await request.post(`${BACKEND_BASE_URL}/auth/test/seed-user`, { data: payload });
        if (!res.ok()) return null;
        const json = await res.json();
        // Backend may wrap responses in { success: true, data: {...} }
        if (json && json.success && json.data) return json.data;
        return json;
    } catch (err) {
        return null;
    }
}

export async function setSessionOnPage(page: Page, session: any) {
    // session: { id: string, user_id?: number, user?: object, ... }
    if (!session || !session.id) return;
    const userObj = session.user || { id: session.user_id || 1, username: process.env.E2E_TEST_USERNAME || 'e2e-test', email: process.env.E2E_TEST_EMAIL || 'e2e-test@example.com' };

    // Set both Flutter keys and React-style key to maximize compatibility
    await page.evaluate(({ id, sessionObj, userObj }) => {
        try {
            localStorage.setItem('session_id', id);
            localStorage.setItem('session_json', JSON.stringify(sessionObj));
            localStorage.setItem('sessionJson', JSON.stringify(sessionObj));
            localStorage.setItem('session', JSON.stringify(sessionObj));
            localStorage.setItem('sessionId', id);
            localStorage.setItem('user_json', JSON.stringify(userObj));
            localStorage.setItem('user', JSON.stringify(userObj));
            localStorage.setItem('userId', String(userObj.id));
        } catch (e) {
            // ignore in page context
        }
    }, { id: session.id, sessionObj: session, userObj });
}
