# Open Source Legal Tools Research Report

**Research Date:** October 11, 2025
**Purpose:** Identify open-source legal tools on GitHub that could enhance Justice Companion
**Researcher:** Agent 4 - Open Source Legal Tools Researcher

---

## Executive Summary

This research identified 10 high-quality open-source legal technology repositories with practical applications for Justice Companion. The Free Law Project's suite of tools stands out as the most mature and well-maintained collection, offering citation extraction, document parsing, and court data scraping capabilities. Several modern AI-powered document analysis tools were also discovered, though most are in early stages of development.

**Key Findings:**

- **Best Overall:** Free Law Project's ecosystem (CourtListener, eyecite, juriscraper, doctor)
- **Most Immediately Useful:** eyecite (citation parser) and doctor (document converter)
- **Best for Document Assembly:** A2J DAT (document automation tool)
- **Emerging AI Tools:** Multiple RAG-based legal assistants with document analysis features

---

## Top 10 Repositories

### 1. CourtListener by Free Law Project

**Repository:** https://github.com/freelawproject/courtlistener
**Stars:** 562+ | **Language:** Python/Django | **License:** AGPL-3.0
**Last Updated:** October 2025 (Active)

#### Description

CourtListener is a comprehensive legal search engine and archive containing millions of court opinions, oral arguments, judges, judicial financial records, and federal filings. Started in 2009, it's one of the most mature open-source legal platforms.

#### Key Features for Justice Companion

- **Full-text search** across millions of legal documents
- **Citation extraction and linking** to referenced cases
- **Opinion database** with extensive metadata
- **REST API** for programmatic access to legal data
- **Advanced search capabilities** with filtering by date, court, judge
- **Oral argument audio** collection and transcription
- **PACER integration** for federal court documents

#### Tech Stack

- Django (Python web framework)
- PostgreSQL (database)
- Solr/Elasticsearch (search engine)
- Celery (task queue for background processing)
- Docker (containerization)

#### Code/Patterns We Could Adapt

```python
# Citation extraction and linking
from cl.search.models import Opinion
# Auto-link citations in legal documents
# Database schema for organizing cases, opinions, dockets

# Advanced search with faceted filtering
# API design patterns for legal data
# Document storage and retrieval system
```

#### Integration Difficulty

**Hard** - This is a large, complex Django application with many dependencies. However, we could use its API or extract specific components.

#### Priority for Implementation

**Medium** - While powerful, CourtListener is best used as an external API rather than integrated directly. We could connect to their public API for case law searches.

---

### 2. eyecite by Free Law Project

**Repository:** https://github.com/freelawproject/eyecite
**Stars:** 154+ | **Language:** Python | **License:** BSD-2-Clause
**Last Updated:** October 2025 (Active)

#### Description

eyecite is a specialized Python library for extracting legal citations from text. It can recognize full case citations, short form citations, statutory citations, law journal citations, supra references, and id. citations. Used by CourtListener and Harvard's Caselaw Access Project.

#### Key Features for Justice Companion

- **Extract citations** from unstructured legal text
- **Citation normalization** (standardizes format)
- **Citation resolution** (links related citations together)
- **Citation annotation** (add hyperlinks to extracted citations)
- **Multiple citation types:**
  - Full case: "Bush v. Gore, 531 U.S. 98, 99-100 (2000)"
  - Short case: "531 U.S., at 99"
  - Statutory: "Mass. Gen. Laws ch. 1, § 2"
  - Supra: "Bush, supra, at 100"
  - Id.: "Id., at 101"

#### Tech Stack

- Pure Python library
- Regex-based extraction using reporters-db
- Fast performance with pyahocorasick or hyperscan
- No database required

#### Code/Patterns We Could Adapt

```python
from eyecite import get_citations

text = """
In Smith v. Jones, 123 F.3d 456 (9th Cir. 2020),
the court held that... See also Id. at 460.
"""

citations = get_citations(text)
# Returns structured citation objects with metadata

# We could use this to:
# 1. Auto-detect citations in user-uploaded documents
# 2. Create hyperlinks to case law databases
# 3. Extract case references for timeline building
# 4. Validate citation formatting in user documents
```

