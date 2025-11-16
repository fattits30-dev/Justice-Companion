#!/usr/bin/env python3
"""
SearchIndexBuilder Usage Examples
Demonstrates all key functionality of the search index builder service.
"""

import asyncio
import json
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.services.search_index_builder import SearchIndexBuilder
from backend.services.encryption_service import EncryptionService


# ===== SETUP =====

def get_database_session():
    """Create database session (replace with your actual DB config)."""
    engine = create_engine("sqlite:///justice_companion.db")
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


def get_encryption_service():
    """Get encryption service (replace with your actual key management)."""
    # In production, load from environment or KeyManager
    encryption_key = "your-base64-encoded-encryption-key-here"
    return EncryptionService(encryption_key=encryption_key)


# ===== EXAMPLE 1: FULL INDEX REBUILD (ADMIN ONLY) =====

async def example_full_rebuild():
    """
    Example: Rebuild entire search index for all users.

    ⚠️ ADMIN ONLY - This clears and rebuilds the entire index.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 1: Full Index Rebuild (Admin Only)")
    print("=" * 60)

    db = get_database_session()
    encryption_service = get_encryption_service()
    builder = SearchIndexBuilder(db=db, encryption_service=encryption_service)

    try:
        print("Starting full index rebuild...")
        await builder.rebuild_index()
        print("✓ Index rebuilt successfully!")

        # Get statistics
        stats = await builder.get_index_stats()
        print(f"\nIndex Statistics:")
        print(f"  Total documents: {stats['total_documents']}")
        print(f"  By type: {stats['documents_by_type']}")
        print(f"  Last updated: {stats['last_updated']}")

    except Exception as e:
        print(f"✗ Rebuild failed: {e}")
    finally:
        db.close()


# ===== EXAMPLE 2: USER-SPECIFIC INDEX REBUILD =====

async def example_user_rebuild():
    """
    Example: Rebuild search index for specific user.

    This is safe for production and only affects one user.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 2: User-Specific Index Rebuild")
    print("=" * 60)

    db = get_database_session()
    encryption_service = get_encryption_service()
    builder = SearchIndexBuilder(db=db, encryption_service=encryption_service)

    user_id = 1

    try:
        print(f"Rebuilding index for user {user_id}...")
        await builder.rebuild_index_for_user(user_id)
        print(f"✓ Index rebuilt for user {user_id}!")

        # Get updated statistics
        stats = await builder.get_index_stats()
        print(f"\nIndex Statistics:")
        print(f"  Total documents: {stats['total_documents']}")
        print(f"  Cases: {stats['documents_by_type'].get('case', 0)}")
        print(f"  Evidence: {stats['documents_by_type'].get('evidence', 0)}")
        print(f"  Conversations: {stats['documents_by_type'].get('conversation', 0)}")
        print(f"  Notes: {stats['documents_by_type'].get('note', 0)}")

    except Exception as e:
        print(f"✗ Rebuild failed: {e}")
    finally:
        db.close()


# ===== EXAMPLE 3: INDEX A NEW CASE =====

