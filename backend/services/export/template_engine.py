"""
Template Engine for export document formatting.
Migrated from src/services/export/TemplateEngine.ts

Features:
- Pre-defined export templates (case-summary, evidence-list, timeline-report, case-notes)
- Template-based data formatting for document generation
- Section-based template organization
- Extensible template registry

Templates:
1. case-summary: Complete case details with evidence, timeline, notes, and facts
2. evidence-list: Detailed inventory of all case evidence
3. timeline-report: Chronological timeline with deadlines and events
4. case-notes: All notes and observations for the case

Usage:
    engine = TemplateEngine()
    templates = engine.get_all_templates()
    formatted_data = await engine.apply_template("case-summary", case_export_data)

Note: This is separate from backend/services/template_service.py which handles
      case template CRUD operations. This engine is specifically for export
      document formatting.
"""

from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from fastapi import HTTPException


class Template(BaseModel):
    """Export template definition."""
    name: str = Field(..., description="Human-readable template name")
    description: str = Field(..., description="Template description")
    sections: List[str] = Field(..., description="Sections included in template")
    format_func: str = Field(..., description="Formatter function name")

    model_config = ConfigDict(arbitrary_types_allowed=True)


class TimelineEvent(BaseModel):
    """Timeline event for export."""
    id: int
    case_id: int
    title: str
    description: Optional[str] = None
    event_date: str = Field(..., description="ISO 8601 date string")
    event_type: str = Field(
        ...,
        description="Event type: deadline, hearing, filing, milestone, other"
    )
    completed: bool
    created_at: str = Field(..., description="ISO 8601 datetime string")
    updated_at: str = Field(..., description="ISO 8601 datetime string")

    model_config = ConfigDict(from_attributes=True)


class CaseExportData(BaseModel):
    """Complete case export data."""
    case: Dict[str, Any]
    evidence: List[Dict[str, Any]]
    timeline: List[TimelineEvent]
    deadlines: List[Dict[str, Any]]
    notes: List[Dict[str, Any]]
    facts: List[Dict[str, Any]]
    documents: List[Dict[str, Any]]
    export_date: datetime
    exported_by: str = Field(..., description="User who exported")

    model_config = ConfigDict(from_attributes=True)


class EvidenceExportData(BaseModel):
    """Evidence-focused export data."""
    case_id: int
    case_title: str
    evidence: List[Dict[str, Any]]
    export_date: datetime
    exported_by: str
    total_items: int
    category_summary: Dict[str, int]

    model_config = ConfigDict(from_attributes=True)


class TimelineExportData(BaseModel):
    """Timeline-focused export data."""
    case_id: int
    case_title: str
    events: List[TimelineEvent]
    deadlines: List[Dict[str, Any]]
    export_date: datetime
    exported_by: str
    upcoming_deadlines: List[Dict[str, Any]]
    completed_events: List[TimelineEvent]

    model_config = ConfigDict(from_attributes=True)


class NotesExportData(BaseModel):
    """Notes-focused export data."""
    case_id: int
    case_title: str
    notes: List[Dict[str, Any]]
    export_date: datetime
    exported_by: str
    total_notes: int

    model_config = ConfigDict(from_attributes=True)


