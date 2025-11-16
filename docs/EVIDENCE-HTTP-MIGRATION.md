# Evidence HTTP Migration Guide

**Status:** ✅ Complete
**Date:** 2025-11-13
**Migration:** Electron IPC → FastAPI HTTP REST API

---

## Overview

This document describes the complete migration of Justice Companion's evidence management system from Electron IPC to HTTP REST API. All evidence operations now use FastAPI backend endpoints with comprehensive file operations, document parsing, OCR, and citation extraction.

## Table of Contents

1. [Architecture Changes](#architecture-changes)
2. [API Endpoints](#api-endpoints)
3. [New Components](#new-components)
4. [File Upload Architecture](#file-upload-architecture)
5. [Document Parsing](#document-parsing)
6. [OCR Integration](#ocr-integration)
7. [Citation Extraction](#citation-extraction)
8. [Migration Checklist](#migration-checklist)
9. [Testing Procedures](#testing-procedures)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Changes

### Before (Electron IPC)

```typescript
// Old IPC-based approach
window.justiceAPI.createEvidence(sessionId, { title, caseId, filePath });
window.justiceAPI.uploadEvidenceFile(sessionId, evidenceId, file);
window.justiceAPI.downloadEvidenceFile(sessionId, evidenceId);
```

### After (HTTP REST API)

```typescript
// New HTTP-based approach
import { evidenceApi } from "./lib/evidenceApiClient.ts";

// Create and upload in one operation
const evidence = await evidenceApi.createAndUpload(
  caseId,
  file,
  { title: "Contract.pdf" },
  (progress) => console.log(`Upload: ${progress}%`)
);

// Download
await evidenceApi.download(evidenceId, "Contract.pdf");

// Parse document
const parsed = await evidenceApi.parse(evidenceId);

// Extract citations
const citations = await evidenceApi.extractCitations(evidenceId);

// Run OCR
const ocrResult = await evidenceApi.runOCR(evidenceId, "eng");
```

---

## API Endpoints

### Base URL

```
http://127.0.0.1:8000
```

### Evidence CRUD

#### List Evidence

```http
GET /cases/{caseId}/evidence?type=document&limit=50&offset=0
Authorization: X-Session-Id: {sessionId}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "caseId": 5,
        "title": "Employment Contract",
        "filePath": "uploads/evidence/1.pdf",
        "content": null,
        "evidenceType": "document",
        "obtainedDate": "2024-12-15",
        "createdAt": "2025-01-15T10:00:00Z",
        "updatedAt": "2025-01-15T10:05:00Z"
      }
    ],
    "total": 42,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

#### Get Single Evidence

```http
GET /evidence/{evidenceId}
Authorization: X-Session-Id: {sessionId}
```

#### Create Evidence

```http
POST /evidence
Authorization: X-Session-Id: {sessionId}
Content-Type: application/json

{
  "caseId": 5,
  "title": "Employment Contract",
  "evidenceType": "document",
  "obtainedDate": "2024-12-15"
}
```

#### Update Evidence

```http
PUT /evidence/{evidenceId}
Authorization: X-Session-Id: {sessionId}
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Additional notes"
}
```

#### Delete Evidence

```http
DELETE /evidence/{evidenceId}
Authorization: X-Session-Id: {sessionId}
```

### File Operations

#### Upload File

```http
POST /evidence/{evidenceId}/upload
Authorization: X-Session-Id: {sessionId}
Content-Type: multipart/form-data

file: <binary file data>
```

**Features:**
- Progress tracking via XMLHttpRequest
- File size validation (max 50MB for documents)
- MIME type validation
- Automatic thumbnail generation for images

#### Download File

```http
GET /evidence/{evidenceId}/download
Authorization: X-Session-Id: {sessionId}
```

**Response:** Binary file data with correct Content-Type header

#### Preview File

```http
GET /evidence/{evidenceId}/preview
Authorization: X-Session-Id: {sessionId}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "previewUrl": "data:image/jpeg;base64,...",
    "mimeType": "image/jpeg"
  }
}
```

### Document Parsing

#### Parse Document

```http
POST /evidence/{evidenceId}/parse
Authorization: X-Session-Id: {sessionId}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "text": "Extracted document text...",
    "pages": 5,
    "metadata": {
      "author": "John Doe",
      "creationDate": "2024-01-15T10:00:00Z",
      "modificationDate": "2024-12-20T15:30:00Z",
      "pageCount": 5,
      "wordCount": 1250
    }
  }
}
```

**Supported Formats:**
- PDF (via pypdf)
- DOCX (via python-docx)
- TXT (plain text)

### Citation Extraction

#### Extract Citations

```http
POST /evidence/{evidenceId}/extract-citations
Authorization: X-Session-Id: {sessionId}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "citations": [
      {
        "text": "Smith v. Jones [2020] UKSC 15",
        "type": "case",
        "startIndex": 450,
        "endIndex": 480,
        "context": "...as held in Smith v. Jones [2020] UKSC 15..."
      },
      {
        "text": "Employment Rights Act 1996, s 98",
        "type": "statute",
        "startIndex": 1250,
        "endIndex": 1282,
        "context": "...under Employment Rights Act 1996, s 98..."
      }
    ],
    "count": 2
  }
}
```

**Features:**
- UK case law citations
- Statute citations
- Regulation citations
- Citation context (surrounding text)

### OCR Operations

#### Run OCR

```http
POST /evidence/{evidenceId}/ocr
Authorization: X-Session-Id: {sessionId}
Content-Type: application/json

{
  "language": "eng"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "text": "Extracted text from scanned document...",
    "confidence": 92.5,
    "language": "eng",
    "processingTime": 3.45
  }
}
```

**Supported Languages:**
- English (eng)
- French (fra)
- German (deu)
- Spanish (spa)
- Italian (ita)
- Portuguese (por)
- Dutch (nld)
- Polish (pol)
- Russian (rus)
- Chinese Simplified (chi_sim)
- Chinese Traditional (chi_tra)
- Japanese (jpn)
- Korean (kor)
- Arabic (ara)
- Hindi (hin)

---

## New Components

### 1. EvidenceUpload Component

**Location:** `src/components/evidence/EvidenceUpload.tsx`

**Features:**
- Drag-and-drop file upload
- Multiple file selection
- File type validation
- File size validation (max 50MB)
- Upload progress tracking (per file)
- Preview thumbnails for images
- Cancel upload
- Retry failed uploads
- Real-time upload statistics

**Usage:**

```tsx
import { EvidenceUpload } from "@/components/evidence/EvidenceUpload";

<EvidenceUpload
  caseId={5}
  evidenceType="document"
  onUploadComplete={() => {
    console.log("Upload complete");
    refetchEvidence();
  }}
  onClose={() => setShowUpload(false)}
/>
```

**Validation:**
- File type: PDF, DOCX, TXT, JPG, PNG, MP4, MP3, etc.
- File size: Max 50MB for documents, 10MB for images, 100MB for videos
- Multiple files: Upload up to 10 files simultaneously

### 2. EvidenceViewer Component

**Location:** `src/components/evidence/EvidenceViewer.tsx`

**Features:**
- Universal file viewer (PDF, images, video, audio, text)
- Zoom controls (50%-200%)
- Download original file
- Print support
- Fullscreen mode
- PDF page navigation
- Image lightbox with zoom
- Video/audio HTML5 player

**Usage:**

```tsx
import { EvidenceViewer } from "@/components/evidence/EvidenceViewer";

<EvidenceViewer
  evidenceId={evidenceId}
  onClose={() => setShowViewer(false)}
/>
```

**Supported Formats:**
- **Documents:** PDF (iframe viewer), DOCX (preview), TXT
- **Images:** JPG, PNG, GIF, BMP, WEBP, SVG
- **Videos:** MP4, MOV, AVI, WEBM
- **Audio:** MP3, WAV, M4A, AAC, FLAC, OGG

### 3. DocumentParser Component

**Location:** `src/components/evidence/DocumentParser.tsx`

**Features:**
- Parse PDF, DOCX, TXT files
- Extract text with page structure
- Display metadata (author, dates, page count, word count)
- Search within extracted text
- Copy to clipboard
- Export extracted text to .txt file
- Highlight search matches

**Usage:**

```tsx
import { DocumentParser } from "@/components/evidence/DocumentParser";

<DocumentParser
  evidence={evidence}
  onClose={() => setShowParser(false)}
/>
```

**Extracted Metadata:**
- Author name
- Creation date
- Modification date
- Page count
- Word count
- Character count

### 4. CitationExtractor Component

**Location:** `src/components/evidence/CitationExtractor.tsx`

**Features:**
- Extract legal citations from documents
- Display citation type (case, statute, regulation)
- Show citation context (surrounding text)
- Filter by citation type
- Search citations
- Click to search in UK legal databases (legislation.gov.uk)
- Export citations to CSV

**Usage:**

```tsx
import { CitationExtractor } from "@/components/evidence/CitationExtractor";

<CitationExtractor
  evidence={evidence}
  onClose={() => setShowCitations(false)}
/>
```

**Citation Types:**
- **Case:** Smith v. Jones [2020] UKSC 15
- **Statute:** Employment Rights Act 1996, s 98
- **Regulation:** SI 2015/1589

### 5. OCRComponent

**Location:** `src/components/evidence/OCRComponent.tsx`

**Features:**
- Run OCR on scanned PDFs and images
- Language selection (15+ languages)
- Confidence score display
- Edit OCR results
- Save corrected text
- Copy to clipboard
- Export text to .txt file
- Processing time display

**Usage:**

```tsx
import { OCRComponent } from "@/components/evidence/OCRComponent";

<OCRComponent
  evidence={evidence}
  onSave={(text) => {
    console.log("Saving OCR text:", text);
    updateEvidence({ content: text });
  }}
  onClose={() => setShowOCR(false)}
/>
```

**Confidence Levels:**
- **Excellent:** ≥90% (green)
- **Good:** 70-89% (yellow)
- **Fair:** 50-69% (yellow)
- **Poor:** <50% (red)

---

## File Upload Architecture

### Upload Flow

```
1. User selects files (drag-and-drop or file picker)
   ↓
2. Client-side validation
   - File type validation
   - File size validation
   - MIME type check
   ↓
3. Create evidence record (POST /evidence)
   ↓
4. Upload file (POST /evidence/{id}/upload)
   - Progress tracking via XMLHttpRequest
   - Real-time progress updates
   ↓
5. Backend processing
   - Save file to disk (uploads/evidence/{userId}/{evidenceId}.ext)
   - Generate thumbnail for images
   - Calculate SHA-256 hash
   - Detect MIME type
   ↓
6. Update evidence metadata
   ↓
7. Return updated evidence record
```

### File Storage

**Local Storage:**
- Evidence files: `uploads/evidence/{userId}/{evidenceId}.{ext}`
- Thumbnails: `uploads/evidence/thumbnails/{evidenceId}_thumb.jpg`
- Permissions: 0o600 (read/write owner only)

**Metadata:**
- File hash (SHA-256) for integrity verification
- MIME type detected automatically
- File size tracked in database

**Security:**
- Absolute paths only (no path traversal)
- File uploads scanned for malware (future)
- Sensitive files encrypted at rest (future)

---

## Document Parsing

### Parsing Architecture

**PDF Parsing:**
- Backend library: `pypdf`
- Extracts text from all pages
- Preserves page structure
- Extracts metadata (author, creation date, modification date)

**DOCX Parsing:**
- Backend library: `python-docx`
- Extracts text from paragraphs
- Preserves formatting (bold, italic, lists)
- Extracts metadata

**Text Parsing:**
- Direct file read
- Character encoding detection (UTF-8, ISO-8859-1, etc.)

### Example Output

```typescript
const parsed = await evidenceApi.parse(evidenceId);

console.log(parsed);
// Output:
{
  text: "Full document text...",
  pages: 5,
  metadata: {
    author: "John Doe",
    creationDate: "2024-01-15T10:00:00Z",
    modificationDate: "2024-12-20T15:30:00Z",
    pageCount: 5,
    wordCount: 1250
  }
}
```

---

## OCR Integration

### OCR Architecture

**Backend:**
- **Engine:** Tesseract OCR 4.x
- **Python wrapper:** `pytesseract`
- **Supported languages:** 100+ languages
- **Processing:** Async with timeout (60s)

**Installation (Backend):**

```bash
# Ubuntu/Debian
sudo apt-get install tesseract-ocr tesseract-ocr-eng

# macOS
brew install tesseract

# Windows
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
```

**Language Data:**

```bash
# Download additional language packs
sudo apt-get install tesseract-ocr-fra tesseract-ocr-deu tesseract-ocr-spa
```

### OCR Workflow

```
1. User selects language and runs OCR
   ↓
2. Frontend sends POST /evidence/{id}/ocr
   ↓
3. Backend loads evidence file
   ↓
4. Tesseract processes image/PDF
   - Deskewing
   - Binarization
   - Character recognition
   ↓
5. Extract text and confidence score
   ↓
6. Return results to frontend
   ↓
7. User reviews and edits text
   ↓
8. Save corrected text (optional)
```

### Example Usage

```typescript
const result = await evidenceApi.runOCR(evidenceId, "eng");

console.log(result);
// Output:
{
  text: "Extracted text from scanned document...",
  confidence: 92.5,
  language: "eng",
  processingTime: 3.45
}
```

---

## Citation Extraction

### Citation Architecture

**Backend:**
- **Library:** `eyecite` (legal citation extraction)
- **Supported jurisdictions:** UK, US
- **Citation types:** Cases, statutes, regulations

**Citation Patterns:**
- **UK Cases:** Smith v. Jones [2020] UKSC 15
- **Statutes:** Employment Rights Act 1996, s 98
- **Regulations:** SI 2015/1589

### Example Output

```typescript
const citations = await evidenceApi.extractCitations(evidenceId);

console.log(citations);
// Output:
{
  citations: [
    {
      text: "Smith v. Jones [2020] UKSC 15",
      type: "case",
      startIndex: 450,
      endIndex: 480,
      context: "...as held in Smith v. Jones [2020] UKSC 15, the court ruled..."
    }
  ],
  count: 1
}
```

---

## Migration Checklist

### Backend (FastAPI)

- ✅ Implement evidence CRUD endpoints
- ✅ Implement file upload endpoint
- ✅ Implement file download endpoint
- ✅ Implement file preview endpoint
- ✅ Implement document parsing endpoint (pypdf, python-docx)
- ✅ Implement citation extraction endpoint (eyecite)
- ✅ Implement OCR endpoint (pytesseract)
- ✅ Add file size validation (max 50MB)
- ✅ Add MIME type validation
- ✅ Add session-based authentication
- ✅ Add error handling and logging
- ✅ Generate thumbnails for images
- ✅ Calculate SHA-256 hash for files

### Frontend

- ✅ Create `evidenceHelpers.ts` utility functions
- ✅ Create `evidenceApiClient.ts` HTTP client
- ✅ Create `EvidenceUpload` component
- ✅ Create `EvidenceViewer` component
- ✅ Create `DocumentParser` component
- ✅ Create `CitationExtractor` component
- ✅ Create `OCRComponent` component
- ✅ Update existing `EvidenceList` component (use HTTP API)
- ✅ Add progress tracking for uploads
- ✅ Add error handling and retry logic
- ✅ Add loading states and skeletons
- ✅ Write comprehensive documentation

### Testing

- ⬜ Test evidence CRUD operations
- ⬜ Test file upload (PDF, DOCX, images, video, audio)
- ⬜ Test file download
- ⬜ Test file preview
- ⬜ Test document parsing (PDF, DOCX, TXT)
- ⬜ Test citation extraction
- ⬜ Test OCR (multiple languages)
- ⬜ Test bulk upload (10 files)
- ⬜ Test file size validation (reject >50MB)
- ⬜ Test file type validation
- ⬜ Test error scenarios (network error, invalid file, etc.)

---

## Testing Procedures

### 1. Evidence CRUD Tests

```bash
# Start backend
cd backend
python -m uvicorn main:app --reload --port 8000

# Start frontend
npm run electron:dev
```

**Test Cases:**

1. **Create Evidence:**
   - Create evidence with title, type, case ID
   - Verify response contains evidence ID
   - Verify evidence appears in list

2. **Update Evidence:**
   - Update evidence title
   - Update evidence content
   - Verify changes saved

3. **Delete Evidence:**
   - Delete evidence
   - Verify evidence removed from list
   - Verify file deleted from disk (backend)

4. **List Evidence:**
   - List all evidence for case
   - Filter by type (document, photo, etc.)
   - Paginate results (limit, offset)

### 2. File Upload Tests

**Test Files:**

- `contract.pdf` (2MB, 10 pages)
- `photo.jpg` (1MB, 1920x1080)
- `video.mp4` (15MB, 30 seconds)
- `audio.mp3` (5MB, 3 minutes)
- `large_file.pdf` (60MB) - should fail

**Test Cases:**

1. **Single File Upload:**
   - Drag-and-drop single file
   - Verify progress tracking (0% → 100%)
   - Verify success notification
   - Verify file appears in evidence list

2. **Multiple File Upload:**
   - Select 5 files via file picker
   - Verify all files validated
   - Verify upload progress for each file
   - Verify all files uploaded successfully

3. **File Size Validation:**
   - Try to upload 60MB PDF
   - Verify error: "File size exceeds maximum allowed size of 50 MB"
   - Verify file not added to upload queue

4. **File Type Validation:**
   - Try to upload .exe file
   - Verify error: "Invalid file type for document"
   - Verify file not added to upload queue

5. **Cancel Upload:**
   - Start upload
   - Click cancel button
   - Verify upload aborted
   - Verify file not saved to disk

### 3. File Download Tests

**Test Cases:**

1. **Download PDF:**
   - Click download button
   - Verify browser download dialog appears
   - Verify downloaded file opens correctly
   - Verify filename correct

2. **Download Image:**
   - Download JPG file
   - Verify file integrity (hash match)

3. **Download Video:**
   - Download MP4 file
   - Verify file plays correctly

### 4. File Preview Tests

**Test Cases:**

1. **Preview PDF:**
   - Open evidence viewer
   - Verify PDF loads in iframe
   - Verify zoom controls work
   - Verify page navigation works

2. **Preview Image:**
   - Open evidence viewer
   - Verify image displays correctly
   - Verify zoom controls work
   - Verify fullscreen works

3. **Preview Video:**
   - Open evidence viewer
   - Verify video player loads
   - Verify playback controls work
   - Verify fullscreen works

4. **Preview Audio:**
   - Open evidence viewer
   - Verify audio player loads
   - Verify playback controls work

### 5. Document Parsing Tests

**Test Files:**

- `contract.pdf` (5 pages, metadata)
- `agreement.docx` (3 pages, metadata)
- `notes.txt` (plain text)

**Test Cases:**

1. **Parse PDF:**
   - Click "Parse Document" button
   - Verify loading indicator appears
   - Verify text extracted correctly
   - Verify metadata displayed (author, dates, page count)
   - Verify word count accurate

2. **Parse DOCX:**
   - Parse DOCX file
   - Verify text extracted
   - Verify formatting preserved (paragraphs)

3. **Search in Text:**
   - Enter search query: "employment"
   - Verify matches highlighted
   - Verify match count displayed

4. **Copy Text:**
   - Click "Copy" button
   - Verify text copied to clipboard
   - Verify "Copied" confirmation shown

5. **Export Text:**
   - Click "Export" button
   - Verify .txt file downloaded
   - Verify content matches extracted text

### 6. Citation Extraction Tests

**Test File:**

- `legal_brief.pdf` (10 pages with UK citations)

**Test Cases:**

1. **Extract Citations:**
   - Click "Extract Citations" button
   - Verify loading indicator appears
   - Verify citations extracted
   - Verify citation types labeled (case, statute, regulation)

2. **Filter by Type:**
   - Click "case" badge
   - Verify only case citations shown
   - Click "statute" badge
   - Verify only statute citations shown

3. **Search Citations:**
   - Enter search: "Employment"
   - Verify matching citations shown
   - Verify non-matching citations hidden

4. **Search Citation in Database:**
   - Click external link icon on citation
   - Verify new tab opens to legislation.gov.uk
   - Verify search query correct

5. **Export to CSV:**
   - Click "Export CSV" button
   - Verify CSV file downloaded
   - Open CSV in Excel
   - Verify columns: Type, Citation, Context, Position

### 7. OCR Tests

**Test Files:**

- `scanned_contract.pdf` (scanned PDF, English)
- `french_document.pdf` (scanned PDF, French)
- `low_quality_scan.jpg` (poor quality scan)

**Test Cases:**

1. **Run OCR (English):**
   - Select language: English
   - Click "Run OCR" button
   - Verify loading indicator appears (30-60s)
   - Verify progress bar animates
   - Verify text extracted
   - Verify confidence score displayed (e.g., 92.5%)
   - Verify processing time displayed

2. **Run OCR (French):**
   - Select language: French
   - Run OCR
   - Verify French text extracted correctly
   - Verify language: "fra"

3. **Edit OCR Results:**
   - Click "Edit" button
   - Modify extracted text (fix errors)
   - Click "Save Changes" button
   - Verify changes saved

4. **Copy OCR Text:**
   - Click "Copy" button
   - Verify text copied to clipboard

5. **Export OCR Text:**
   - Click "Export" button
   - Verify .txt file downloaded

6. **Low Confidence Warning:**
   - Run OCR on poor quality scan
   - Verify confidence < 70%
   - Verify warning badge shown: "Low confidence - Please review"

---

## Troubleshooting

### Issue: File Upload Fails

**Symptoms:**
- Upload progress bar stops at 0%
- Error: "Failed to upload file"

**Solutions:**

1. **Check file size:**
   - Max 50MB for documents
   - Max 10MB for images
   - Max 100MB for videos

2. **Check file type:**
   - Verify MIME type supported
   - Check `evidenceHelpers.ts` → `MIME_TYPE_MAP`

3. **Check backend logs:**
   ```bash
   # Backend console
   # Look for errors related to file upload
   ```

4. **Check network:**
   - Open DevTools → Network tab
   - Look for failed POST /evidence/{id}/upload request
   - Check response body for error details

### Issue: Document Parsing Fails

**Symptoms:**
- Error: "Failed to parse document"

**Solutions:**

1. **Check file format:**
   - Only PDF, DOCX, TXT supported
   - Verify file not corrupted

2. **Check backend dependencies:**
   ```bash
   pip show pypdf python-docx
   # Verify installed
   ```

3. **Check PDF encryption:**
   - Parsing fails for encrypted PDFs
   - Remove password protection

4. **Check backend logs:**
   ```bash
   # Look for pypdf errors
   ```

### Issue: OCR Fails

**Symptoms:**
- Error: "Failed to run OCR"
- Timeout after 60 seconds

**Solutions:**

1. **Check Tesseract installation:**
   ```bash
   tesseract --version
   # Should show: tesseract 4.x.x
   ```

2. **Check language data:**
   ```bash
   tesseract --list-langs
   # Should show: eng, fra, deu, etc.
   ```

3. **Check file format:**
   - OCR works best on scanned PDFs and images
   - Use high-resolution scans (300+ DPI)

4. **Check backend timeout:**
   - Large files may exceed 60s timeout
   - Increase timeout in backend configuration

5. **Check image quality:**
   - Low quality scans produce poor results
   - Confidence score < 50% indicates quality issues

### Issue: Citation Extraction Returns No Results

**Symptoms:**
- Citations extracted: 0

**Solutions:**

1. **Check document content:**
   - Verify document contains UK legal citations
   - Supported formats: Smith v. Jones [2020] UKSC 15

2. **Check backend dependency:**
   ```bash
   pip show eyecite
   # Verify installed
   ```

3. **Check citation patterns:**
   - eyecite optimized for UK/US citations
   - Other jurisdictions may not be recognized

### Issue: Preview Not Working

**Symptoms:**
- Preview shows "Preview not available for this file type"

**Solutions:**

1. **Check MIME type:**
   - Only specific MIME types supported
   - PDF: application/pdf
   - Images: image/*
   - Video: video/*
   - Audio: audio/*

2. **Check file encoding:**
   - Text files must be UTF-8 or ISO-8859-1

3. **Check browser support:**
   - Some video/audio codecs not supported in all browsers
   - Use standard formats (MP4, MP3)

---

## API Client Usage Examples

### Example 1: Create and Upload Evidence

```typescript
import { evidenceApi } from "@/lib/evidenceApiClient";

async function uploadEvidence(caseId: number, file: File) {
  try {
    // Create and upload in one operation
    const evidence = await evidenceApi.createAndUpload(
      caseId,
      file,
      {
        title: file.name,
        obtainedDate: new Date().toISOString().split("T")[0],
      },
      (progress) => {
        console.log(`Upload progress: ${progress}%`);
        setUploadProgress(progress);
      }
    );

    console.log("Evidence uploaded:", evidence);
    return evidence;
  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
}
```

### Example 2: Parse Document and Extract Citations

```typescript
async function analyzeDocument(evidenceId: number) {
  try {
    // Parse document
    const parsed = await evidenceApi.parse(evidenceId);
    console.log("Extracted text:", parsed.text);
    console.log("Page count:", parsed.pages);
    console.log("Author:", parsed.metadata.author);

    // Extract citations
    const citations = await evidenceApi.extractCitations(evidenceId);
    console.log("Found citations:", citations.count);
    citations.citations.forEach((citation) => {
      console.log(`- ${citation.text} (${citation.type})`);
    });

    return { parsed, citations };
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
}
```

### Example 3: Run OCR on Scanned Document

```typescript
async function performOCR(evidenceId: number, language: string = "eng") {
  try {
    // Run OCR
    const result = await evidenceApi.runOCR(evidenceId, language);

    if (result.confidence < 70) {
      console.warn("Low confidence OCR result:", result.confidence);
      // Prompt user to review
    }

    console.log("OCR text:", result.text);
    console.log("Confidence:", result.confidence);
    console.log("Processing time:", result.processingTime);

    return result;
  } catch (error) {
    console.error("OCR failed:", error);
    throw error;
  }
}
```

### Example 4: Bulk Upload

```typescript
async function bulkUpload(caseId: number, files: File[]) {
  try {
    const evidence = await evidenceApi.bulkUpload(
      caseId,
      files,
      (fileIndex, progress) => {
        console.log(`File ${fileIndex + 1}: ${progress}%`);
        setFileProgress(fileIndex, progress);
      }
    );

    console.log(`Uploaded ${evidence.length} files successfully`);
    return evidence;
  } catch (error) {
    console.error("Bulk upload failed:", error);
    throw error;
  }
}
```

---

## Summary

The evidence HTTP migration is complete with the following achievements:

### ✅ Completed

1. **API Client:** Comprehensive HTTP REST client with evidence operations
2. **File Operations:** Upload, download, preview with progress tracking
3. **Document Parsing:** PDF, DOCX, TXT text extraction with metadata
4. **Citation Extraction:** UK legal citation extraction with context
5. **OCR Integration:** Multi-language OCR with confidence scores
6. **Components:** 5 new React components for evidence management
7. **Documentation:** Complete migration guide with examples
8. **Error Handling:** Comprehensive error handling and retry logic
9. **Validation:** File type and size validation
10. **UI/UX:** Modern, responsive design with loading states

### 📊 Statistics

- **Files Created:** 8
- **Components:** 5 (EvidenceUpload, EvidenceViewer, DocumentParser, CitationExtractor, OCRComponent)
- **Utilities:** 2 (evidenceHelpers.ts, evidenceApiClient.ts)
- **API Endpoints:** 10+
- **Supported File Types:** 20+
- **Languages (OCR):** 15+
- **Lines of Code:** ~2,500

### 🎯 Next Steps

1. Run comprehensive testing (see Testing Procedures)
2. Deploy backend with Tesseract installed
3. Monitor upload performance and optimize
4. Add file compression for large uploads
5. Implement malware scanning for uploads
6. Add encryption for sensitive files
7. Optimize OCR processing time
8. Add more citation patterns (EU law, etc.)

---

**End of Document**
