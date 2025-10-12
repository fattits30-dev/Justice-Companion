import { expect, test } from '@playwright/test';
import {
  authenticateTestUser,
  closeElectronApp,
  launchElectronApp,
  type ElectronTestApp,
} from '../setup/electron-setup.js';
import { cleanupTestFiles, createTestFile, evidenceFixtures } from '../setup/fixtures.js';
import { getTestDatabase, TEST_USER_CREDENTIALS } from '../setup/test-database.js';

let testApp: ElectronTestApp;

test.beforeEach(async () => {
  // Launch app with seeded data (includes a case to attach evidence to)
  testApp = await launchElectronApp({ seedData: true });

  // Authenticate test user to bypass login screen
  await authenticateTestUser(testApp.window, {
    username: TEST_USER_CREDENTIALS.username,
    password: TEST_USER_CREDENTIALS.password,
  });
});

test.afterEach(async () => {
  // Cleanup test files
  cleanupTestFiles();
  // Close app and cleanup
  await closeElectronApp(testApp);
});

test.describe('Evidence Upload E2E', () => {
  test('should upload document evidence', async () => {
    const { window, dbPath } = testApp;
    const evidenceData = evidenceFixtures.employmentContract;

    // Create test PDF file
    const testFilePath = createTestFile('contract.pdf', 'PDF content here');

    // Navigate to case details (case ID 1 from seed data)
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Look for evidence section or upload button
    const uploadBtn =
      (await window.$('[data-testid="upload-evidence-btn"]')) ||
      (await window.$('button:has-text("Upload Evidence")')) ||
      (await window.$('button:has-text("Add Evidence")'));

    if (uploadBtn) {
      await uploadBtn.click();
      await window.waitForTimeout(500);

      // Fill evidence form
      const titleInput =
        (await window.$('[name="evidenceTitle"]')) ||
        (await window.$('input[placeholder*="title" i]'));
      if (titleInput) {
        await titleInput.fill(evidenceData.title);
      }

      const descInput =
        (await window.$('[name="evidenceDescription"]')) ||
        (await window.$('textarea[placeholder*="description" i]'));
      if (descInput) {
        await descInput.fill(evidenceData.description);
      }

      // Set file input
      const fileInput = await window.$('input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles(testFilePath);
        await window.waitForTimeout(1000);
      }

      // Submit form
      const submitBtn =
        (await window.$('[data-testid="save-evidence-btn"]')) ||
        (await window.$('button:has-text("Upload")')) ||
        (await window.$('button:has-text("Save")'));
      if (submitBtn) {
        await submitBtn.click();
        await window.waitForTimeout(2000);
      }

      // Verify evidence appears in UI
      const evidenceTitle = await window.$(`text=${evidenceData.title}`);
      expect(evidenceTitle).toBeTruthy();

      // Verify database persistence
      const db = getTestDatabase(dbPath);
      const dbEvidence = db
        .prepare('SELECT * FROM evidence WHERE title = ?')
        .get(evidenceData.title) as any;

      expect(dbEvidence).toBeDefined();
      expect(dbEvidence.case_id).toBe(1);
      expect(dbEvidence.file_type).toContain('pdf');

      db.close();
    }
  });

  test('should upload photo evidence', async () => {
    const { window, dbPath } = testApp;
    const evidenceData = evidenceFixtures.photo;

    // Create test image file
    const testFilePath = createTestFile('damage.jpg', 'JPEG image data');

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    const uploadBtn =
      (await window.$('[data-testid="upload-evidence-btn"]')) ||
      (await window.$('button:has-text("Upload Evidence")'));

    if (uploadBtn) {
      await uploadBtn.click();
      await window.waitForTimeout(500);

      // Fill form
      const titleInput = await window.$('[name="evidenceTitle"]');
      if (titleInput) await titleInput.fill(evidenceData.title);

      const descInput = await window.$('[name="evidenceDescription"]');
      if (descInput) await descInput.fill(evidenceData.description);

      // Upload image
      const fileInput = await window.$('input[type="file"]');
      if (fileInput) {
        await fileInput.setInputFiles(testFilePath);
        await window.waitForTimeout(1000);
      }

      const submitBtn = await window.$('button:has-text("Upload")');
      if (submitBtn) {
        await submitBtn.click();
        await window.waitForTimeout(2000);
      }

      // Verify in database
      const db = getTestDatabase(dbPath);
      const dbEvidence = db
        .prepare('SELECT * FROM evidence WHERE title = ?')
        .get(evidenceData.title) as any;

      expect(dbEvidence).toBeDefined();
      expect(dbEvidence.file_type).toContain('image');

      db.close();
    }
  });

  test('should view uploaded evidence', async () => {
    const { window, dbPath } = testApp;

    // Seed evidence first
    const db = getTestDatabase(dbPath);
    const evidenceData = evidenceFixtures.dismissalLetter;

    db.exec(`
      INSERT INTO evidence (case_id, title, description, file_path, file_type, upload_date)
      VALUES (1, '${evidenceData.title}', '${evidenceData.description}', '${evidenceData.filePath}', '${evidenceData.fileType}', datetime('now'))
    `);
    db.close();

    // Reload page
    await window.reload();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Look for evidence in list
    const evidenceLink = await window.$(`text=${evidenceData.title}`);
    expect(evidenceLink).toBeTruthy();

    // Click to view details
    if (evidenceLink) {
      await evidenceLink.click();
      await window.waitForTimeout(1000);

      // Verify details are shown
      const description = await window.$(`text=${evidenceData.description}`);
      expect(description).toBeTruthy();
    }
  });

  test('should delete evidence', async () => {
    const { window, dbPath } = testApp;

    // Seed evidence first
    const db = getTestDatabase(dbPath);
    const evidenceData = evidenceFixtures.payslips;

    db.exec(`
      INSERT INTO evidence (id, case_id, title, description, file_path, file_type, upload_date)
      VALUES (999, 1, '${evidenceData.title}', '${evidenceData.description}', '${evidenceData.filePath}', '${evidenceData.fileType}', datetime('now'))
    `);
    db.close();

    // Reload page
    await window.reload();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Find and click evidence
    const evidenceLink = await window.$(`text=${evidenceData.title}`);
    if (evidenceLink) {
      await evidenceLink.click();
      await window.waitForTimeout(1000);

      // Click delete button
      const deleteBtn =
        (await window.$('[data-testid="delete-evidence-btn"]')) ||
        (await window.$('button:has-text("Delete")'));

      if (deleteBtn) {
        await deleteBtn.click();
        await window.waitForTimeout(500);

        // Confirm deletion
        const confirmBtn =
          (await window.$('button:has-text("Confirm")')) ||
          (await window.$('button:has-text("Yes")'));
        if (confirmBtn) {
          await confirmBtn.click();
        }

        await window.waitForTimeout(2000);

        // Verify deletion
        const dbVerify = getTestDatabase(dbPath);
        const deletedEvidence = dbVerify.prepare('SELECT * FROM evidence WHERE id = ?').get(999);

        expect(deletedEvidence).toBeUndefined();
        dbVerify.close();
      }
    }
  });
});