#### Integration Difficulty

**Easy** - Standalone Python library with simple API. Could be integrated via Python subprocess or REST wrapper.

#### Priority for Implementation

**High** - Extremely useful for automatically identifying and linking case law references in user documents. Would enhance the document analysis features significantly.

---

### 3. juriscraper by Free Law Project

**Repository:** https://github.com/freelawproject/juriscraper
**Stars:** 289+ | **Language:** Python | **License:** BSD
**Last Updated:** October 2025 (Active)

#### Description

juriscraper is a scraper library that gathers judicial opinions, oral arguments, and PACER data from American courts. It can scrape all major federal appellate courts and all state courts of last resort.

#### Key Features for Justice Companion

- **Automated opinion scraping** from court websites
- **PACER integration** for federal court data
- **Oral argument audio** collection
- **Metadata extraction** (case name, docket number, date, judges)
- **Multi-jurisdiction support** (federal and state courts)
- **Extensible architecture** for adding new courts

#### Tech Stack

- Python with lxml for HTML parsing
- XPath-based scraping
- Selenium WebDriver for JavaScript-heavy sites
- Structured metadata output

#### Code/Patterns We Could Adapt

```python
from juriscraper.opinions.united_states.federal_appellate import ca9

# Scrape recent opinions from 9th Circuit
scraper = ca9.Site()
scraper.parse()

# Get structured data
for opinion in scraper:
    print(opinion['case_name'])
    print(opinion['download_url'])
    print(opinion['date_filed'])

# Use cases for Justice Companion:
# 1. Auto-fetch new opinions relevant to user's case
# 2. Monitor for updates in ongoing cases
# 3. Build a local cache of case law
# 4. Track precedent changes over time
```

#### Integration Difficulty

**Medium** - Requires managing scrapers and handling rate limiting. Could run as background jobs.

#### Priority for Implementation

**Low-Medium** - Useful for keeping case law updated, but may require significant infrastructure for scraping at scale. Better suited as a future enhancement.

---

### 4. doctor by Free Law Project

**Repository:** https://github.com/freelawproject/doctor
**Stars:** 29+ | **Language:** Python/Docker | **License:** BSD
**Last Updated:** October 2025 (Active)

#### Description

Doctor is a microservice for document conversion, extraction, and modification. It provides HTTP endpoints for text extraction, OCR, audio conversion, PDF manipulation, and more.

#### Key Features for Justice Companion

- **Text extraction** from PDF, DOC, DOCX, RTF, HTML, WPD
- **OCR support** via Tesseract for scanned documents
- **PDF page counting**
- **Bad redaction detection** (security feature!)
- **PDF thumbnail generation**
- **Audio conversion** (MP3, OGG)
- **Document type detection** (MIME type identification)
- **Image to PDF conversion**
- **Add text layer to scanned PDFs**

#### Tech Stack

- Django REST framework
- Gunicorn for HTTP serving
- ffmpeg (audio conversion)
- pdftotext, tesseract (OCR)
- ghostscript (PDF manipulation)
- wkhtmltopdf (HTML to PDF)
- Docker containerized

#### Code/Patterns We Could Adapt

```bash
# Extract text from uploaded document
curl 'http://doctor:5050/extract/doc/text/' \
  -X POST \
  -F "file=@legal-contract.pdf"

# Returns JSON:
{
  "content": "extracted text...",
  "page_count": 15,
  "extracted_by_ocr": false,
  "extension": "pdf"
}

# Use cases for Justice Companion:
# 1. Extract text from user-uploaded documents
# 2. OCR scanned court documents
# 3. Generate PDF thumbnails for document preview
# 4. Detect poorly redacted sensitive information
# 5. Convert various document formats to searchable PDFs
```

#### Integration Difficulty

**Easy** - Docker-based microservice with REST API. Can run alongside Justice Companion as a separate container.

#### Priority for Implementation

**High** - Essential for document processing. Would significantly improve document upload and analysis features. Can handle multiple formats and includes OCR.

---

### 5. A2J Document Assembly Tool (DAT) by CCALI

