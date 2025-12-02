"""
Vision Routes
=============
Document OCR and image processing endpoints.
Uses Hugging Face models for text extraction.
"""

from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from enum import Enum


router = APIRouter()


class DocumentType(str, Enum):
    """Supported document types"""
    UNKNOWN = "unknown"
    CONTRACT = "contract"
    LETTER = "letter"
    PAYSLIP = "payslip"
    FORM = "form"
    COURT_DOCUMENT = "court_document"
    EVIDENCE_PHOTO = "evidence_photo"
    HANDWRITTEN = "handwritten"


class OCRRequest(BaseModel):
    """OCR processing request"""
    preserve_structure: bool = True
    detect_tables: bool = True
    detect_handwriting: bool = False


class OCRResponse(BaseModel):
    """OCR processing response"""
    text: str
    confidence: float
    document_type: DocumentType
    has_tables: bool = False
    tables: Optional[List[dict]] = None
    page_count: int = 1
    metadata: Optional[dict] = None


class NameDetection(BaseModel):
    """Name detection result"""
    user_name_found: bool
    matched_party: Optional[str] = None
    suggested_owner: Optional[str] = None
    warning_message: Optional[str] = None


class DocumentAnalysis(BaseModel):
    """Full document analysis response"""
    extracted_text: str
    document_type: DocumentType
    key_facts: List[str]
    dates_found: List[str]
    parties_identified: List[str]
    relevance_notes: Optional[str] = None
    confidence: float
    name_detection: Optional[NameDetection] = None


class EvidenceAnalysis(BaseModel):
    """Evidence image analysis response"""
    description: str
    evidence_type: str
    legal_relevance: str
    strength_assessment: str
    suggested_use: str
    metadata: dict


