"""
AI Service Client
=================
Backend client for calling the AI microservice.
Handles all communication between backend and ai-service.
"""

import os
import httpx
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class AIServiceClient:
    """
    Client for communicating with Justice Companion AI Service.
    
    Usage:
        client = AIServiceClient()
        response = await client.chat([{"role": "user", "content": "Hello"}])
    """
    
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or os.getenv("AI_SERVICE_URL", "http://localhost:8001")
        self.timeout = httpx.Timeout(60.0, connect=10.0)
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Make HTTP request to AI service"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            url = f"{self.base_url}{endpoint}"
            response = await client.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()

    # ==========================================
    # HEALTH & STATUS
    # ==========================================
    
    async def health_check(self) -> Dict[str, Any]:
        """Check AI service health"""
        return await self._request("GET", "/health")
    
    async def is_available(self) -> bool:
        """Check if AI service is available"""
        try:
            health = await self.health_check()
            return health.get("status") == "healthy"
        except Exception:
            return False
    
    # ==========================================
    # CHAT
    # ==========================================
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        case_context: Optional[str] = None,
        model_preference: str = "balanced",
        max_tokens: int = 2048,
    ) -> Dict[str, Any]:
        """
        Generate chat completion.
        
        Args:
            messages: List of {role, content} messages
            case_context: Optional case context for legal assistance
            model_preference: fast|balanced|thorough
            max_tokens: Maximum response tokens
        """
        return await self._request(
            "POST",
            "/chat/completions",
            json={
                "messages": messages,
                "case_context": case_context,
                "model_preference": model_preference,
                "max_tokens": max_tokens,
            }
        )
    
    async def analyze_case(
        self,
        case_description: str,
        case_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Analyze a legal case"""
        return await self._request(
            "POST",
            "/chat/analyze-case",
            params={
                "case_description": case_description,
                "case_type": case_type,
            }
        )
    
    # ==========================================
    # VISION / OCR
    # ==========================================
    
    async def ocr_document(
        self,
        file_bytes: bytes,
        filename: str,
        preserve_structure: bool = True,
    ) -> Dict[str, Any]:
        """Extract text from document image"""
        return await self._request(
            "POST",
            "/vision/ocr",
            files={"file": (filename, file_bytes)},
            params={"preserve_structure": preserve_structure},
        )
    
    async def ocr_handwritten(
        self,
        file_bytes: bytes,
        filename: str,
    ) -> Dict[str, Any]:
        """Extract handwritten text"""
        return await self._request(
            "POST",
            "/vision/ocr/handwritten",
            files={"file": (filename, file_bytes)},
        )
    
    async def analyze_document(
        self,
        file_bytes: bytes,
        filename: str,
        case_context: Optional[str] = None,
        username: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Full document analysis"""
        params = {}
        if case_context:
            params["case_context"] = case_context
        if username:
            params["username"] = username
            
        return await self._request(
            "POST",
            "/vision/analyze/document",
            files={"file": (filename, file_bytes)},
            params=params,
        )
    
    async def analyze_evidence(
        self,
        file_bytes: bytes,
        filename: str,
        case_type: Optional[str] = None,
        context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Analyze evidence image"""
        params = {}
        if case_type:
            params["case_type"] = case_type
        if context:
            params["context"] = context
            
        return await self._request(
            "POST",
            "/vision/analyze/evidence",
            files={"file": (filename, file_bytes)},
            params=params,
        )

    # ==========================================
    # ANALYSIS
    # ==========================================
    
    async def full_case_analysis(
        self,
        description: str,
        case_type: Optional[str] = None,
        documents_summary: Optional[str] = None,
        timeline_summary: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Comprehensive case analysis"""
        return await self._request(
            "POST",
            "/analysis/case",
            json={
                "description": description,
                "case_type": case_type,
                "documents_summary": documents_summary,
                "timeline_summary": timeline_summary,
            }
        )
    
    async def assess_evidence_strength(
        self,
        case_id: int,
        evidence_descriptions: List[str],
        case_type: str,
    ) -> Dict[str, Any]:
        """Assess strength of collected evidence"""
        return await self._request(
            "POST",
            "/analysis/evidence-strength",
            json={
                "case_id": case_id,
                "evidence_descriptions": evidence_descriptions,
                "case_type": case_type,
            }
        )
    
    async def analyze_timeline(
        self,
        events: List[Dict[str, str]],
        case_type: str,
    ) -> Dict[str, Any]:
        """Analyze case timeline"""
        return await self._request(
            "POST",
            "/analysis/timeline-analysis",
            json={
                "events": events,
                "case_type": case_type,
            }
        )
    
    # ==========================================
    # DRAFTING
    # ==========================================
    
    async def draft_letter(
        self,
        letter_type: str,
        recipient: str,
        subject: str,
        key_points: List[str],
        tone: str = "formal",
        case_context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate draft letter"""
        return await self._request(
            "POST",
            "/drafting/letter",
            json={
                "letter_type": letter_type,
                "recipient": recipient,
                "subject": subject,
                "key_points": key_points,
                "tone": tone,
                "case_context": case_context,
            }
        )
    
    async def draft_witness_statement(
        self,
        witness_name: str,
        relationship_to_case: str,
        events_witnessed: List[str],
        case_context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate witness statement"""
        return await self._request(
            "POST",
            "/drafting/witness-statement",
            params={
                "witness_name": witness_name,
                "relationship_to_case": relationship_to_case,
                "case_context": case_context,
            },
            json=events_witnessed,
        )
    
    async def generate_timeline_document(
        self,
        events: List[Dict[str, str]],
        case_title: str,
        include_evidence_refs: bool = True,
    ) -> Dict[str, Any]:
        """Generate formatted timeline document"""
        return await self._request(
            "POST",
            "/drafting/timeline-document",
            params={
                "case_title": case_title,
                "include_evidence_refs": include_evidence_refs,
            },
            json=events,
        )

    # ==========================================
    # RESEARCH
    # ==========================================
    
    async def search_legal_resources(
        self,
        query: str,
        area: Optional[str] = None,
        include_legislation: bool = True,
        include_case_law: bool = True,
        max_results: int = 10,
    ) -> Dict[str, Any]:
        """Search UK legal resources"""
        return await self._request(
            "POST",
            "/research/search",
            json={
                "query": query,
                "area": area,
                "include_legislation": include_legislation,
                "include_case_law": include_case_law,
                "max_results": max_results,
            }
        )
    
    async def get_legislation_detail(self, act_id: str) -> Dict[str, Any]:
        """Get detailed legislation information"""
        return await self._request(
            "GET",
            f"/research/legislation/{act_id}",
        )
    
    async def calculate_deadline(
        self,
        incident_date: str,
        case_type: str,
    ) -> Dict[str, Any]:
        """Calculate legal deadlines"""
        return await self._request(
            "GET",
            "/research/deadline-calculator",
            params={
                "incident_date": incident_date,
                "case_type": case_type,
            }
        )


# Singleton instance for easy import
ai_client = AIServiceClient()