**Repository:** https://github.com/CCALI/a2jdat
**Stars:** 8+ | **Language:** JavaScript/Node.js | **License:** AGPL-3.0
**Last Updated:** October 2024 (Maintained)

#### Description

A2J DAT is a document automation tool designed to generate PDF legal forms at the end of guided interviews. It's part of the A2J Author ecosystem for creating access to justice applications.

#### Key Features for Justice Companion

- **Document assembly** from interview data
- **PDF generation** from HTML templates
- **Form field population** automation
- **Template-based document creation**
- **wkhtmltopdf integration** for high-quality PDFs
- **Multi-page document support**
- **Calibrated rendering** for consistent output

#### Tech Stack

- Node.js 20.17.0+
- Express.js (REST API)
- wkhtmltopdf (HTML to PDF engine)
- PM2 (process manager)
- Volta (Node version manager)

#### Code/Patterns We Could Adapt

```javascript
// Document assembly workflow:
// 1. User completes guided interview
// 2. Answers stored as structured data
// 3. Data merged with court form templates
// 4. Generate PDF with proper formatting

// Use cases for Justice Companion:
// 1. Generate court forms from user interviews
// 2. Auto-fill standard legal documents
// 3. Create consistent, court-ready PDFs
// 4. Support multi-page complex forms
```

#### Integration Difficulty

**Medium** - Requires Node.js runtime and wkhtmltopdf binary. Would need integration layer between our Electron/TypeScript app and Node service.

#### Priority for Implementation

**Medium-High** - Very useful for court form automation, which is a key feature request. Could significantly reduce manual form-filling burden for users.

---

### 6. Docspect - AI Contract Analysis

**Repository:** https://github.com/Sreyasiv/Docspect
**Stars:** 1 | **Language:** React/Node.js | **License:** Proprietary
**Last Updated:** October 2025 (Recent)

#### Description

AI-powered contract analysis tool that summarizes legal documents, highlights risky clauses, and provides AI-powered suggestions with relevant case studies.

#### Key Features for Justice Companion

- **AI clause extraction** using LLMs
- **Risk analysis** for contracts
- **Document summarization**
- **Case study references** tied to contract clauses
- **Support for PDF and DOCX** via PDFMiner and Mammoth
- **Modern React UI** with TailwindCSS

#### Tech Stack

- **Frontend:** React, TailwindCSS
- **Backend:** Node.js
- **AI:** OpenRouter API with Mistral 7B
- **Document Parsing:** PDFMiner, Mammoth (Python libraries)
- **Deployment:** Netlify (frontend)

#### Code/Patterns We Could Adapt

```javascript
// Document analysis pipeline:
// 1. Parse PDF/DOCX to extract text
// 2. Send to LLM for clause identification
// 3. Analyze clauses for risk factors
// 4. Generate summary and recommendations

// Integration approach for Justice Companion:
// - Use OpenRouter or similar API for AI features
// - Implement document parser for contract analysis
// - Add risk highlighting in document viewer
// - Generate plain-language summaries
```

#### Integration Difficulty

**Medium** - Modern React/Node stack similar to Justice Companion. Would need to integrate AI API and document parsing libraries.

#### Priority for Implementation

**Medium** - Contract analysis is valuable but may be outside Justice Companion's core use case (litigants in person for court proceedings). More relevant if we expand to contract review.

---

### 7. eyecite-js by beshkenadze

**Repository:** https://github.com/beshkenadze/eyecite-js
**Stars:** 0 | **Language:** TypeScript/JavaScript | **License:** Not specified
**Last Updated:** August 2025 (Recent)

#### Description

TypeScript/JavaScript port of the eyecite library for extracting legal citations from text. Brings citation parsing to JavaScript environments.

#### Key Features for Justice Companion

- **Client-side citation extraction** (runs in browser)
- **TypeScript support** (type-safe)
- **Same functionality as Python eyecite**
- **No backend required** for citation parsing

#### Tech Stack

- TypeScript
- Pure JavaScript (no heavy dependencies)
- Compatible with Node.js and browsers

