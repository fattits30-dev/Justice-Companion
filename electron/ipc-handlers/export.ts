// electron/ipc-handlers/export.ts
import { ipcMain, dialog, app, type IpcMainInvokeEvent } from 'electron';
import { container } from '../../src/shared/infrastructure/di/container.ts';
import { TYPES } from '../../src/shared/infrastructure/di/types.ts';
import type { IExportService } from '../../src/services/export/ExportService.ts';
import type { ExportOptions } from '../../src/models/Export.ts';
import { withAuthorization } from '../utils/authorization-wrapper.ts';
import type { IPCResponse } from '../utils/ipc-response.ts';
import path from 'path';
import {
  CaseNotFoundError,
  FileOperationError,
  ValidationError,
  DatabaseError,
} from '../../src/errors/DomainErrors.ts';

export function setupExportHandlers(): void {
  // Export case to PDF
  ipcMain.handle(
    'export:case-to-pdf',
    async (
      _event: IpcMainInvokeEvent,
      caseId: number,
      sessionId: string,
      options?: Partial<ExportOptions>
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] export:case-to-pdf called by user:', userId, 'for case:', caseId);

          // If no output path provided, show save dialog
          if (!options?.outputPath) {
            const result = await dialog.showSaveDialog({
              title: 'Export Case to PDF',
              defaultPath: path.join(
                app.getPath('documents'),
                'Justice-Companion',
                'exports',
                `case-${caseId}.pdf`
              ),
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
          // Use validated userId from session, NOT from parameter!
          const result = await service.exportCaseToPDF(caseId, userId, options);
          return { success: true, data: result };
        } catch (error) {
          console.error('[IPC] Failed to export case to PDF:', error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes('not found') && message.includes('case')) {
              throw new CaseNotFoundError(`Case ${caseId} not found`);
            }

            if (message.includes('database') || message.includes('sqlite')) {
              throw new DatabaseError('export case to PDF', error.message);
            }

            if (message.includes('file') || message.includes('write') || message.includes('permission')) {
              throw new FileOperationError(`Failed to write PDF file: ${error.message}`);
            }
          }

          throw error;
        }
      });
    }
  );

  // Export case to Word
  ipcMain.handle(
    'export:case-to-word',
    async (
      _event: IpcMainInvokeEvent,
      caseId: number,
      sessionId: string,
      options?: Partial<ExportOptions>
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] export:case-to-word called by user:', userId, 'for case:', caseId);

          // If no output path provided, show save dialog
          if (!options?.outputPath) {
            const result = await dialog.showSaveDialog({
              title: 'Export Case to Word Document',
              defaultPath: path.join(
                app.getPath('documents'),
                'Justice-Companion',
                'exports',
                `case-${caseId}.docx`
              ),
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
          console.error('[IPC] Failed to export case to Word:', error);

          // Wrap generic errors in DomainErrors
          if (error instanceof Error) {
            const message = error.message.toLowerCase();

            if (message.includes('not found') && message.includes('case')) {
              throw new CaseNotFoundError(`Case ${caseId} not found`);
            }

            if (message.includes('database') || message.includes('sqlite')) {
              throw new DatabaseError('export case to Word', error.message);
            }

            if (message.includes('file') || message.includes('write') || message.includes('permission')) {
              throw new FileOperationError(`Failed to write Word file: ${error.message}`);
            }
          }

          throw error;
        }
      });
    }
  );

  // Export evidence list to PDF
  ipcMain.handle(
    'export:evidence-list-to-pdf',
    async (_event: IpcMainInvokeEvent, caseId: number, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] export:evidence-list-to-pdf called by user:', userId, 'for case:', caseId);

          const result = await dialog.showSaveDialog({
            title: 'Export Evidence List to PDF',
            defaultPath: path.join(
              app.getPath('documents'),
              'Justice-Companion',
              'exports',
              `evidence-list-${caseId}.pdf`
            ),
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
          console.error('[IPC] Failed to export evidence list to PDF:', error);

          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes('not found') && message.includes('case')) {
              throw new CaseNotFoundError(`Case ${caseId} not found`);
            }
            if (message.includes('database') || message.includes('sqlite')) {
              throw new DatabaseError('export evidence list', error.message);
            }
            if (message.includes('file') || message.includes('write')) {
              throw new FileOperationError(`Failed to write PDF: ${error.message}`);
            }
          }
          throw error;
        }
      });
    }
  );

  // Export timeline report to PDF
  ipcMain.handle(
    'export:timeline-report-to-pdf',
    async (_event: IpcMainInvokeEvent, caseId: number, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] export:timeline-report-to-pdf called by user:', userId, 'for case:', caseId);

          const result = await dialog.showSaveDialog({
            title: 'Export Timeline Report to PDF',
            defaultPath: path.join(
              app.getPath('documents'),
              'Justice-Companion',
              'exports',
              `timeline-report-${caseId}.pdf`
            ),
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
          console.error('[IPC] Failed to export timeline report to PDF:', error);

          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes('not found') && message.includes('case')) {
              throw new CaseNotFoundError(`Case ${caseId} not found`);
            }
            if (message.includes('database') || message.includes('sqlite')) {
              throw new DatabaseError('export timeline report', error.message);
            }
            if (message.includes('file') || message.includes('write')) {
              throw new FileOperationError(`Failed to write PDF: ${error.message}`);
            }
          }
          throw error;
        }
      });
    }
  );

  // Export case notes to PDF
  ipcMain.handle(
    'export:case-notes-to-pdf',
    async (_event: IpcMainInvokeEvent, caseId: number, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] export:case-notes-to-pdf called by user:', userId, 'for case:', caseId);

          const result = await dialog.showSaveDialog({
            title: 'Export Case Notes to PDF',
            defaultPath: path.join(
              app.getPath('documents'),
              'Justice-Companion',
              'exports',
              `case-notes-${caseId}.pdf`
            ),
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
          console.error('[IPC] Failed to export case notes to PDF:', error);

          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes('not found') && message.includes('case')) {
              throw new CaseNotFoundError(`Case ${caseId} not found`);
            }
            if (message.includes('database') || message.includes('sqlite')) {
              throw new DatabaseError('export case notes', error.message);
            }
            if (message.includes('file') || message.includes('write')) {
              throw new FileOperationError(`Failed to write PDF: ${error.message}`);
            }
          }
          throw error;
        }
      });
    }
  );

  // Export case notes to Word
  ipcMain.handle(
    'export:case-notes-to-word',
    async (_event: IpcMainInvokeEvent, caseId: number, sessionId: string): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] export:case-notes-to-word called by user:', userId, 'for case:', caseId);

          const result = await dialog.showSaveDialog({
            title: 'Export Case Notes to Word Document',
            defaultPath: path.join(
              app.getPath('documents'),
              'Justice-Companion',
              'exports',
              `case-notes-${caseId}.docx`
            ),
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
          console.error('[IPC] Failed to export case notes to Word:', error);

          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes('not found') && message.includes('case')) {
              throw new CaseNotFoundError(`Case ${caseId} not found`);
            }
            if (message.includes('database') || message.includes('sqlite')) {
              throw new DatabaseError('export case notes', error.message);
            }
            if (message.includes('file') || message.includes('write')) {
              throw new FileOperationError(`Failed to write Word file: ${error.message}`);
            }
          }
          throw error;
        }
      });
    }
  );

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

      if (error instanceof Error) {
        throw new DatabaseError('get export templates', error.message);
      }
      throw error;
    }
  });

  // Export with custom options
  ipcMain.handle(
    'export:custom',
    async (
      _event: IpcMainInvokeEvent,
      caseId: number,
      sessionId: string,
      options: ExportOptions
    ): Promise<IPCResponse> => {
      return withAuthorization(sessionId, async (userId) => {
        try {
          console.warn('[IPC] export:custom called by user:', userId, 'for case:', caseId, 'format:', options.format);

          const service = container.get<IExportService>(TYPES.ExportService);

          let result;
          if (options.format === 'pdf') {
            result = await service.exportCaseToPDF(caseId, userId, options);
          } else if (options.format === 'docx') {
            result = await service.exportCaseToWord(caseId, userId, options);
          } else {
            throw new ValidationError(`Unsupported format: ${options.format}`);
          }

          return { success: true, data: result };
        } catch (error) {
          console.error('[IPC] Failed to export with custom options:', error);

          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes('not found') && message.includes('case')) {
              throw new CaseNotFoundError(`Case ${caseId} not found`);
            }
            if (message.includes('database') || message.includes('sqlite')) {
              throw new DatabaseError('custom export', error.message);
            }
            if (message.includes('file') || message.includes('write')) {
              throw new FileOperationError(`Failed to write file: ${error.message}`);
            }
          }
          throw error;
        }
      });
    }
  );
}