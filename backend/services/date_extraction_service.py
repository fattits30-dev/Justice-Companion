"""
Date Extraction Service for Justice Companion.

Extracts dates from legal documents and classifies them by importance.
Detects deadline keywords and suggests which dates are critical.
"""

import re
import logging
from datetime import date
from typing import Optional
from dataclasses import dataclass, field
from dateutil import parser as date_parser
from dateutil.relativedelta import relativedelta

logger = logging.getLogger(__name__)


@dataclass
class ExtractedDate:
    """A date extracted from document text."""
    date: date
    original_text: str  # "26th November 2025"
    context: str  # Surrounding text snippet
    is_deadline: bool = False
    deadline_type: Optional[str] = None  # "appeal", "response", "hearing", "payment"
    confidence: float = 0.8
    position: int = 0  # Character position in document


@dataclass 
class DateExtractionResult:
    """Result of date extraction from a document."""
    dates: list[ExtractedDate] = field(default_factory=list)
    deadlines: list[ExtractedDate] = field(default_factory=list)  # Subset that are deadlines
    document_date: Optional[ExtractedDate] = None  # The letter/document date
    errors: list[str] = field(default_factory=list)


class DateExtractionService:
    """
    Extracts and classifies dates from legal document text.
    
    Handles UK date formats and legal terminology.
    """
    
    # UK date patterns
    DATE_PATTERNS = [
        # "26th November 2025", "1st January 2024"
        r'\b(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b',
        # "26 November 2025"
        r'\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b',
        # "November 26, 2025"
        r'\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b',
        # "26/11/2025" or "26-11-2025" (UK format: DD/MM/YYYY)
        r'\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\b',
        # "2025-11-26" (ISO format)
        r'\b(\d{4})-(\d{2})-(\d{2})\b',
    ]
    
    # Keywords that indicate a deadline
    DEADLINE_KEYWORDS = {
        'appeal': ['appeal', 'appealed', 'appealing'],
        'response': ['respond', 'response', 'reply', 'answer'],
        'deadline': ['deadline', 'due date', 'due by', 'must be received'],
        'hearing': ['hearing', 'tribunal', 'court date', 'appear'],
        'payment': ['payment', 'pay by', 'paid by', 'settle'],
        'submission': ['submit', 'submission', 'file by', 'lodge'],
        'expiry': ['expires', 'expiry', 'valid until', 'effective until'],
        'return': ['return', 'hand in', 'deliver by'],
    }
    
    # Phrases that strongly indicate the next date is a deadline
    DEADLINE_TRIGGERS = [
        r'deadline[:\s]+(?:is\s+)?',
        r'must\s+(?:be\s+)?(?:received|submitted|filed|returned)\s+by',
        r'no\s+later\s+than',
        r'by\s+(?:no\s+later\s+than\s+)?(?:5pm\s+(?:on\s+)?)?',
        r'within\s+\d+\s+(?:working\s+)?days',
        r'appeal\s+(?:must\s+be\s+)?(?:submitted\s+)?(?:by|within)',
        r'respond\s+(?:by|within)',
        r'effective\s+(?:from|as\s+of)',
        r'terminat(?:ed?|ion)\s+(?:effective|from|on)',
    ]
    
    # Context window (chars) around date for snippet
    CONTEXT_WINDOW = 100
    
    def __init__(self):
        self._month_map = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4,
            'may': 5, 'june': 6, 'july': 7, 'august': 8,
            'september': 9, 'october': 10, 'november': 11, 'december': 12
        }
    
    def extract_dates(self, text: str) -> DateExtractionResult:
        """
        Extract all dates from document text.
        
        Args:
            text: Document text content
            
        Returns:
            DateExtractionResult with all found dates and classified deadlines
        """
        result = DateExtractionResult()
        
        if not text or not text.strip():
            result.errors.append("Empty document text")
            return result
        
        text_lower = text.lower()
        found_dates: list[ExtractedDate] = []
        
        # Find all date matches
        for pattern in self.DATE_PATTERNS:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                try:
                    extracted = self._parse_match(match, text, text_lower)
                    if extracted:
                        found_dates.append(extracted)
                except Exception as e:
                    logger.debug(f"Failed to parse date match '{match.group()}': {e}")
        
        # Deduplicate by date value (keep first occurrence)
        seen_dates: set[date] = set()
        unique_dates: list[ExtractedDate] = []
        for ed in sorted(found_dates, key=lambda x: x.position):
            if ed.date not in seen_dates:
                seen_dates.add(ed.date)
                unique_dates.append(ed)
        
        result.dates = unique_dates
        
        # Identify deadlines
        result.deadlines = [d for d in unique_dates if d.is_deadline]
        
        # Try to identify the document date (usually first date, or date near top)
        if unique_dates:
            # First date in first 500 chars is likely the document date
            early_dates = [d for d in unique_dates if d.position < 500]
            if early_dates:
                result.document_date = early_dates[0]
        
        logger.info(
            f"Extracted {len(result.dates)} dates, "
            f"{len(result.deadlines)} deadlines from document"
        )
        
        return result
    
    def _parse_match(
        self, 
        match: re.Match, 
        text: str, 
        text_lower: str
    ) -> Optional[ExtractedDate]:
        """Parse a regex match into an ExtractedDate."""
        original_text = match.group()
        position = match.start()
        
        # Get context snippet - try to start/end at word boundaries
        start = max(0, position - self.CONTEXT_WINDOW)
        end = min(len(text), match.end() + self.CONTEXT_WINDOW)
        
        # Adjust start to next word boundary (find space after start)
        if start > 0:
            space_pos = text.find(' ', start)
            if space_pos != -1 and space_pos < position:
                start = space_pos + 1
        
        # Adjust end to previous word boundary (find space before end)
        if end < len(text):
            space_pos = text.rfind(' ', position, end)
            if space_pos != -1:
                # Find the end of the last complete word
                next_space = text.find(' ', space_pos + 1)
                if next_space != -1 and next_space <= end + 20:
                    end = next_space
        
        context = text[start:end].strip()
        # Clean up context - normalize whitespace
        context = re.sub(r'\s+', ' ', context)
        
        # Parse the date
        parsed_date = self._parse_date_string(original_text)
        if not parsed_date:
            return None
        
        # Check if this is a deadline
        is_deadline, deadline_type, confidence = self._classify_deadline(
            position, text_lower
        )
        
        return ExtractedDate(
            date=parsed_date,
            original_text=original_text,
            context=context,
            is_deadline=is_deadline,
            deadline_type=deadline_type,
            confidence=confidence,
            position=position,
        )
    
    def _parse_date_string(self, date_str: str) -> Optional[date]:
        """Parse a date string into a date object."""
        try:
            # Try dateutil parser first (handles most formats)
            parsed = date_parser.parse(date_str, dayfirst=True)
            return parsed.date()
        except (ValueError, TypeError):
            pass
        
        # Try manual parsing for UK formats
        try:
            # "26th November 2025" pattern
            match = re.match(
                r'(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)\s+(\d{4})',
                date_str,
                re.IGNORECASE
            )
            if match:
                day = int(match.group(1))
                month_name = match.group(2).lower()
                year = int(match.group(3))
                month = self._month_map.get(month_name)
                if month:
                    return date(year, month, day)
        except (ValueError, TypeError):
            pass
        
        return None
    
    def _classify_deadline(
        self, 
        position: int, 
        text_lower: str
    ) -> tuple[bool, Optional[str], float]:
        """
        Determine if a date at given position is a deadline.
        
        Returns:
            Tuple of (is_deadline, deadline_type, confidence)
        """
        # Look at text before and after the date
        context_start = max(0, position - 150)
        context_end = min(len(text_lower), position + 50)
        context = text_lower[context_start:context_end]
        
        # Check for strong deadline triggers
        for trigger in self.DEADLINE_TRIGGERS:
            if re.search(trigger, context):
                # Determine type from context
                dtype = self._determine_deadline_type(context)
                return True, dtype, 0.95
        
        # Check for deadline keywords
        for dtype, keywords in self.DEADLINE_KEYWORDS.items():
            for keyword in keywords:
                if keyword in context:
                    return True, dtype, 0.75
        
        return False, None, 0.5
    
    def _determine_deadline_type(self, context: str) -> str:
        """Determine the type of deadline from context."""
        for dtype, keywords in self.DEADLINE_KEYWORDS.items():
            for keyword in keywords:
                if keyword in context:
                    return dtype
        return "deadline"
    
    def get_upcoming_deadlines(
        self, 
        result: DateExtractionResult,
        days_ahead: int = 30
    ) -> list[ExtractedDate]:
        """
        Filter deadlines to only those in the next N days.
        
        Args:
            result: Extraction result
            days_ahead: Number of days to look ahead
            
        Returns:
            List of upcoming deadlines, sorted by date
        """
        today = date.today()
        cutoff = today + relativedelta(days=days_ahead)
        
        upcoming = [
            d for d in result.deadlines
            if today <= d.date <= cutoff
        ]
        
        return sorted(upcoming, key=lambda x: x.date)
    
    def to_dict(self, extracted: ExtractedDate) -> dict:
        """Convert ExtractedDate to dictionary for JSON response."""
        return {
            "date": extracted.date.isoformat(),
            "originalText": extracted.original_text,
            "context": extracted.context,
            "isDeadline": extracted.is_deadline,
            "deadlineType": extracted.deadline_type,
            "confidence": extracted.confidence,
        }
    
    def result_to_dict(self, result: DateExtractionResult) -> dict:
        """Convert full result to dictionary for JSON response."""
        return {
            "dates": [self.to_dict(d) for d in result.dates],
            "deadlines": [self.to_dict(d) for d in result.deadlines],
            "documentDate": self.to_dict(result.document_date) if result.document_date else None,
            "totalDates": len(result.dates),
            "totalDeadlines": len(result.deadlines),
            "errors": result.errors,
        }
