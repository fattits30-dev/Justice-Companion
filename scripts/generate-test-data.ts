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
      title: 'Child Custody Arrangement',
      caseType: 'family',
      description:
        "Establishing fair custody arrangement after separation. Focus on child's best interests.",
      status: 'active',
    });

    // Civil Law Case
    await createCase({
      title: 'Contract Breach - Freelance Work',
      caseType: 'civil',
      description:
        'Client refusing to pay for completed work. Contract clearly outlines payment terms.',
      status: 'active',
    });

    // Closed Cases (for testing closed status)
    await createCase({
      title: 'Resolved Employment Matter',
      caseType: 'employment',
      description: 'Successfully negotiated settlement for unpaid wages.',
      status: 'closed',
    });

    await createCase({
      title: 'Completed Housing Case',
      caseType: 'housing',
      description: 'Deposit recovered through alternative dispute resolution.',
      status: 'closed',
    });

    console.warn('\n✅ Test data generation complete!');
    console.warn('📊 Created 8 test cases (6 active, 2 closed)');
    console.warn('\n💡 Refresh the app to see the test data');
  } catch (error) {
    console.error('❌ Error generating test data:', error);
    console.error('\n💡 Make sure the dev server is running: npm run dev');
    process.exit(1);
  }
}

// Run the script
generateTestData();