#### Code/Patterns We Could Adapt

```typescript
import { getCitations } from 'eyecite-js';

const text = 'In Smith v. Jones, 123 F.3d 456 (2020)...';
const citations = getCitations(text);

// Use in Justice Companion:
// 1. Real-time citation detection in editor
// 2. Client-side parsing without API calls
// 3. Offline citation extraction
// 4. Integrate with TypeScript/React codebase
```

#### Integration Difficulty

**Easy** - TypeScript library that fits perfectly with our tech stack. Could be npm installed directly.

#### Priority for Implementation

**High** - If this library is stable, it's ideal for Justice Companion since we're already using TypeScript/React. Easier than integrating Python eyecite.

---

### 8. Legal Assistant App by ASPU-Projects

**Repository:** https://github.com/ASPU-Projects/Legal-Assistant-App
**Stars:** 0 | **Language:** React/TypeScript | **License:** Not specified
**Last Updated:** September 2025 (Recent)

#### Description

Web application for hiring lawyers with appointment scheduling, legal chatbot, file analysis, and rating system. Built with React and TypeScript.

#### Key Features for Justice Companion

- **Appointment scheduling** system
- **File analysis** capabilities
- **Rating and recommendation** system for lawyers
- **Real-time communication** features
- **React + TypeScript** architecture

#### Tech Stack

- React 18+
- TypeScript
- Vite (build tool)
- Modern React patterns (hooks, context)

#### Code/Patterns We Could Adapt

```typescript
// Architecture patterns we could learn from:
// 1. Appointment/deadline management system
// 2. Rating system for legal professionals
// 3. Real-time notification system
// 4. File upload and analysis workflow
// 5. Modern React component structure

// Potential integration:
// - Deadline reminder system similar to appointment scheduling
// - Document sharing patterns
// - User feedback/rating system for legal resources
```

#### Integration Difficulty

**Easy** - Same tech stack (React/TypeScript). Could review code for patterns and best practices.

#### Priority for Implementation

**Low-Medium** - Useful for design patterns but limited novel functionality. Appointment scheduling patterns could help with deadline management.

---

### 9. X-Ray by Free Law Project

**Repository:** https://github.com/freelawproject/x-ray
**Stars:** 33+ | **Language:** Python | **License:** BSD
**Last Updated:** October 2025 (Active)

#### Description

Tool to detect whether a PDF has bad redactions (text that appears redacted but is still extractable). Important for document security and privacy.

#### Key Features for Justice Companion

- **Redaction detection** in PDFs
- **Text extraction from "redacted" areas**
- **Bounding box identification** for problematic redactions
- **Security analysis** for sensitive documents

#### Tech Stack

- Python
- PyMuPDF (PDF manipulation)
- Text extraction algorithms

#### Code/Patterns We Could Adapt

```python
# Check document for bad redactions
from xray import check_redactions

result = check_redactions('sensitive_document.pdf')

# Returns:
{
  "error": false,
  "results": {
    "1": [  # page number
      {
        "bbox": [x, y, width, height],
        "text": "sensitive info that should be hidden"
      }
    ]
  }
}

# Use cases for Justice Companion:
# 1. Warn users about improperly redacted documents
# 2. Security check before sharing documents
# 3. Help users create proper redactions
# 4. Privacy protection feature
```

#### Integration Difficulty

**Easy-Medium** - Python library that could be wrapped in a REST API or called as subprocess.

#### Priority for Implementation

**Medium** - Important for user privacy and document security. Could prevent users from accidentally sharing sensitive information.

---

### 10. reporters-db by Free Law Project

**Repository:** https://github.com/freelawproject/reporters-db
**Stars:** 64+ | **Language:** JSON/Python | **License:** BSD
**Last Updated:** October 2025 (Active)

#### Description

Database of court reporters (citation formats) used by eyecite and other citation parsing tools. Contains metadata about legal reporters, including abbreviations, date ranges, and jurisdictions.

#### Key Features for Justice Companion

- **Citation format database** (5000+ reporter variations)
- **Court metadata** (jurisdictions, date ranges)
- **Reporter abbreviation mappings**
- **Citation validation data**
- **JSON format** for easy integration

