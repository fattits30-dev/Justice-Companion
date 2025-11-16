// src/services/export/ExportService.test.ts
import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { ExportService } from "./ExportService.ts";
import type { IDatabase } from "../../interfaces/IDatabase.ts";
import type { ICaseRepository } from "../../interfaces/ICaseRepository.ts";
import type { IEvidenceRepository } from "../../interfaces/IEvidenceRepository.ts";
import type { IDeadlineRepository } from "../../interfaces/IDeadlineRepository.ts";
import type { IDocumentRepository } from "../../interfaces/IDocumentRepository.ts";
import type { INoteRepository } from "../../interfaces/INoteRepository.ts";
import type { IEncryptionService } from "../../interfaces/IEncryptionService.ts";
import type { IAuditLogger } from "../../interfaces/IAuditLogger.ts";
import type { IUserRepository } from "../../interfaces/IUserRepository.ts";
import type { Case } from "../../domains/cases/entities/Case.ts";
import type { Evidence } from "../../domains/evidence/entities/Evidence.ts";
import type { Deadline } from "../../domains/timeline/entities/Deadline.ts";
import type { Note } from "../../models/Note.ts";
import type { User } from "../../domains/auth/entities/User.ts";

// Mock electron
vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => "/mock/path"),
  },
}));

