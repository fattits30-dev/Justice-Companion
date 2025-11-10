#!/usr/bin/env tsx

/**
 * Test Case Creation Script for "Test User"
 *
 * This script creates a comprehensive test case for the Justice Companion AI
 * to test document analysis and case creation capabilities.
 *
 * Test Case: Test User - Unfair Dismissal Claim
 *
 * Documents included:
 * 1. Dismissal Letter - Main termination document
 * 2. Performance Review - Shows performance concerns
 * 3. Email Chain - Communication about PIP and extension
 * 4. Meeting Notes - Termination discussion details
 *
 * Expected AI Extraction Results:
 * - Case Title: "Unfair Dismissal Claim - Test User vs Global Tech Innovations PLC"
 * - Case Type: "employment"
 * - Opposing Party: "Global Tech Innovations PLC"
 * - Court: "Employment Tribunal" (inferred)
 * - Key Dates: Various dates from documents
 * - Description: Comprehensive case summary
 */

import { readFileSync } from "fs";
import { join } from "path";

interface TestDocument {
  filename: string;
  content: string;
  description: string;
}

interface ExpectedExtraction {
  title: string;
  caseType: string;
  description: string;
  opposingParty: string;
  caseNumber?: string;
  courtName?: string;
  filingDeadline?: string;
  nextHearingDate?: string;
  confidence: {
    title: number;
    caseType: number;
    description: number;
    opposingParty: number;
  };
}

class TestUserCaseCreator {
  private documents: TestDocument[] = [];
  private expectedResults: ExpectedExtraction;

  constructor() {
    this.expectedResults = {
      title:
        "Unfair Dismissal Claim - Test User vs Global Tech Innovations PLC",
      caseType: "employment",
      description:
        "Test User was dismissed from their role as Lead Developer at Global Tech Innovations PLC after failing to meet performance improvement plan objectives. The dismissal occurred during a period of organizational restructuring where the company was transitioning to cloud-native technologies. Test User had 6 years, 7 months of service and was earning £100,000 per annum.",
      opposingParty: "Global Tech Innovations PLC",
      courtName: "Employment Tribunal",
      confidence: {
        title: 0.95,
        caseType: 0.98,
        description: 0.9,
        opposingParty: 0.95,
      },
    };

    this.loadDocuments();
  }

  private loadDocuments() {
    const testDocsPath = join(process.cwd(), "test-documents");

    this.documents = [
      {
        filename: "test-user-dismissal-letter.txt",
        content: readFileSync(
          join(testDocsPath, "test-user-dismissal-letter.txt"),
          "utf-8"
        ),
        description:
          "Main termination letter with employment details and termination package",
      },
      {
        filename: "test-user-performance-review.txt",
        content: readFileSync(
          join(testDocsPath, "test-user-performance-review.txt"),
          "utf-8"
        ),
        description:
          "Annual performance review showing areas for improvement and PIP initiation",
      },
      {
        filename: "test-user-email-chain.txt",
        content: readFileSync(
          join(testDocsPath, "test-user-email-chain.txt"),
          "utf-8"
        ),
        description:
          "Email correspondence about PIP progress, extension, and performance concerns",
      },
      {
        filename: "test-user-termination-meeting-notes.txt",
        content: readFileSync(
          join(testDocsPath, "test-user-termination-meeting-notes.txt"),
          "utf-8"
        ),
        description:
          "Meeting notes from termination discussion including rationale and package details",
      },
    ];
  }

  public getDocuments(): TestDocument[] {
    return this.documents;
  }

  public getExpectedResults(): ExpectedExtraction {
    return this.expectedResults;
  }

  public printTestCaseInfo() {
    console.log("🧪 JUSTICE COMPANION - TEST USER CASE");
    console.log("=".repeat(50));
    console.log();

    console.log("📋 CASE OVERVIEW:");
    console.log(`Title: ${this.expectedResults.title}`);
    console.log(`Type: ${this.expectedResults.caseType}`);
    console.log(`Opposing Party: ${this.expectedResults.opposingParty}`);
    console.log();

    console.log("📄 DOCUMENTS TO ANALYZE:");
    this.documents.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.filename}`);
      console.log(`   ${doc.description}`);
      console.log();
    });

    console.log("🎯 AI TESTING OBJECTIVES:");
    console.log("• Extract case title from multiple document sources");
    console.log("• Identify employment law context and case type");
    console.log("• Extract opposing party and company details");
    console.log("• Identify key dates and deadlines");
    console.log("• Generate comprehensive case description");
    console.log("• Provide confidence scores for extractions");
    console.log("• Show source attribution for extracted information");
    console.log();

    console.log("📊 EXPECTED CONFIDENCE SCORES:");
    Object.entries(this.expectedResults.confidence).forEach(
      ([field, score]) => {
        const percentage = Math.round(score * 100);
        const rating =
          score >= 0.9 ? "🟢 High" : score >= 0.7 ? "🟡 Medium" : "🔴 Low";
        console.log(`${field}: ${percentage}% (${rating})`);
      }
    );
    console.log();

    console.log("🚀 TO RUN THIS TEST:");
    console.log("1. Start Justice Companion application");
    console.log("2. Go to Chat view");
    console.log("3. Upload each document using the upload button");
    console.log('4. Click "Create Case from Analysis" on the AI response');
    console.log("5. Review the AI-extracted case details");
    console.log("6. Verify confidence scores and source attribution");
    console.log("7. Confirm case creation");
    console.log();

    console.log("✨ KEY AI CAPABILITIES TO TEST:");
    console.log("• Document content analysis and information extraction");
    console.log("• Cross-document information correlation");
    console.log("• Legal context understanding (employment law)");
    console.log("• Confidence scoring and transparency");
    console.log("• Human-in-the-loop case creation workflow");
    console.log("• Duplicate case detection and handling");
  }

  public generateTestReport(actualResults?: any) {
    console.log("📊 TEST RESULTS REPORT");
    console.log("=".repeat(30));

    if (!actualResults) {
      console.log("❌ No actual results provided for comparison");
      return;
    }

    console.log("🔍 EXTRACTION ACCURACY:");

    const compareField = (field: string, expected: any, actual: any) => {
      const match = expected === actual;
      const status = match ? "✅" : "❌";
      console.log(`${status} ${field}:`);
      console.log(`   Expected: ${expected}`);
      console.log(`   Actual:   ${actual}`);
      console.log();
    };

    compareField("Title", this.expectedResults.title, actualResults.title);
    compareField(
      "Case Type",
      this.expectedResults.caseType,
      actualResults.caseType
    );
    compareField(
      "Opposing Party",
      this.expectedResults.opposingParty,
      actualResults.opposingParty
    );

    console.log("🎯 CONFIDENCE SCORES:");
    Object.keys(this.expectedResults.confidence).forEach((field) => {
      const expected =
        this.expectedResults.confidence[
          field as keyof typeof this.expectedResults.confidence
        ];
      const actual = actualResults.confidence?.[field];
      const diff = Math.abs(expected - (actual || 0));
      const status = diff <= 0.1 ? "✅" : diff <= 0.2 ? "⚠️" : "❌";
      console.log(
        `${status} ${field}: Expected ${expected}, Got ${actual || "N/A"}`
      );
    });
  }
}

// CLI Interface
if (require.main === module) {
  const testCase = new TestUserCaseCreator();

  if (process.argv.includes("--report")) {
    // Generate test report mode
    console.log("Test report generation not implemented yet");
    console.log("Run without --report to see test case information");
  } else {
    // Show test case information
    testCase.printTestCaseInfo();
  }
}

export { TestUserCaseCreator, TestDocument, ExpectedExtraction };
