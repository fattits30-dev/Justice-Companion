import path from "path";
import Database from "better-sqlite3";
import { runMigrations } from "../src/db/migrate";

// Resolve database path without Electron: use JUSTICE_DB_PATH or a
// ".justice-companion" directory under the current working directory.
const userDataDir = (() => {
  if (process.env.JUSTICE_DB_PATH) {
    return path.dirname(process.env.JUSTICE_DB_PATH);
  }

  return path.join(process.cwd(), ".justice-companion");
})();

const dbPath =
  process.env.JUSTICE_DB_PATH || path.join(userDataDir, "justice.db");
process.env.JUSTICE_DB_PATH = dbPath;

console.warn("🔄 Force-running migrations...");
console.warn("📂 Database path:", process.env.JUSTICE_DB_PATH);

try {
  runMigrations();
  console.warn("✅ Migrations completed successfully!");

  // Verify tables were created
  const db = new Database(process.env.JUSTICE_DB_PATH, { readonly: true });
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all();
  console.warn("\n📊 Tables in database:");
  tables.forEach((t: { name: string }) => console.warn("  -", t.name));

  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as {
    count: number;
  };
  console.warn("\n👤 User count:", userCount.count);

  db.close();
  process.exit(0);
} catch (error) {
  console.error("❌ Migration failed:", error);
  process.exit(1);
}