async def example_index_case():
    """
    Example: Index a single case.

    Use this when creating or updating a case.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 3: Index a Single Case")
    print("=" * 60)

    db = get_database_session()
    encryption_service = get_encryption_service()
    builder = SearchIndexBuilder(db=db, encryption_service=encryption_service)

    # Example case data
    case_data = {
        "id": 1,
        "user_id": 1,
        "title": "Smith v. Jones Contract Dispute #urgent",
        "description": "Contract dispute over payment terms for services rendered on 2025-01-15. Contact: attorney@lawfirm.com",
        "case_type": "civil",
        "status": "active",
        "created_at": datetime.utcnow().isoformat()
    }

    try:
        print("Indexing case...")
        print(f"  Title: {case_data['title']}")
        print(f"  Type: {case_data['case_type']}")
        print(f"  Status: {case_data['status']}")

        await builder.index_case(case_data)
        print("✓ Case indexed successfully!")

        # Show extracted tags
        content = f"{case_data['title']} {case_data['description']}"
        tags = builder._extract_tags(content)
        print(f"\nExtracted tags: {tags}")

    except Exception as e:
        print(f"✗ Indexing failed: {e}")
    finally:
        db.close()


# ===== EXAMPLE 4: INDEX EVIDENCE WITH ENCRYPTED CONTENT =====

async def example_index_encrypted_evidence():
    """
    Example: Index evidence with encrypted content.

    The builder automatically decrypts encrypted fields.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 4: Index Evidence with Encrypted Content")
    print("=" * 60)

    db = get_database_session()
    encryption_service = get_encryption_service()
    builder = SearchIndexBuilder(db=db, encryption_service=encryption_service)

    # Encrypt content
    plaintext = "This is confidential evidence content that must be encrypted."
    encrypted_data = encryption_service.encrypt(plaintext)

    # Evidence data with encrypted content
    evidence_data = {
        "id": 1,
        "case_id": 1,
        "title": "Confidential Document",
        "content": json.dumps(encrypted_data.to_dict()),  # Encrypted
        "evidence_type": "document",
        "file_path": "/evidence/confidential.pdf",
        "created_at": datetime.utcnow().isoformat()
    }

    try:
        print("Indexing evidence with encrypted content...")
        print(f"  Title: {evidence_data['title']}")
        print(f"  Type: {evidence_data['evidence_type']}")
        print(f"  Content encrypted: Yes")

        await builder.index_evidence(evidence_data)
        print("✓ Evidence indexed successfully!")
        print("  (Content was automatically decrypted during indexing)")

    except Exception as e:
        print(f"✗ Indexing failed: {e}")
    finally:
        db.close()


# ===== EXAMPLE 5: INDEX A CONVERSATION =====

async def example_index_conversation():
    """
    Example: Index a conversation with messages.

    The builder fetches messages and includes them in the index.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 5: Index a Conversation")
    print("=" * 60)

    db = get_database_session()
    encryption_service = get_encryption_service()
    builder = SearchIndexBuilder(db=db, encryption_service=encryption_service)

    conversation_data = {
        "id": 1,
        "user_id": 1,
        "title": "Legal Research on Contract Law #research",
        "case_id": 1,
        "message_count": 10,
        "created_at": datetime.utcnow().isoformat()
    }

    try:
        print("Indexing conversation...")
        print(f"  Title: {conversation_data['title']}")
        print(f"  Messages: {conversation_data['message_count']}")

        await builder.index_conversation(conversation_data)
        print("✓ Conversation indexed successfully!")
        print("  (All messages included in search index)")

    except Exception as e:
        print(f"✗ Indexing failed: {e}")
    finally:
        db.close()


# ===== EXAMPLE 6: INDEX A NOTE =====

async def example_index_note():
    """
    Example: Index a note.

    Notes can be pinned and are fully searchable.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 6: Index a Note")
    print("=" * 60)

    db = get_database_session()
    encryption_service = get_encryption_service()
    builder = SearchIndexBuilder(db=db, encryption_service=encryption_service)

    note_data = {
        "id": 1,
        "user_id": 1,
        "title": "Meeting Notes #important",
        "content": "Discussed settlement options. Next meeting: 2025-02-01. Call client at +1-555-1234.",
        "case_id": 1,
        "is_pinned": True,
        "created_at": datetime.utcnow().isoformat()
    }

    try:
        print("Indexing note...")
        print(f"  Title: {note_data['title']}")
        print(f"  Pinned: {note_data['is_pinned']}")

        await builder.index_note(note_data)
        print("✓ Note indexed successfully!")

        # Show extracted tags
        content = f"{note_data['title']} {note_data['content']}"
        tags = builder._extract_tags(content)
        print(f"\nExtracted tags: {tags}")

    except Exception as e:
        print(f"✗ Indexing failed: {e}")
    finally:
        db.close()


# ===== EXAMPLE 7: UPDATE EXISTING INDEX ENTRY =====