class TemplateEngine:
    """
    Template engine for export document formatting.

    Manages pre-defined templates for different export types and applies
    formatting logic to prepare data for document generation (PDF/DOCX).

    This is NOT a text templating engine (like Jinja2). Instead, it provides
    structured data formatters that prepare export data for document generators.
    """

    def __init__(self, audit_logger=None):
        """
        Initialize template engine with default templates.

        Args:
            audit_logger: Optional audit logger for tracking template usage
        """
        self.audit_logger = audit_logger
        self.templates: Dict[str, Template] = {}
        self._initialize_default_templates()

    def _initialize_default_templates(self) -> None:
        """Register all default export templates."""

        # Case Summary Template
        self.templates["case-summary"] = Template(
            name="Case Summary",
            description="Complete case details with evidence, timeline, and notes",
            sections=["case", "evidence", "timeline", "notes", "facts"],
            format_func="format_case_summary"
        )

        # Evidence List Template
        self.templates["evidence-list"] = Template(
            name="Evidence List",
            description="Detailed inventory of all case evidence",
            sections=["evidence"],
            format_func="format_evidence_list"
        )

        # Timeline Report Template
        self.templates["timeline-report"] = Template(
            name="Timeline Report",
            description="Chronological timeline with deadlines and events",
            sections=["timeline", "deadlines"],
            format_func="format_timeline_report"
        )

        # Case Notes Template
        self.templates["case-notes"] = Template(
            name="Case Notes",
            description="All notes and observations for the case",
            sections=["notes"],
            format_func="format_case_notes"
        )

    def get_template(self, template_name: str) -> Optional[Template]:
        """
        Get a specific template by name.

        Args:
            template_name: Name of template to retrieve

        Returns:
            Template if found, None otherwise

        Example:
            template = engine.get_template("case-summary")
            if template:
                print(f"Template: {template.name}")
        """
        return self.templates.get(template_name)

    def get_all_templates(self) -> List[Template]:
        """
        Get all available templates.

        Returns:
            List of all registered templates

        Example:
            templates = engine.get_all_templates()
            for template in templates:
                print(f"{template.name}: {template.description}")
        """
        return list(self.templates.values())

    async def apply_template(
        self,
        template_name: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Apply template to format export data.

        Args:
            template_name: Name of template to apply
            data: Export data to format

        Returns:
            Formatted data ready for document generation

        Raises:
            HTTPException: 404 if template not found
            HTTPException: 500 if formatting fails

        Example:
            formatted = await engine.apply_template(
                "case-summary",
                case_export_data
            )
        """
        template = self.templates.get(template_name)

        if not template:
            if self.audit_logger:
                await self.audit_logger.log({
                    "event_type": "template_engine.template_not_found",
                    "resource_type": "template",
                    "resource_id": template_name,
                    "action": "apply",
                    "success": False,
                    "details": {"reason": "Template not found"}
                })

            raise HTTPException(
                status_code=404,
                detail=f"Template '{template_name}' not found"
            )

        try:
            # Get formatter function by name
            formatter = getattr(self, template.format_func)

            # Apply formatting
            formatted_data = formatter(data)

            if self.audit_logger:
                await self.audit_logger.log({
                    "event_type": "template_engine.apply",
                    "resource_type": "template",
                    "resource_id": template_name,
                    "action": "apply",
                    "success": True,
                    "details": {
                        "template": template.name,
                        "sections": template.sections
                    }
                })

            return formatted_data

        except AttributeError:
            error_msg = f"Formatter function '{template.format_func}' not found"

            if self.audit_logger:
                await self.audit_logger.log({
                    "event_type": "template_engine.apply",
                    "resource_type": "template",
                    "resource_id": template_name,
                    "action": "apply",
                    "success": False,
                    "error_message": error_msg
                })

            raise HTTPException(
                status_code=500,
                detail=error_msg
            )

        except Exception as error:
            error_msg = f"Failed to apply template: {str(error)}"

            if self.audit_logger:
                await self.audit_logger.log({
                    "event_type": "template_engine.apply",
                    "resource_type": "template",
                    "resource_id": template_name,
                    "action": "apply",
                    "success": False,
                    "error_message": str(error)
                })

            raise HTTPException(
                status_code=500,
                detail=error_msg
            )

    def format_case_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format complete case summary with all sections.

        Args:
            data: CaseExportData dictionary

        Returns:
            Formatted case summary data

        Sections included:
        - Case overview (title, status, dates, parties)
        - Evidence inventory (grouped by type/category)
        - Timeline (chronological events and deadlines)
        - Notes (all case notes with timestamps)
        - Facts (key case facts and findings)
        """
        formatted: Dict[str, Any] = {
            "document_type": "case_summary",
            "template_name": "Case Summary",
            "generated_at": datetime.now().isoformat(),
            "sections": {}
        }

        # Case overview section
        case = data.get("case", {})
        formatted["sections"]["case_overview"] = {
            "case_id": case.get("id"),
            "title": case.get("title"),
            "case_type": case.get("case_type"),
            "status": case.get("status"),
            "created_at": case.get("created_at"),
            "updated_at": case.get("updated_at"),
            "description": case.get("description", ""),
            "parties": self._extract_parties(case)
        }

        # Evidence section
        evidence = data.get("evidence", [])
        formatted["sections"]["evidence"] = {
            "total_items": len(evidence),
            "items": self._format_evidence_items(evidence),
            "by_category": self._group_evidence_by_category(evidence)
        }

        # Timeline section
        timeline = data.get("timeline", [])
        deadlines = data.get("deadlines", [])
        formatted["sections"]["timeline"] = {
            "total_events": len(timeline),
            "total_deadlines": len(deadlines),
            "events": self._format_timeline_events(timeline),
            "deadlines": self._format_deadlines(deadlines),
            "upcoming": self._filter_upcoming_deadlines(deadlines)
        }

        # Notes section
        notes = data.get("notes", [])
        formatted["sections"]["notes"] = {
            "total_notes": len(notes),
            "items": self._format_notes(notes)
        }

        # Facts section
        facts = data.get("facts", [])
        formatted["sections"]["facts"] = {
            "total_facts": len(facts),
            "items": self._format_facts(facts)
        }

        # Export metadata
        formatted["metadata"] = {
            "export_date": data.get("export_date", datetime.now()).isoformat(),
            "exported_by": data.get("exported_by", "Unknown")
        }

        return formatted

    def format_evidence_list(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format detailed evidence inventory.

        Args:
            data: EvidenceExportData dictionary

        Returns:
            Formatted evidence list with categorization
        """
        evidence = data.get("evidence", [])

        formatted: Dict[str, Any] = {
            "document_type": "evidence_list",
            "template_name": "Evidence List",
            "generated_at": datetime.now().isoformat(),
            "case_id": data.get("case_id"),
            "case_title": data.get("case_title"),
            "total_items": data.get("total_items", len(evidence)),
            "evidence": {
                "items": self._format_evidence_items(evidence),
                "by_category": self._group_evidence_by_category(evidence),
                "summary": data.get("category_summary", {})
            },
            "metadata": {
                "export_date": data.get("export_date", datetime.now()).isoformat(),
                "exported_by": data.get("exported_by", "Unknown")
            }
        }

        return formatted

    def format_timeline_report(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format chronological timeline with events and deadlines.

        Args:
            data: TimelineExportData dictionary

        Returns:
            Formatted timeline report
        """
        events = data.get("events", [])
        deadlines = data.get("deadlines", [])

        formatted: Dict[str, Any] = {
            "document_type": "timeline_report",
            "template_name": "Timeline Report",
            "generated_at": datetime.now().isoformat(),
            "case_id": data.get("case_id"),
            "case_title": data.get("case_title"),
            "timeline": {
                "events": self._format_timeline_events(events),
                "deadlines": self._format_deadlines(deadlines),
                "upcoming_deadlines": data.get("upcoming_deadlines", []),
                "completed_events": [
                    e for e in events if e.get("completed", False)
                ],
                "chronological": self._merge_timeline_and_deadlines(events, deadlines)
            },
            "statistics": {
                "total_events": len(events),
                "total_deadlines": len(deadlines),
                "completed_events": sum(1 for e in events if e.get("completed", False)),
                "upcoming_deadlines": len(data.get("upcoming_deadlines", []))
            },
            "metadata": {
                "export_date": data.get("export_date", datetime.now()).isoformat(),
                "exported_by": data.get("exported_by", "Unknown")
            }
        }

        return formatted

    def format_case_notes(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format all case notes and observations.

        Args:
            data: NotesExportData dictionary

        Returns:
            Formatted notes document
        """
        notes = data.get("notes", [])

        formatted: Dict[str, Any] = {
            "document_type": "case_notes",
            "template_name": "Case Notes",
            "generated_at": datetime.now().isoformat(),
            "case_id": data.get("case_id"),
            "case_title": data.get("case_title"),
            "total_notes": data.get("total_notes", len(notes)),
            "notes": {
                "items": self._format_notes(notes),
                "chronological": sorted(
                    notes,
                    key=lambda n: n.get("created_at", ""),
                    reverse=True
                )
            },
            "metadata": {
                "export_date": data.get("export_date", datetime.now()).isoformat(),
                "exported_by": data.get("exported_by", "Unknown")
            }
        }

        return formatted

    # Helper methods for formatting sections

    def _extract_parties(self, case: Dict[str, Any]) -> Dict[str, Any]:
        """Extract party information from case data."""
        return {
            "plaintiff": case.get("plaintiff", ""),
            "defendant": case.get("defendant", ""),
            "other_parties": case.get("other_parties", [])
        }

    def _format_evidence_items(self, evidence: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format evidence items with consistent structure."""
        return [
            {
                "id": item.get("id"),
                "title": item.get("title"),
                "type": item.get("evidence_type"),
                "category": item.get("category"),
                "description": item.get("description", ""),
                "file_path": item.get("file_path"),
                "collected_date": item.get("collected_date"),
                "added_date": item.get("created_at")
            }
            for item in evidence
        ]

    def _group_evidence_by_category(
        self,
        evidence: List[Dict[str, Any]]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Group evidence items by category."""
        grouped: Dict[str, List[Dict[str, Any]]] = {}

        for item in evidence:
            category = item.get("category", "Uncategorized")
            if category not in grouped:
                grouped[category] = []
            grouped[category].append(item)

        return grouped

    def _format_timeline_events(
        self,
        events: List[Any]
    ) -> List[Dict[str, Any]]:
        """Format timeline events with consistent structure."""
        formatted_events = []

        for event in events:
            # Handle both dict and TimelineEvent objects
            if isinstance(event, dict):
                formatted_events.append({
                    "id": event.get("id"),
                    "title": event.get("title"),
                    "description": event.get("description", ""),
                    "event_date": event.get("event_date"),
                    "event_type": event.get("event_type"),
                    "completed": event.get("completed", False)
                })
            else:
                formatted_events.append({
                    "id": event.id,
                    "title": event.title,
                    "description": event.description or "",
                    "event_date": event.event_date,
                    "event_type": event.event_type,
                    "completed": event.completed
                })

        return formatted_events

    def _format_deadlines(self, deadlines: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format deadline items with consistent structure."""
        return [
            {
                "id": item.get("id"),
                "title": item.get("title"),
                "description": item.get("description", ""),
                "deadline_date": item.get("deadline_date"),
                "priority": item.get("priority"),
                "completed": item.get("completed", False)
            }
            for item in deadlines
        ]

    def _filter_upcoming_deadlines(
        self,
        deadlines: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Filter deadlines to show only upcoming (not completed)."""
        now = datetime.now()

        upcoming = []
        for deadline in deadlines:
            if deadline.get("completed", False):
                continue

            deadline_date_str = deadline.get("deadline_date")
            if deadline_date_str:
                try:
                    deadline_date = datetime.fromisoformat(deadline_date_str)
                    if deadline_date >= now:
                        upcoming.append(deadline)
                except (ValueError, TypeError):
                    continue

        return upcoming

    def _format_notes(self, notes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format note items with consistent structure."""
        return [
            {
                "id": item.get("id"),
                "content": item.get("content"),
                "created_at": item.get("created_at"),
                "updated_at": item.get("updated_at"),
                "author": item.get("author", "Unknown")
            }
            for item in notes
        ]

    def _format_facts(self, facts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format fact items with consistent structure."""
        return [
            {
                "id": item.get("id"),
                "statement": item.get("statement"),
                "category": item.get("category", "general"),
                "importance": item.get("importance", "medium"),
                "verified": item.get("verified", False),
                "created_at": item.get("created_at")
            }
            for item in facts
        ]

    def _merge_timeline_and_deadlines(
        self,
        events: List[Any],
        deadlines: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Merge events and deadlines into chronological order."""
        merged = []

        # Add events
        for event in events:
            if isinstance(event, dict):
                merged.append({
                    "type": "event",
                    "date": event.get("event_date"),
                    "title": event.get("title"),
                    "description": event.get("description", ""),
                    "data": event
                })
            else:
                merged.append({
                    "type": "event",
                    "date": event.event_date,
                    "title": event.title,
                    "description": event.description or "",
                    "data": {
                        "id": event.id,
                        "event_type": event.event_type,
                        "completed": event.completed
                    }
                })

        # Add deadlines
        for deadline in deadlines:
            merged.append({
                "type": "deadline",
                "date": deadline.get("deadline_date"),
                "title": deadline.get("title"),
                "description": deadline.get("description", ""),
                "data": deadline
            })

        # Sort by date
        merged.sort(key=lambda x: x.get("date", ""), reverse=True)

        return merged
