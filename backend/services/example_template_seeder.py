"""
Example usage of TemplateSeeder service.

This file demonstrates various ways to use the TemplateSeeder service
to seed the database with built-in system templates.

Run with: python backend/services/example_template_seeder.py
"""

import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.services.template_seeder import TemplateSeeder, TemplateSeederError
from backend.services.audit_logger import AuditLogger


def example_1_basic_seeding():
    """
    Example 1: Basic template seeding with in-memory database.
    """
    print("\n" + "="*70)
    print("Example 1: Basic Template Seeding")
    print("="*70)

    # Create in-memory database for demo
    engine = create_engine("sqlite:///:memory:")
    Session = sessionmaker(bind=engine)
    db = Session()

    # Create tables (simplified for demo)
    db.execute("""
        CREATE TABLE IF NOT EXISTS case_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL,
            is_system_template INTEGER DEFAULT 0,
            user_id INTEGER,
            template_fields_json TEXT NOT NULL,
            suggested_evidence_types_json TEXT,
            timeline_milestones_json TEXT,
            checklist_items_json TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    db.commit()

    # Initialize seeder
    seeder = TemplateSeeder(db)

    # Seed all templates
    print("\n📋 Seeding templates...")
    result = seeder.seed_all()

    # Display results
    print(f"\n✓ Seeding Complete!")
    print(f"  Total templates: {result['total_templates']}")
    print(f"  Seeded: {result['seeded']}")
    print(f"  Skipped: {result['skipped']}")
    print(f"  Failed: {result['failed']}")

    if result['template_names']:
        print(f"\n📝 Templates created:")
        for name in result['template_names']:
            print(f"  - {name}")

    # Verify templates in database
    templates = db.execute("SELECT name FROM case_templates WHERE is_system_template = 1").fetchall()
    print(f"\n✓ {len(templates)} system templates in database")

    db.close()


def example_2_idempotency_check():
    """
    Example 2: Demonstrate idempotency (running twice doesn't create duplicates).
    """
    print("\n" + "="*70)
    print("Example 2: Idempotency Check")
    print("="*70)

    # Create in-memory database
    engine = create_engine("sqlite:///:memory:")
    Session = sessionmaker(bind=engine)
    db = Session()

    # Create tables
    db.execute("""
        CREATE TABLE IF NOT EXISTS case_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL,
            is_system_template INTEGER DEFAULT 0,
            user_id INTEGER,
            template_fields_json TEXT NOT NULL,
            suggested_evidence_types_json TEXT,
            timeline_milestones_json TEXT,
            checklist_items_json TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    db.commit()

    seeder = TemplateSeeder(db)

    # First run
    print("\n📋 First run...")
    result1 = seeder.seed_all()
    print(f"  Seeded: {result1['seeded']}")
    print(f"  Skipped: {result1['skipped']}")

    # Second run (should skip all)
    print("\n📋 Second run (should skip all existing templates)...")
    result2 = seeder.seed_all()
    print(f"  Seeded: {result2['seeded']}")
    print(f"  Skipped: {result2['skipped']}")

    # Verify no duplicates
    count = db.execute("SELECT COUNT(*) FROM case_templates WHERE is_system_template = 1").fetchone()[0]
    print(f"\n✓ Total system templates in database: {count}")
    print(f"  (Should be 8, not 16)")

    assert count == 8, "Duplicate templates created!"
    print("\n✅ Idempotency verified: No duplicates created")

    db.close()


def example_3_with_audit_logging():
    """
    Example 3: Template seeding with audit logging.
    """
    print("\n" + "="*70)
    print("Example 3: Seeding with Audit Logging")
    print("="*70)

    # Create in-memory database
    engine = create_engine("sqlite:///:memory:")
    Session = sessionmaker(bind=engine)
    db = Session()

    # Create tables (including audit log)
    db.execute("""
        CREATE TABLE IF NOT EXISTS case_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL,
            is_system_template INTEGER DEFAULT 0,
            user_id INTEGER,
            template_fields_json TEXT NOT NULL,
            suggested_evidence_types_json TEXT,
            timeline_milestones_json TEXT,
            checklist_items_json TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    db.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            user_id TEXT,
            resource_type TEXT,
            resource_id TEXT,
            action TEXT NOT NULL,
            success INTEGER NOT NULL,
            details TEXT,
            error_message TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    db.commit()

    # Initialize audit logger
    audit_logger = AuditLogger(db)

    # Initialize seeder with audit logger
    seeder = TemplateSeeder(db, audit_logger)

    print("\n📋 Seeding templates with audit logging...")
    result = seeder.seed_all()

    print(f"\n✓ Seeded {result['seeded']} templates")

    # Check audit logs
    audit_count = db.execute("SELECT COUNT(*) FROM audit_logs WHERE event_type LIKE 'template.%'").fetchone()[0]
    print(f"✓ {audit_count} audit log entries created")

    # Display some audit log entries
    logs = db.execute("""
        SELECT event_type, action, success, details
        FROM audit_logs
        WHERE event_type LIKE 'template.%'
        LIMIT 5
    """).fetchall()

    if logs:
        print("\n📊 Sample audit log entries:")
        for log in logs:
            event_type, action, success, details = log
            status = "✓" if success else "✗"
            print(f"  {status} {event_type} | {action}")

    db.close()


def example_4_error_handling():
    """
    Example 4: Demonstrate error handling and rollback.
    """
    print("\n" + "="*70)
    print("Example 4: Error Handling")
    print("="*70)

    # Create in-memory database
    engine = create_engine("sqlite:///:memory:")
    Session = sessionmaker(bind=engine)
    db = Session()

    # Create tables with a constraint that will cause error
    db.execute("""
        CREATE TABLE IF NOT EXISTS case_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,  -- UNIQUE constraint
            description TEXT,
            category TEXT NOT NULL,
            is_system_template INTEGER DEFAULT 0,
            user_id INTEGER,
            template_fields_json TEXT NOT NULL,
            suggested_evidence_types_json TEXT,
            timeline_milestones_json TEXT,
            checklist_items_json TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    db.commit()

    seeder = TemplateSeeder(db)

    print("\n📋 First seeding (should succeed)...")
    try:
        result1 = seeder.seed_all()
        print(f"  ✓ Seeded: {result1['seeded']}")
    except TemplateSeederError as e:
        print(f"  ✗ Error: {e}")

    # Try to seed again with UNIQUE constraint violation
    print("\n📋 Second seeding (should skip existing templates)...")
    try:
        result2 = seeder.seed_all()
        print(f"  ✓ Seeded: {result2['seeded']}")
        print(f"  ⊘ Skipped: {result2['skipped']}")
    except TemplateSeederError as e:
        print(f"  ✗ Error: {e}")

    db.close()


def example_5_inspect_template_details():
    """
    Example 5: Inspect details of seeded templates.
    """
    print("\n" + "="*70)
    print("Example 5: Inspect Template Details")
    print("="*70)

    # Create in-memory database
    engine = create_engine("sqlite:///:memory:")
    Session = sessionmaker(bind=engine)
    db = Session()

    # Create tables
    db.execute("""
        CREATE TABLE IF NOT EXISTS case_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL,
            is_system_template INTEGER DEFAULT 0,
            user_id INTEGER,
            template_fields_json TEXT NOT NULL,
            suggested_evidence_types_json TEXT,
            timeline_milestones_json TEXT,
            checklist_items_json TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    db.commit()

    seeder = TemplateSeeder(db)

    print("\n📋 Seeding templates...")
    result = seeder.seed_all()
    print(f"  ✓ Seeded {result['seeded']} templates")

    # Fetch and display template details
    templates = db.execute("""
        SELECT id, name, category, description
        FROM case_templates
        WHERE is_system_template = 1
        ORDER BY category, name
    """).fetchall()

    print("\n📝 Template Details:")
    current_category = None
    for template_id, name, category, description in templates:
        if category != current_category:
            print(f"\n  📁 {category.upper()}")
            current_category = category

        print(f"    • {name}")
        if description:
            desc_short = description[:60] + "..." if len(description) > 60 else description
            print(f"      {desc_short}")

    # Show statistics by category
    print("\n📊 Templates by Category:")
    category_counts = db.execute("""
        SELECT category, COUNT(*) as count
        FROM case_templates
        WHERE is_system_template = 1
        GROUP BY category
        ORDER BY count DESC
    """).fetchall()

    for category, count in category_counts:
        print(f"  {category}: {count} template(s)")

    db.close()


def example_6_cli_script():
    """
    Example 6: CLI-style script for production use.
    """
    print("\n" + "="*70)
    print("Example 6: Production CLI Script")
    print("="*70)

    # Create in-memory database
    engine = create_engine("sqlite:///:memory:")
    Session = sessionmaker(bind=engine)
    db = Session()

    # Create tables
    db.execute("""
        CREATE TABLE IF NOT EXISTS case_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL,
            is_system_template INTEGER DEFAULT 0,
            user_id INTEGER,
            template_fields_json TEXT NOT NULL,
            suggested_evidence_types_json TEXT,
            timeline_milestones_json TEXT,
            checklist_items_json TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    db.commit()

    seeder = TemplateSeeder(db)

    print("\n" + "="*70)
    print("Justice Companion - Template Seeder")
    print("="*70)
    print("\nSeeding system templates...")

    try:
        result = seeder.seed_all()

        print("\n" + "="*70)
        print("Seeding Results")
        print("="*70)
        print(f"Total templates: {result['total_templates']}")
        print(f"✓ Seeded: {result['seeded']}")
        print(f"⊘ Skipped (already exist): {result['skipped']}")
        print(f"✗ Failed: {result['failed']}")

        if result['template_names']:
            print("\nTemplates seeded:")
            for name in result['template_names']:
                print(f"  • {name}")

        if result['failed'] > 0:
            print("\n⚠ Some templates failed to seed. Check logs for details.")
            return False

        print("\n✅ Template seeding complete!")
        return True

    except TemplateSeederError as e:
        print(f"\n✗ Seeding failed: {e}")
        return False
    finally:
        db.close()


def main():
    """Run all examples."""
    print("\n" + "="*70)
    print("TemplateSeeder - Example Usage")
    print("="*70)
    print("\nThis script demonstrates various uses of the TemplateSeeder service.")
    print("Each example uses an in-memory database for demonstration.")

    examples = [
        example_1_basic_seeding,
        example_2_idempotency_check,
        example_3_with_audit_logging,
        example_4_error_handling,
        example_5_inspect_template_details,
        example_6_cli_script
    ]

    for i, example_func in enumerate(examples, 1):
        try:
            example_func()
        except Exception as e:
            print(f"\n✗ Example {i} failed: {e}")
            import traceback
            traceback.print_exc()

    print("\n" + "="*70)
    print("✅ All examples complete!")
    print("="*70)
    print("\nFor more information, see:")
    print("  • TEMPLATE_SEEDER_README.md - Complete documentation")
    print("  • TEMPLATE_SEEDER_MIGRATION.md - Migration guide")
    print("  • test_template_seeder.py - Comprehensive test suite")
    print("="*70 + "\n")


if __name__ == "__main__":
    main()