#### Tech Stack

- Pure JSON data files
- Python utilities for processing
- No runtime dependencies

#### Code/Patterns We Could Adapt

```json
{
  "F.3d": {
    "cite_type": "federal",
    "name": "Federal Reporter Third Series",
    "editions": {
      "F.3d": {
        "start": "1993",
        "end": "Present",
        "volume_count": 1000
      }
    }
  }
}

// Use cases:
// 1. Validate citation formats
// 2. Auto-complete citation entry
// 3. Identify citation jurisdiction
// 4. Citation format conversion
```

#### Integration Difficulty

**Easy** - JSON data files that can be imported directly. No code execution required.

#### Priority for Implementation

**Medium** - Essential if we implement citation parsing. Works hand-in-hand with eyecite or eyecite-js.

---

## Summary Matrix

| Repository      | Stars | Language      | License     | Maintenance | Difficulty | Priority | Best For                      |
| --------------- | ----- | ------------- | ----------- | ----------- | ---------- | -------- | ----------------------------- |
| CourtListener   | 562+  | Python/Django | AGPL-3.0    | Active      | Hard       | Medium   | Case law database & search    |
| eyecite         | 154+  | Python        | BSD-2       | Active      | Easy       | High     | Citation extraction & parsing |
| juriscraper     | 289+  | Python        | BSD         | Active      | Medium     | Low-Med  | Court opinion scraping        |
| doctor          | 29+   | Python        | BSD         | Active      | Easy       | High     | Document conversion & OCR     |
| A2J DAT         | 8+    | Node.js       | AGPL-3.0    | Maintained  | Medium     | Med-High | Form automation               |
| Docspect        | 1     | React/Node    | Proprietary | Recent      | Medium     | Medium   | AI contract analysis          |
| eyecite-js      | 0     | TypeScript    | Unknown     | Recent      | Easy       | High     | Client-side citation parsing  |
| Legal Assistant | 0     | React/TS      | Unknown     | Recent      | Easy       | Low-Med  | UI patterns & scheduling      |
| x-ray           | 33+   | Python        | BSD         | Active      | Easy-Med   | Medium   | Redaction detection           |
| reporters-db    | 64+   | JSON/Python   | BSD         | Active      | Easy       | Medium   | Citation validation data      |

---

## Recommendations for Justice Companion

### Immediate Integration (High Priority)

1. **eyecite or eyecite-js** - Citation Parsing
   - **Why:** Automatically detect and link case citations in documents
   - **How:** If eyecite-js is stable, integrate directly. Otherwise, wrap Python eyecite in a simple REST service
   - **Impact:** Major improvement to document analysis and case research features
   - **Effort:** 2-3 days for TypeScript version, 1 week for Python wrapper

2. **doctor** - Document Processing
   - **Why:** Handle multiple document formats, OCR, PDF manipulation
   - **How:** Run as Docker container, communicate via REST API
   - **Impact:** Support more document types, extract text from scans, generate thumbnails
   - **Effort:** 3-5 days for Docker setup and API integration

3. **reporters-db** - Citation Database
   - **Why:** Validate and standardize citations
   - **How:** Import JSON data files into application
   - **Impact:** Enhance citation parsing accuracy
   - **Effort:** 1-2 days

### Near-Term Integration (Medium Priority)

4. **A2J DAT** - Form Automation
   - **Why:** Generate court-ready PDFs from user data
   - **How:** Integrate as separate Node.js service
   - **Impact:** Reduce manual form-filling, improve document consistency
   - **Effort:** 1-2 weeks (requires template creation)

5. **x-ray** - Redaction Detection
   - **Why:** Protect user privacy, prevent sensitive data leaks
   - **How:** Python service or subprocess
   - **Impact:** Critical security feature for document sharing
   - **Effort:** 3-5 days

6. **CourtListener API** - Case Law Search
   - **Why:** Access millions of court opinions
   - **How:** Use their public REST API (no self-hosting needed)
   - **Impact:** Powerful case research capabilities
   - **Effort:** 1 week for API integration and UI

