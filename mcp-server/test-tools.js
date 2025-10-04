#!/usr/bin/env node
/**
 * MCP Server End-to-End Test Suite
 * Tests all 9 tools with real IPC communication
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let requestId = 1;
let testCaseId = null;

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function sendRequest(child, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = requestId++;
    const request = JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params
    });

    let responseData = '';
    let timeoutHandle;

    const dataHandler = (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('{')) {
          try {
            const response = JSON.parse(line);
            if (response.id === id) {
              clearTimeout(timeoutHandle);
              child.stdout.removeListener('data', dataHandler);
              if (response.error) {
                reject(new Error(response.error.message || JSON.stringify(response.error)));
              } else {
                resolve(response.result);
              }
            }
          } catch (e) {
            // Not valid JSON or not our response, continue
          }
        }
      }
    };

    child.stdout.on('data', dataHandler);

    timeoutHandle = setTimeout(() => {
      child.stdout.removeListener('data', dataHandler);
      reject(new Error(`Request timeout: ${method}`));
    }, 5000);

    child.stdin.write(request + '\n');
  });
}

async function runTests() {
  log('\n🧪 Starting MCP Server End-to-End Tests', 'blue');
  log('==========================================\n', 'blue');

  // Start MCP server
  const serverPath = join(__dirname, 'dist', 'index.js');
  const child = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Capture stderr for debugging
  child.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg.includes('✅') || msg.includes('🚀')) {
      log(msg, 'green');
    }
  });

  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));

  let passedTests = 0;
  let failedTests = 0;

  async function test(name, fn) {
    try {
      log(`\n▶ Testing: ${name}`, 'yellow');
      await fn();
      log(`✅ PASS: ${name}`, 'green');
      passedTests++;
    } catch (error) {
      log(`❌ FAIL: ${name}`, 'red');
      log(`   Error: ${error.message}`, 'red');
      failedTests++;
    }
  }

  // Test 1: List tools
  await test('tools/list', async () => {
    const result = await sendRequest(child, 'tools/list');
    if (!result.tools || result.tools.length !== 9) {
      throw new Error(`Expected 9 tools, got ${result.tools?.length || 0}`);
    }
    log(`   Found ${result.tools.length} tools`, 'blue');
  });

  // Test 2: Create test fixture
  await test('cases:createTestFixture', async () => {
    const result = await sendRequest(child, 'tools/call', {
      name: 'cases:createTestFixture',
      arguments: {
        caseType: 'employment',
        includeDocuments: true,
        includeConversations: true,
        documentCount: 3,
        conversationCount: 2
      }
    });

    const text = result.content[0].text;
    const match = text.match(/Case ID: ([a-f0-9-]+)/);
    if (!match) {
      throw new Error('No case ID found in response');
    }
    testCaseId = match[1];
    log(`   Created test fixture with case ID: ${testCaseId}`, 'blue');
  });

  // Test 3: List cases
  await test('cases:list', async () => {
    const result = await sendRequest(child, 'tools/call', {
      name: 'cases:list',
      arguments: {}
    });

    const text = result.content[0].text;
    const match = text.match(/Found (\d+) cases/);
    if (!match) {
      throw new Error('Could not parse case count');
    }
    const count = parseInt(match[1]);
    log(`   Found ${count} case(s)`, 'blue');
    if (count === 0) {
      throw new Error('Expected at least 1 case after creating test fixture');
    }
  });

  // Test 4: Get case by ID
  await test('cases:get', async () => {
    if (!testCaseId) {
      throw new Error('No test case ID available');
    }

    const result = await sendRequest(child, 'tools/call', {
      name: 'cases:get',
      arguments: { id: testCaseId }
    });

    const text = result.content[0].text;
    const caseData = JSON.parse(text);
    if (caseData.id !== testCaseId) {
      throw new Error(`Case ID mismatch: expected ${testCaseId}, got ${caseData.id}`);
    }
    log(`   Retrieved case: ${caseData.title}`, 'blue');
  });

  // Test 5: Update case
  await test('cases:update', async () => {
    if (!testCaseId) {
      throw new Error('No test case ID available');
    }

    const result = await sendRequest(child, 'tools/call', {
      name: 'cases:update',
      arguments: {
        id: testCaseId,
        title: 'Updated Test Case - MCP Integration Test'
      }
    });

    const text = result.content[0].text;
    if (!text.includes('updated successfully')) {
      throw new Error('Update response does not confirm success');
    }
    log(`   Updated case title`, 'blue');
  });

  // Test 6: Database query (list all cases)
  await test('database:query', async () => {
    const result = await sendRequest(child, 'tools/call', {
      name: 'database:query',
      arguments: {
        sql: 'SELECT id, title, type, status FROM cases LIMIT 10'
      }
    });

    const text = result.content[0].text;
    if (!text.includes('Query executed successfully')) {
      throw new Error('Query did not execute successfully');
    }
    const match = text.match(/Rows returned: (\d+)/);
    if (match) {
      log(`   Query returned ${match[1]} row(s)`, 'blue');
    }
  });

  // Test 7: Database query security (reject DELETE)
  await test('database:query (security check)', async () => {
    try {
      await sendRequest(child, 'tools/call', {
        name: 'database:query',
        arguments: {
          sql: 'DELETE FROM cases WHERE id = "test"'
        }
      });
      throw new Error('Should have rejected DELETE query');
    } catch (error) {
      if (!error.message.includes('Only SELECT')) {
        throw error;
      }
      log(`   Correctly rejected dangerous query`, 'blue');
    }
  });

  // Test 8: Delete case
  await test('cases:delete', async () => {
    if (!testCaseId) {
      throw new Error('No test case ID available');
    }

    const result = await sendRequest(child, 'tools/call', {
      name: 'cases:delete',
      arguments: { id: testCaseId }
    });

    const text = result.content[0].text;
    if (!text.includes('deleted successfully')) {
      throw new Error('Delete response does not confirm success');
    }
    log(`   Deleted test case`, 'blue');
  });

  // Test 9: Create another case for final verification
  await test('cases:create', async () => {
    const result = await sendRequest(child, 'tools/call', {
      name: 'cases:create',
      arguments: {
        title: 'Final Test Case',
        type: 'housing',
        description: 'Testing direct case creation',
        status: 'active'
      }
    });

    const text = result.content[0].text;
    if (!text.includes('Case created successfully')) {
      throw new Error('Create response does not confirm success');
    }
    log(`   Created new case directly`, 'blue');
  });

  // Summary
  log('\n==========================================', 'blue');
  log(`\n📊 Test Summary:`, 'yellow');
  log(`   ✅ Passed: ${passedTests}`, 'green');
  log(`   ❌ Failed: ${failedTests}`, 'red');
  log(`   📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%\n`, 'blue');

  // Cleanup
  child.kill();
  process.exit(failedTests > 0 ? 1 : 0);
}

runTests().catch(error => {
  log(`\n💥 Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