async def example_update_index():
    """
    Example: Update an existing index entry.

    Use this when entity data changes.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 7: Update Existing Index Entry")
    print("=" * 60)

    db = get_database_session()
    encryption_service = get_encryption_service()
    builder = SearchIndexBuilder(db=db, encryption_service=encryption_service)

    case_id = 1

    try:
        print(f"Updating case {case_id} in index...")
        await builder.update_in_index("case", case_id)
        print("✓ Index updated successfully!")

        # Can update any entity type
        print("\nUpdating other entity types...")
        await builder.update_in_index("evidence", 1)
        print("  ✓ Evidence updated")

        await builder.update_in_index("conversation", 1)
        print("  ✓ Conversation updated")

        await builder.update_in_index("note", 1)
        print("  ✓ Note updated")

    except Exception as e:
        print(f"✗ Update failed: {e}")
    finally:
        db.close()


# ===== EXAMPLE 8: REMOVE FROM INDEX =====

async def example_remove_from_index():
    """
    Example: Remove an item from the index.

    Use this when deleting an entity.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 8: Remove from Index")
    print("=" * 60)

    db = get_database_session()
    encryption_service = get_encryption_service()
    builder = SearchIndexBuilder(db=db, encryption_service=encryption_service)

    case_id = 999

    try:
        print(f"Removing case {case_id} from index...")
        await builder.remove_from_index("case", case_id)
        print("✓ Removed from index successfully!")

        # Verify removal
        stats = await builder.get_index_stats()
        print(f"\nRemaining documents: {stats['total_documents']}")

    except Exception as e:
        print(f"✗ Removal failed: {e}")
    finally:
        db.close()


# ===== EXAMPLE 9: OPTIMIZE INDEX =====

async def example_optimize_index():
    """
    Example: Optimize the FTS5 index.

    Run this periodically for better search performance.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 9: Optimize FTS5 Index")
    print("=" * 60)

    db = get_database_session()
    encryption_service = get_encryption_service()
    builder = SearchIndexBuilder(db=db, encryption_service=encryption_service)

    try:
        print("Optimizing FTS5 index...")
        await builder.optimize_index()
        print("✓ Index optimized successfully!")
        print("\nWhat optimization does:")
        print("  1. Rebuilds internal FTS5 structures")
        print("  2. Merges index segments")
        print("  3. Compacts data")
        print("  4. Improves search performance")

    except Exception as e:
        print(f"✗ Optimization failed: {e}")
    finally:
        db.close()


# ===== EXAMPLE 10: GET INDEX STATISTICS =====

async def example_get_statistics():
    """
    Example: Get comprehensive index statistics.

    Monitor index health and size.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 10: Get Index Statistics")
    print("=" * 60)

    db = get_database_session()
    encryption_service = get_encryption_service()
    builder = SearchIndexBuilder(db=db, encryption_service=encryption_service)

    try:
        print("Fetching index statistics...")
        stats = await builder.get_index_stats()

        print("\n📊 Index Statistics:")
        print(f"  Total documents: {stats['total_documents']}")

        print("\n  Documents by type:")
        for entity_type, count in stats['documents_by_type'].items():
            percentage = (count / stats['total_documents'] * 100) if stats['total_documents'] > 0 else 0
            print(f"    {entity_type:12s}: {count:5d} ({percentage:5.1f}%)")

        print(f"\n  Last updated: {stats['last_updated']}")

        # Estimate index size
        avg_doc_size_kb = 2  # Average 2KB per document
        estimated_size_mb = (stats['total_documents'] * avg_doc_size_kb) / 1024
        print(f"\n  Estimated index size: ~{estimated_size_mb:.1f} MB")

    except Exception as e:
        print(f"✗ Statistics retrieval failed: {e}")
    finally:
        db.close()


# ===== EXAMPLE 11: TAG EXTRACTION DEMO =====

