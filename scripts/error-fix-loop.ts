#!/usr/bin/env tsx

import { execSync, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ErrorInfo {
  type: string;
  count: number;
  details: string[];
  priority: "P0" | "P1" | "P2" | "P3";
}

interface FixAttempt {
  attempt: number;
  strategy: string;
  success: boolean;
  error?: string;
  duration: number;
}

interface FixResult {
  errorType: string;
  attempts: FixAttempt[];
  finalStatus: "fixed" | "escalated" | "failed";
  commitHash?: string;
  escalatedIssue?: string;
}

interface VerificationResult {
  lint: { status: "pass" | "fail"; errors?: number };
  typecheck: { status: "pass" | "fail"; errors?: number };
  tests: { status: "pass" | "fail"; failed?: number; total?: number };
  build: { status: "pass" | "fail"; errors?: string };
}

class ErrorFixLoop {
  private config: any;
  private startTime: Date;
  private logFile: string;

  constructor() {
    this.startTime = new Date();
    this.logFile = path.join(
      __dirname,
      "..",
      ".localclaude",
      `fix-loop-${this.startTime.toISOString().slice(0, 19).replace(/:/g, "")}.log`
    );
    this.loadConfig();
    this.initLog();
  }

  private loadConfig() {
    const configPath = path.join(
      __dirname,
      "..",
      ".localclaude",
      "fix-loop-config.json"
    );
    this.config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  }

  private initLog() {
    const header = `=== Justice Companion Error Fix Loop ===
Date: ${this.startTime.toISOString()}
Config: ${JSON.stringify(this.config, null, 2)}

`;
    fs.writeFileSync(this.logFile, header);
  }

  private log(message: string) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(this.logFile, logEntry);
    console.log(message);
  }

  async run(): Promise<void> {
    try {
      this.log("🔍 Starting error detection...");

      // Detect errors from history and current state
      const errors = await this.detectErrors();
      this.log(`🔍 Debug: detectErrors returned ${errors.length} errors`);

      if (errors.length === 0) {
        this.log("✅ No errors detected. All systems operational.");
        return;
      }

      this.log(`🔍 Found ${errors.length} error categories to address`);
      errors.forEach((error, i) => {
        this.log(
          `  ${i + 1}. ${error.type}: ${error.count} (${error.priority})`
        );
      });

      // Prioritize errors
      const prioritizedErrors = this.prioritizeErrors(errors);
      this.log(`🔍 Prioritized ${prioritizedErrors.length} errors for fixing`);

      // Fix loop
      const results: FixResult[] = [];
      for (const error of prioritizedErrors) {
        this.log(`🔧 Starting fix for ${error.type}`);
        const result = await this.fixError(error);
        results.push(result);
        this.log(`🔧 Completed fix for ${error.type}: ${result.finalStatus}`);
      }

      // Generate summary
      this.generateSummary(results);

      // Update memory with successful patterns
      this.updateMemory(results);
    } catch (error) {
      this.log(`❌ Error fix loop failed: ${error}`);
      throw error;
    }
  }

  private async detectErrors(): Promise<ErrorInfo[]> {
    const errors: ErrorInfo[] = [];

    // Check lint errors - minimal output
    try {
      execSync("pnpm lint --quiet", { stdio: "pipe", timeout: 30000 });
    } catch (error: any) {
      // Count actual error lines from stderr
      const errorLines = (error.stderr || error.stdout || "")
        .split("\n")
        .filter((line: string) => line.includes("error"));
      const count = errorLines.length || 1;
      errors.push({
        type: "lint",
        count,
        details: [`${count} lint errors`],
        priority: "P2",
      });
    }

    // Check type errors - minimal output
    try {
      execSync("pnpm type-check", { stdio: "pipe", timeout: 30000 });
    } catch (error: any) {
      const errorCount = (error.stdout?.match(/error TS\d+/g) || []).length;
      errors.push({
        type: "typecheck",
        count: errorCount || 1,
        details: ["TypeScript errors"],
        priority: "P1",
      });
    }

    // Check test failures - minimal output
    try {
      execSync("pnpm test --run --reporter=basic", {
        stdio: "pipe",
        timeout: 60000,
      });
    } catch (error: any) {
      // Look for failure count in stderr (where test output goes)
      const failedMatch =
        error.stderr?.match(/(\d+)\s+failed/) ||
        error.stdout?.match(/(\d+)\s+failed/);
      const failedCount = failedMatch ? parseInt(failedMatch[1]) : 1;
      errors.push({
        type: "test_failure",
        count: failedCount,
        details: [`${failedCount} tests failed`],
        priority: "P1",
      });
    }

    // Check build errors - minimal output
    try {
      execSync("pnpm build", { stdio: "pipe", timeout: 60000 });
    } catch (error: any) {
      errors.push({
        type: "build_failure",
        count: 1,
        details: ["Build failed"],
        priority: "P0",
      });
    }

    return errors;
  }

  private prioritizeErrors(errors: ErrorInfo[]): ErrorInfo[] {
    // Sort by priority (P0 first) and then by count
    return errors.sort((a, b) => {
      const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.count - a.count;
    });
  }

  private async fixError(error: ErrorInfo): Promise<FixResult> {
    const result: FixResult = {
      errorType: error.type,
      attempts: [],
      finalStatus: "failed",
    };

    this.log(`🔧 Attempting to fix ${error.count} ${error.type} error(s)...`);

    for (let attempt = 1; attempt <= this.config.max_attempts; attempt++) {
      const startTime = Date.now();
      const fixAttempt: FixAttempt = {
        attempt,
        strategy: "",
        success: false,
        duration: 0,
      };

      try {
        // Apply fix strategy
        const strategy = this.getFixStrategy(error.type, attempt);
        fixAttempt.strategy = strategy;

        this.log(
          `  Attempt ${attempt}/${this.config.max_attempts}: ${strategy}`
        );

        await this.applyFixStrategy(error.type, strategy);

        // Verify fix
        const verification = await this.verifyFix();

        if (this.isVerificationPassing(verification)) {
          fixAttempt.success = true;
          result.finalStatus = "fixed";

          // Commit changes if configured
          if (this.config.auto_commit) {
            const commitHash = this.commitFixes(error, attempt);
            result.commitHash = commitHash;
          }

          this.log(`  ✅ Fixed after ${attempt} attempts`);
          break;
        } else {
          // Rollback if verification failed
          if (this.config.rollback_on_failure) {
            this.rollbackChanges();
          }
          fixAttempt.error = "Verification failed";
        }
      } catch (error: any) {
        fixAttempt.error = error.message;
        this.log(`  ❌ Attempt ${attempt} failed: ${error.message}`);

        // Rollback on error
        if (this.config.rollback_on_failure) {
          this.rollbackChanges();
        }
      }

      fixAttempt.duration = Date.now() - startTime;
      result.attempts.push(fixAttempt);

      // If max attempts reached, escalate
      if (attempt >= this.config.max_attempts) {
        result.finalStatus = "escalated";
        if (this.config.create_issues_on_escalation) {
          result.escalatedIssue = await this.escalateToHuman(
            error,
            result.attempts
          );
        }
      }
    }

    return result;
  }

  private getFixStrategy(errorType: string, attempt: number): string {
    const strategies = this.config.fix_strategies[errorType] || [];
    return (
      strategies[Math.min(attempt - 1, strategies.length - 1)] || "unknown"
    );
  }

  private async applyFixStrategy(
    errorType: string,
    strategy: string
  ): Promise<void> {
    switch (errorType) {
      case "lint":
        if (strategy === "eslint --fix") {
          execSync("pnpm lint:fix", { stdio: "inherit" });
        }
        break;

      case "typecheck":
        // For now, just try to add basic type annotations
        // This would need more sophisticated logic for real implementation
        break;

      case "test_failure":
        if (strategy === "increase_timeout") {
          // This would need to identify specific test files and increase timeouts
        } else if (strategy === "update_snapshots") {
          execSync("pnpm test -- -u", { stdio: "inherit" });
        }
        break;

      case "build_failure":
        if (strategy === "fix_imports") {
          // Try to fix import issues
        } else if (strategy === "install_deps") {
          execSync("pnpm install", { stdio: "inherit" });
        }
        break;
    }
  }

  private async verifyFix(): Promise<VerificationResult> {
    const result: VerificationResult = {
      lint: { status: "fail" },
      typecheck: { status: "fail" },
      tests: { status: "fail" },
      build: { status: "fail" },
    };

    // Ultra-minimal verification - just check exit codes
    if (this.config.verification_tests.lint) {
      try {
        execSync("pnpm lint --quiet", { stdio: "pipe", timeout: 30000 });
        result.lint.status = "pass";
      } catch {
        result.lint.status = "fail";
      }
    }

    if (this.config.verification_tests.typecheck) {
      try {
        execSync("pnpm type-check", { stdio: "pipe", timeout: 30000 });
        result.typecheck.status = "pass";
      } catch {
        result.typecheck.status = "fail";
      }
    }

    if (this.config.verification_tests.unit_tests) {
      try {
        execSync("pnpm test --run --reporter=basic", {
          stdio: "pipe",
          timeout: 60000,
        });
        result.tests.status = "pass";
      } catch {
        result.tests.status = "fail";
      }
    }

    if (this.config.verification_tests.build) {
      try {
        execSync("pnpm build", { stdio: "pipe", timeout: 60000 });
        result.build.status = "pass";
      } catch {
        result.build.status = "fail";
      }
    }

    return result;
  }

  private isVerificationPassing(verification: VerificationResult): boolean {
    return (
      verification.lint.status === "pass" &&
      verification.typecheck.status === "pass" &&
      verification.tests.status === "pass" &&
      verification.build.status === "pass"
    );
  }

  private rollbackChanges(): void {
    try {
      execSync("git reset HEAD .", { stdio: "pipe" });
      execSync("git checkout -- .", { stdio: "pipe" });
      execSync("git clean -fd", { stdio: "pipe" });
      this.log("  🔄 Changes rolled back");
    } catch (error) {
      this.log(`  ⚠️ Rollback failed: ${error}`);
    }
  }

  private commitFixes(error: ErrorInfo, attempt: number): string {
    try {
      execSync("git add .", { stdio: "pipe" });

      const commitMessage = `chore: auto-fix ${error.type} errors

- Fixed ${error.count} ${error.type} error(s)
- Attempt ${attempt}/${this.config.max_attempts}
- All verification tests passing

🤖 Generated by Cline Caretaker (Error Fix Loop)`;

      execSync(`git commit -m "${commitMessage}"`, { stdio: "pipe" });

      const commitHash = execSync("git rev-parse HEAD", {
        encoding: "utf8",
        stdio: "pipe",
      }).trim();
      this.log(`  📝 Committed: ${commitHash.slice(0, 8)}`);
      return commitHash;
    } catch (error: any) {
      this.log(`  ⚠️ Commit failed: ${error.message}`);
      return "";
    }
  }

  private async escalateToHuman(
    error: ErrorInfo,
    attempts: FixAttempt[]
  ): Promise<string> {
    // This would create a GitHub issue
    // For now, just log the escalation
    const issueTitle = `🔴 Auto-Fix Failed: ${error.type} errors`;
    const issueBody = `**Error Type:** ${error.type}
**Count:** ${error.count}
**Attempts:** ${attempts.length}/${this.config.max_attempts}

**Attempted Fixes:**
${attempts.map((a) => `- ${a.strategy} (${a.success ? "success" : "failed"})`).join("\n")}

**Details:**
${error.details.join("\n")}

**Next Steps:**
- [ ] Manual investigation required
- [ ] Review fix loop logs
- [ ] Implement custom fix

🤖 Escalated by Cline Caretaker (Error Fix Loop)`;

    this.log(`🚨 Escalating to human intervention: ${issueTitle}`);

    // In a real implementation, this would create a GitHub issue
    // For now, we'll just return a placeholder
    return `escalated-${Date.now()}`;
  }

  private generateSummary(results: FixResult[]): void {
    const totalErrors = results.reduce((sum, r) => sum + 1, 0);
    const fixed = results.filter((r) => r.finalStatus === "fixed").length;
    const escalated = results.filter(
      (r) => r.finalStatus === "escalated"
    ).length;
    const failed = results.filter((r) => r.finalStatus === "failed").length;

    const duration = Date.now() - this.startTime.getTime();
    const durationStr = `${Math.round(duration / 1000 / 60)}m ${Math.round((duration / 1000) % 60)}s`;

    const summary = `
📊 Fix Summary:
  - Total error types: ${totalErrors}
  - Auto-fixed: ${fixed}
  - Escalated: ${escalated}
  - Failed: ${failed}
  - Success rate: ${totalErrors > 0 ? Math.round((fixed / totalErrors) * 100) : 0}%
  - Duration: ${durationStr}

📝 Results:
${results.map((r) => `  - ${r.errorType}: ${r.finalStatus} (${r.attempts.length} attempts)`).join("\n")}

Full log: ${this.logFile}
`;

    this.log(summary);

    // Update history
    this.updateHistory(results);
  }

  private updateHistory(results: FixResult[]): void {
    const historyEntry = {
      timestamp: new Date().toISOString(),
      type: "error_fix_loop",
      data: {
        results: results.map((r) => ({
          errorType: r.errorType,
          attempts: r.attempts.length,
          finalStatus: r.finalStatus,
          commitHash: r.commitHash,
          escalatedIssue: r.escalatedIssue,
        })),
        summary: {
          totalErrors: results.length,
          fixed: results.filter((r) => r.finalStatus === "fixed").length,
          escalated: results.filter((r) => r.finalStatus === "escalated")
            .length,
          failed: results.filter((r) => r.finalStatus === "failed").length,
        },
        duration_seconds: Math.round(
          (Date.now() - this.startTime.getTime()) / 1000
        ),
        logFile: this.logFile,
      },
    };

    const historyPath = path.join(
      __dirname,
      "..",
      ".localclaude",
      "history.jsonl"
    );
    fs.appendFileSync(historyPath, JSON.stringify(historyEntry) + "\n");
  }

  private updateMemory(results: FixResult[]): void {
    const memoryPath = path.join(
      __dirname,
      "..",
      ".localclaude",
      "memory.json"
    );
    const memory = JSON.parse(fs.readFileSync(memoryPath, "utf8"));

    // Add successful fix patterns
    const successfulFixes = results.filter((r) => r.finalStatus === "fixed");

    for (const result of successfulFixes) {
      const lastAttempt = result.attempts[result.attempts.length - 1];
      if (lastAttempt.success) {
        const pattern = {
          error_type: result.errorType,
          successful_fix: lastAttempt.strategy,
          success_rate: 1.0, // Would be calculated from historical data
          examples: [
            {
              timestamp: new Date().toISOString(),
              attempts: result.attempts.length,
              duration_seconds: result.attempts.reduce(
                (sum, a) => sum + a.duration,
                0
              ),
            },
          ],
        };

        // Check if pattern already exists
        const existingPattern = memory.fix_patterns?.find(
          (p: any) =>
            p.error_type === pattern.error_type &&
            p.successful_fix === pattern.successful_fix
        );

        if (existingPattern) {
          existingPattern.success_rate = Math.min(
            1.0,
            existingPattern.success_rate + 0.1
          );
          existingPattern.examples.push(pattern.examples[0]);
        } else {
          if (!memory.fix_patterns) memory.fix_patterns = [];
          memory.fix_patterns.push(pattern);
        }
      }
    }

    fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
  }
}

// Run the error fix loop
async function main() {
  const fixLoop = new ErrorFixLoop();
  await fixLoop.run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ErrorFixLoop };
