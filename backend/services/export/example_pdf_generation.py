#!/usr/bin/env python3
"""
Example script demonstrating PDF Generator usage.

This script shows how to use the PDFGenerator service to create various
types of PDF reports for Justice Companion.

Run with:
    python backend/services/export/example_pdf_generation.py
"""

import asyncio
from datetime import datetime
from pathlib import Path

from backend.services.export.pdf_generator import (
    PDFGenerator,
    CaseExportData,
    EvidenceExportData,
    NotesExportData,
    CaseData,
    Evidence,
    TimelineEvent,
    Deadline,
    Note,
    CaseFact,
    DocumentStyles,
)


async def example_case_summary():
    """Generate a case summary PDF example."""
    print("\n" + "=" * 70)
    print("Example 1: Case Summary PDF")
    print("=" * 70)

    # Create PDF generator with default styles
    generator = PDFGenerator()

    # Prepare sample case data
    case_data = CaseExportData(
        case=CaseData(
            id=1,
            title="Smith v. TechCorp Ltd - Employment Discrimination",
            description=(
                "This case involves allegations of employment discrimination based on age. "
                "The claimant, Jane Smith, was allegedly passed over for promotion in favor "
                "of younger, less qualified candidates. The case includes evidence of "
                "discriminatory comments made by management and a pattern of similar "
                "treatment towards other employees over 50."
            ),
            case_type="employment",
            status="active",
            created_at="2024-11-15T09:00:00",
            updated_at="2025-01-13T14:30:00",
        ),
        evidence=[
            Evidence(
                id=1,
                case_id=1,
                title="Employment Contract",
                evidence_type="document",
                obtained_date="2024-11-20T00:00:00",
                file_path="/evidence/contracts/employment_contract_2020.pdf",
                content="Original employment contract dated June 15, 2020, showing promised career progression path.",
                created_at="2024-11-20T10:00:00",
                updated_at="2024-11-20T10:00:00",
            ),
            Evidence(
                id=2,
                case_id=1,
                title="Performance Reviews 2020-2024",
                evidence_type="document",
                obtained_date="2024-11-21T00:00:00",
                file_path="/evidence/reviews/performance_reviews.pdf",
                content="Annual performance reviews showing consistently excellent ratings.",
                created_at="2024-11-21T10:00:00",
                updated_at="2024-11-21T10:00:00",
            ),
            Evidence(
                id=3,
                case_id=1,
                title="Email from Manager - Ageist Comments",
                evidence_type="email",
                obtained_date="2024-11-22T00:00:00",
                file_path="/evidence/emails/manager_email_2024_09_10.eml",
                content="Email chain where manager stated 'We need fresh blood' and 'younger energy' in promotion discussions.",
                created_at="2024-11-22T10:00:00",
                updated_at="2024-11-22T10:00:00",
            ),
        ],
        timeline=[
            TimelineEvent(
                id=1,
                case_id=1,
                title="Initial Consultation",
                description="First meeting with client to discuss case details and evidence.",
                event_date="2024-11-15T09:00:00",
                event_type="milestone",
                completed=True,
                created_at="2024-11-15T09:00:00",
                updated_at="2024-11-15T09:00:00",
            ),
            TimelineEvent(
                id=2,
                case_id=1,
                title="Evidence Collection Phase",
                description="Gathered employment documents, emails, and witness statements.",
                event_date="2024-11-20T00:00:00",
                event_type="milestone",
                completed=True,
                created_at="2024-11-20T10:00:00",
                updated_at="2024-12-01T10:00:00",
            ),
            TimelineEvent(
                id=3,
                case_id=1,
                title="Pre-Action Letter Sent",
                description="Formal letter sent to employer outlining discrimination claims.",
                event_date="2024-12-10T00:00:00",
                event_type="filing",
                completed=True,
                created_at="2024-12-10T10:00:00",
                updated_at="2024-12-10T10:00:00",
            ),
        ],
        deadlines=[
            Deadline(
                id=1,
                case_id=1,
                title="Employer Response Due",
                description="Employer must respond to pre-action letter within 28 days.",
                deadline_date="2025-01-07T00:00:00",
                priority="high",
                status="completed",
                created_at="2024-12-10T10:00:00",
                updated_at="2025-01-07T16:00:00",
            ),
            Deadline(
                id=2,
                case_id=1,
                title="Tribunal Claim Submission",
                description="Submit claim to Employment Tribunal if settlement not reached.",
                deadline_date="2025-02-14T00:00:00",
                priority="critical",
                status="pending",
                created_at="2024-12-10T10:00:00",
                updated_at="2024-12-10T10:00:00",
            ),
            Deadline(
                id=3,
                case_id=1,
                title="Mediation Session",
                description="Attend mandatory ACAS mediation session.",
                deadline_date="2025-01-28T10:00:00",
                priority="high",
                status="pending",
                created_at="2024-12-15T10:00:00",
                updated_at="2024-12-15T10:00:00",
            ),
        ],
        notes=[
            Note(
                id=1,
                case_id=1,
                title="Initial Assessment",
                content=(
                    "Strong case based on direct evidence of age discrimination. "
                    "Client has excellent performance record and multiple witnesses. "
                    "Recommend pursuing full tribunal claim if settlement offer inadequate."
                ),
                created_at="2024-11-15T10:00:00",
                updated_at="2024-11-15T10:00:00",
            ),
            Note(
                id=2,
                case_id=1,
                title="Witness Statements",
                content=(
                    "Interviewed three colleagues who corroborate age discrimination. "
                    "All willing to provide formal statements. Two have experienced similar treatment."
                ),
                created_at="2024-11-25T14:00:00",
                updated_at="2024-11-25T14:00:00",
            ),
            Note(
                id=3,
                case_id=1,
                title="Employer Response Analysis",
                content=(
                    "Employer's response denies discrimination but admits promotion was given to younger candidate. "
                    "Their justification is weak and contradicts documented performance reviews. "
                    "Strong grounds to proceed to tribunal."
                ),
                created_at="2025-01-08T09:30:00",
                updated_at="2025-01-08T09:30:00",
            ),
        ],
        facts=[
            CaseFact(
                id=1,
                case_id=1,
                fact_content="Claimant (age 52) passed over for promotion despite 15 years service and excellent reviews",
                fact_category="discrimination",
                importance="critical",
                created_at="2024-11-15T10:00:00",
                updated_at="2024-11-15T10:00:00",
            ),
            CaseFact(
                id=2,
                case_id=1,
                fact_content="Successful candidate was 28 years old with 3 years experience and lower performance ratings",
                fact_category="comparative_evidence",
                importance="critical",
                created_at="2024-11-15T10:00:00",
                updated_at="2024-11-15T10:00:00",
            ),
            CaseFact(
                id=3,
                case_id=1,
                fact_content="Manager made documented ageist comments in email correspondence",
                fact_category="direct_evidence",
                importance="critical",
                created_at="2024-11-22T10:00:00",
                updated_at="2024-11-22T10:00:00",
            ),
            CaseFact(
                id=4,
                case_id=1,
                fact_content="Three other employees over 50 report similar treatment in past 2 years",
                fact_category="pattern_evidence",
                importance="high",
                created_at="2024-11-25T14:00:00",
                updated_at="2024-11-25T14:00:00",
            ),
        ],
        export_date=datetime.now(),
        exported_by="Sarah Johnson, Solicitor",
    )

    # Generate PDF
    print("Generating case summary PDF...")
    pdf_bytes = await generator.generate_case_summary(case_data)

    # Save to file
    output_path = Path("case_summary_example.pdf")
    with open(output_path, "wb") as f:
        f.write(pdf_bytes)

    print(f"✓ Case summary PDF generated: {output_path}")
    print(f"  File size: {len(pdf_bytes):,} bytes")
    print(
        f"  Sections: Case info, {len(case_data.evidence)} evidence items, "
        f"{len(case_data.timeline)} timeline events, {len(case_data.deadlines)} deadlines, "
        f"{len(case_data.notes)} notes, {len(case_data.facts)} facts"
    )


