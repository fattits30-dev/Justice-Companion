/**
 * PDF Export Utility
 *
 * Converts chat conversation to PDF document using html2pdf.js
 * Features:
 * - Professional formatting (A4, clean typography)
 * - Header with Justice Companion branding
 * - Legal disclaimer
 * - Full conversation with timestamps
 * - Source citations (when RAG is integrated)
 * - Footer with generation date
 * - XSS protection with DOMPurify sanitization
 */

import html2pdf from "html2pdf.js";
import { logger } from "@/utils/logger.ts";
import DOMPurify from "dompurify";
import type { ChatMessage } from "../types/ai.ts";

/**
 * Export chat conversation to PDF
 *
 * @param messages - Array of chat messages
 * @param sources - Optional array of legal sources cited
 */
export async function exportChatToPDF(
  messages: ChatMessage[],
  sources: string[] = [],
): Promise<void> {
  if (messages.length === 0) {
    alert("No messages to export");
    return;
  }

  // Build HTML content
  const html = buildPDFHTML(messages, sources);

  // PDF options
  const options = {
    margin: 10,
    filename: `justice-companion-${new Date().toISOString().split("T")[0]}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
  };

  try {
    await html2pdf().set(options).from(html).save();
  } catch (error) {
    logger.error("PDF export failed:", {
      service: "Export",
      error: error as Error,
    });

    alert("Failed to export PDF. Please try again.");
  }
}

/**
 * Build HTML structure for PDF
 */
function buildPDFHTML(messages: ChatMessage[], sources: string[]): string {
  const timestamp = new Date().toLocaleString("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #1f2937;
          line-height: 1.6;
          padding: 20px;
        }
        h1 {
          color: #2563eb;
          font-size: 24px;
          margin-bottom: 8px;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 8px;
        }
        h2 {
          color: #4b5563;
          font-size: 18px;
          margin-top: 24px;
          margin-bottom: 12px;
        }
        .subtitle {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 20px;
        }
        .disclaimer {
          background-color: #fef3c7;
          border: 2px solid #f59e0b;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 20px;
          font-size: 12px;
          color: #78350f;
        }
        .disclaimer strong {
          color: #92400e;
        }
        .message {
          margin-bottom: 16px;
          padding: 12px;
          border-radius: 8px;
        }
        .message-user {
          background-color: #dbeafe;
          margin-left: 40px;
          text-align: right;
        }
        .message-assistant {
          background-color: #f3f4f6;
          margin-right: 40px;
        }
        .message-role {
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .message-user .message-role {
          color: #1e40af;
        }
        .message-assistant .message-role {
          color: #4b5563;
        }
        .message-content {
          font-size: 14px;
          white-space: pre-wrap;
        }
        .message-timestamp {
          font-size: 11px;
          color: #9ca3af;
          margin-top: 6px;
        }
        .sources {
          margin-top: 24px;
          padding: 16px;
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
        .source-item {
          font-size: 12px;
          margin-bottom: 8px;
          color: #374151;
        }
        .footer {
          margin-top: 32px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 11px;
          color: #9ca3af;
        }
      </style>
    </head>
    <body>
      <h1>Justice Companion</h1>
      <p class="subtitle">UK Legal Information Assistant - Conversation Export</p>

      <div class="disclaimer">
        <strong>Legal Disclaimer:</strong> This document contains general legal information only.
        It is not legal advice and does not create a solicitor-client relationship.
        Always consult a qualified solicitor for advice specific to your situation.
      </div>

      <h2>Conversation</h2>
      ${messages
        .map(
          (msg) => `
        <div class="message message-${DOMPurify.sanitize(msg.role)}">
          <div class="message-role">${msg.role === "user" ? "You" : "Assistant"}</div>
          <div class="message-content">${DOMPurify.sanitize(msg.content)}</div>
          ${
            msg.timestamp
              ? `<div class="message-timestamp">${DOMPurify.sanitize(new Date(msg.timestamp).toLocaleString("en-GB"))}</div>`
              : ""
          }
        </div>
      `,
        )
        .join("")}

      ${
        sources.length > 0
          ? `
        <div class="sources">
          <h2>Legal Sources Cited</h2>
          ${sources
            .map(
              (source, index) => `
            <div class="source-item">${index + 1}. ${DOMPurify.sanitize(source)}</div>
          `,
            )
            .join("")}
        </div>
      `
          : ""
      }

      <div class="footer">
        Generated by Justice Companion on ${timestamp}
      </div>
    </body>
    </html>
  `;
}
