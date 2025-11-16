#!/usr/bin/env node

/**
 * Test Authentication Migration
 *
 * Quick integration test to verify HTTP auth endpoints work correctly.
 *
 * Usage:
 *   node scripts/test-auth-migration.mjs
 *
 * Prerequisites:
 *   - FastAPI backend running on http://127.0.0.1:8000
 *   - Database initialized with migrations
 */

const API_BASE_URL = 'http://127.0.0.1:8000';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function makeRequest(endpoint, method = 'GET', body = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
    };
  }
}

async function testHealthCheck() {
  logInfo('Testing health check endpoint...');

  const result = await makeRequest('/health');

  if (result.ok && result.data.status === 'healthy') {
    logSuccess('Health check passed');
    return true;
  }

  logError('Health check failed');
  console.log('Response:', result);
  return false;
}

async function testRegistration() {
  logInfo('Testing user registration...');

  const timestamp = Date.now();
  const testUser = {
    username: `test_user_${timestamp}`,
    email: `test_${timestamp}@example.com`,
    password: 'TestPassword123!',
  };

  const result = await makeRequest('/auth/register', 'POST', testUser);

  if (result.status === 201 && result.data.user && result.data.session) {
    logSuccess(`Registration successful: ${testUser.username}`);
    console.log('User ID:', result.data.user.id);
    console.log('Session ID:', result.data.session.id);
    return { testUser, response: result.data };
  }

  if (result.status === 429) {
    logWarning('Rate limit exceeded for registration');
    return null;
  }

  logError('Registration failed');
  console.log('Response:', result);
  return null;
}

async function testLogin(username, password) {
  logInfo('Testing user login...');

  const result = await makeRequest('/auth/login', 'POST', {
    username,
    password,
    remember_me: false,
  });

  if (result.ok && result.data.user && result.data.session) {
    logSuccess(`Login successful: ${username}`);
    console.log('Session ID:', result.data.session.id);
    return result.data;
  }

  if (result.status === 429) {
    logWarning('Rate limit exceeded for login');
    return null;
  }

  logError('Login failed');
  console.log('Response:', result);
  return null;
}

async function testGetSession(sessionId) {
  logInfo('Testing session validation...');

  const result = await makeRequest(`/auth/session/${sessionId}`);

  if (result.ok && result.data.user && result.data.session) {
    logSuccess('Session validation successful');
    console.log('User:', result.data.user.username);
    console.log('Expires at:', result.data.session.expires_at);
    return true;
  }

  logError('Session validation failed');
  console.log('Response:', result);
  return false;
}

async function testLogout(sessionId) {
  logInfo('Testing user logout...');

  const result = await makeRequest('/auth/logout', 'POST', {
    session_id: sessionId,
  });

  if (result.ok && result.data.success) {
    logSuccess('Logout successful');
    return true;
  }

  logError('Logout failed');
  console.log('Response:', result);
  return false;
}

async function testInvalidLogin() {
  logInfo('Testing invalid credentials...');

  const result = await makeRequest('/auth/login', 'POST', {
    username: 'nonexistent_user',
    password: 'wrong_password',
    remember_me: false,
  });

  if (result.status === 401) {
    logSuccess('Invalid credentials rejected correctly (401)');
    return true;
  }

  logError('Expected 401 for invalid credentials');
  console.log('Response:', result);
  return false;
}

async function testInvalidSession() {
  logInfo('Testing invalid session...');

  const fakeSessionId = '00000000-0000-0000-0000-000000000000';
  const result = await makeRequest(`/auth/session/${fakeSessionId}`);

  if (result.status === 404) {
    logSuccess('Invalid session rejected correctly (404)');
    return true;
  }

  logError('Expected 404 for invalid session');
  console.log('Response:', result);
  return false;
}

async function runTests() {
  log('\n=== Authentication Migration Tests ===\n', 'cyan');

  let passed = 0;
  let failed = 0;

  // Test 1: Health Check
  if (await testHealthCheck()) {
    passed++;
  } else {
    failed++;
    logError('Backend not running. Start it with: cd backend && python -m uvicorn backend.main:app --reload');
    return;
  }

  console.log('');

  // Test 2: Registration
  const registrationResult = await testRegistration();
  if (registrationResult) {
    passed++;
  } else {
    failed++;
    logWarning('Skipping remaining tests due to registration failure');
    console.log('\n=== Test Summary ===');
    log(`Passed: ${passed}`, 'green');
    log(`Failed: ${failed}`, 'red');
    return;
  }

  console.log('');

  // Test 3: Login
  const loginResult = await testLogin(
    registrationResult.testUser.username,
    registrationResult.testUser.password
  );
  if (loginResult) {
    passed++;
  } else {
    failed++;
  }

  console.log('');

  // Test 4: Get Session
  if (loginResult && (await testGetSession(loginResult.session.id))) {
    passed++;
  } else {
    failed++;
  }

  console.log('');

  // Test 5: Logout
  if (loginResult && (await testLogout(loginResult.session.id))) {
    passed++;
  } else {
    failed++;
  }

  console.log('');

  // Test 6: Invalid Login
  if (await testInvalidLogin()) {
    passed++;
  } else {
    failed++;
  }

  console.log('');

  // Test 7: Invalid Session
  if (await testInvalidSession()) {
    passed++;
  } else {
    failed++;
  }

  // Summary
  console.log('\n=== Test Summary ===');
  log(`Passed: ${passed}/7`, passed === 7 ? 'green' : 'yellow');
  if (failed > 0) {
    log(`Failed: ${failed}/7`, 'red');
  }

  if (passed === 7) {
    log('\n✅ All tests passed! Migration successful.', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please review the output above.', 'yellow');
  }
}

// Run tests
runTests().catch((error) => {
  logError('Test suite crashed:');
  console.error(error);
  process.exit(1);
});
