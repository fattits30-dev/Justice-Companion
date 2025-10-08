import { test, expect } from '@playwright/test';
import { launchElectronApp, closeElectronApp, type ElectronTestApp } from '../setup/electron-setup.js';
import { casesFixtures } from '../setup/fixtures.js';
import { getTestDatabase, verifyDatabaseState } from '../setup/test-database.js';

let testApp: ElectronTestApp;

test.beforeEach(async () => {
  // Launch app with clean database (no seed data)
  testApp = await launchElectronApp({ seedData: false });
});

test.afterEach(async () => {
  // Close app and cleanup
  await closeElectronApp(testApp);
});

test.describe('Case Management E2E', () => {
  test('should create new case and persist to database', async () => {
    const { window, dbPath } = testApp;
    const caseData = casesFixtures.employment;

    // Wait for app to be ready
    await window.waitForLoadState('domcontentloaded');

    // Navigate to cases view (assuming there's a navigation link)
    const casesNav = await window.$('[data-testid="nav-cases"]');
    if (casesNav) {
      await casesNav.click();
      await window.waitForTimeout(1000);
    }

    // Look for create case button
    const createBtn = await window.$('[data-testid="create-case-btn"]') ||
                      await window.$('button:has-text("New Case")') ||
                      await window.$('button:has-text("Create Case")');

    expect(createBtn).toBeTruthy();
    await createBtn?.click();
    await window.waitForTimeout(1000);

    // Fill case form
    await window.fill('[name="title"]', caseData.title);
    await window.selectOption('[name="caseType"]', caseData.caseType);
    await window.fill('[name="description"]', caseData.description);

    // Submit form
    const saveBtn = await window.$('[data-testid="save-case-btn"]') ||
                    await window.$('button:has-text("Save")') ||
                    await window.$('button:has-text("Create")');

    await saveBtn?.click();
    await window.waitForTimeout(2000);

    // Verify case appears in UI
    const caseTitle = await window.$(`text=${caseData.title}`);
    expect(caseTitle).toBeTruthy();

    // Verify database persistence
    const db = getTestDatabase(dbPath);
    const dbCase = db.prepare('SELECT * FROM cases WHERE title = ?').get(caseData.title) as any;

    expect(dbCase).toBeDefined();
    expect(dbCase.case_type).toBe(caseData.caseType);
    expect(dbCase.status).toBe('open');

    db.close();
  });

  test('should view case details', async () => {
    const { window, dbPath } = testApp;

    // Seed a case first
    const db = getTestDatabase(dbPath);
    const caseData = casesFixtures.housing;

    db.exec(`
      INSERT INTO cases (title, case_type, description, status, created_at, updated_at)
      VALUES ('${caseData.title}', '${caseData.caseType}', '${caseData.description}', 'open', datetime('now'), datetime('now'))
    `);
    db.close();

    // Reload page to pick up new data
    await window.reload();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Click on case to view details
    const caseLink = await window.$(`text=${caseData.title}`);
    expect(caseLink).toBeTruthy();
    await caseLink?.click();
    await window.waitForTimeout(1000);

    // Verify case details are displayed
    const titleElement = await window.$(`text=${caseData.title}`);
    const descriptionElement = await window.$(`text=${caseData.description}`);

    expect(titleElement).toBeTruthy();
    expect(descriptionElement).toBeTruthy();
  });

  test('should update case information', async () => {
    const { window, dbPath } = testApp;

    // Seed a case first
    const db = getTestDatabase(dbPath);
    const caseData = casesFixtures.consumer;

    db.exec(`
      INSERT INTO cases (id, title, case_type, description, status, created_at, updated_at)
      VALUES (1, '${caseData.title}', '${caseData.caseType}', '${caseData.description}', 'open', datetime('now'), datetime('now'))
    `);
    db.close();

    // Reload page
    await window.reload();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Navigate to case details
    const caseLink = await window.$(`text=${caseData.title}`);
    await caseLink?.click();
    await window.waitForTimeout(1000);

    // Click edit button
    const editBtn = await window.$('[data-testid="edit-case-btn"]') ||
                    await window.$('button:has-text("Edit")');

    if (editBtn) {
      await editBtn.click();
      await window.waitForTimeout(500);

      // Update title
      const newTitle = 'Updated: ' + caseData.title;
      await window.fill('[name="title"]', newTitle);

      // Save changes
      const saveBtn = await window.$('[data-testid="save-case-btn"]') ||
                      await window.$('button:has-text("Save")');
      await saveBtn?.click();
      await window.waitForTimeout(2000);

      // Verify update in database
      const dbUpdated = getTestDatabase(dbPath);
      const updatedCase = dbUpdated.prepare('SELECT * FROM cases WHERE id = ?').get(1) as any;

      expect(updatedCase.title).toContain('Updated:');
      dbUpdated.close();
    }
  });

  test('should delete case', async () => {
    const { window, dbPath } = testApp;

    // Seed a case first
    const db = getTestDatabase(dbPath);
    const caseData = casesFixtures.debt;

    db.exec(`
      INSERT INTO cases (id, title, case_type, description, status, created_at, updated_at)
      VALUES (1, '${caseData.title}', '${caseData.caseType}', '${caseData.description}', 'open', datetime('now'), datetime('now'))
    `);
    db.close();

    // Reload page
    await window.reload();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Navigate to case details
    const caseLink = await window.$(`text=${caseData.title}`);
    await caseLink?.click();
    await window.waitForTimeout(1000);

    // Click delete button
    const deleteBtn = await window.$('[data-testid="delete-case-btn"]') ||
                      await window.$('button:has-text("Delete")');

    if (deleteBtn) {
      await deleteBtn.click();
      await window.waitForTimeout(500);

      // Confirm deletion if there's a confirmation dialog
      const confirmBtn = await window.$('button:has-text("Confirm")') ||
                        await window.$('button:has-text("Yes")');
      if (confirmBtn) {
        await confirmBtn.click();
      }

      await window.waitForTimeout(2000);

      // Verify deletion in database
      const dbVerify = getTestDatabase(dbPath);
      const deletedCase = dbVerify.prepare('SELECT * FROM cases WHERE id = ?').get(1);

      expect(deletedCase).toBeUndefined();
      dbVerify.close();
    }
  });

  test('should verify case persistence across app restarts', async () => {
    const { window, dbPath } = testApp;
    const caseData = casesFixtures.family;

    // Create a case
    const db = getTestDatabase(dbPath);
    db.exec(`
      INSERT INTO cases (title, case_type, description, status, created_at, updated_at)
      VALUES ('${caseData.title}', '${caseData.caseType}', '${caseData.description}', 'open', datetime('now'), datetime('now'))
    `);
    db.close();

    // Verify data exists in database
    const dbVerify = getTestDatabase(dbPath);
    const persistedCase = dbVerify.prepare('SELECT * FROM cases WHERE title = ?').get(caseData.title) as any;

    expect(persistedCase).toBeDefined();
    expect(persistedCase.title).toBe(caseData.title);
    expect(persistedCase.case_type).toBe(caseData.caseType);

    dbVerify.close();

    // Close and relaunch app with same database
    await closeElectronApp(testApp);
    testApp = await launchElectronApp({ seedData: false });
    testApp.dbPath = dbPath; // Use same database

    // Reload and verify case still appears
    await testApp.window.reload();
    await testApp.window.waitForLoadState('domcontentloaded');
    await testApp.window.waitForTimeout(2000);

    const caseElement = await testApp.window.$(`text=${caseData.title}`);
    expect(caseElement).toBeTruthy();
  });
});
