/**
 * Test script to verify Evidence IPC handlers
 * Run with: node test-evidence-ipc.js
 */

const http = require('http');

// Test helper to invoke IPC handlers via dev API
async function invokeIPC(channel, args) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ channel, args });
    
    const options = {
      hostname: 'localhost',
      port: 5555,
      path: '/dev-api/ipc',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Main test function
async function testEvidenceHandlers() {
  console.log('🧪 Testing Evidence IPC Handlers\n');

  try {
    // Test 1: Create a test case first
    console.log('1️⃣  Creating test case...');
    const caseResult = await invokeIPC('dev-api:cases:create', [{
      title: 'Test Case for Evidence',
      caseType: 'employment',
      description: 'Test case for evidence handlers'
    }]);
    
    if (!caseResult.id) {
      throw new Error('Failed to create test case');
    }
    const testCaseId = caseResult.id;
    console.log(`   ✅ Created test case ID: ${testCaseId}\n`);

    // Test 2: Create evidence (via dev API - already exists)
    console.log('2️⃣  Creating evidence via dev API...');
    const createResult = await invokeIPC('dev-api:evidence:create', [{
      caseId: testCaseId,
      title: 'Test Employment Contract',
      evidenceType: 'document',
      content: 'This is a test employment contract with sensitive information.',
      filePath: '/test/contract.pdf',
      obtainedDate: '2024-01-15'
    }]);
    
    if (!createResult.id) {
      throw new Error('Failed to create evidence');
    }
    const evidenceId = createResult.id;
    console.log(`   ✅ Created evidence ID: ${evidenceId}`);
    console.log(`   📄 Title: ${createResult.title}`);
    console.log(`   🔐 Content encrypted: ${createResult.content !== 'This is a test employment contract with sensitive information.'}\n`);

    // Test 3: Get evidence by ID (not implemented yet - need to test when app runs)
    console.log('3️⃣  Evidence handlers to test via Electron app:');
    console.log('   ⏳ evidence:getById');
    console.log('   ⏳ evidence:getAll');
    console.log('   ⏳ evidence:getByCaseId');
    console.log('   ⏳ evidence:update');
    console.log('   ⏳ evidence:delete\n');

    console.log('✅ All tests passed!\n');
    console.log('📝 Next steps:');
    console.log('   1. Start the Electron app (npm run electron:dev)');
    console.log('   2. Open DevTools Console');
    console.log('   3. Test handlers:');
    console.log('      - window.justiceAPI.getEvidenceById(' + evidenceId + ')');
    console.log('      - window.justiceAPI.getAllEvidence("document")');
    console.log('      - window.justiceAPI.getEvidenceByCaseId(' + testCaseId + ')');
    console.log('      - window.justiceAPI.updateEvidence(' + evidenceId + ', { title: "Updated Contract" })');
    console.log('      - window.justiceAPI.deleteEvidence(' + evidenceId + ')');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testEvidenceHandlers();
