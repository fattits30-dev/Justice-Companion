/**
 * Test Data Generation Script
 *
 * This script populates the Justice Companion database with test data
 * for development and testing purposes.
 *
 * Usage:
 *   npm run dev (in one terminal - starts dev API server on :5555)
 *   tsx scripts/generate-test-data.ts (in another terminal)
 */

const DEV_API_URL = 'http://localhost:5555/dev-api/ipc';

interface CreateCaseInput {
  title: string;
  caseType: 'employment' | 'housing' | 'family' | 'immigration' | 'criminal' | 'civil' | 'other';
  description: string;
  status?: 'active' | 'closed';
}

async function callIPC(channel: string, args: unknown[]): Promise<unknown> {
  const response = await fetch(DEV_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, args }),
  });

  if (!response.ok) {
    throw new Error(`IPC call failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.result; // Extract result from wrapper
}

async function createCase(input: CreateCaseInput) {
  console.warn(`Creating case: ${input.title}...`);
  const result = await callIPC('dev-api:cases:create', [input]);
  console.warn(`✓ Created case ID: ${result.id}`);
  return result;
}

async function generateTestData() {
  console.warn('🔥 JUSTICE COMPANION - Test Data Generation\n');

  try {
    // Employment Law Cases
    await createCase({
      title: 'Unfair Dismissal - Tech Co.',
      caseType: 'employment',
      description:
        'Wrongful termination without proper procedure or notice. Employee was dismissed after raising safety concerns.',
      status: 'active',
    });

    await createCase({
      title: 'Discrimination Claim - Retail Store',
      caseType: 'employment',
      description:
        'Age discrimination in hiring process. Candidate was rejected despite qualifications due to age.',
      status: 'active',
    });

    // Housing Law Cases
    await createCase({
      title: 'Landlord Deposit Dispute',
      caseType: 'housing',
      description:
        'Landlord refusing to return deposit despite property being in good condition. No inventory provided.',
      status: 'active',
    });

    await createCase({
      title: 'Tenant Rights - Unsafe Property',
      caseType: 'housing',
      description:
        'Property has serious damp and mold issues. Landlord refusing to make repairs despite multiple requests.',
      status: 'active',
    });

    // Family Law Case
    await createCase({
      title: 'Child Custody Dispute',
      caseType: 'family',
      description:
        'Disagreement over custody arrangements. Both parents have equal rights but cannot agree on schedule.',
      status: 'active',
    });

    // Immigration Law Cases
    await createCase({
      title: 'Asylum Application - Refugee Status',
      caseType: 'immigration',
      description:
        'Seeking asylum due to political persecution in home country. Documentation of threats provided.',
      status: 'active',
    });

    await createCase({
      title: 'Green Card Application - Family Sponsorship',
      caseType: 'immigration',
      description:
        'Petition for family-based green card. Sponsor has been approved and documents submitted.',
      status: 'active',
    });

    // Criminal Law Cases
    await createCase({
      title: 'Traffic Violation - DUI Charge',
      caseType: 'criminal',
      description:
        'Arrested for driving under influence. Client has prior offense history and is facing enhanced penalties.',
      status: 'active',
    });

    // Civil Law Cases
    await createCase({
      title: 'Personal Injury - Car Accident',
      caseType: 'civil',
      description:
        'Injured in car accident due to another driver\'s negligence. Seeking compensation for medical bills and lost wages.',
      status: 'active',
    });

    // Other Legal Cases
    await createCase({
      title: 'Contract Dispute - Service Agreement',
      caseType: 'other',
      description:
        'Dispute over service agreement terms. Client paid upfront but services were not delivered as promised.',
      status: 'active',
    });

    console.warn('\n✅ Test data generation completed successfully!');
  } catch (error) {
    console.error('❌ Error generating test data:', error);
    process.exit(1);
  }
}

// Run the test data generation
generateTestData();