async def example_tag_extraction():
    """
    Example: Demonstrate tag extraction.

    Shows how different tag types are extracted from content.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 11: Tag Extraction Demo")
    print("=" * 60)

    db = get_database_session()
    encryption_service = get_encryption_service()
    builder = SearchIndexBuilder(db=db, encryption_service=encryption_service)

    test_content = """
    Case #123 filed on 2025-01-15 and 2025-01-20
    Contact attorney at attorney@lawfirm.com and john.doe@example.com
    Phone: +1 (555) 123-4567 or +44 20 1234 5678
    #urgent #criminal #appeal
    """

    print("Test content:")
    print(test_content)

    tags = builder._extract_tags(test_content)

    print("\n🏷️  Extracted tags:")
    print(tags)

    print("\nTag breakdown:")
    tag_list = tags.split()
    hashtags = [t for t in tag_list if not any(c in t for c in ['@', '-', '+'])]
    emails = [t for t in tag_list if '@' in t]
    phones = [t for t in tag_list if '+' in t or '-' in t]

    print(f"  Hashtags: {hashtags}")
    print(f"  Emails: {emails}")
    print(f"  Phone numbers: {phones}")

    db.close()


# ===== EXAMPLE 12: BULK INDEXING WORKFLOW =====

async def example_bulk_indexing():
    """
    Example: Bulk index multiple entities efficiently.

    Demonstrates proper transaction handling.
    """
    print("\n" + "=" * 60)
    print("EXAMPLE 12: Bulk Indexing Workflow")
    print("=" * 60)

    db = get_database_session()
    encryption_service = get_encryption_service()
    builder = SearchIndexBuilder(db=db, encryption_service=encryption_service)

    # Generate test data
    cases = [
        {
            "id": i,
            "user_id": 1,
            "title": f"Case {i}",
            "description": f"Description for case {i}",
            "case_type": "civil",
            "status": "active",
            "created_at": datetime.utcnow().isoformat()
        }
        for i in range(1, 11)
    ]

    try:
        print(f"Bulk indexing {len(cases)} cases...")

        # Option 1: Use rebuild_index_for_user (recommended)
        print("\nOption 1: Using rebuild_index_for_user (fastest)")
        await builder.rebuild_index_for_user(user_id=1)
        print("  ✓ All entities indexed in single transaction")

        # Option 2: Index individually (slower but more granular control)
        print("\nOption 2: Indexing individually")
        for i, case in enumerate(cases, 1):
            await builder.index_case(case)
            print(f"  ✓ Case {i}/{len(cases)} indexed")

        print("\n✓ Bulk indexing completed!")

        # Show statistics
        stats = await builder.get_index_stats()
        print(f"\nTotal documents: {stats['total_documents']}")

    except Exception as e:
        print(f"✗ Bulk indexing failed: {e}")
    finally:
        db.close()


# ===== MAIN: RUN ALL EXAMPLES =====

async def main():
    """Run all examples."""
    print("\n" + "=" * 60)
    print("SearchIndexBuilder - Usage Examples")
    print("=" * 60)

    examples = [
        ("Full Index Rebuild", example_full_rebuild),
        ("User-Specific Rebuild", example_user_rebuild),
        ("Index Case", example_index_case),
        ("Index Encrypted Evidence", example_index_encrypted_evidence),
        ("Index Conversation", example_index_conversation),
        ("Index Note", example_index_note),
        ("Update Index Entry", example_update_index),
        ("Remove from Index", example_remove_from_index),
        ("Optimize Index", example_optimize_index),
        ("Get Statistics", example_get_statistics),
        ("Tag Extraction", example_tag_extraction),
        ("Bulk Indexing", example_bulk_indexing),
    ]

    print("\nAvailable examples:")
    for i, (name, _) in enumerate(examples, 1):
        print(f"  {i}. {name}")

    print("\nRun individual examples by uncommenting them below:")
    print("Or modify this script to run all examples sequentially.\n")

    # Uncomment to run specific examples:

    # await example_full_rebuild()
    # await example_user_rebuild()
    # await example_index_case()
    # await example_index_encrypted_evidence()
    # await example_index_conversation()
    # await example_index_note()
    # await example_update_index()
    # await example_remove_from_index()
    # await example_optimize_index()
    await example_get_statistics()
    # await example_tag_extraction()
    # await example_bulk_indexing()


if __name__ == "__main__":
    asyncio.run(main())
