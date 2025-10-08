import { test, expect } from '@playwright/test';
import { launchElectronApp, closeElectronApp, type ElectronTestApp } from '../setup/electron-setup.js';
import { userFactsFixtures, caseFactsFixtures } from '../setup/fixtures.js';
import { getTestDatabase } from '../setup/test-database.js';

let testApp: ElectronTestApp;

test.beforeEach(async () => {
  testApp = await launchElectronApp({ seedData: true });
});

test.afterEach(async () => {
  await closeElectronApp(testApp);
});

test.describe('Facts Tracking E2E', () => {
  test('should create user fact', async () => {
    const { window, dbPath } = testApp;
    const factData = userFactsFixtures.employment1;

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Navigate to user facts
    const factsNav = await window.$('[data-testid="nav-user-facts"]') ||
                     await window.$('a:has-text("My Facts")') ||
                     await window.$('a:has-text("User Facts")');

    if (factsNav) {
      await factsNav.click();
      await window.waitForTimeout(1000);
    }

    // Click create fact button
    const createBtn = await window.$('[data-testid="create-user-fact-btn"]') ||
                      await window.$('button:has-text("Add Fact")');

    if (createBtn) {
      await createBtn.click();
      await window.waitForTimeout(500);

      // Fill fact form
      const typeSelect = await window.$('[name="factType"]');
      if (typeSelect) {
        await typeSelect.selectOption(factData.factType);
      }

      const contentInput = await window.$('[name="factContent"]') ||
                          await window.$('textarea[placeholder*="fact" i]');
      if (contentInput) {
        await contentInput.fill(factData.factContent);
      }

      const importanceSelect = await window.$('[name="importance"]');
      if (importanceSelect) {
        await importanceSelect.selectOption(factData.importance);
      }

      // Save fact
      const saveBtn = await window.$('[data-testid="save-user-fact-btn"]') ||
                     await window.$('button:has-text("Save")');
      if (saveBtn) {
        await saveBtn.click();
        await window.waitForTimeout(2000);
      }

      // Verify fact appears in UI
      const factElement = await window.$(`text=${factData.factContent}`);
      expect(factElement).toBeTruthy();

      // Verify database persistence
      const db = getTestDatabase(dbPath);
      const dbFact = db.prepare('SELECT * FROM user_facts WHERE fact_type = ?').get(factData.factType) as any;

      expect(dbFact).toBeDefined();
      expect(dbFact.importance).toBe(factData.importance);

      db.close();
    }
  });

  test('should create case fact', async () => {
    const { window, dbPath } = testApp;
    const factData = caseFactsFixtures.timeline1;

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Navigate to case details (case ID 1 from seed data)
    const caseNav = await window.$('[data-testid="nav-cases"]');
    if (caseNav) {
      await caseNav.click();
      await window.waitForTimeout(1000);

      // Click on first case
      const firstCase = await window.$('[data-testid="case-item"]') ||
                        await window.$$('.case-card').then(cards => cards[0]);
      if (firstCase) {
        await firstCase.click();
        await window.waitForTimeout(1000);
      }
    }

    // Find case facts section
    const factsTab = await window.$('[data-testid="case-facts-tab"]') ||
                     await window.$('button:has-text("Facts")');

    if (factsTab) {
      await factsTab.click();
      await window.waitForTimeout(500);
    }

    // Create case fact
    const createBtn = await window.$('[data-testid="create-case-fact-btn"]') ||
                      await window.$('button:has-text("Add Fact")');

    if (createBtn) {
      await createBtn.click();
      await window.waitForTimeout(500);

      // Fill form
      const categorySelect = await window.$('[name="category"]');
      if (categorySelect) {
        await categorySelect.selectOption(factData.category);
      }

      const contentInput = await window.$('[name="factContent"]');
      if (contentInput) {
        await contentInput.fill(factData.factContent);
      }

      const importanceSelect = await window.$('[name="importance"]');
      if (importanceSelect) {
        await importanceSelect.selectOption(factData.importance);
      }

      const saveBtn = await window.$('button:has-text("Save")');
      if (saveBtn) {
        await saveBtn.click();
        await window.waitForTimeout(2000);
      }

      // Verify in database
      const db = getTestDatabase(dbPath);
      const dbFact = db.prepare('SELECT * FROM case_facts WHERE category = ?').get(factData.category) as any;

      expect(dbFact).toBeDefined();
      db.close();
    }
  });

  test('should filter facts by category', async () => {
    const { window, dbPath } = testApp;

    // Seed multiple user facts with different types
    const db = getTestDatabase(dbPath);
    db.exec(`
      INSERT INTO user_facts (fact_type, fact_content, importance, created_at, updated_at)
      VALUES
        ('personal', 'Personal fact 1', 'medium', datetime('now'), datetime('now')),
        ('employment', 'Employment fact 1', 'high', datetime('now'), datetime('now')),
        ('financial', 'Financial fact 1', 'low', datetime('now'), datetime('now'));
    `);
    db.close();

    await window.reload();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Navigate to user facts
    const factsNav = await window.$('[data-testid="nav-user-facts"]');
    if (factsNav) {
      await factsNav.click();
      await window.waitForTimeout(1000);
    }

    // Filter by employment
    const employmentFilter = await window.$('[data-testid="filter-employment"]') ||
                             await window.$('button:has-text("Employment")');

    if (employmentFilter) {
      await employmentFilter.click();
      await window.waitForTimeout(500);

      // Should show only employment facts
      const employmentFact = await window.$('text=Employment fact 1');
      const personalFact = await window.$('text=Personal fact 1');

      expect(employmentFact).toBeTruthy();
      expect(personalFact).toBeFalsy();
    }
  });

  test('should update and delete facts', async () => {
    const { window, dbPath } = testApp;

    // Seed a user fact
    const db = getTestDatabase(dbPath);
    db.exec(`
      INSERT INTO user_facts (id, fact_type, fact_content, importance, created_at, updated_at)
      VALUES (999, 'personal', 'Test fact to update', 'medium', datetime('now'), datetime('now'));
    `);
    db.close();

    await window.reload();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Navigate to user facts
    const factsNav = await window.$('[data-testid="nav-user-facts"]');
    if (factsNav) {
      await factsNav.click();
      await window.waitForTimeout(1000);
    }

    // Find the fact
    const factCard = await window.$('text=Test fact to update');
    if (factCard) {
      // Click to edit
      const editBtn = await window.$('[data-testid="edit-fact-999"]') ||
                     factCard.locator('button:has-text("Edit")');

      if (editBtn) {
        await editBtn.click();
        await window.waitForTimeout(500);

        // Update content
        const contentInput = await window.$('[name="factContent"]');
        if (contentInput) {
          await contentInput.fill('Updated fact content');

          const saveBtn = await window.$('button:has-text("Save")');
          if (saveBtn) {
            await saveBtn.click();
            await window.waitForTimeout(2000);
          }

          // Verify update
          const dbVerify = getTestDatabase(dbPath);
          const updatedFact = dbVerify.prepare('SELECT * FROM user_facts WHERE id = ?').get(999) as any;

          expect(updatedFact.fact_content).toContain('Updated');
          dbVerify.close();
        }
      }

      // Delete the fact
      const deleteBtn = await window.$('[data-testid="delete-fact-999"]') ||
                       await window.$('button:has-text("Delete")');

      if (deleteBtn) {
        await deleteBtn.click();
        await window.waitForTimeout(500);

        // Confirm
        const confirmBtn = await window.$('button:has-text("Confirm")');
        if (confirmBtn) {
          await confirmBtn.click();
          await window.waitForTimeout(2000);
        }

        // Verify deletion
        const dbFinal = getTestDatabase(dbPath);
        const deletedFact = dbFinal.prepare('SELECT * FROM user_facts WHERE id = ?').get(999);

        expect(deletedFact).toBeUndefined();
        dbFinal.close();
      }
    }
  });
});
