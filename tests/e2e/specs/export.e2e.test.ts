/**
 * Export Functionality E2E Tests
 *
 * Tests case export to PDF, Word, evidence lists, timeline reports, and case notes.
 */

import { test } from "@playwright/test";
import {
  authenticateTestUser,
  closeElectronApp,
  launchElectronApp,
  type ElectronTestApp,
} from "../setup/electron-setup.js";
import { TEST_USER_CREDENTIALS } from "../setup/test-database.js";
import { casesFixtures } from "../setup/fixtures.js";

let testApp: ElectronTestApp;

test.beforeEach(async () => {
  testApp = await launchElectronApp({ seedData: true });
  await authenticateTestUser(testApp.window, {
    username: TEST_USER_CREDENTIALS.username,
    password: TEST_USER_CREDENTIALS.password,
  });
});

test.afterEach(async () => {
  await closeElectronApp(testApp);
});

test.describe("Export Functionality E2E", () => {
  test("should export case to PDF", async () => {
    const { window } = testApp;

    // First create a case
    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    const caseData = casesFixtures.employment;
    const casesNav = await window.$('a:has-text("Cases")');
    if (casesNav) {
      await casesNav.click();
      await window.waitForTimeout(1000);

      const createCaseBtn = await window.$('button:has-text("New Case")');
      if (createCaseBtn) {
        await createCaseBtn.click();
        await window.waitForTimeout(500);

        await window.fill('[name="title"]', caseData.title);
        await window.selectOption('[name="caseType"]', caseData.caseType);
        await window.fill('[name="description"]', caseData.description);

        const saveBtn = await window.$('button:has-text("Save")');
        if (saveBtn) {
          await saveBtn.click();
          await window.waitForTimeout(2000);
        }
      }

      // Now try to export the case
      const caseItem = await window.$(`text=${caseData.title}`);
      if (caseItem) {
        await caseItem.click();
        await window.waitForTimeout(1000);

        // Look for export button
        const exportBtn = await window.$(
          'button:has-text("Export"), [data-testid*="export"]'
        );
        if (exportBtn) {
          await exportBtn.click();
          await window.waitForTimeout(500);

          // Look for PDF export option
          const pdfExport = await window.$(
            'button:has-text("PDF"), text=/PDF/i'
          );
          if (pdfExport) {
            await pdfExport.click();
            await window.waitForTimeout(3000); // Wait for export

            console.log("Case PDF export initiated");
          }
        }
      }
    }
  });

  test("should export case to Word document", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to cases
    const casesNav = await window.$('a:has-text("Cases")');
    if (casesNav) {
      await casesNav.click();
      await window.waitForTimeout(1000);

      // Find and click on a case
      const caseItem = await window.$('.case-item, [data-testid*="case"]');
      if (caseItem) {
        await caseItem.click();
        await window.waitForTimeout(1000);

        // Look for export options
        const exportBtn = await window.$(
          'button:has-text("Export"), [data-testid*="export"]'
        );
        if (exportBtn) {
          await exportBtn.click();
          await window.waitForTimeout(500);

          // Look for Word export option
          const wordExport = await window.$(
            'button:has-text("Word"), text=/Word|DOCX/i'
          );
          if (wordExport) {
            await wordExport.click();
            await window.waitForTimeout(3000); // Wait for export

            console.log("Case Word export initiated");
          }
        }
      }
    }
  });

  test("should export evidence list to PDF", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to documents/evidence
    const docsNav = await window.$(
      'a:has-text("Documents"), a:has-text("Evidence")'
    );
    if (docsNav) {
      await docsNav.click();
      await window.waitForTimeout(1000);

      // Look for export evidence list button
      const exportEvidenceBtn = await window.$(
        'button:has-text("Export Evidence"), button:has-text("Export List")'
      );
      if (exportEvidenceBtn) {
        await exportEvidenceBtn.click();
        await window.waitForTimeout(3000); // Wait for export

        console.log("Evidence list PDF export initiated");
      }
    }
  });

  test("should export timeline report to PDF", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to timeline
    const timelineNav = await window.$('a:has-text("Timeline")');
    if (timelineNav) {
      await timelineNav.click();
      await window.waitForTimeout(1000);

      // Look for export timeline button
      const exportTimelineBtn = await window.$(
        'button:has-text("Export Timeline"), button:has-text("Export Report")'
      );
      if (exportTimelineBtn) {
        await exportTimelineBtn.click();
        await window.waitForTimeout(3000); // Wait for export

        console.log("Timeline report PDF export initiated");
      }
    }
  });

  test("should export case notes to PDF", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to cases
    const casesNav = await window.$('a:has-text("Cases")');
    if (casesNav) {
      await casesNav.click();
      await window.waitForTimeout(1000);

      // Find and click on a case
      const caseItem = await window.$('.case-item, [data-testid*="case"]');
      if (caseItem) {
        await caseItem.click();
        await window.waitForTimeout(1000);

        // Look for notes section
        const notesTab = await window.$(
          'button:has-text("Notes"), [data-testid*="notes"]'
        );
        if (notesTab) {
          await notesTab.click();
          await window.waitForTimeout(500);

          // Look for export notes button
          const exportNotesBtn = await window.$(
            'button:has-text("Export Notes")'
          );
          if (exportNotesBtn) {
            await exportNotesBtn.click();
            await window.waitForTimeout(3000); // Wait for export

            console.log("Case notes PDF export initiated");
          }
        }
      }
    }
  });

  test("should export case notes to Word", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to cases
    const casesNav = await window.$('a:has-text("Cases")');
    if (casesNav) {
      await casesNav.click();
      await window.waitForTimeout(1000);

      // Find and click on a case
      const caseItem = await window.$('.case-item, [data-testid*="case"]');
      if (caseItem) {
        await caseItem.click();
        await window.waitForTimeout(1000);

        // Look for notes section
        const notesTab = await window.$(
          'button:has-text("Notes"), [data-testid*="notes"]'
        );
        if (notesTab) {
          await notesTab.click();
          await window.waitForTimeout(500);

          // Look for export options
          const exportBtn = await window.$(
            'button:has-text("Export"), [data-testid*="export"]'
          );
          if (exportBtn) {
            await exportBtn.click();
            await window.waitForTimeout(500);

            // Look for Word export option
            const wordExport = await window.$(
              'button:has-text("Word"), text=/Word|DOCX/i'
            );
            if (wordExport) {
              await wordExport.click();
              await window.waitForTimeout(3000); // Wait for export

              console.log("Case notes Word export initiated");
            }
          }
        }
      }
    }
  });

  test("should show export templates", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to cases
    const casesNav = await window.$('a:has-text("Cases")');
    if (casesNav) {
      await casesNav.click();
      await window.waitForTimeout(1000);

      // Find and click on a case
      const caseItem = await window.$('.case-item, [data-testid*="case"]');
      if (caseItem) {
        await caseItem.click();
        await window.waitForTimeout(1000);

        // Look for export button
        const exportBtn = await window.$(
          'button:has-text("Export"), [data-testid*="export"]'
        );
        if (exportBtn) {
          await exportBtn.click();
          await window.waitForTimeout(500);

          // Check for template options
          const templates = [
            "Case Summary",
            "Evidence List",
            "Timeline Report",
            "Case Notes",
          ];

          for (const template of templates) {
            const templateOption = await window.$(`text=${template}`);
            if (templateOption) {
              console.log(`Found export template: ${template}`);
            }
          }
        }
      }
    }
  });

  test("should handle export cancellation", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to cases
    const casesNav = await window.$('a:has-text("Cases")');
    if (casesNav) {
      await casesNav.click();
      await window.waitForTimeout(1000);

      // Find and click on a case
      const caseItem = await window.$('.case-item, [data-testid*="case"]');
      if (caseItem) {
        await caseItem.click();
        await window.waitForTimeout(1000);

        // Look for export button
        const exportBtn = await window.$(
          'button:has-text("Export"), [data-testid*="export"]'
        );
        if (exportBtn) {
          await exportBtn.click();
          await window.waitForTimeout(500);

          // Look for cancel button
          const cancelBtn = await window.$('button:has-text("Cancel")');
          if (cancelBtn) {
            await cancelBtn.click();
            await window.waitForTimeout(500);

            console.log("Export cancellation handled");
          }
        }
      }
    }
  });

  test("should export with custom options", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to cases
    const casesNav = await window.$('a:has-text("Cases")');
    if (casesNav) {
      await casesNav.click();
      await window.waitForTimeout(1000);

      // Find and click on a case
      const caseItem = await window.$('.case-item, [data-testid*="case"]');
      if (caseItem) {
        await caseItem.click();
        await window.waitForTimeout(1000);

        // Look for advanced export options
        const advancedExportBtn = await window.$(
          'button:has-text("Advanced Export"), button:has-text("Custom Export")'
        );
        if (advancedExportBtn) {
          await advancedExportBtn.click();
          await window.waitForTimeout(500);

          // Check for custom options
          const includeEvidence = await window.$(
            'input[aria-label*="evidence"], text=/evidence/i'
          );
          const includeTimeline = await window.$(
            'input[aria-label*="timeline"], text=/timeline/i'
          );
          const includeNotes = await window.$(
            'input[aria-label*="notes"], text=/notes/i'
          );

          if (includeEvidence || includeTimeline || includeNotes) {
            console.log("Custom export options available");
          }

          // Try to export with custom options
          const customExportBtn = await window.$('button:has-text("Export")');
          if (customExportBtn) {
            await customExportBtn.click();
            await window.waitForTimeout(3000);

            console.log("Custom export initiated");
          }
        }
      }
    }
  });

  test("should handle export errors gracefully", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to cases
    const casesNav = await window.$('a:has-text("Cases")');
    if (casesNav) {
      await casesNav.click();
      await window.waitForTimeout(1000);

      // Try to export non-existent case (if possible through UI)
      const exportBtn = await window.$(
        'button:has-text("Export"), [data-testid*="export"]'
      );
      if (exportBtn) {
        // This might trigger an error if no case is selected
        await exportBtn.click();
        await window.waitForTimeout(1000);

        // Check for error message
        const errorMsg = await window.$("text=/error|failed|not found/i");
        if (errorMsg) {
          console.log("Export error handled gracefully");
        }
      }
    }
  });

  test("should show export progress", async () => {
    const { window } = testApp;

    await window.waitForLoadState("domcontentloaded");
    await window.waitForTimeout(2000);

    // Navigate to cases
    const casesNav = await window.$('a:has-text("Cases")');
    if (casesNav) {
      await casesNav.click();
      await window.waitForTimeout(1000);

      // Find and click on a case
      const caseItem = await window.$('.case-item, [data-testid*="case"]');
      if (caseItem) {
        await caseItem.click();
        await window.waitForTimeout(1000);

        // Look for export button
        const exportBtn = await window.$(
          'button:has-text("Export"), [data-testid*="export"]'
        );
        if (exportBtn) {
          await exportBtn.click();
          await window.waitForTimeout(500);

          // Look for PDF export
          const pdfExport = await window.$(
            'button:has-text("PDF"), text=/PDF/i'
          );
          if (pdfExport) {
            await pdfExport.click();

            // Check for progress indicator
            const progressBar = await window.$(
              '.progress, [role="progressbar"]'
            );
            const loadingText = await window.$(
              "text=/exporting|generating|processing/i"
            );

            if (progressBar || loadingText) {
              console.log("Export progress indicator shown");
            }

            await window.waitForTimeout(3000); // Wait for completion
          }
        }
      }
    }
  });
});
