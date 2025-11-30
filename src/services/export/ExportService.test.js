// src/services/export/ExportService.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExportService } from "./ExportService.ts";
// Mock electron
vi.mock("electron", () => ({
    app: {
        getPath: vi.fn(() => "/mock/path"),
    },
}));
// Mock fs
vi.mock("fs", () => {
    const promises = {
        mkdir: vi.fn().mockResolvedValue(undefined),
        writeFile: vi.fn().mockResolvedValue(undefined),
    };
    return {
        promises,
        default: { promises },
    };
});
// Mock error logger to avoid touching disk
vi.mock("../../utils/error-logger.ts", () => ({
    errorLogger: {
        logError: vi.fn(),
    },
}));
// Mock the generators
vi.mock("./PDFGenerator.ts", () => {
    class MockPDFGenerator {
        generateCaseSummary = vi
            .fn()
            .mockResolvedValue(Buffer.from("mock pdf content"));
        generateEvidenceList = vi
            .fn()
            .mockResolvedValue(Buffer.from("mock pdf content"));
        generateTimelineReport = vi
            .fn()
            .mockResolvedValue(Buffer.from("mock pdf content"));
        generateCaseNotes = vi
            .fn()
            .mockResolvedValue(Buffer.from("mock pdf content"));
    }
    return {
        PDFGenerator: MockPDFGenerator,
    };
});
vi.mock("./DOCXGenerator.ts", () => {
    class MockDOCXGenerator {
        generateCaseSummary = vi
            .fn()
            .mockResolvedValue(Buffer.from("mock docx content"));
        generateEvidenceList = vi
            .fn()
            .mockResolvedValue(Buffer.from("mock docx content"));
        generateTimelineReport = vi
            .fn()
            .mockResolvedValue(Buffer.from("mock docx content"));
        generateCaseNotes = vi
            .fn()
            .mockResolvedValue(Buffer.from("mock docx content"));
    }
    return {
        DOCXGenerator: MockDOCXGenerator,
    };
});
vi.mock("./TemplateEngine.ts", () => ({
    TemplateEngine: vi.fn().mockImplementation(() => ({})),
}));
describe("ExportService", () => {
    let service;
    let mockDb;
    let mockCaseRepo;
    let mockEvidenceRepo;
    let mockDeadlineRepo;
    let mockDocumentRepo;
    let mockNoteRepo;
    let mockUserRepo;
    let mockEncryption;
    let mockAuditLogger;
    const mockCase = {
        id: 1,
        userId: 1,
        title: "encrypted_title",
        caseType: "employment",
        status: "active",
        description: "encrypted_description",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
    };
    const mockUser = {
        id: 1,
        username: "testuser",
        email: "test@example.com",
        passwordHash: "hash",
        passwordSalt: "salt",
        role: "user",
        isActive: true,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        lastLoginAt: null,
    };
    const mockEvidence = [
        {
            id: 1,
            caseId: 1,
            title: "encrypted_evidence_title",
            filePath: "encrypted_path",
            content: null,
            evidenceType: "document",
            obtainedDate: "2024-01-05",
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-01T00:00:00.000Z",
        },
    ];
    const mockDeadlines = [
        {
            id: 1,
            caseId: 1,
            userId: 1,
            title: "encrypted_deadline_title",
            description: "encrypted_deadline_desc",
            deadlineDate: "2024-02-01",
            priority: "high",
            status: "upcoming",
            completedAt: null,
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-01T00:00:00.000Z",
            deletedAt: null,
        },
    ];
    const mockNotes = [
        {
            id: 1,
            caseId: 1,
            userId: 1,
            title: "encrypted_note_title",
            content: "encrypted_note_content",
            isPinned: false,
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-01T00:00:00.000Z",
        },
    ];
    beforeEach(() => {
        // Create mocks
        mockDb = {};
        mockCaseRepo = {
            findById: vi.fn(),
            findByUserId: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };
        mockEvidenceRepo = {
            findByCaseId: vi.fn(),
            findById: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };
        mockDeadlineRepo = {
            findByCaseId: vi.fn(),
            findById: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };
        mockDocumentRepo = {
            findByCaseId: vi.fn(),
            findById: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };
        mockNoteRepo = {
            findByCaseId: vi.fn(),
            findById: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        };
        mockUserRepo = {
            findById: vi.fn(),
            findByUsername: vi.fn(),
            findByEmail: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        };
        mockEncryption = {
            encrypt: vi.fn((data) => `encrypted_${data}`),
            decrypt: vi.fn((data) => data.replace("encrypted_", "")),
            hash: vi.fn(),
            compare: vi.fn(),
            generateSalt: vi.fn(() => "mock-salt"),
        };
        mockAuditLogger = {
            logAction: vi.fn(),
            logFailedAttempt: vi.fn(),
            getAuditLog: vi.fn(),
        };
        // Create service instance
        service = new ExportService(mockDb, mockCaseRepo, mockEvidenceRepo, mockDeadlineRepo, mockDocumentRepo, mockNoteRepo, mockUserRepo, mockEncryption, mockAuditLogger);
    });
    describe("exportCaseToPDF", () => {
        it("should export case to PDF successfully", async () => {
            // Setup
            mockCaseRepo.findById.mockResolvedValue(mockCase);
            mockUserRepo.findById.mockResolvedValue(mockUser);
            mockEvidenceRepo.findByCaseId.mockResolvedValue(mockEvidence);
            mockDeadlineRepo.findByCaseId.mockImplementation(() => mockDeadlines);
            mockNoteRepo.findByCaseId.mockResolvedValue(mockNotes);
            mockDocumentRepo.findByCaseId.mockResolvedValue([]);
            // Execute
            const result = await service.exportCaseToPDF(1, 1);
            // Assert
            expect(result.success).toBe(true);
            expect(result.format).toBe("pdf");
            expect(result.template).toBe("case-summary");
            expect(result.filePath).toContain(".pdf");
            expect(mockAuditLogger.logAction).toHaveBeenCalledWith(expect.objectContaining({
                userId: 1,
                action: "EXPORT_CASE_PDF",
                resourceType: "CASE",
                resourceId: 1,
            }));
        });
        it("should throw error if user does not have access to case", async () => {
            // Setup
            mockCaseRepo.findById.mockResolvedValue({
                ...mockCase,
                userId: 2,
            });
            // Execute & Assert
            await expect(service.exportCaseToPDF(1, 1)).rejects.toThrow("Permission denied");
        });
        it("should throw error if case not found", async () => {
            // Setup
            mockCaseRepo.findById.mockResolvedValue(null);
            // Execute & Assert
            await expect(service.exportCaseToPDF(1, 1)).rejects.toThrow("Case not found");
        });
        it("should decrypt all encrypted fields before export", async () => {
            // Setup
            mockCaseRepo.findById.mockResolvedValue(mockCase);
            mockUserRepo.findById.mockResolvedValue(mockUser);
            mockEvidenceRepo.findByCaseId.mockResolvedValue(mockEvidence);
            mockDeadlineRepo.findByCaseId.mockImplementation(() => mockDeadlines);
            mockNoteRepo.findByCaseId.mockResolvedValue(mockNotes);
            mockDocumentRepo.findByCaseId.mockResolvedValue([]);
            // Execute
            await service.exportCaseToPDF(1, 1);
            // Assert - check that decrypt was called for all encrypted fields
            expect(mockEncryption.decrypt).toHaveBeenCalledWith("encrypted_title");
            expect(mockEncryption.decrypt).toHaveBeenCalledWith("encrypted_description");
            expect(mockEncryption.decrypt).toHaveBeenCalledWith("encrypted_evidence_title");
            expect(mockEncryption.decrypt).toHaveBeenCalledWith("encrypted_deadline_title");
            expect(mockEncryption.decrypt).toHaveBeenCalledWith("encrypted_note_content");
        });
        it("should export with custom template", async () => {
            // Setup
            mockCaseRepo.findById.mockResolvedValue(mockCase);
            mockUserRepo.findById.mockResolvedValue(mockUser);
            mockEvidenceRepo.findByCaseId.mockResolvedValue(mockEvidence);
            mockDeadlineRepo.findByCaseId.mockImplementation(() => []);
            mockNoteRepo.findByCaseId.mockResolvedValue([]);
            mockDocumentRepo.findByCaseId.mockResolvedValue([]);
            // Execute
            const result = await service.exportCaseToPDF(1, 1, {
                template: "evidence-list",
            });
            // Assert
            expect(result.success).toBe(true);
            expect(result.template).toBe("evidence-list");
        });
    });
    describe("exportCaseToWord", () => {
        it("should export case to Word successfully", async () => {
            // Setup
            mockCaseRepo.findById.mockResolvedValue(mockCase);
            mockUserRepo.findById.mockResolvedValue(mockUser);
            mockEvidenceRepo.findByCaseId.mockResolvedValue(mockEvidence);
            mockDeadlineRepo.findByCaseId.mockImplementation(() => mockDeadlines);
            mockNoteRepo.findByCaseId.mockResolvedValue(mockNotes);
            mockDocumentRepo.findByCaseId.mockResolvedValue([]);
            // Execute
            const result = await service.exportCaseToWord(1, 1);
            // Assert
            expect(result.success).toBe(true);
            expect(result.format).toBe("docx");
            expect(result.template).toBe("case-summary");
            expect(result.filePath).toContain(".docx");
            expect(mockAuditLogger.logAction).toHaveBeenCalledWith(expect.objectContaining({
                userId: 1,
                action: "EXPORT_CASE_DOCX",
                resourceType: "CASE",
                resourceId: 1,
            }));
        });
        it("should handle timeline report template", async () => {
            // Setup
            mockCaseRepo.findById.mockResolvedValue(mockCase);
            mockUserRepo.findById.mockResolvedValue(mockUser);
            mockDeadlineRepo.findByCaseId.mockImplementation(() => mockDeadlines);
            mockEvidenceRepo.findByCaseId.mockResolvedValue([]);
            mockNoteRepo.findByCaseId.mockResolvedValue([]);
            mockDocumentRepo.findByCaseId.mockResolvedValue([]);
            // Execute
            const result = await service.exportCaseToWord(1, 1, {
                template: "timeline-report",
            });
            // Assert
            expect(result.success).toBe(true);
            expect(result.template).toBe("timeline-report");
        });
    });
    describe("exportEvidenceListToPDF", () => {
        it("should export evidence list to PDF", async () => {
            // Setup
            mockCaseRepo.findById.mockResolvedValue(mockCase);
            mockUserRepo.findById.mockResolvedValue(mockUser);
            mockEvidenceRepo.findByCaseId.mockResolvedValue(mockEvidence);
            mockDeadlineRepo.findByCaseId.mockImplementation(() => []);
            mockNoteRepo.findByCaseId.mockResolvedValue([]);
            mockDocumentRepo.findByCaseId.mockResolvedValue([]);
            // Execute
            const result = await service.exportEvidenceListToPDF(1, 1);
            // Assert
            expect(result.success).toBe(true);
            expect(result.format).toBe("pdf");
            expect(result.template).toBe("evidence-list");
        });
    });
    describe("exportTimelineReportToPDF", () => {
        it("should export timeline report to PDF", async () => {
            // Setup
            mockCaseRepo.findById.mockResolvedValue(mockCase);
            mockUserRepo.findById.mockResolvedValue(mockUser);
            mockDeadlineRepo.findByCaseId.mockImplementation(() => mockDeadlines);
            mockEvidenceRepo.findByCaseId.mockResolvedValue([]);
            mockNoteRepo.findByCaseId.mockResolvedValue([]);
            mockDocumentRepo.findByCaseId.mockResolvedValue([]);
            // Execute
            const result = await service.exportTimelineReportToPDF(1, 1);
            // Assert
            expect(result.success).toBe(true);
            expect(result.format).toBe("pdf");
            expect(result.template).toBe("timeline-report");
        });
    });
    describe("exportCaseNotesToPDF", () => {
        it("should export case notes to PDF", async () => {
            // Setup
            mockCaseRepo.findById.mockResolvedValue(mockCase);
            mockUserRepo.findById.mockResolvedValue(mockUser);
            mockNoteRepo.findByCaseId.mockResolvedValue(mockNotes);
            mockEvidenceRepo.findByCaseId.mockResolvedValue([]);
            mockDeadlineRepo.findByCaseId.mockImplementation(() => []);
            mockDocumentRepo.findByCaseId.mockResolvedValue([]);
            // Execute
            const result = await service.exportCaseNotesToPDF(1, 1);
            // Assert
            expect(result.success).toBe(true);
            expect(result.format).toBe("pdf");
            expect(result.template).toBe("case-notes");
        });
    });
    describe("exportCaseNotesToWord", () => {
        it("should export case notes to Word", async () => {
            // Setup
            mockCaseRepo.findById.mockResolvedValue(mockCase);
            mockUserRepo.findById.mockResolvedValue(mockUser);
            mockNoteRepo.findByCaseId.mockResolvedValue(mockNotes);
            mockEvidenceRepo.findByCaseId.mockResolvedValue([]);
            mockDeadlineRepo.findByCaseId.mockImplementation(() => []);
            mockDocumentRepo.findByCaseId.mockResolvedValue([]);
            // Execute
            const result = await service.exportCaseNotesToWord(1, 1);
            // Assert
            expect(result.success).toBe(true);
            expect(result.format).toBe("docx");
            expect(result.template).toBe("case-notes");
        });
    });
    describe("custom export options", () => {
        it("should respect custom output path", async () => {
            // Setup
            mockCaseRepo.findById.mockResolvedValue(mockCase);
            mockUserRepo.findById.mockResolvedValue(mockUser);
            mockEvidenceRepo.findByCaseId.mockResolvedValue([]);
            mockDeadlineRepo.findByCaseId.mockImplementation(() => []);
            mockNoteRepo.findByCaseId.mockResolvedValue([]);
            mockDocumentRepo.findByCaseId.mockResolvedValue([]);
            const customPath = "/custom/path/export.pdf";
            // Execute
            const result = await service.exportCaseToPDF(1, 1, {
                outputPath: customPath,
            });
            // Assert
            expect(result.filePath).toBe(customPath);
        });
        it("should respect includeEvidence option", async () => {
            // Setup
            mockCaseRepo.findById.mockResolvedValue(mockCase);
            mockUserRepo.findById.mockResolvedValue(mockUser);
            mockDeadlineRepo.findByCaseId.mockImplementation(() => []);
            mockNoteRepo.findByCaseId.mockResolvedValue([]);
            mockDocumentRepo.findByCaseId.mockResolvedValue([]);
            // Execute
            await service.exportCaseToPDF(1, 1, { includeEvidence: false });
            // Assert
            expect(mockEvidenceRepo.findByCaseId).not.toHaveBeenCalled();
        });
        it("should respect includeNotes option", async () => {
            // Setup
            mockCaseRepo.findById.mockResolvedValue(mockCase);
            mockUserRepo.findById.mockResolvedValue(mockUser);
            mockEvidenceRepo.findByCaseId.mockResolvedValue([]);
            mockDeadlineRepo.findByCaseId.mockImplementation(() => []);
            mockDocumentRepo.findByCaseId.mockResolvedValue([]);
            // Execute
            await service.exportCaseToPDF(1, 1, { includeNotes: false });
            // Assert
            expect(mockNoteRepo.findByCaseId).not.toHaveBeenCalled();
        });
    });
    describe("error handling", () => {
        it("should handle invalid template", async () => {
            // Setup
            mockCaseRepo.findById.mockResolvedValue(mockCase);
            mockUserRepo.findById.mockResolvedValue(mockUser);
            mockEvidenceRepo.findByCaseId.mockResolvedValue([]);
            mockDeadlineRepo.findByCaseId.mockImplementation(() => []);
            mockNoteRepo.findByCaseId.mockResolvedValue([]);
            mockDocumentRepo.findByCaseId.mockResolvedValue([]);
            // Execute & Assert
            await expect(service.exportCaseToPDF(1, 1, { template: "invalid-template" })).rejects.toThrow("Invalid template");
        });
    });
});
