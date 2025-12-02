"""
Case Folder Service - Digital Case File Organization

Provides virtual folder structure for cases without additional database tables.
Aggregates existing data (case, evidence, deadlines, chat) and enriches with
legal research from UK APIs.

Features:
- Generate folder structure from existing case data
- Auto-fetch relevant legislation for case type
- Provide data for PDF export (future)
- Cache legal research for performance

Usage:
    service = CaseFolderService(db, legal_api_service)
    folder_data = await service.get_case_folder(case_id, user_id)
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from backend.models.case import Case
from backend.models.evidence import Evidence
from backend.models.deadline import Deadline
from backend.models.chat import ChatConversation
from backend.services.legal_api_service import LegalAPIService

logger = logging.getLogger(__name__)


# Type mappings for auto-fetching relevant legislation
CASE_TYPE_SEARCH_TERMS = {
    "employment": [
        "Employment Rights Act 1996",
        "Equality Act 2010",
        "unfair dismissal",
        "employment tribunal",
    ],
    "housing": [
        "Housing Act 1988",
        "Protection from Eviction Act",
        "tenant rights",
        "landlord obligations",
    ],
    "consumer": [
        "Consumer Rights Act 2015",
        "Sale of Goods Act",
        "consumer protection",
    ],
    "family": [
        "Children Act 1989",
        "Family Law Act 1996",
        "child arrangements",
    ],
    "discrimination": [
        "Equality Act 2010",
        "Human Rights Act 1998",
        "discrimination",
    ],
    "debt": [
        "Consumer Credit Act 1974",
        "Limitation Act 1980",
        "debt collection",
    ],
}


@dataclass
class FolderItem:
    """Represents a single item in the folder structure."""
    id: str
    name: str
    type: str  # 'folder' or 'file'
    icon: str
    children: Optional[List["FolderItem"]] = None
    data: Optional[Dict[str, Any]] = None
    count: Optional[int] = None
    url: Optional[str] = None


@dataclass
class CaseFolderData:
    """Complete folder structure for a case."""
    case_id: int
    case_title: str
    case_type: str
    status: str
    created_at: datetime
    folders: List[FolderItem]
    stats: Dict[str, int]
    legal_research_loaded: bool


class CaseFolderService:
    """
    Service for generating virtual folder structures for cases.
    
    This service doesn't persist folder data - it generates the structure
    on demand from existing case data and legal API results.
    """
    
    def __init__(
        self,
        db: Session,
        legal_api_service: Optional[LegalAPIService] = None,
    ):
        self.db = db
        self.legal_api = legal_api_service or LegalAPIService()
        self._legal_cache: Dict[int, Dict[str, Any]] = {}
    
    async def get_case_folder(
        self,
        case_id: int,
        user_id: int,
        include_legal_research: bool = True,
    ) -> CaseFolderData:
        """
        Get complete folder structure for a case.
        
        Args:
            case_id: ID of the case
            user_id: ID of the requesting user (for auth)
            include_legal_research: Whether to fetch legal research (can be slow)
            
        Returns:
            CaseFolderData with complete folder structure
            
        Raises:
            ValueError: If case not found or user not authorized
        """
        # Fetch case
        case = self.db.query(Case).filter(
            Case.id == case_id,
            Case.user_id == user_id,
        ).first()
        
        if not case:
            raise ValueError(f"Case {case_id} not found or not authorized")
        
        # Fetch related data
        evidence_items = self.db.query(Evidence).filter(
            Evidence.case_id == case_id
        ).all()
        
        deadlines = self.db.query(Deadline).filter(
            Deadline.case_id == case_id
        ).all()
        
        conversations = self.db.query(ChatConversation).filter(
            ChatConversation.case_id == case_id
        ).all()
        
        # Fetch legal research if requested
        legal_research = None
        if include_legal_research:
            legal_research = await self._get_legal_research(case_id, case.case_type)
        
        # Build folder structure
        folders = self._build_folder_structure(
            case=case,
            evidence=evidence_items,
            deadlines=deadlines,
            conversations=conversations,
            legal_research=legal_research,
        )
        
        # Calculate stats
        stats = {
            "evidence_count": len(evidence_items),
            "deadline_count": len(deadlines),
            "conversation_count": len(conversations),
            "legislation_count": len(legal_research.get("legislation", [])) if legal_research else 0,
            "case_law_count": len(legal_research.get("cases", [])) if legal_research else 0,
        }
        
        return CaseFolderData(
            case_id=case_id,
            case_title=case.title,
            case_type=case.case_type,
            status=case.status,
            created_at=case.created_at,
            folders=folders,
            stats=stats,
            legal_research_loaded=legal_research is not None,
        )
    
    async def _get_legal_research(
        self,
        case_id: int,
        case_type: str,
    ) -> Dict[str, Any]:
        """
        Fetch legal research for a case type.
        
        Results are cached per case_id to avoid repeated API calls.
        """
        # Check cache
        if case_id in self._legal_cache:
            return self._legal_cache[case_id]
        
        # Get search terms for this case type
        search_terms = CASE_TYPE_SEARCH_TERMS.get(case_type.lower(), [case_type])
        
        # Search for the primary term
        primary_term = search_terms[0] if search_terms else case_type
        
        try:
            results = await self.legal_api.search_legal_info(primary_term)
            self._legal_cache[case_id] = results
            return results
        except Exception as e:
            logger.warning(f"Failed to fetch legal research for case {case_id}: {e}")
            return {"legislation": [], "cases": [], "knowledge_base": []}
    
    def _build_folder_structure(
        self,
        case: Case,
        evidence: List[Evidence],
        deadlines: List[Deadline],
        conversations: List[ChatConversation],
        legal_research: Optional[Dict[str, Any]],
    ) -> List[FolderItem]:
        """Build the virtual folder structure."""
        folders = []
        
        # 1. Case Summary (always present)
        folders.append(FolderItem(
            id="case-summary",
            name="Case Summary",
            type="file",
            icon="briefcase",
            data={
                "title": case.title,
                "description": case.description,
                "case_type": case.case_type,
                "status": case.status,
                "created_at": case.created_at.isoformat() if case.created_at else None,
                "updated_at": case.updated_at.isoformat() if case.updated_at else None,
            },
        ))
        
        # 2. Evidence folder
        evidence_by_type = self._group_evidence_by_type(evidence)
        evidence_children = []
        
        for etype, items in evidence_by_type.items():
            type_folder = FolderItem(
                id=f"evidence-{etype}",
                name=f"{etype.title()}s",
                type="folder",
                icon=self._get_evidence_icon(etype),
                count=len(items),
                children=[
                    FolderItem(
                        id=f"evidence-item-{e.id}",
                        name=e.title,
                        type="file",
                        icon=self._get_evidence_icon(e.evidence_type),
                        data={
                            "id": e.id,
                            "title": e.title,
                            "description": e.description,
                            "evidence_type": e.evidence_type,
                            "filename": e.filename,
                            "obtained_date": e.obtained_date.isoformat() if e.obtained_date else None,
                        },
                    )
                    for e in items
                ],
            )
            evidence_children.append(type_folder)
        
        folders.append(FolderItem(
            id="evidence",
            name="Evidence",
            type="folder",
            icon="file-text",
            count=len(evidence),
            children=evidence_children if evidence_children else None,
        ))
        
        # 3. Legal Research folder
        legislation = legal_research.get("legislation", []) if legal_research else []
        case_law = legal_research.get("cases", []) if legal_research else []
        
        legal_children = []
        
        if legislation:
            legal_children.append(FolderItem(
                id="legislation",
                name="Legislation",
                type="folder",
                icon="scroll",
                count=len(legislation),
                children=[
                    FolderItem(
                        id=f"legislation-{i}",
                        name=item.get("title", f"Legislation {i+1}"),
                        type="file",
                        icon="scroll",
                        url=item.get("url"),
                        data=item,
                    )
                    for i, item in enumerate(legislation[:10])  # Limit to 10
                ],
            ))
        
        if case_law:
            legal_children.append(FolderItem(
                id="case-law",
                name="Case Law",
                type="folder",
                icon="gavel",
                count=len(case_law),
                children=[
                    FolderItem(
                        id=f"caselaw-{i}",
                        name=item.get("citation", f"Case {i+1}"),
                        type="file",
                        icon="gavel",
                        url=item.get("url"),
                        data=item,
                    )
                    for i, item in enumerate(case_law[:10])  # Limit to 10
                ],
            ))
        
        folders.append(FolderItem(
            id="legal-research",
            name="Legal Research",
            type="folder",
            icon="scale",
            count=len(legislation) + len(case_law),
            children=legal_children if legal_children else None,
        ))
        
        # 4. Timeline & Deadlines folder
        deadline_children = [
            FolderItem(
                id=f"deadline-{d.id}",
                name=d.title,
                type="file",
                icon="calendar",
                data={
                    "id": d.id,
                    "title": d.title,
                    "description": d.description,
                    "deadline_date": d.deadline_date.isoformat() if d.deadline_date else None,
                    "priority": d.priority,
                    "status": d.status,
                },
            )
            for d in deadlines
        ]
        
        folders.append(FolderItem(
            id="timeline",
            name="Timeline & Deadlines",
            type="folder",
            icon="clock",
            count=len(deadlines),
            children=deadline_children if deadline_children else None,
        ))
        
        # 5. AI Analysis folder (chat conversations)
        chat_children = [
            FolderItem(
                id=f"chat-{c.id}",
                name=c.title or f"Conversation {c.id}",
                type="file",
                icon="message-square",
                data={
                    "id": c.id,
                    "title": c.title,
                    "updated_at": c.updated_at.isoformat() if c.updated_at else None,
                },
            )
            for c in conversations
        ]
        
        folders.append(FolderItem(
            id="ai-analysis",
            name="AI Analysis",
            type="folder",
            icon="brain",
            count=len(conversations),
            children=chat_children if chat_children else None,
        ))
        
        return folders
    
    def _group_evidence_by_type(
        self,
        evidence: List[Evidence],
    ) -> Dict[str, List[Evidence]]:
        """Group evidence items by their type."""
        groups: Dict[str, List[Evidence]] = {}
        for e in evidence:
            etype = e.evidence_type or "other"
            if etype not in groups:
                groups[etype] = []
            groups[etype].append(e)
        return groups
    
    def _get_evidence_icon(self, evidence_type: str) -> str:
        """Get icon name for evidence type."""
        icons = {
            "document": "file-text",
            "photo": "camera",
            "email": "mail",
            "recording": "mic",
            "note": "sticky-note",
            "witness": "users",
        }
        return icons.get(evidence_type, "file")
    
    async def get_suggested_legislation(
        self,
        case_type: str,
    ) -> List[Dict[str, Any]]:
        """
        Get suggested legislation for a case type.
        
        This is useful when creating a new case to show relevant laws.
        """
        search_terms = CASE_TYPE_SEARCH_TERMS.get(case_type.lower(), [])
        
        if not search_terms:
            return []
        
        all_legislation = []
        
        # Search for top 2 terms to get variety
        for term in search_terms[:2]:
            try:
                results = await self.legal_api.search_legislation(term)
                all_legislation.extend(results)
            except Exception as e:
                logger.warning(f"Failed to fetch legislation for '{term}': {e}")
        
        # Deduplicate by URL
        seen_urls = set()
        unique = []
        for item in all_legislation:
            url = item.get("url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique.append(item)
        
        return unique[:10]  # Return top 10
