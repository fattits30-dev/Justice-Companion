/**
 * DocumentParserService - Extract text from various document formats
 *
 * Supported formats:
 * - PDF (.pdf)
 * - Word Documents (.docx)
 * - Plain Text (.txt)
 *
 * Future support: Images with OCR (.jpg, .png)
 */

import mammoth from "mammoth";
import * as fs from "fs";
import * as path from "path";

// Import pdf-parse using require since it doesn't have proper ES6 exports
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

export interface ParsedDocument {
  text: string;
  filename: string;
  fileType: string;
  pageCount?: number;
  wordCount: number;
  metadata?: {
    title?: string;
    author?: string;
    creationDate?: string;
    [key: string]: any;
  };
}

export class DocumentParserService {
  /**
   * Parse document from file path
   */
  async parseDocument(filePath: string): Promise<ParsedDocument> {
    const filename = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case ".pdf":
        return this.parsePDF(filePath, filename);
      case ".docx":
        return this.parseDOCX(filePath, filename);
      case ".txt":
        return this.parseTXT(filePath, filename);
      default:
        throw new Error(`Unsupported file format: ${ext}`);
    }
  }

  /**
   * Parse document from buffer
   */
  async parseDocumentBuffer(
    buffer: Buffer,
    filename: string,
  ): Promise<ParsedDocument> {
    const ext = path.extname(filename).toLowerCase();

    switch (ext) {
      case ".pdf":
        return this.parsePDFBuffer(buffer, filename);
      case ".docx":
        return this.parseDOCXBuffer(buffer, filename);
      case ".txt":
        return this.parseTXTBuffer(buffer, filename);
      default:
        throw new Error(`Unsupported file format: ${ext}`);
    }
  }

  /**
   * Parse PDF file
   */
  private async parsePDF(
    filePath: string,
    filename: string,
  ): Promise<ParsedDocument> {
    const dataBuffer = fs.readFileSync(filePath);
    return this.parsePDFBuffer(dataBuffer, filename);
  }

  /**
   * Parse PDF from buffer
   */
  private async parsePDFBuffer(
    buffer: Buffer,
    filename: string,
  ): Promise<ParsedDocument> {
    try {
      const data = await pdfParse(buffer);

      return {
        text: data.text,
        filename,
        fileType: "pdf",
        pageCount: data.numpages,
        wordCount: this.countWords(data.text),
        metadata: {
          title: data.info?.Title,
          author: data.info?.Author,
          creationDate: data.info?.CreationDate,
          ...data.info,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to parse PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Parse DOCX file
   */
  private async parseDOCX(
    filePath: string,
    filename: string,
  ): Promise<ParsedDocument> {
    const dataBuffer = fs.readFileSync(filePath);
    return this.parseDOCXBuffer(dataBuffer, filename);
  }

  /**
   * Parse DOCX from buffer
   */
  private async parseDOCXBuffer(
    buffer: Buffer,
    filename: string,
  ): Promise<ParsedDocument> {
    try {
      const result = await mammoth.extractRawText({ buffer });

      return {
        text: result.value,
        filename,
        fileType: "docx",
        wordCount: this.countWords(result.value),
        metadata: {
          messages: result.messages, // Parsing warnings/errors
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to parse DOCX: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Parse plain text file
   */
  private async parseTXT(
    filePath: string,
    filename: string,
  ): Promise<ParsedDocument> {
    const buffer = fs.readFileSync(filePath);
    return this.parseTXTBuffer(buffer, filename);
  }

  /**
   * Parse plain text from buffer
   */
  private async parseTXTBuffer(
    buffer: Buffer,
    filename: string,
  ): Promise<ParsedDocument> {
    try {
      const text = buffer.toString("utf-8");

      return {
        text,
        filename,
        fileType: "txt",
        wordCount: this.countWords(text),
      };
    } catch (error) {
      throw new Error(
        `Failed to parse TXT: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  /**
   * Extract summary from parsed text (first 500 words)
   */
  extractSummary(text: string, maxWords: number = 500): string {
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) {
      return text;
    }
    return words.slice(0, maxWords).join(" ") + "...";
  }

  /**
   * Validate file size (max 10MB for now)
   */
  validateFileSize(fileSize: number): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (fileSize > maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
      };
    }

    return { valid: true };
  }

  /**
   * Get supported file extensions
   */
  getSupportedExtensions(): string[] {
    return [".pdf", ".docx", ".txt"];
  }

  /**
   * Check if file type is supported
   */
  isSupported(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return this.getSupportedExtensions().includes(ext);
  }
}