@router.post("/ocr", response_model=OCRResponse)
async def extract_text(
    file: UploadFile = File(...),
    preserve_structure: bool = True,
    detect_tables: bool = True,
    req: Request = None
):
    """
    Extract text from document image or PDF.
    
    Supports:
    - Scanned documents
    - Photos of documents
    - PDF files
    - Screenshots
    
    Uses Qwen2.5-VL for intelligent OCR with layout preservation.
    """
    hf_client = req.app.state.hf_client
    
    # Read file content
    content = await file.read()
    filename = file.filename.lower()
    
    # Determine processing approach
    is_pdf = filename.endswith('.pdf')
    
    try:
        if is_pdf:
            # Handle PDF - extract pages as images first
            result = await hf_client.process_pdf(content, preserve_structure)
        else:
            # Direct image OCR
            prompt = build_ocr_prompt(preserve_structure, detect_tables)
            result = await hf_client.vision_ocr(content, prompt)
        
        return OCRResponse(
            text=result["text"],
            confidence=result.get("confidence", 0.9),
            document_type=classify_document(result["text"]),
            has_tables=result.get("has_tables", False),
            tables=result.get("tables"),
            page_count=result.get("page_count", 1),
            metadata={"model": result.get("model", "qwen-vl")}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")


@router.post("/ocr/handwritten", response_model=OCRResponse)
async def extract_handwriting(
    file: UploadFile = File(...),
    req: Request = None
):
    """
    Extract handwritten text using specialized TrOCR model.
    
    Best for:
    - Meeting notes
    - Handwritten letters
    - Annotations
    - Signatures (detection only)
    """
    hf_client = req.app.state.hf_client
    content = await file.read()
    
    try:
        result = await hf_client.handwriting_ocr(content)
        
        return OCRResponse(
            text=result["text"],
            confidence=result.get("confidence", 0.8),
            document_type=DocumentType.HANDWRITTEN,
            metadata={"model": "trocr-handwritten"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Handwriting OCR failed: {str(e)}")


@router.post("/ocr/batch")
async def extract_text_batch(
    files: List[UploadFile] = File(...),
    req: Request = None
):
    """
    Process multiple documents in batch.
    Returns results for each document.
    """
    results = []
    for file in files:
        try:
            content = await file.read()
            hf_client = req.app.state.hf_client
            result = await hf_client.vision_ocr(content, build_ocr_prompt())
            results.append({
                "filename": file.filename,
                "success": True,
                "text": result["text"],
                "document_type": classify_document(result["text"]).value,
            })
        except Exception as e:
            results.append({
                "filename": file.filename,
                "success": False,
                "error": str(e),
            })
    
    return {"results": results, "processed": len(results)}


@router.post("/analyze/document", response_model=DocumentAnalysis)
async def analyze_document(
    file: UploadFile = File(...),
    case_context: Optional[str] = None,
    username: Optional[str] = None,
    req: Request = None
):
    """
    Full document analysis pipeline:
    1. OCR text extraction (for images/PDFs) OR direct read (for text files)
    2. Document type classification
    3. Key facts extraction
    4. Date and party identification
    5. Legal relevance assessment
    6. NAME DETECTION: Check if logged-in user appears in document
    """
    hf_client = req.app.state.hf_client
    content = await file.read()
    filename = file.filename.lower() if file.filename else ""
    
    try:
        # Step 1: Get text content based on file type
        text_extensions = ('.txt', '.md', '.csv', '.json', '.xml', '.html')
        doc_extensions = ('.docx', '.doc', '.rtf')
        image_extensions = ('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff')
        
        print(f"DEBUG: Processing file: {filename}", flush=True)
        print(f"DEBUG: Is txt file: {filename.endswith(text_extensions)}", flush=True)
        
        if filename.endswith(text_extensions):
            # Direct text file - decode and use as-is
            try:
                extracted_text = content.decode('utf-8')
            except UnicodeDecodeError:
                extracted_text = content.decode('latin-1')
            confidence = 1.0  # Perfect confidence for text files
        elif filename.endswith(doc_extensions):
            # Word documents - would need python-docx in production
            # For now, try to extract readable text
            extracted_text = content.decode('utf-8', errors='ignore')
            confidence = 0.7
        elif filename.endswith('.pdf'):
            # PDF - use vision model
            result = await hf_client.process_pdf(content, preserve_structure=True)
            extracted_text = result["text"]
            confidence = result.get("confidence", 0.85)
        elif filename.endswith(image_extensions):
            # Image - use OCR
            ocr_result = await hf_client.vision_ocr(content, build_ocr_prompt())
            extracted_text = ocr_result["text"]
            confidence = ocr_result.get("confidence", 0.9)
        else:
            # Unknown type - try text first, then OCR as fallback
            try:
                extracted_text = content.decode('utf-8')
                confidence = 0.9
            except UnicodeDecodeError:
                # Probably binary/image - try OCR
                ocr_result = await hf_client.vision_ocr(content, build_ocr_prompt())
                extracted_text = ocr_result["text"]
                confidence = ocr_result.get("confidence", 0.8)
        
        # Step 2: Analysis with LLM
        analysis_prompt = f"""Analyze this legal document and extract key information:

DOCUMENT TEXT:
{extracted_text[:4000]}  # Truncate for token limits

{f"CASE CONTEXT: {case_context}" if case_context else ""}

Extract and return:
1. DOCUMENT TYPE: What kind of document is this?
2. KEY FACTS: List the most important facts (max 10)
3. DATES: List all dates mentioned
4. PARTIES: Who are the parties involved?
5. RELEVANCE: How might this be relevant to a legal case?

Format as structured list."""

        analysis = await hf_client.chat(
            messages=[{"role": "user", "content": analysis_prompt}],
            model_key="chat_primary",
        )
        
        # Parse analysis
        parties = extract_parties(analysis["content"])
        
        # Step 3: Name detection
        name_detection = None
        if username:
            name_detection = detect_user_in_parties(username, parties)
        
        # Return full analysis with name detection
        return DocumentAnalysis(
            extracted_text=extracted_text,
            document_type=classify_document(extracted_text),
            key_facts=extract_facts(analysis["content"]),
            dates_found=extract_dates(extracted_text),
            parties_identified=parties,
            relevance_notes=analysis["content"],
            confidence=confidence,
            name_detection=name_detection,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document analysis failed: {str(e)}")


@router.post("/analyze/evidence", response_model=EvidenceAnalysis)
async def analyze_evidence_image(
    file: UploadFile = File(...),
    case_type: Optional[str] = None,
    context: Optional[str] = None,
    req: Request = None
):
    """
    Analyze photo evidence (workplace conditions, property damage, etc.)
    
    Returns description, legal relevance, and suggested use.
    """
    hf_client = req.app.state.hf_client
    content = await file.read()
    
    prompt = f"""Analyze this evidence image for a UK legal case.

{f"Case Type: {case_type}" if case_type else ""}
{f"Context: {context}" if context else ""}

Provide:
1. DESCRIPTION: What does this image show?
2. EVIDENCE TYPE: What kind of evidence is this? (photo evidence, document, screenshot, etc.)
3. LEGAL RELEVANCE: How could this be used in legal proceedings?
4. STRENGTH: How strong is this as evidence? (Weak/Moderate/Strong)
5. SUGGESTED USE: How should this evidence be presented or used?
6. CONCERNS: Any issues with this evidence? (quality, authenticity, completeness)"""

    try:
        result = await hf_client.vision_analyze(content, prompt)
        
        return EvidenceAnalysis(
            description=result.get("description", ""),
            evidence_type=result.get("evidence_type", "photo"),
            legal_relevance=result.get("relevance", ""),
            strength_assessment=result.get("strength", "Moderate"),
            suggested_use=result.get("suggested_use", ""),
            metadata={"model": result.get("model"), "filename": file.filename}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evidence analysis failed: {str(e)}")


# Helper functions

def build_ocr_prompt(preserve_structure: bool = True, detect_tables: bool = True) -> str:
    """Build OCR prompt for Qwen-VL"""
    prompt = "Extract all text from this document image."
    if preserve_structure:
        prompt += " Preserve the original layout and formatting."
    if detect_tables:
        prompt += " If tables are present, format them clearly."
    return prompt


def classify_document(text: str) -> DocumentType:
    """Simple document classification based on content"""
    text_lower = text.lower()
    
    if "employment contract" in text_lower or "terms of employment" in text_lower:
        return DocumentType.CONTRACT
    elif "payslip" in text_lower or "net pay" in text_lower or "gross pay" in text_lower:
        return DocumentType.PAYSLIP
    elif "dear sir" in text_lower or "dear madam" in text_lower or "yours sincerely" in text_lower:
        return DocumentType.LETTER
    elif "form" in text_lower and ("et1" in text_lower or "et3" in text_lower):
        return DocumentType.FORM
    elif "court" in text_lower or "tribunal" in text_lower or "claimant" in text_lower:
        return DocumentType.COURT_DOCUMENT
    else:
        return DocumentType.UNKNOWN


def extract_facts(analysis_text: str) -> List[str]:
    """Extract key facts from analysis"""
    # Simplified extraction - would use structured output in production
    facts = []
    lines = analysis_text.split('\n')
    in_facts_section = False
    
    for line in lines:
        if "KEY FACTS" in line.upper():
            in_facts_section = True
            continue
        if in_facts_section and line.strip().startswith(('-', '•', '*', '1', '2', '3')):
            facts.append(line.strip().lstrip('-•*0123456789. '))
        if in_facts_section and any(x in line.upper() for x in ['DATES:', 'PARTIES:', 'RELEVANCE:']):
            break
    
    return facts[:10]  # Max 10 facts


def extract_dates(text: str) -> List[str]:
    """Extract dates from text"""
    import re
    # Simple date patterns - would use dateparser in production
    patterns = [
        r'\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}',
        r'\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}',
    ]
    
    dates = []
    for pattern in patterns:
        dates.extend(re.findall(pattern, text, re.IGNORECASE))
    
    return list(set(dates))[:10]


def extract_parties(analysis_text: str) -> List[str]:
    """Extract party names from analysis"""
    parties = []
    lines = analysis_text.split('\n')
    in_parties_section = False
    
    for line in lines:
        line_upper = line.upper().strip()
        
        # Detect parties section
        if "PARTIES" in line_upper or "PARTY" in line_upper and ("INVOLVED" in line_upper or "IDENTIFIED" in line_upper):
            in_parties_section = True
            # Check if parties are on same line after colon
            if ':' in line:
                after_colon = line.split(':', 1)[1].strip()
                if after_colon:
                    # Split by comma or "and"
                    for party in after_colon.replace(' and ', ', ').split(','):
                        party = party.strip().rstrip('.')
                        if party and len(party) > 2:
                            parties.append(party)
            continue
            
        if in_parties_section:
            # Stop at next section
            if any(x in line_upper for x in ['RELEVANCE:', 'KEY FACTS:', 'DATES:', 'DOCUMENT TYPE:', '**']):
                if not line.strip().startswith(('*', '-', '•', '1', '2', '3', '4', '5')):
                    break
            
            # Extract from bullet points or numbered lists
            stripped = line.strip()
            if stripped.startswith(('-', '•', '*', '1', '2', '3', '4', '5', '6', '7', '8', '9')):
                # Remove bullet/number and clean up
                party = stripped.lstrip('-•*0123456789.). ').strip()
                # Remove markdown bold
                party = party.replace('**', '').strip()
                if party and len(party) > 2 and not party.upper().startswith(('THE ', 'A ', 'AN ')):
                    parties.append(party)
            elif stripped and not stripped.startswith(('#', '>', '=')):
                # Non-bullet line in parties section - might be comma separated
                for party in stripped.replace(' and ', ', ').split(','):
                    party = party.strip().rstrip('.').replace('**', '')
                    if party and len(party) > 2 and party not in parties:
                        parties.append(party)
    
    # Deduplicate while preserving order
    seen = set()
    unique_parties = []
    for p in parties:
        p_lower = p.lower()
        if p_lower not in seen:
            seen.add(p_lower)
            unique_parties.append(p)
    
    return unique_parties[:10]  # Max 10 parties


def detect_user_in_parties(username: str, parties: List[str]) -> NameDetection:
    """
    Check if the logged-in user's name appears in the identified parties.
    Returns a NameDetection object with match status and warning if needed.
    """
    if not username or not parties:
        return None
    
    username_lower = username.lower()
    
    # Build name patterns to check (handle common username formats)
    # e.g., "testuser555" -> ["testuser555", "testuser"]
    # e.g., "john.smith" -> ["john.smith", "john", "smith"]
    name_patterns = [username_lower]
    
    # Remove numbers
    without_numbers = ''.join(c for c in username_lower if not c.isdigit())
    if without_numbers and without_numbers != username_lower:
        name_patterns.append(without_numbers)
    
    # Split by common separators
    for sep in ['.', '_', '-']:
        if sep in username_lower:
            parts = username_lower.split(sep)
            name_patterns.extend(parts)
    
    # Filter out very short patterns
    name_patterns = [p for p in name_patterns if p and len(p) >= 3]
    
    # Check each party for matches
    matched_party = None
    for party in parties:
        party_lower = party.lower()
        for pattern in name_patterns:
            if pattern in party_lower:
                matched_party = party
                break
        if matched_party:
            break
    
    if matched_party:
        return NameDetection(
            user_name_found=True,
            matched_party=matched_party,
            suggested_owner=None,
            warning_message=None
        )
    
    # No match found - find suggested owner (first person, not an org)
    org_keywords = ['ltd', 'limited', 'plc', 'inc', 'corp', 'company', 
                    'department', 'council', 'committee', 'hr', 'finance']
    
    suggested_owner = None
    for party in parties:
        party_lower = party.lower()
        if not any(kw in party_lower for kw in org_keywords):
            suggested_owner = party
            break
    
    warning = f"Your name '{username}' was not found in this document."
    if suggested_owner:
        warning += f" This document appears to be about {suggested_owner}."
    warning += " If this belongs to someone else, tell them about Justice Companion!"
    
    return NameDetection(
        user_name_found=False,
        matched_party=None,
        suggested_owner=suggested_owner,
        warning_message=warning
    )
