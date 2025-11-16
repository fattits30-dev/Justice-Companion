/**
 * AI Process Flowchart Component
 * Visual representation of how the AI processes uploaded documents and evidence
 */

import { Card } from "../ui/Card.tsx";
import {
  Upload,
  FileSearch,
  Brain,
  CheckCircle,
  AlertTriangle,
  ArrowDown,
  FileText,
  Image as ImageIcon,
  Video,
  Sparkles,
} from "lucide-react";

export function AIProcessFlowchart() {
  return (
    <Card variant="glass" className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-primary-400" />
            <h3 className="text-xl font-bold text-white">
              AI Document Processing Pipeline
            </h3>
          </div>
          <p className="text-sm text-white/80">
            How your evidence is analyzed and integrated into your case
          </p>
        </div>

        {/* Flowchart Steps */}
        <div className="space-y-4">
          {/* Step 1: Upload */}
          <div className="relative">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 bg-blue-500/20 border border-blue-500/50 rounded-lg flex items-center justify-center">
                <Upload className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white mb-1">
                  1. Document Upload
                </h4>
                <p className="text-sm text-white/80">
                  Upload PDF, Word docs, images, or videos. Files are encrypted
                  and stored locally.
                </p>
                <div className="flex gap-2 mt-2">
                  <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Documents
                  </span>
                  <span className="px-2 py-1 bg-pink-500/10 border border-pink-500/30 rounded text-xs text-pink-300 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Images
                  </span>
                  <span className="px-2 py-1 bg-purple-500/10 border border-purple-500/30 rounded text-xs text-purple-300 flex items-center gap-1">
                    <Video className="w-3 h-3" /> Videos
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-center my-2">
              <ArrowDown className="w-5 h-5 text-primary-400" />
            </div>
          </div>

          {/* Step 2: File Analysis */}
          <div className="relative">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 bg-cyan-500/20 border border-cyan-500/50 rounded-lg flex items-center justify-center">
                <FileSearch className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white mb-1">
                  2. Content Extraction
                </h4>
                <p className="text-sm text-white/80 mb-2">
                  AI extracts text, metadata, and key information from your
                  files.
                </p>
                <ul className="text-xs text-white/70 space-y-1 ml-4 list-disc">
                  <li>PDFs: Text extraction + OCR for scanned documents</li>
                  <li>Word docs: Full text + formatting preservation</li>
                  <li>Images: OCR + visual analysis for key details</li>
                  <li>Videos: Metadata + thumbnail extraction</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-center my-2">
              <ArrowDown className="w-5 h-5 text-primary-400" />
            </div>
          </div>

          {/* Step 3: AI Analysis */}
          <div className="relative">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white mb-1">
                  3. AI Legal Analysis
                </h4>
                <p className="text-sm text-white/80 mb-2">
                  Advanced AI models analyze content for legal relevance and
                  extract insights.
                </p>
                <ul className="text-xs text-white/70 space-y-1 ml-4 list-disc">
                  <li>
                    <strong>Citation Extraction:</strong> Identifies legal
                    citations, case law, and statutes
                  </li>
                  <li>
                    <strong>Key Dates:</strong> Extracts important dates and
                    deadlines
                  </li>
                  <li>
                    <strong>Entity Recognition:</strong> Identifies people,
                    organizations, and locations
                  </li>
                  <li>
                    <strong>Sentiment Analysis:</strong> Detects tone and
                    context
                  </li>
                  <li>
                    <strong>Relevance Scoring:</strong> Ranks evidence by
                    importance to your case
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex justify-center my-2">
              <ArrowDown className="w-5 h-5 text-primary-400" />
            </div>
          </div>

          {/* Step 4: Integration */}
          <div className="relative">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 bg-yellow-500/20 border border-yellow-500/50 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white mb-1">
                  4. Knowledge Integration
                </h4>
                <p className="text-sm text-white/80 mb-2">
                  Evidence is indexed and integrated into your case knowledge
                  base.
                </p>
                <ul className="text-xs text-white/70 space-y-1 ml-4 list-disc">
                  <li>Vector embeddings for semantic search</li>
                  <li>Cross-referencing with existing evidence</li>
                  <li>Timeline integration for chronological analysis</li>
                  <li>Tag generation for easy filtering</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-center my-2">
              <ArrowDown className="w-5 h-5 text-primary-400" />
            </div>
          </div>

          {/* Step 5: Ready for Chat */}
          <div className="relative">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white mb-1">
                  5. Ready for AI Chat
                </h4>
                <p className="text-sm text-white/80 mb-2">
                  Your evidence is now available for AI-powered legal research
                  and analysis.
                </p>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mt-2">
                  <p className="text-sm text-green-300 font-medium mb-1">
                    You can now ask:
                  </p>
                  <ul className="text-xs text-green-200/80 space-y-1 ml-4 list-disc">
                    <li>"Summarize the key evidence in my case"</li>
                    <li>"What legal precedents are relevant?"</li>
                    <li>"Create a timeline of events"</li>
                    <li>"Find contradictions in the evidence"</li>
                    <li>"Draft a response based on this evidence"</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-200 mb-1">
                Privacy & Security
              </h4>
              <ul className="text-xs text-amber-100/80 space-y-1">
                <li>
                  • All files are encrypted with AES-256-GCM before storage
                </li>
                <li>
                  • Processing happens locally - your data never leaves your
                  device
                </li>
                <li>• AI models run on your machine (no cloud uploads)</li>
                <li>• You control all data - delete anytime with zero trace</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-primary-900/20 border border-primary-500/30 rounded-lg p-4">
          <p className="text-xs text-primary-200/80 text-center">
            <strong>Legal Disclaimer:</strong> This AI provides information, not
            legal advice. Always consult a qualified solicitor for legal matters
            specific to your situation.
          </p>
        </div>
      </div>
    </Card>
  );
}
