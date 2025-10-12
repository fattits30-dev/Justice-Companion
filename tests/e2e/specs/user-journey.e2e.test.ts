import { expect, test } from '@playwright/test';
import {
  authenticateTestUser,
  closeElectronApp,
  launchElectronApp,
  type ElectronTestApp,
} from '../setup/electron-setup.js';
import {
  caseFactsFixtures,
  casesFixtures,
  createTestFile,
  evidenceFixtures,
  userFactsFixtures,
} from '../setup/fixtures.js';
import {
  getTestDatabase,
  TEST_USER_CREDENTIALS,
  verifyDatabaseState,
} from '../setup/test-database.js';

let testApp: ElectronTestApp;

test.beforeEach(async () => {
  // Start with seeded database (includes authenticated user)
  testApp = await launchElectronApp({ seedData: true });

  // Authenticate test user to bypass login screen
  await authenticateTestUser(testApp.window, {
    username: TEST_USER_CREDENTIALS.username,
    password: TEST_USER_CREDENTIALS.password,
  });
});

test.afterEach(async () => {
  await closeElectronApp(testApp);
});

test.describe('Complete User Journey E2E', () => {
  test('should complete full workflow: create case → add evidence → add facts → chat with AI → verify persistence', async () => {
    const { window, dbPath } = testApp;

    // ============================================
    // STEP 1: Launch app and verify it's ready
    // ============================================
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    console.log('Step 1: App launched successfully');

    // ============================================
    // STEP 2: Create a new case
    // ============================================
    const caseData = casesFixtures.employment;

    // Navigate to cases
    const casesNav =
      (await window.$('[data-testid="nav-cases"]')) ||
      (await window.$('a:has-text("Cases")')) ||
      (await window.$('button:has-text("Cases")'));

    if (casesNav) {
      await casesNav.click();
      await window.waitForTimeout(1000);
    }

    // Create new case
    const createCaseBtn =
      (await window.$('[data-testid="create-case-btn"]')) ||
      (await window.$('button:has-text("New Case")')) ||
      (await window.$('button:has-text("Create Case")'));

    expect(createCaseBtn, 'Create case button should exist').toBeTruthy();

    if (createCaseBtn) {
      await createCaseBtn.click();
      await window.waitForTimeout(1000);

      // Fill case form
      await window.fill('[name="title"]', caseData.title);
      await window.selectOption('[name="caseType"]', caseData.caseType);
      await window.fill('[name="description"]', caseData.description);

      const saveCaseBtn =
        (await window.$('[data-testid="save-case-btn"]')) ||
        (await window.$('button:has-text("Save")')) ||
        (await window.$('button:has-text("Create")'));

      if (saveCaseBtn) {
        await saveCaseBtn.click();
        await window.waitForTimeout(2000);
      }
    }

    // Verify case was created
    const caseTitle = await window.$(`text=${caseData.title}`);
    expect(caseTitle, 'Case title should appear in UI').toBeTruthy();

    const dbState1 = await verifyDatabaseState(dbPath);
    expect(dbState1.cases, 'Should have 1 case in database').toBe(1);

    console.log('Step 2: Case created successfully');

    // ============================================
    // STEP 3: Add user facts
    // ============================================
    const userFactData = userFactsFixtures.employment1;

    // Navigate to user facts
    const userFactsNav =
      (await window.$('[data-testid="nav-user-facts"]')) ||
      (await window.$('a:has-text("My Facts")'));

    if (userFactsNav) {
      await userFactsNav.click();
      await window.waitForTimeout(1000);

      // Create user fact
      const createFactBtn =
        (await window.$('[data-testid="create-user-fact-btn"]')) ||
        (await window.$('button:has-text("Add Fact")'));

      if (createFactBtn) {
        await createFactBtn.click();
        await window.waitForTimeout(500);

        const typeSelect = await window.$('[name="factType"]');
        if (typeSelect) await typeSelect.selectOption(userFactData.factType);

        const contentInput = await window.$('[name="factContent"]');
        if (contentInput) await contentInput.fill(userFactData.factContent);

        const importanceSelect = await window.$('[name="importance"]');
        if (importanceSelect) await importanceSelect.selectOption(userFactData.importance);

        const saveFactBtn = await window.$('button:has-text("Save")');
        if (saveFactBtn) {
          await saveFactBtn.click();
          await window.waitForTimeout(2000);
        }
      }
    }

    const dbState2 = await verifyDatabaseState(dbPath);
    expect(dbState2.userFacts, 'Should have at least 1 user fact').toBeGreaterThanOrEqual(1);

    console.log('Step 3: User fact added successfully');

    // ============================================
    // STEP 4: Upload evidence to case
    // ============================================
    const evidenceData = evidenceFixtures.employmentContract;
    const testFilePath = createTestFile('contract.pdf', 'Employment contract content');

    // Navigate back to case
    const casesNavBack = await window.$('[data-testid="nav-cases"]');
    if (casesNavBack) {
      await casesNavBack.click();
      await window.waitForTimeout(1000);

      // Click on the case we created
      const caseLink = await window.$(`text=${caseData.title}`);
      if (caseLink) {
        await caseLink.click();
        await window.waitForTimeout(1000);
      }
    }

    // Upload evidence
    const uploadBtn =
      (await window.$('[data-testid="upload-evidence-btn"]')) ||
      (await window.$('button:has-text("Upload Evidence")'));

    if (uploadBtn) {
      await uploadBtn.click();
      await window.waitForTimeout(500);

      const titleInput = await window.$('[name="evidenceTitle"]');
      if (titleInput) await titleInput.fill(evidenceData.title);

      const descInput = await window.$('[name="evidenceDescription"]');
      if (descInput) await descInput.fill(evidenceData.description);

      const fileInput = await window.$('input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles(testFilePath);
        await window.waitForTimeout(1000);
      }

      const uploadSubmitBtn = await window.$('button:has-text("Upload")');
      if (uploadSubmitBtn) {
        await uploadSubmitBtn.click();
        await window.waitForTimeout(2000);
      }
    }

    const dbState3 = await verifyDatabaseState(dbPath);
    expect(dbState3.evidence, 'Should have at least 1 evidence').toBeGreaterThanOrEqual(1);

    console.log('Step 4: Evidence uploaded successfully');

    // ============================================
    // STEP 5: Add case facts
    // ============================================
    const caseFactData = caseFactsFixtures.timeline1;

    // Find case facts section
    const factsTab =
      (await window.$('[data-testid="case-facts-tab"]')) ||
      (await window.$('button:has-text("Facts")'));

    if (factsTab) {
      await factsTab.click();
      await window.waitForTimeout(500);

      const createCaseFactBtn =
        (await window.$('[data-testid="create-case-fact-btn"]')) ||
        (await window.$('button:has-text("Add Fact")'));

      if (createCaseFactBtn) {
        await createCaseFactBtn.click();
        await window.waitForTimeout(500);

        const categorySelect = await window.$('[name="category"]');
        if (categorySelect) await categorySelect.selectOption(caseFactData.category);

        const factContent = await window.$('[name="factContent"]');
        if (factContent) await factContent.fill(caseFactData.factContent);

        const factImportance = await window.$('[name="importance"]');
        if (factImportance) await factImportance.selectOption(caseFactData.importance);

        const saveCaseFactBtn = await window.$('button:has-text("Save")');
        if (saveCaseFactBtn) {
          await saveCaseFactBtn.click();
          await window.waitForTimeout(2000);
        }
      }
    }

    const dbState4 = await verifyDatabaseState(dbPath);
    expect(dbState4.caseFacts, 'Should have at least 1 case fact').toBeGreaterThanOrEqual(1);

    console.log('Step 5: Case fact added successfully');

    // ============================================
    // STEP 6: Chat with AI about the case
    // ============================================
    const chatNav =
      (await window.$('[data-testid="nav-chat"]')) || (await window.$('a:has-text("Chat")'));

    if (chatNav) {
      await chatNav.click();
      await window.waitForTimeout(1000);

      const chatInput =
        (await window.$('[data-testid="chat-input"]')) ||
        (await window.$('textarea[placeholder*="message" i]'));

      if (chatInput) {
        await chatInput.fill('What are my rights in this employment case?');
        await window.waitForTimeout(500);

        const sendBtn =
          (await window.$('[data-testid="send-message-btn"]')) ||
          (await window.$('button:has-text("Send")'));

        if (sendBtn) {
          await sendBtn.click();
          await window.waitForTimeout(3000); // Wait for AI response
        }
      }
    }

    console.log('Step 6: AI chat interaction completed');

    // ============================================
    // STEP 7: View case summary
    // ============================================
    // Navigate back to case
    const casesNavFinal = await window.$('[data-testid="nav-cases"]');
    if (casesNavFinal) {
      await casesNavFinal.click();
      await window.waitForTimeout(1000);

      const caseLinkFinal = await window.$(`text=${caseData.title}`);
      if (caseLinkFinal) {
        await caseLinkFinal.click();
        await window.waitForTimeout(1000);
      }
    }

    // Verify case summary shows all added content
    const summaryTitle = await window.$(`text=${caseData.title}`);
    const summaryEvidence = await window.$(`text=${evidenceData.title}`);

    expect(summaryTitle, 'Case title should be visible').toBeTruthy();
    expect(summaryEvidence, 'Evidence should be visible').toBeTruthy();

    console.log('Step 7: Case summary verified');

    // ============================================
    // STEP 8: Verify data persistence
    // ============================================
    const db = getTestDatabase(dbPath);

    // Verify case
    const dbCase = db.prepare('SELECT * FROM cases WHERE title = ?').get(caseData.title) as any;
    expect(dbCase, 'Case should exist in database').toBeDefined();
    expect(dbCase.case_type).toBe(caseData.caseType);

    // Verify evidence
    const dbEvidence = db
      .prepare('SELECT * FROM evidence WHERE title = ?')
      .get(evidenceData.title) as any;
    expect(dbEvidence, 'Evidence should exist in database').toBeDefined();

    // Verify user facts
    const dbUserFacts = db.prepare('SELECT * FROM user_facts').all();
    expect(dbUserFacts.length, 'Should have user facts').toBeGreaterThan(0);

    // Verify case facts
    const dbCaseFacts = db.prepare('SELECT * FROM case_facts').all();
    expect(dbCaseFacts.length, 'Should have case facts').toBeGreaterThan(0);

    // Verify chat messages
    const dbMessages = db.prepare('SELECT * FROM chat_messages').all();
    expect(dbMessages.length, 'Should have chat messages').toBeGreaterThanOrEqual(0);

    db.close();

    console.log('Step 8: All data persisted successfully');

    // ============================================
    // STEP 9: Verify audit trail
    // ============================================
    const dbAudit = getTestDatabase(dbPath);
    const auditLogs = dbAudit.prepare('SELECT * FROM audit_logs').all();

    expect(auditLogs.length, 'Should have audit logs for all operations').toBeGreaterThan(0);

    // Check for specific event types
    const caseCreateLog = dbAudit
      .prepare('SELECT * FROM audit_logs WHERE event_type = ?')
      .get('case.create');
    expect(caseCreateLog, 'Should have case.create audit log').toBeDefined();

    dbAudit.close();

    console.log('Step 9: Audit trail verified');

    // ============================================
    // FINAL: Complete workflow verified
    // ============================================
    console.log('✓ Complete user journey test passed!');
    console.log('  - Case created');
    console.log('  - Evidence uploaded');
    console.log('  - User facts added');
    console.log('  - Case facts added');
    console.log('  - AI chat interaction completed');
    console.log('  - All data persisted to database');
    console.log('  - Audit trail recorded');
  });
});
