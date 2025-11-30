import type { FullConfig } from "@playwright/test";

export default async function globalSetup(_config: FullConfig) {
  console.log("Skipping seed user setup for testing");
  return;
}
