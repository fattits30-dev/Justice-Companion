"""
Export services module for Justice Companion.

This module contains services for generating export documents:
- TemplateEngine: Format export data using pre-defined templates
- DOCXGenerator: Generate Microsoft Word documents (.docx) [optional]
"""

    TemplateEngine,
    Template,
    TimelineEvent as TemplateTimelineEvent,
    CaseExportData as TemplateCaseExportData,
    EvidenceExportData as TemplateEvidenceExportData,
    TimelineExportData as TemplateTimelineExportData,
    NotesExportData as TemplateNotesExportData,
)

__all__ = [
    # Template Engine (always available)
    "TemplateEngine",
    "Template",
    "TemplateTimelineEvent",
    "TemplateCaseExportData",
    "TemplateEvidenceExportData",
    "TemplateTimelineExportData",
    "TemplateNotesExportData",
]

# Optional imports (require python-docx)
try:
    pass

    __all__.extend(
        [
            # DOCX Generator (optional)
            "DOCXGenerator",
            "CaseExportData",
            "EvidenceExportData",
            "TimelineExportData",
            "NotesExportData",
            "Case",
            "Evidence",
            "Note",
            "TimelineEvent",
        ]
    )
except ImportError:
    # python-docx not installed, DOCX generator unavailable
    pass
