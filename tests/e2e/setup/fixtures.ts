/**
 * Test data fixtures for E2E tests
 */

import fs from 'fs';
import path from 'path';

export interface CaseFixture {
  title: string;
  caseType: 'employment' | 'housing' | 'consumer' | 'family' | 'debt' | 'other';
  description: string;
  caseNumber?: string;
  status?: 'open' | 'closed' | 'pending';
}

export interface EvidenceFixture {
  title: string;
  description: string;
  filePath: string;
  fileType: string;
}

export interface UserFactFixture {
  factType: 'personal' | 'employment' | 'financial' | 'contact' | 'medical' | 'other';
  factContent: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
}

export interface CaseFactFixture {
  category: 'timeline' | 'evidence' | 'witness' | 'location' | 'communication' | 'other';
  factContent: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
}

export interface ChatMessageFixture {
  content: string;
  expectedKeywords?: string[];
}

/**
 * Sample case fixtures
 */
export const casesFixtures: Record<string, CaseFixture> = {
  employment: {
    title: 'Unfair Dismissal Case',
    caseType: 'employment',
    description: 'Dismissed without proper procedure or notice period',
    caseNumber: 'EMP-2024-001',
    status: 'open',
  },
  housing: {
    title: 'Deposit Dispute',
    caseType: 'housing',
    description: 'Landlord refusing to return deposit without valid reason',
    caseNumber: 'HSG-2024-002',
    status: 'open',
  },
  consumer: {
    title: 'Faulty Product Refund',
    caseType: 'consumer',
    description: 'Retailer refusing refund for defective product',
    caseNumber: 'CON-2024-003',
    status: 'open',
  },
  family: {
    title: 'Child Custody Arrangement',
    caseType: 'family',
    description: 'Seeking fair custody arrangement',
    caseNumber: 'FAM-2024-004',
    status: 'pending',
  },
  debt: {
    title: 'Creditor Harassment',
    caseType: 'debt',
    description: 'Creditor using unfair collection practices',
    caseNumber: 'DBT-2024-005',
    status: 'open',
  },
};

/**
 * Sample evidence fixtures
 */
export const evidenceFixtures: Record<string, EvidenceFixture> = {
  employmentContract: {
    title: 'Employment Contract',
    description: 'Original signed employment contract',
    filePath: '/test-files/contract.pdf',
    fileType: 'application/pdf',
  },
  dismissalLetter: {
    title: 'Dismissal Letter',
    description: 'Letter of dismissal received from employer',
    filePath: '/test-files/dismissal.pdf',
    fileType: 'application/pdf',
  },
  payslips: {
    title: 'Payslips',
    description: 'Last 3 months of payslips',
    filePath: '/test-files/payslips.pdf',
    fileType: 'application/pdf',
  },
  correspondence: {
    title: 'Email Correspondence',
    description: 'Email chain with employer',
    filePath: '/test-files/emails.pdf',
    fileType: 'application/pdf',
  },
  photo: {
    title: 'Property Photo',
    description: 'Photo of property damage',
    filePath: '/test-files/damage.jpg',
    fileType: 'image/jpeg',
  },
};

/**
 * Sample user fact fixtures
 */
export const userFactsFixtures: Record<string, UserFactFixture> = {
  personal1: {
    factType: 'personal',
    factContent: 'UK citizen, age 35, residing in London',
    importance: 'medium',
  },
  employment1: {
    factType: 'employment',
    factContent: 'Worked as Software Engineer at TechCorp Ltd for 5 years',
    importance: 'high',
  },
  employment2: {
    factType: 'employment',
    factContent: 'Annual salary: £55,000',
    importance: 'high',
  },
  financial1: {
    factType: 'financial',
    factContent: 'Monthly rent: £1,200, Savings: £10,000',
    importance: 'medium',
  },
  contact1: {
    factType: 'contact',
    factContent: 'Email: user@example.com, Phone: 07700 900000',
    importance: 'critical',
  },
  medical1: {
    factType: 'medical',
    factContent: 'No relevant medical conditions affecting work',
    importance: 'low',
  },
};

/**
 * Sample case fact fixtures
 */
export const caseFactsFixtures: Record<string, CaseFactFixture> = {
  timeline1: {
    category: 'timeline',
    factContent: 'Employed: 01/01/2019 to 31/12/2023',
    importance: 'critical',
  },
  timeline2: {
    category: 'timeline',
    factContent: 'Dismissal notice received: 01/12/2023',
    importance: 'critical',
  },
  timeline3: {
    category: 'timeline',
    factContent: 'Final working day: 31/12/2023',
    importance: 'critical',
  },
  evidence1: {
    category: 'evidence',
    factContent: 'Have employment contract, dismissal letter, and email correspondence',
    importance: 'high',
  },
  witness1: {
    category: 'witness',
    factContent: 'Former colleague John Smith willing to provide statement',
    importance: 'high',
  },
  location1: {
    category: 'location',
    factContent: 'Workplace: TechCorp Ltd, 123 Tech Street, London, EC1A 1AA',
    importance: 'medium',
  },
  communication1: {
    category: 'communication',
    factContent: 'Attempted informal resolution via email on 05/12/2023 - no response',
    importance: 'medium',
  },
};

/**
 * Sample chat message fixtures
 */
export const chatMessagesFixtures: Record<string, ChatMessageFixture> = {
  greeting: {
    content: 'Hello, I need help with my employment case',
    expectedKeywords: ['employment', 'help', 'assist'],
  },
  question1: {
    content: 'What are my rights after unfair dismissal?',
    expectedKeywords: ['rights', 'dismissal', 'employment'],
  },
  question2: {
    content: 'How long do I have to file a claim?',
    expectedKeywords: ['time', 'deadline', 'claim'],
  },
  question3: {
    content: 'What evidence should I gather?',
    expectedKeywords: ['evidence', 'documents', 'proof'],
  },
  followup: {
    content: 'Can you explain that in simpler terms?',
    expectedKeywords: ['explain', 'clarify'],
  },
};

/**
 * Get random case fixture
 */
export function getRandomCase(): CaseFixture {
  const keys = Object.keys(casesFixtures);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return casesFixtures[randomKey];
}

/**
 * Get random evidence fixture
 */
export function getRandomEvidence(): EvidenceFixture {
  const keys = Object.keys(evidenceFixtures);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return evidenceFixtures[randomKey];
}

/**
 * Get random user fact fixture
 */
export function getRandomUserFact(): UserFactFixture {
  const keys = Object.keys(userFactsFixtures);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return userFactsFixtures[randomKey];
}

/**
 * Get random case fact fixture
 */
export function getRandomCaseFact(): CaseFactFixture {
  const keys = Object.keys(caseFactsFixtures);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return caseFactsFixtures[randomKey];
}

/**
 * Create test file for evidence upload
 */
export function createTestFile(fileName: string, content: string = 'Test file content'): string {
  const testFilesDir = path.join(process.cwd(), 'test-data', 'files');
  if (!fs.existsSync(testFilesDir)) {
    fs.mkdirSync(testFilesDir, { recursive: true });
  }

  const filePath = path.join(testFilesDir, fileName);
  fs.writeFileSync(filePath, content);

  return filePath;
}

/**
 * Cleanup test files
 */
export function cleanupTestFiles(): void {
  const testFilesDir = path.join(process.cwd(), 'test-data', 'files');
  if (fs.existsSync(testFilesDir)) {
    const files = fs.readdirSync(testFilesDir);
    for (const file of files) {
      fs.unlinkSync(path.join(testFilesDir, file));
    }
    fs.rmdirSync(testFilesDir);
  }
}