// Mock fs
vi.mock("fs", async () => {
  const actual = (await vi.importActual("fs")) as any;
  return {
    ...actual,
    promises: {
      ...(actual.promises || {}),
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock the generators
vi.mock("./PDFGenerator.ts", () => ({
  PDFGenerator: vi.fn().mockImplementation(() => ({
    generateCaseSummary: vi
      .fn()
      .mockResolvedValue(Buffer.from("mock pdf content")),
    generateEvidenceList: vi
      .fn()
      .mockResolvedValue(Buffer.from("mock pdf content")),
    generateTimelineReport: vi
      .fn()
      .mockResolvedValue(Buffer.from("mock pdf content")),
    generateCaseNotes: vi
      .fn()
      .mockResolvedValue(Buffer.from("mock pdf content")),
  })),
}));

vi.mock("./DOCXGenerator.ts", () => ({
  DOCXGenerator: vi.fn().mockImplementation(() => ({
    generateCaseSummary: vi
      .fn()
      .mockResolvedValue(Buffer.from("mock docx content")),
    generateEvidenceList: vi
      .fn()
      .mockResolvedValue(Buffer.from("mock docx content")),
    generateTimelineReport: vi
      .fn()
      .mockResolvedValue(Buffer.from("mock docx content")),
    generateCaseNotes: vi
      .fn()
      .mockResolvedValue(Buffer.from("mock docx content")),
  })),
}));

vi.mock("./TemplateEngine.ts", () => ({
  TemplateEngine: vi.fn().mockImplementation(() => ({})),
}));

describe("ExportService", () => {
  let service: ExportService;
  let mockDb: IDatabase;
  let mockCaseRepo: ICaseRepository;
  let mockEvidenceRepo: IEvidenceRepository;
  let mockDeadlineRepo: IDeadlineRepository;
  let mockDocumentRepo: IDocumentRepository;
  let mockNoteRepo: INoteRepository;
  let mockUserRepo: IUserRepository;
  let mockEncryption: IEncryptionService;
  let mockAuditLogger: IAuditLogger;

  const mockCase: Case = {
    id: 1,
    userId: 1,
    title: "encrypted_title",
    caseType: "employment",
    status: "active",
    description: "encrypted_description",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
  };

  const mockUser: User = {
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

  const mockEvidence: Evidence[] = [
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

  const mockDeadlines: Deadline[] = [
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

  const mockNotes: Note[] = [
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
    mockDb = {} as IDatabase;

    mockCaseRepo = {
      findById: vi.fn(),
      findByUserId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as ICaseRepository;

    mockEvidenceRepo = {
      findByCaseId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as IEvidenceRepository;

    mockDeadlineRepo = {
      findByCaseId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as IDeadlineRepository;

    mockDocumentRepo = {
      findByCaseId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as IDocumentRepository;

    mockNoteRepo = {
      findByCaseId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as INoteRepository;

    mockUserRepo = {
      findById: vi.fn(),
      findByUsername: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    } as unknown as IUserRepository;

    mockEncryption = {
      encrypt: vi.fn((data: string) => `encrypted_${data}`),
      decrypt: vi.fn((data: string) => data.replace("encrypted_", "")),
      hash: vi.fn(),
      compare: vi.fn(),
      generateSalt: vi.fn(() => "mock-salt"),
    } as IEncryptionService;

    mockAuditLogger = {
      logAction: vi.fn(),
      logFailedAttempt: vi.fn(),
      getAuditLog: vi.fn(),
    } as IAuditLogger;

    // Create service instance
    service = new ExportService(
      mockDb,
      mockCaseRepo,
      mockEvidenceRepo,
      mockDeadlineRepo,
      mockDocumentRepo,
      mockNoteRepo,
      mockUserRepo,
      mockEncryption,
      mockAuditLogger,
    );
  });

  describe("exportCaseToPDF", () => {
    it("should export case to PDF successfully", async () => {
      // Setup
      (mockCaseRepo.findById as Mock).mockResolvedValue(mockCase);
      (mockUserRepo.findById as Mock).mockResolvedValue(mockUser);
      (mockEvidenceRepo.findByCaseId as Mock).mockResolvedValue(mockEvidence);
      (mockDeadlineRepo.findByCaseId as Mock).mockImplementation(
        () => mockDeadlines,
      );
      (mockNoteRepo.findByCaseId as Mock).mockResolvedValue(mockNotes);
      (mockDocumentRepo.findByCaseId as Mock).mockResolvedValue([]);

      // Execute
      const result = await service.exportCaseToPDF(1, 1);

      // Assert
      expect(result.success).toBe(true);
      expect(result.format).toBe("pdf");
      expect(result.template).toBe("case-summary");
      expect(result.filePath).toContain(".pdf");
      expect(mockAuditLogger.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          action: "EXPORT_CASE_PDF",
          resourceType: "CASE",
          resourceId: 1,
        }),
      );
    });

    it("should throw error if user does not have access to case", async () => {
      // Setup
      (mockCaseRepo.findById as Mock).mockResolvedValue({
        ...mockCase,
        userId: 2,
      });

      // Execute & Assert
      await expect(service.exportCaseToPDF(1, 1)).rejects.toThrow(
        "Permission denied",
      );
    });

    it("should throw error if case not found", async () => {
      // Setup
      (mockCaseRepo.findById as Mock).mockResolvedValue(null);

      // Execute & Assert
      await expect(service.exportCaseToPDF(1, 1)).rejects.toThrow(
        "Case not found",
      );
    });

    it("should decrypt all encrypted fields before export", async () => {
      // Setup
      (mockCaseRepo.findById as Mock).mockResolvedValue(mockCase);
      (mockUserRepo.findById as Mock).mockResolvedValue(mockUser);
      (mockEvidenceRepo.findByCaseId as Mock).mockResolvedValue(mockEvidence);
      (mockDeadlineRepo.findByCaseId as Mock).mockImplementation(
        () => mockDeadlines,
      );
      (mockNoteRepo.findByCaseId as Mock).mockResolvedValue(mockNotes);
      (mockDocumentRepo.findByCaseId as Mock).mockResolvedValue([]);

      // Execute
      await service.exportCaseToPDF(1, 1);

      // Assert - check that decrypt was called for all encrypted fields
      expect(mockEncryption.decrypt).toHaveBeenCalledWith("encrypted_title");
      expect(mockEncryption.decrypt).toHaveBeenCalledWith(
        "encrypted_description",
      );
      expect(mockEncryption.decrypt).toHaveBeenCalledWith(
        "encrypted_evidence_title",
      );
      expect(mockEncryption.decrypt).toHaveBeenCalledWith(
        "encrypted_deadline_title",
      );
      expect(mockEncryption.decrypt).toHaveBeenCalledWith(
        "encrypted_note_content",
      );
    });

    it("should export with custom template", async () => {
      // Setup
      (mockCaseRepo.findById as Mock).mockResolvedValue(mockCase);
      (mockUserRepo.findById as Mock).mockResolvedValue(mockUser);
      (mockEvidenceRepo.findByCaseId as Mock).mockResolvedValue(mockEvidence);
      (mockDeadlineRepo.findByCaseId as Mock).mockImplementation(() => []);
      (mockNoteRepo.findByCaseId as Mock).mockResolvedValue([]);
      (mockDocumentRepo.findByCaseId as Mock).mockResolvedValue([]);

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
      (mockCaseRepo.findById as Mock).mockResolvedValue(mockCase);
      (mockUserRepo.findById as Mock).mockResolvedValue(mockUser);
      (mockEvidenceRepo.findByCaseId as Mock).mockResolvedValue(mockEvidence);
      (mockDeadlineRepo.findByCaseId as Mock).mockImplementation(
        () => mockDeadlines,
      );
      (mockNoteRepo.findByCaseId as Mock).mockResolvedValue(mockNotes);
      (mockDocumentRepo.findByCaseId as Mock).mockResolvedValue([]);

      // Execute
      const result = await service.exportCaseToWord(1, 1);

      // Assert
      expect(result.success).toBe(true);
      expect(result.format).toBe("docx");
      expect(result.template).toBe("case-summary");
      expect(result.filePath).toContain(".docx");
      expect(mockAuditLogger.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          action: "EXPORT_CASE_DOCX",
          resourceType: "CASE",
          resourceId: 1,
        }),
      );
    });

    it("should handle timeline report template", async () => {
      // Setup
      (mockCaseRepo.findById as Mock).mockResolvedValue(mockCase);
      (mockUserRepo.findById as Mock).mockResolvedValue(mockUser);
      (mockDeadlineRepo.findByCaseId as Mock).mockImplementation(
        () => mockDeadlines,
      );
      (mockEvidenceRepo.findByCaseId as Mock).mockResolvedValue([]);
      (mockNoteRepo.findByCaseId as Mock).mockResolvedValue([]);
      (mockDocumentRepo.findByCaseId as Mock).mockResolvedValue([]);

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
      (mockCaseRepo.findById as Mock).mockResolvedValue(mockCase);
      (mockUserRepo.findById as Mock).mockResolvedValue(mockUser);
      (mockEvidenceRepo.findByCaseId as Mock).mockResolvedValue(mockEvidence);
      (mockDeadlineRepo.findByCaseId as Mock).mockImplementation(() => []);
      (mockNoteRepo.findByCaseId as Mock).mockResolvedValue([]);
      (mockDocumentRepo.findByCaseId as Mock).mockResolvedValue([]);

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
      (mockCaseRepo.findById as Mock).mockResolvedValue(mockCase);
      (mockUserRepo.findById as Mock).mockResolvedValue(mockUser);
      (mockDeadlineRepo.findByCaseId as Mock).mockImplementation(
        () => mockDeadlines,
      );
      (mockEvidenceRepo.findByCaseId as Mock).mockResolvedValue([]);
      (mockNoteRepo.findByCaseId as Mock).mockResolvedValue([]);
      (mockDocumentRepo.findByCaseId as Mock).mockResolvedValue([]);

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
      (mockCaseRepo.findById as Mock).mockResolvedValue(mockCase);
      (mockUserRepo.findById as Mock).mockResolvedValue(mockUser);
      (mockNoteRepo.findByCaseId as Mock).mockResolvedValue(mockNotes);
      (mockEvidenceRepo.findByCaseId as Mock).mockResolvedValue([]);
      (mockDeadlineRepo.findByCaseId as Mock).mockImplementation(() => []);
      (mockDocumentRepo.findByCaseId as Mock).mockResolvedValue([]);

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
      (mockCaseRepo.findById as Mock).mockResolvedValue(mockCase);
      (mockUserRepo.findById as Mock).mockResolvedValue(mockUser);
      (mockNoteRepo.findByCaseId as Mock).mockResolvedValue(mockNotes);
      (mockEvidenceRepo.findByCaseId as Mock).mockResolvedValue([]);
      (mockDeadlineRepo.findByCaseId as Mock).mockImplementation(() => []);
      (mockDocumentRepo.findByCaseId as Mock).mockResolvedValue([]);

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
      (mockCaseRepo.findById as Mock).mockResolvedValue(mockCase);
      (mockUserRepo.findById as Mock).mockResolvedValue(mockUser);
      (mockEvidenceRepo.findByCaseId as Mock).mockResolvedValue([]);
      (mockDeadlineRepo.findByCaseId as Mock).mockImplementation(() => []);
      (mockNoteRepo.findByCaseId as Mock).mockResolvedValue([]);
      (mockDocumentRepo.findByCaseId as Mock).mockResolvedValue([]);

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
      (mockCaseRepo.findById as Mock).mockResolvedValue(mockCase);
      (mockUserRepo.findById as Mock).mockResolvedValue(mockUser);
      (mockDeadlineRepo.findByCaseId as Mock).mockImplementation(() => []);
      (mockNoteRepo.findByCaseId as Mock).mockResolvedValue([]);
      (mockDocumentRepo.findByCaseId as Mock).mockResolvedValue([]);

      // Execute
      await service.exportCaseToPDF(1, 1, { includeEvidence: false });

      // Assert
      expect(mockEvidenceRepo.findByCaseId).not.toHaveBeenCalled();
    });

    it("should respect includeNotes option", async () => {
      // Setup
      (mockCaseRepo.findById as Mock).mockResolvedValue(mockCase);
      (mockUserRepo.findById as Mock).mockResolvedValue(mockUser);
      (mockEvidenceRepo.findByCaseId as Mock).mockResolvedValue([]);
      (mockDeadlineRepo.findByCaseId as Mock).mockImplementation(() => []);
      (mockDocumentRepo.findByCaseId as Mock).mockResolvedValue([]);

      // Execute
      await service.exportCaseToPDF(1, 1, { includeNotes: false });

      // Assert
      expect(mockNoteRepo.findByCaseId).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should handle invalid template", async () => {
      // Setup
      (mockCaseRepo.findById as Mock).mockResolvedValue(mockCase);
      (mockUserRepo.findById as Mock).mockResolvedValue(mockUser);
      (mockEvidenceRepo.findByCaseId as Mock).mockResolvedValue([]);
      (mockDeadlineRepo.findByCaseId as Mock).mockImplementation(() => []);
      (mockNoteRepo.findByCaseId as Mock).mockResolvedValue([]);
      (mockDocumentRepo.findByCaseId as Mock).mockResolvedValue([]);

      // Execute & Assert
      await expect(
        service.exportCaseToPDF(1, 1, { template: "invalid-template" as any }),
      ).rejects.toThrow("Invalid template");
    });
  });
});
