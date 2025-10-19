/**
 * Standalone Performance Analysis for Justice Companion
 * This script runs without TypeScript compilation issues
 */

const Database = require('better-sqlite3');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

console.log('='.repeat(80));
console.log('JUSTICE COMPANION - PERFORMANCE ANALYSIS');
console.log('='.repeat(80));

// Create test database
const db = new Database(':memory:');

// Setup schema
db.exec(`
  CREATE TABLE cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    case_type TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    evidence_type TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
  );

  CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
  );

  -- Add indexes
  CREATE INDEX idx_evidence_case_id ON evidence(case_id);
  CREATE INDEX idx_notes_case_id ON notes(case_id);
`);

// Simple encryption simulation
class SimpleEncryption {
  constructor() {
    this.key = crypto.randomBytes(32);
    this.algorithm = 'aes-256-gcm';
  }

  encrypt(text) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();
    return {
      ciphertext: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  }

  decrypt(data) {
    const iv = Buffer.from(data.iv, 'base64');
    const authTag = Buffer.from(data.authTag, 'base64');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(data.ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

// Simple cache implementation
class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    if (this.cache.has(key)) {
      this.hits++;
      return this.cache.get(key);
    }
    this.misses++;
    return null;
  }

  set(key, value) {
    this.cache.set(key, value);
  }

  getStats() {
    return { hits: this.hits, misses: this.misses, size: this.cache.size };
  }
}

const encryption = new SimpleEncryption();
const cache = new SimpleCache();

console.log('\n=== TEST 1: ENCRYPTION/DECRYPTION PERFORMANCE ===\n');

const testSizes = [
  { name: 'small', size: 100 },
  { name: 'medium', size: 1000 },
  { name: 'large', size: 10000 },
  { name: 'xlarge', size: 100000 }
];

const encryptionResults = [];

for (const { name, size } of testSizes) {
  const text = 'A'.repeat(size);

  // Test encryption
  const encStart = performance.now();
  const encrypted = encryption.encrypt(text);
  const encTime = performance.now() - encStart;

  // Test decryption
  const decStart = performance.now();
  encryption.decrypt(encrypted);
  const decTime = performance.now() - decStart;

  encryptionResults.push({ name, size, encTime, decTime });
  console.log(`${name.padEnd(10)} (${size.toString().padStart(6)} chars): Encrypt=${encTime.toFixed(2)}ms, Decrypt=${decTime.toFixed(2)}ms`);
}

console.log('\n=== TEST 2: CACHE EFFECTIVENESS ===\n');

// Test cache miss vs hit
const testKey = 'case:1:description';
const testValue = 'Sensitive legal information that should be cached';

// Cache miss
const missStart = performance.now();
let cached = cache.get(testKey);
if (!cached) {
  cache.set(testKey, testValue);
}
const missTime = performance.now() - missStart;

// Cache hits
const hitRuns = 10000;
const hitStart = performance.now();
for (let i = 0; i < hitRuns; i++) {
  cache.get(testKey);
}
const totalHitTime = performance.now() - hitStart;
const avgHitTime = totalHitTime / hitRuns;

console.log(`Cache miss + set: ${missTime.toFixed(4)}ms`);
console.log(`Cache hit (avg of ${hitRuns}): ${avgHitTime.toFixed(6)}ms`);
console.log(`Cache speedup: ${(missTime / avgHitTime).toFixed(0)}x faster`);

console.log('\n=== TEST 3: DATABASE PERFORMANCE ===\n');

// Insert test data
const caseCount = 100;
const evidencePerCase = 5;

console.log(`Creating ${caseCount} cases with ${evidencePerCase} evidence items each...`);

const insertStart = performance.now();
const insertStmt = db.prepare('INSERT INTO cases (title, description, case_type) VALUES (?, ?, ?)');
const caseIds = [];

for (let i = 0; i < caseCount; i++) {
  const encrypted = encryption.encrypt(`Sensitive description for case ${i}`);
  const result = insertStmt.run(
    `Case ${i}`,
    JSON.stringify(encrypted),
    'employment'
  );
  caseIds.push(result.lastInsertRowid);
}

const evidenceStmt = db.prepare('INSERT INTO evidence (case_id, title, content, evidence_type) VALUES (?, ?, ?, ?)');
for (const caseId of caseIds) {
  for (let j = 0; j < evidencePerCase; j++) {
    const encrypted = encryption.encrypt(`Evidence content ${j} for case ${caseId}`);
    evidenceStmt.run(
      caseId,
      `Evidence ${j}`,
      JSON.stringify(encrypted),
      'document'
    );
  }
}

const insertTime = performance.now() - insertStart;
console.log(`Insert time: ${insertTime.toFixed(2)}ms (${(insertTime/caseCount).toFixed(2)}ms per case with evidence)`);

// Test loading all cases WITHOUT cache
console.log('\n=== TEST 4: LOADING DATA WITHOUT CACHE ===\n');

const loadNoCacheStart = performance.now();
const selectStmt = db.prepare('SELECT * FROM cases');
const cases = selectStmt.all();

let decryptedCount = 0;
for (const caseRow of cases) {
  if (caseRow.description) {
    const encrypted = JSON.parse(caseRow.description);
    encryption.decrypt(encrypted);
    decryptedCount++;
  }
}

const loadNoCacheTime = performance.now() - loadNoCacheStart;
console.log(`Load ${caseCount} cases (no cache): ${loadNoCacheTime.toFixed(2)}ms`);
console.log(`Average per case: ${(loadNoCacheTime/caseCount).toFixed(2)}ms`);
console.log(`Decryptions performed: ${decryptedCount}`);

// Test loading all cases WITH cache
console.log('\n=== TEST 5: LOADING DATA WITH CACHE ===\n');

const cache2 = new SimpleCache();
const loadWithCacheStart = performance.now();
const cases2 = selectStmt.all();

for (const caseRow of cases2) {
  if (caseRow.description) {
    const cacheKey = `case:${caseRow.id}:description`;
    let decrypted = cache2.get(cacheKey);

    if (!decrypted) {
      const encrypted = JSON.parse(caseRow.description);
      decrypted = encryption.decrypt(encrypted);
      cache2.set(cacheKey, decrypted);
    }
  }
}

const loadWithCacheTime = performance.now() - loadWithCacheStart;

// Load again to test cache hits
const loadCacheHitStart = performance.now();
const cases3 = selectStmt.all();

for (const caseRow of cases3) {
  if (caseRow.description) {
    const cacheKey = `case:${caseRow.id}:description`;
    cache2.get(cacheKey); // Should all be hits
  }
}

const loadCacheHitTime = performance.now() - loadCacheHitStart;

console.log(`Load ${caseCount} cases (first run with cache): ${loadWithCacheTime.toFixed(2)}ms`);
console.log(`Load ${caseCount} cases (cache hits): ${loadCacheHitTime.toFixed(2)}ms`);
console.log(`Cache stats:`, cache2.getStats());
console.log(`Cache speedup: ${(loadNoCacheTime/loadCacheHitTime).toFixed(1)}x faster`);

// Test N+1 Query Pattern
console.log('\n=== TEST 6: N+1 QUERY PATTERN ===\n');

const n1Start = performance.now();
const allCases = db.prepare('SELECT * FROM cases').all();
let totalEvidence = 0;

for (const caseRow of allCases) {
  const evidence = db.prepare('SELECT * FROM evidence WHERE case_id = ?').all(caseRow.id);
  totalEvidence += evidence.length;
}

const n1Time = performance.now() - n1Start;

// Test with JOIN (avoiding N+1)
const joinStart = performance.now();
const joinResult = db.prepare(`
  SELECT c.*, COUNT(e.id) as evidence_count
  FROM cases c
  LEFT JOIN evidence e ON c.id = e.case_id
  GROUP BY c.id
`).all();
const joinTime = performance.now() - joinStart;

console.log(`N+1 Pattern (${caseCount} + ${caseCount} queries): ${n1Time.toFixed(2)}ms`);
console.log(`JOIN Query (1 query): ${joinTime.toFixed(2)}ms`);
console.log(`N+1 overhead: ${(n1Time/joinTime).toFixed(1)}x slower`);
console.log(`Total evidence found: ${totalEvidence}`);

// Test index performance
console.log('\n=== TEST 7: INDEX PERFORMANCE ===\n');

// Query with index
const indexStart = performance.now();
db.prepare('SELECT * FROM evidence WHERE case_id = ?').all(1);
const indexTime = performance.now() - indexStart;

// Query without index (full scan)
const noIndexStart = performance.now();
db.prepare('SELECT * FROM evidence WHERE content LIKE ?').all('%Evidence content%');
const noIndexTime = performance.now() - noIndexStart;

console.log(`Query with index (case_id): ${indexTime.toFixed(2)}ms`);
console.log(`Query without index (LIKE): ${noIndexTime.toFixed(2)}ms`);
console.log(`Index speedup: ${(noIndexTime/indexTime).toFixed(1)}x faster`);

// Summary Report
console.log('\n' + '='.repeat(80));
console.log('PERFORMANCE ANALYSIS SUMMARY');
console.log('='.repeat(80));

console.log('\n### CRITICAL FINDINGS ###\n');

// Calculate average decryption time
const avgDecryptTime = encryptionResults.reduce((sum, r) => sum + r.decTime, 0) / encryptionResults.length;

console.log('1. DECRYPTION OVERHEAD');
console.log(`   - Average decrypt time: ${avgDecryptTime.toFixed(2)}ms`);
console.log(`   - Cache hit time: ${avgHitTime.toFixed(6)}ms`);
console.log(`   - Potential speedup: ${(avgDecryptTime/avgHitTime).toFixed(0)}x with caching`);
console.log(`   - For ${caseCount} cases: ${(loadNoCacheTime - loadCacheHitTime).toFixed(2)}ms saved`);

console.log('\n2. N+1 QUERY PATTERN');
console.log(`   - Current approach: ${n1Time.toFixed(2)}ms (${caseCount + 1} queries)`);
console.log(`   - Optimized (JOIN): ${joinTime.toFixed(2)}ms (1 query)`);
console.log(`   - Performance loss: ${(n1Time - joinTime).toFixed(2)}ms`);

console.log('\n3. DATABASE PERFORMANCE');
console.log(`   - Insert rate: ${(caseCount/insertTime * 1000).toFixed(0)} cases/second`);
console.log(`   - Query rate: ${(caseCount/loadNoCacheTime * 1000).toFixed(0)} cases/second (with decryption)`);
console.log(`   - Index benefit: ${(noIndexTime/indexTime).toFixed(1)}x faster queries`);

console.log('\n### RECOMMENDATIONS ###\n');
console.log('PRIORITY 1: Implement DecryptionCache Integration');
console.log(`   - Estimated savings: ${((1 - loadCacheHitTime/loadNoCacheTime) * 100).toFixed(0)}% reduction in load time`);
console.log(`   - Implementation: Modify repositories to use cache`);

console.log('\nPRIORITY 2: Fix N+1 Query Patterns');
console.log(`   - Use JOIN queries or batch loading`);
console.log(`   - Estimated savings: ${((1 - joinTime/n1Time) * 100).toFixed(0)}% reduction`);

console.log('\nPRIORITY 3: Optimize Bulk Operations');
console.log(`   - Use transactions for bulk inserts`);
console.log(`   - Current rate could be improved with batching`);

console.log('\n' + '='.repeat(80));

// Memory usage
if (process.memoryUsage) {
  const mem = process.memoryUsage();
  console.log('\nMemory Usage:');
  console.log(`   - Heap Used: ${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   - RSS: ${(mem.rss / 1024 / 1024).toFixed(2)} MB`);
}

db.close();
console.log('\nAnalysis complete.');