### Future Consideration (Low Priority)

7. **juriscraper** - Opinion Scraping
   - **Why:** Keep local case law database updated
   - **When:** After establishing local database infrastructure
   - **Effort:** 2-3 weeks plus ongoing maintenance

8. **Docspect patterns** - AI Analysis
   - **Why:** Contract risk analysis
   - **When:** If expanding beyond court proceeding support
   - **Effort:** 1-2 weeks for AI integration

---

## Technical Integration Strategy

### Phase 1: Foundation (Weeks 1-2)

- Integrate **eyecite-js** for client-side citation parsing
- Import **reporters-db** JSON data
- Test citation extraction on sample documents

### Phase 2: Document Processing (Weeks 3-4)

- Deploy **doctor** microservice in Docker
- Build document upload pipeline using doctor
- Add OCR support for scanned documents
- Implement PDF thumbnail generation

### Phase 3: Security & Privacy (Week 5)

- Integrate **x-ray** for redaction checking
- Add warning system for improperly redacted documents
- Create user education materials on proper redaction

### Phase 4: Form Automation (Weeks 6-8)

- Set up **A2J DAT** service
- Create templates for common court forms
- Build interview flow for form population
- Test generated PDFs against court requirements

### Phase 5: Case Research (Weeks 9-10)

- Integrate **CourtListener API**
- Build case search interface
- Add citation linking to search results
- Implement case law citation in documents

---

## Licensing Considerations

### Permissive Licenses (Safe to Use)

- **BSD-2-Clause:** eyecite, juriscraper, doctor, x-ray, reporters-db
- **MIT:** eyecite-js (likely, needs verification)

These allow commercial use, modification, and redistribution with minimal restrictions.

### Copyleft Licenses (Requires Compliance)

- **AGPL-3.0:** CourtListener, A2J DAT

AGPL requires that if we use the code, we must also open-source our entire application when it's accessed over a network. **Recommendation:** Use these tools as external services (API calls or microservices) rather than incorporating their code directly.

### Unknown/Proprietary

- **Docspect:** Marked as proprietary - cannot use without permission
- **Legal Assistant App:** No license specified - assume all rights reserved

---

## Maintenance & Support

### Actively Maintained (Excellent)

- All Free Law Project repos (CourtListener, eyecite, juriscraper, doctor, x-ray, reporters-db)
- Updated within last month
- Active community and issue tracking
- Professional organization backing

### Recently Updated (Good)

- A2J DAT: October 2024 - mature, stable project
- Docspect, eyecite-js, Legal Assistant: 2025 updates - newer projects

### Support Considerations

- Free Law Project tools: Can contact via their website or GitHub issues
- Others: GitHub issues only, response times unknown

---

## Conclusion

The Free Law Project ecosystem represents the gold standard for open-source legal tools. Their permissive BSD licensing, active maintenance, and production-ready code make them ideal candidates for integration into Justice Companion.

**Recommended Implementation Order:**

1. **eyecite-js** + **reporters-db** (citation parsing)
2. **doctor** (document processing)
3. **x-ray** (security)
4. **A2J DAT** (form automation)
5. **CourtListener API** (case research)

This approach prioritizes features that directly support litigants in person: document analysis, citation handling, form generation, and case research. The modular architecture of these tools allows incremental integration without major refactoring of Justice Companion's existing codebase.

Total estimated effort: 8-12 weeks for full integration of priority tools.

---

## Additional Resources

### Free Law Project

- Website: https://free.law/
- Documentation: https://www.courtlistener.com/help/
- Contact: Available via their website

### A2J Author

- Website: https://www.a2jauthor.org/
- Documentation: https://www.a2jauthor.org/content/a2j-selfhosting-and-backend
- Contact: tobias@cali.org

### Community

- Legal Tech Subreddit: r/legaltech
- Free Law Project Slack/Discord: Check their website
- Legal Hackers: https://legalhackers.org/

---

**Report Compiled By:** Agent 4 - Open Source Legal Tools Researcher
**Date:** October 11, 2025
**Next Review:** Q1 2026 (or when major updates occur)
