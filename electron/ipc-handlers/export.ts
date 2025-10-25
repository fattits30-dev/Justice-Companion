// electron/ipc-handlers/export.ts
import { ipcMain, dialog, app } from 'electron';
import { container } from '../../src/shared/infrastructure/di/container.ts';
import { TYPES } from '../../src/shared/infrastructure/di/types.ts';
import type { IExportService } from '../../src/services/export/ExportService.ts';
import type { ExportOptions } from '../../src/models/Export.ts';
import path from 'path';

export function setupExportHandlers(): void {
  // Export case to PDF
  ipcMain.handle('export:case-to-pdf', async (event, caseId: number, userId: number, options?: Partial<ExportOptions>) => {
    try {
      // If no output path provided, show save dialog
      if (!options?.outputPath) {
        const result = await dialog.showSaveDialog({
          title: 'Export Case to PDF',
          defaultPath: path.join(app.getPath('documents'), 'Justice-Companion', 'exports', `case-${caseId}.pdf`),
          filters: [
            { name: 'PDF Files', extensions: ['pdf'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (result.canceled || !result.filePath) {
          return { success: false, data: null, error: 'Export canceled by user' };
        }

        options = { ...options, outputPath: result.filePath };
      }

      const service = container.get<IExportService>(TYPES.ExportService);
      const result = await service.exportCaseToPDF(caseId, userId, options);
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to export case to PDF:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Export failed' };
    }
  });

  // Export case to Word
  ipcMain.handle('export:case-to-word', async (event, caseId: number, userId: number, options?: Partial<ExportOptions>) => {
    try {
      // If no output path provided, show save dialog
      if (!options?.outputPath) {
        const result = await dialog.showSaveDialog({
          title: 'Export Case to Word Document',
          defaultPath: path.join(app.getPath('documents'), 'Justice-Companion', 'exports', `case-${caseId}.docx`),
          filters: [
            { name: 'Word Documents', extensions: ['docx'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });

        if (result.canceled || !result.filePath) {
          return { success: false, data: null, error: 'Export canceled by user' };
        }

        options = { ...options, outputPath: result.filePath };
      }

      const service = container.get<IExportService>(TYPES.ExportService);
      const result = await service.exportCaseToWord(caseId, userId, options);
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to export case to Word:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Export failed' };
    }
  });

  // Export evidence list to PDF
  ipcMain.handle('export:evidence-list-to-pdf', async (event, caseId: number, userId: number) => {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Export Evidence List to PDF',
        defaultPath: path.join(app.getPath('documents'), 'Justice-Companion', 'exports', `evidence-list-${caseId}.pdf`),
        filters: [
          { name: 'PDF Files', extensions: ['pdf'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, data: null, error: 'Export canceled by user' };
      }

      const service = container.get<IExportService>(TYPES.ExportService);
      const exportResult = await service.exportEvidenceListToPDF(caseId, userId);
      return { success: true, data: exportResult };
    } catch (error) {
      console.error('Failed to export evidence list to PDF:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Export failed' };
    }
  });

  // Export timeline report to PDF
  ipcMain.handle('export:timeline-report-to-pdf', async (event, caseId: number, userId: number) => {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Export Timeline Report to PDF',
        defaultPath: path.join(app.getPath('documents'), 'Justice-Companion', 'exports', `timeline-report-${caseId}.pdf`),
        filters: [
          { name: 'PDF Files', extensions: ['pdf'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, data: null, error: 'Export canceled by user' };
      }

      const service = container.get<IExportService>(TYPES.ExportService);
      const exportResult = await service.exportTimelineReportToPDF(caseId, userId);
      return { success: true, data: exportResult };
    } catch (error) {
      console.error('Failed to export timeline report to PDF:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Export failed' };
    }
  });

  // Export case notes to PDF
  ipcMain.handle('export:case-notes-to-pdf', async (event, caseId: number, userId: number) => {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Export Case Notes to PDF',
        defaultPath: path.join(app.getPath('documents'), 'Justice-Companion', 'exports', `case-notes-${caseId}.pdf`),
        filters: [
          { name: 'PDF Files', extensions: ['pdf'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, data: null, error: 'Export canceled by user' };
      }

      const service = container.get<IExportService>(TYPES.ExportService);
      const exportResult = await service.exportCaseNotesToPDF(caseId, userId);
      return { success: true, data: exportResult };
    } catch (error) {
      console.error('Failed to export case notes to PDF:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Export failed' };
    }
  });

  // Export case notes to Word
  ipcMain.handle('export:case-notes-to-word', async (event, caseId: number, userId: number) => {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Export Case Notes to Word Document',
        defaultPath: path.join(app.getPath('documents'), 'Justice-Companion', 'exports', `case-notes-${caseId}.docx`),
        filters: [
          { name: 'Word Documents', extensions: ['docx'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, data: null, error: 'Export canceled by user' };
      }

      const service = container.get<IExportService>(TYPES.ExportService);
      const exportResult = await service.exportCaseNotesToWord(caseId, userId);
      return { success: true, data: exportResult };
    } catch (error) {
      console.error('Failed to export case notes to Word:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Export failed' };
    }
  });

  // Get available export templates
  ipcMain.handle('export:get-templates', async () => {
    try {
      return {
        success: true,
        data: [
          {
            id: 'case-summary',
            name: 'Case Summary',
            description: 'Complete case details with evidence, timeline, and notes',
            formats: ['pdf', 'docx'],
          },
          {
            id: 'evidence-list',
            name: 'Evidence List',
            description: 'Detailed inventory of all case evidence',
            formats: ['pdf', 'docx'],
          },
          {
            id: 'timeline-report',
            name: 'Timeline Report',
            description: 'Chronological timeline with deadlines and events',
            formats: ['pdf', 'docx'],
          },
          {
            id: 'case-notes',
            name: 'Case Notes',
            description: 'All notes and observations for the case',
            formats: ['pdf', 'docx'],
          },
        ],
      };
    } catch (error) {
      console.error('Failed to get export templates:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to get templates' };
    }
  });

  // Export with custom options
  ipcMain.handle('export:custom', async (event, caseId: number, userId: number, options: ExportOptions) => {
    try {
      const service = container.get<IExportService>(TYPES.ExportService);

      let result;
      if (options.format === 'pdf') {
        result = await service.exportCaseToPDF(caseId, userId, options);
      } else if (options.format === 'docx') {
        result = await service.exportCaseToWord(caseId, userId, options);
      } else {
        throw new Error(`Unsupported format: ${options.format}`);
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to export with custom options:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Export failed' };
    }
  });
}