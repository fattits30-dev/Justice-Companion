import type { FullConfig } from "@playwright/test";
import { TEST_CONFIG } from "./testConfig";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function globalSetup(_config: FullConfig) {
  const { apiURL, credentials } = TEST_CONFIG;
  const testUser = credentials.e2eTest;
  const seedUrl = `${apiURL.replace(/\/$/, "")}/auth/test/seed-user`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(seedUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: testUser.username,
          email: testUser.email,
          password: testUser.password,
        }),
      });

      const rawBody = await response.text();

      if (!response.ok) {
        throw new Error(
          `Seed endpoint responded with ${response.status}: ${rawBody}`
        );
      }

      let payload: unknown;
      try {
        payload = JSON.parse(rawBody);
      } catch (parseError) {
        throw new Error(
          `[global-setup] seed endpoint returned non-JSON payload: ${rawBody}`
        );
      }

      const normalized =
        (payload as Record<string, any>).user ??
        (payload as Record<string, any>).data?.user;

      if (!normalized?.id) {
        throw new Error(
          `[global-setup] seed endpoint returned an unexpected payload: ${rawBody}`
        );
      }

      console.info(
        `[global-setup] ensured test user '${normalized.username}' (attempt ${attempt})`
      );
      return;
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw error;
      }
      console.warn(
        `[global-setup] seed attempt ${attempt} failed: ${String(error)}. Retrying...`
      );
      await wait(RETRY_DELAY_MS);
    }
  }
}