async def example_evidence_list():
    """Generate an evidence list PDF example."""
    print("\n" + "=" * 70)
    print("Example 2: Evidence Inventory Report PDF")
    print("=" * 70)

    generator = PDFGenerator()

    evidence_data = EvidenceExportData(
        case_id=1,
        case_title="Smith v. TechCorp Ltd - Employment Discrimination",
        evidence=[
            Evidence(
                id=1,
                case_id=1,
                title="Employment Contract",
                evidence_type="document",
                obtained_date="2024-11-20T00:00:00",
                file_path="/evidence/contracts/employment_contract_2020.pdf",
                content="Original employment contract",
                created_at="2024-11-20T10:00:00",
                updated_at="2024-11-20T10:00:00",
            ),
            Evidence(
                id=2,
                case_id=1,
                title="Performance Reviews",
                evidence_type="document",
                obtained_date="2024-11-21T00:00:00",
                file_path="/evidence/reviews/performance_reviews.pdf",
                content="Annual performance reviews",
                created_at="2024-11-21T10:00:00",
                updated_at="2024-11-21T10:00:00",
            ),
            Evidence(
                id=3,
                case_id=1,
                title="Ageist Comments Email",
                evidence_type="email",
                obtained_date="2024-11-22T00:00:00",
                file_path="/evidence/emails/manager_email.eml",
                content="Email with discriminatory language",
                created_at="2024-11-22T10:00:00",
                updated_at="2024-11-22T10:00:00",
            ),
            Evidence(
                id=4,
                case_id=1,
                title="Witness Statement - John Doe",
                evidence_type="witness_statement",
                obtained_date="2024-11-25T00:00:00",
                file_path="/evidence/witnesses/john_doe_statement.pdf",
                content="Corroborating witness statement",
                created_at="2024-11-25T10:00:00",
                updated_at="2024-11-25T10:00:00",
            ),
            Evidence(
                id=5,
                case_id=1,
                title="Promotion Decision Meeting Minutes",
                evidence_type="document",
                obtained_date="2024-11-26T00:00:00",
                file_path="/evidence/meetings/promotion_meeting_2024_09.pdf",
                content="Minutes showing promotion decision process",
                created_at="2024-11-26T10:00:00",
                updated_at="2024-11-26T10:00:00",
            ),
        ],
        export_date=datetime.now(),
        exported_by="Sarah Johnson, Solicitor",
        total_items=5,
        category_summary={
            "document": 3,
            "email": 1,
            "witness_statement": 1,
        },
    )

    print("Generating evidence list PDF...")
    pdf_bytes = await generator.generate_evidence_list(evidence_data)

    output_path = Path("evidence_list_example.pdf")
    with open(output_path, "wb") as f:
        f.write(pdf_bytes)

    print(f"✓ Evidence list PDF generated: {output_path}")
    print(f"  File size: {len(pdf_bytes):,} bytes")
    print(f"  Total items: {evidence_data.total_items}")
    print(f"  Categories: {evidence_data.category_summary}")


