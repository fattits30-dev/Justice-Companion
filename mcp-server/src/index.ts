#!/usr/bin/env node
import { JusticeCompanionMCPServer } from "./server.js";

async function main() {
  try {
    const server = new JusticeCompanionMCPServer();
    await server.start();
  } catch (error) {
    console.error("❌ Fatal error starting MCP server:", error);
    process.exit(1);
  }
}

main();
