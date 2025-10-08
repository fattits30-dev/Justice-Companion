/**
 * Create Test Case with Evidence
 *
 * Run this script to create a complete employment dismissal case with evidence
 * for testing AI fact-gathering capabilities.
 *
 * Usage: node --loader ts-node/esm scripts/create-test-case-with-evidence.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { EncryptionService } from '../src/services/EncryptionService.js';
import * as dotenv from 'dotenv';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Load encryption key from environment
const encryptionKey = process.env.ENCRYPTION_KEY_BASE64;
if (!encryptionKey) {
  console.error('❌ ENCRYPTION_KEY_BASE64 not found in .env file');
  process.exit(1);
}

const encryptionService = new EncryptionService(encryptionKey);

// Connect to database (use AppData path directly)
const dbPath = path.join(
  process.env.APPDATA || 'C:\\Users\\sava6\\AppData\\Roaming',
  'justice-companion',
  'justice-companion.db'
);
const db = new Database(dbPath);

console.log(`📂 Using database: ${dbPath}`);

async function createTestData() {
  console.log('📋 Creating test case with evidence...\n');

  // 1. Create test case
  const caseDescription = 'Employment dispute - unfair dismissal. Employee claims they were dismissed without proper process after 3 years of employment at ABC Tech Ltd.';
const encryptedDescription = await encryptionService.encrypt(caseDescription);

const insertCase = db.prepare(`
  INSERT INTO cases (title, case_type, description, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
`);

const caseResult = insertCase.run(
  'John Smith v ABC Tech Ltd - Unfair Dismissal',
  'employment',
  JSON.stringify(encryptedDescription),
  'active'
);

const caseId = caseResult.lastInsertRowid;
console.log(`✅ Created case #${caseId}: John Smith v ABC Tech Ltd`);

// 2. Create evidence items
const evidenceItems = [
  {
    title: 'Employment Contract',
    evidenceType: 'document',
    content: `EMPLOYMENT CONTRACT

This agreement is made on 15th January 2021 between:
- ABC Tech Ltd (Employer)
- John Smith (Employee)

Position: Senior Software Developer
Start Date: 15th January 2021
Salary: £65,000 per annum
Notice Period: 3 months

The employee is entitled to 25 days annual leave plus bank holidays.

Disciplinary procedures will follow the company handbook.

Signed: [Signatures]`,
    description: 'Original signed employment contract dated 15 January 2021'
  },
  {
    title: 'Dismissal Letter',
    evidenceType: 'document',
    content: `ABC Tech Ltd
HR Department

15th March 2024

Dear John Smith,

Re: Termination of Employment

We regret to inform you that your employment with ABC Tech Ltd will be terminated effective immediately.

This decision has been made due to restructuring requirements.

You will receive pay in lieu of notice for the 3-month notice period.

Yours sincerely,
Sarah Johnson
HR Director`,
    description: 'Letter confirming immediate dismissal dated 15 March 2024'
  },
  {
    title: 'Email Thread - Performance Reviews',
    evidenceType: 'email',
    content: `From: manager@abctech.com
To: john.smith@abctech.com
Date: 10 February 2024
Subject: Annual Performance Review

John,

I wanted to follow up on your excellent performance review. You've consistently exceeded expectations and your work on the client portal project was outstanding.

Your rating is "Exceeds Expectations" for the third year running.

Keep up the great work!

Best,
Michael Chen
Engineering Manager`,
    description: 'Email confirming excellent performance review one month before dismissal'
  },
  {
    title: 'Witness Statement - Colleague',
    evidenceType: 'witness_statement',
    content: `WITNESS STATEMENT

Name: Sarah Williams
Position: Senior Developer (Team Member)
Date: 20 March 2024

I have worked alongside John Smith for 2 years at ABC Tech Ltd.

On 15th March 2024, John was called into a meeting and dismissed immediately. There was no prior warning, no performance issues raised, and no disciplinary process.

The team was shocked as John was one of our best performers. The previous week he had received praise from the CTO for his work.

I was not aware of any restructuring plans, and John's role was advertised externally 2 weeks later.

Signed: Sarah Williams`,
    description: 'Statement from colleague confirming sudden dismissal without process'
  },
  {
    title: 'Company Handbook Extract',
    evidenceType: 'document',
    content: `ABC TECH LTD - EMPLOYEE HANDBOOK

Section 7: Disciplinary Procedures

7.1 Before any disciplinary action, employees will be:
   - Informed in writing of the allegations
   - Given at least 5 working days to prepare
   - Invited to a formal hearing
   - Allowed to be accompanied by a colleague or union representative

7.2 Dismissal can only occur after:
   - Formal investigation
   - Disciplinary hearing
   - Right of appeal exercised

7.3 Summary dismissal (without notice) is only permitted in cases of gross misconduct, which includes: theft, violence, serious breach of confidentiality.`,
    description: 'Company disciplinary procedures that were not followed'
  }
];

const insertEvidence = db.prepare(`
  INSERT INTO evidence (case_id, title, evidence_type, content, description, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

for (const item of evidenceItems) {
  const encryptedContent = await encryptionService.encrypt(item.content);

  insertEvidence.run(
    caseId,
    item.title,
    item.evidenceType,
    JSON.stringify(encryptedContent),
    item.description
  );

  console.log(`  ✅ Added evidence: ${item.title}`);
}

  console.log('\n📊 Test Case Summary:');
  console.log(`   Case ID: ${caseId}`);
  console.log(`   Title: John Smith v ABC Tech Ltd - Unfair Dismissal`);
  console.log(`   Evidence Items: ${evidenceItems.length}`);
  console.log('\n🤖 Ready to Test AI:');
  console.log('   1. Open Justice Companion');
  console.log(`   2. Select case #${caseId} in sidebar`);
  console.log('   3. Chat with AI about the case');
  console.log('   4. AI should extract facts from evidence automatically');
  console.log('   5. Watch post-it notes populate with gathered facts!\n');

  db.close();
}

// Run the script
createTestData().catch((error) => {
  console.error('❌ Error creating test data:', error);
  process.exit(1);
});