async def example_custom_styling():
    """Generate a PDF with custom styling."""
    print("\n" + "=" * 70)
    print("Example 3: Custom Styled PDF")
    print("=" * 70)

    # Create custom styles
    custom_styles = DocumentStyles(
        title_font_size=28,
        title_color="#000000",
        heading1_font_size=20,
        heading1_color="#1a1a1a",
        heading2_font_size=16,
        heading2_color="#333333",
        body_font_size=12,
        body_line_height=1.8,
        footer_font_size=10,
        footer_color="#666666",
    )

    generator = PDFGenerator(styles=custom_styles)

    notes_data = NotesExportData(
        case_id=1,
        case_title="Smith v. TechCorp Ltd - Employment Discrimination",
        notes=[
            Note(
                id=1,
                case_id=1,
                title="Case Strategy",
                content=(
                    "Focus on direct evidence of age discrimination. "
                    "Highlight pattern of behavior towards employees over 50. "
                    "Prepare for strong defense arguments regarding business reasons."
                ),
                created_at="2024-11-15T10:00:00",
                updated_at="2024-11-15T10:00:00",
            ),
            Note(
                id=2,
                case_id=1,
                title="Settlement Discussion",
                content=(
                    "Client willing to consider settlement if offer includes: "
                    "1) Compensation equivalent to 18 months salary "
                    "2) Written apology and commitment to age diversity training "
                    "3) Positive reference letter"
                ),
                created_at="2025-01-10T14:00:00",
                updated_at="2025-01-10T14:00:00",
            ),
        ],
        export_date=datetime.now(),
        exported_by="Sarah Johnson, Solicitor",
        total_notes=2,
    )

    print("Generating custom styled notes PDF...")
    pdf_bytes = await generator.generate_case_notes(notes_data)

    output_path = Path("case_notes_custom_style_example.pdf")
    with open(output_path, "wb") as f:
        f.write(pdf_bytes)

    print(f"✓ Custom styled PDF generated: {output_path}")
    print(f"  File size: {len(pdf_bytes):,} bytes")
    print(f"  Custom styles applied: Larger fonts, increased line height")


async def main():
    """Run all examples."""
    print("\n" + "=" * 70)
    print("PDF Generator Service - Example Usage")
    print("=" * 70)
    print("\nThis script demonstrates the PDF Generator service by creating")
    print("example PDF reports for a sample employment discrimination case.")
    print("\nGenerated PDFs will be saved in the current directory.")

    try:
        # Run examples
        await example_case_summary()
        await example_evidence_list()
        await example_custom_styling()

        print("\n" + "=" * 70)
        print("All examples completed successfully!")
        print("=" * 70)
        print("\nGenerated files:")
        print("  1. case_summary_example.pdf")
        print("  2. evidence_list_example.pdf")
        print("  3. case_notes_custom_style_example.pdf")
        print("\nOpen these files to view the generated PDFs.")

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback

        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
