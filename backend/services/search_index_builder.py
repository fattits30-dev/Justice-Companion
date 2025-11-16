"""
Search Index Builder for Justice Companion.
Migrated from src/services/SearchIndexBuilder.ts

Features:
- Full index rebuild for all users (admin only)
- Per-user index rebuild
- Incremental index updates (indexCase, indexEvidence, etc.)
- Automatic decryption of encrypted fields during indexing
- Tag extraction (hashtags, dates, emails, phone numbers)
- FTS5 index optimization
- Index statistics and monitoring
- Transaction safety with rollback on error
- Comprehensive audit logging

Security:
- User isolation (per-user index rebuilds)
- Encrypted field decryption during indexing
- All operations logged for audit
"""

import json
import re
import time
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException

from backend.services.encryption_service import EncryptionService, EncryptedData
from backend.services.audit_logger import log_audit_event


class SearchIndexBuilder:
    """
    Search index builder for FTS5 full-text search.

    Manages the search_index table by:
    1. Rebuilding entire index from source tables
    2. Incrementally updating individual entities
    3. Extracting searchable tags from content
    4. Decrypting encrypted fields for indexing
    5. Optimizing FTS5 index performance

    Example:
        builder = SearchIndexBuilder(
            db=session,
            encryption_service=enc_service
        )

        # Rebuild index for user
        await builder.rebuild_index_for_user(user_id=1)

        # Index a single case
        await builder.index_case(case_data)

        # Optimize index
        await builder.optimize_index()

        # Get statistics
        stats = await builder.get_index_stats()
        print(f"Total documents: {stats['total_documents']}")
    """

    def __init__(
        self,
        db: Session,
        encryption_service: Optional[EncryptionService] = None
    ):
        """
        Initialize search index builder.

        Args:
            db: SQLAlchemy database session
            encryption_service: Optional encryption service for decrypting fields
        """
        self.db = db
        self.encryption_service = encryption_service

    async def rebuild_index(self) -> None:
        """
        Rebuild the entire search index from scratch (ALL USERS).

        ADMIN ONLY - should require admin role check before calling.

        This operation:
        1. Clears the entire search_index table
        2. Iterates through all users
        3. Indexes all cases, evidence, conversations, and notes
        4. Wrapped in a transaction for consistency

        Raises:
            Exception: If indexing fails (transaction rolled back)

        Security:
            This is a privileged operation. Caller must verify admin role.
        """
        start_time = time.time()

        try:
            # Start transaction
            self.db.execute(text("BEGIN"))

            # Clear existing index
            self._clear_index()

            # Get all users
            users_result = self.db.execute(text("SELECT id FROM users")).fetchall()
            users = [{"id": row[0]} for row in users_result]

            total_indexed = 0

            for user in users:
                user_id = user["id"]

                # Index cases
                cases = await self._get_user_cases(user_id)
                for case in cases:
                    await self.index_case(case)
                    total_indexed += 1

                # Index evidence
                evidence_items = await self._get_user_evidence(user_id)
                for evidence in evidence_items:
                    await self.index_evidence(evidence)
                    total_indexed += 1

                # Index conversations
                conversations = await self._get_user_conversations(user_id)
                for conv in conversations:
                    await self.index_conversation(conv)
                    total_indexed += 1

                # Index notes
                notes = await self._get_user_notes(user_id)
                for note in notes:
                    await self.index_note(note)
                    total_indexed += 1

            # Commit transaction
            self.db.execute(text("COMMIT"))

            # Log success
            execution_time = int((time.time() - start_time) * 1000)
            log_audit_event(
                db=self.db,
                event_type="search_index.rebuild",
                user_id="system",
                resource_type="search_index",
                resource_id="global",
                action="rebuild",
                details={
                    "total_users": len(users),
                    "total_indexed": total_indexed,
                    "execution_time_ms": execution_time
                },
                success=True
            )

        except Exception as error:
            # Rollback on error
            self.db.execute(text("ROLLBACK"))
            log_audit_event(
                db=self.db,
                event_type="search_index.rebuild",
                user_id="system",
                resource_type="search_index",
                resource_id="global",
                action="rebuild",
                details={"error": str(error)},
                success=False
            )
            raise Exception(f"Failed to rebuild search index: {str(error)}")

    async def rebuild_index_for_user(self, user_id: int) -> None:
        """
        Rebuild search index for a specific user only.

        SECURITY: Only rebuilds index for authenticated user's data.

        Args:
            user_id: User ID whose index to rebuild

        Raises:
            Exception: If indexing fails (transaction rolled back)
        """
        start_time = time.time()

        try:
            # Start transaction
            self.db.execute(text("BEGIN"))

            # Clear only this user's index entries
            self.db.execute(
                text("DELETE FROM search_index WHERE user_id = :user_id"),
                {"user_id": user_id}
            )

            total_indexed = 0

            # Index cases
            cases = await self._get_user_cases(user_id)
            for case in cases:
                await self.index_case(case)
                total_indexed += 1

            # Index evidence
            evidence_items = await self._get_user_evidence(user_id)
            for evidence in evidence_items:
                await self.index_evidence(evidence)
                total_indexed += 1

            # Index conversations
            conversations = await self._get_user_conversations(user_id)
            for conv in conversations:
                await self.index_conversation(conv)
                total_indexed += 1

            # Index notes
            notes = await self._get_user_notes(user_id)
            for note in notes:
                await self.index_note(note)
                total_indexed += 1

            # Commit transaction
            self.db.execute(text("COMMIT"))

            # Log success
            execution_time = int((time.time() - start_time) * 1000)
            log_audit_event(
                db=self.db,
                event_type="search_index.rebuild_user",
                user_id=str(user_id),
                resource_type="search_index",
                resource_id=f"user_{user_id}",
                action="rebuild",
                details={
                    "total_indexed": total_indexed,
                    "execution_time_ms": execution_time
                },
                success=True
            )

        except Exception as error:
            # Rollback on error
            self.db.execute(text("ROLLBACK"))
            log_audit_event(
                db=self.db,
                event_type="search_index.rebuild_user",
                user_id=str(user_id),
                resource_type="search_index",
                resource_id=f"user_{user_id}",
                action="rebuild",
                details={"error": str(error)},
                success=False
            )
            raise Exception(f"Failed to rebuild search index for user {user_id}: {str(error)}")

    def _clear_index(self) -> None:
        """Clear the entire search index."""
        self.db.execute(text("DELETE FROM search_index"))

    async def index_case(self, case_data: Dict[str, Any]) -> None:
        """
        Index a single case.

        Args:
            case_data: Case dictionary with fields (id, user_id, title, description, etc.)

        Decrypts encrypted fields before indexing.
        """
        try:
            # Decrypt sensitive fields if needed
            title = await self._decrypt_if_needed(case_data.get("title", ""))
            description = await self._decrypt_if_needed(case_data.get("description", ""))

            content = f"{title} {description} {case_data.get('case_type', '')} {case_data.get('status', '')}"
            tags = self._extract_tags(content)

            # Insert into search index
            query = text("""
                INSERT OR REPLACE INTO search_index (
                    entity_type, entity_id, user_id, case_id, title, content, tags, created_at,
                    status, case_type
                ) VALUES (
                    :entity_type, :entity_id, :user_id, :case_id, :title, :content, :tags, :created_at,
                    :status, :case_type
                )
            """)

            self.db.execute(query, {
                "entity_type": "case",
                "entity_id": case_data["id"],
                "user_id": case_data["user_id"],
                "case_id": case_data["id"],
                "title": title,
                "content": content,
                "tags": tags,
                "created_at": case_data.get("created_at", datetime.utcnow().isoformat()),
                "status": case_data.get("status"),
                "case_type": case_data.get("case_type")
            })
            self.db.commit()

        except Exception as error:
            log_audit_event(
                db=self.db,
                event_type="search_index.index_case",
                user_id=str(case_data.get("user_id")),
                resource_type="case",
                resource_id=str(case_data.get("id")),
                action="index",
                details={"error": str(error)},
                success=False
            )
            # Don't raise - continue indexing other items

    async def index_evidence(self, evidence_data: Dict[str, Any]) -> None:
        """
        Index a single evidence item.

        Args:
            evidence_data: Evidence dictionary with fields (id, case_id, title, content, etc.)

        Decrypts encrypted fields before indexing.
        Looks up case to get user_id.
        """
        try:
            # Get the associated case to determine user
            case_query = text("SELECT id, user_id, title FROM cases WHERE id = :case_id")
            case_row = self.db.execute(case_query, {"case_id": evidence_data["case_id"]}).fetchone()

            if not case_row:
                return  # Case doesn't exist, skip

            case_data = {"id": case_row[0], "user_id": case_row[1], "title": case_row[2]}

            # Decrypt sensitive fields if needed
            title = await self._decrypt_if_needed(evidence_data.get("title", ""))
            content = await self._decrypt_if_needed(evidence_data.get("content", ""))
            file_path = await self._decrypt_if_needed(evidence_data.get("file_path", ""))

            full_content = f"{title} {content} {evidence_data.get('evidence_type', '')}"
            tags = self._extract_tags(full_content)

            # Insert into search index
            query = text("""
                INSERT OR REPLACE INTO search_index (
                    entity_type, entity_id, user_id, case_id, title, content, tags, created_at,
                    evidence_type, file_path
                ) VALUES (
                    :entity_type, :entity_id, :user_id, :case_id, :title, :content, :tags, :created_at,
                    :evidence_type, :file_path
                )
            """)

            self.db.execute(query, {
                "entity_type": "evidence",
                "entity_id": evidence_data["id"],
                "user_id": case_data["user_id"],
                "case_id": evidence_data["case_id"],
                "title": title,
                "content": full_content,
                "tags": tags,
                "created_at": evidence_data.get("created_at", datetime.utcnow().isoformat()),
                "evidence_type": evidence_data.get("evidence_type"),
                "file_path": file_path
            })
            self.db.commit()

        except Exception as error:
            log_audit_event(
                db=self.db,
                event_type="search_index.index_evidence",
                user_id=str(evidence_data.get("user_id")),
                resource_type="evidence",
                resource_id=str(evidence_data.get("id")),
                action="index",
                details={
                    "case_id": evidence_data.get("case_id"),
                    "error": str(error)
                },
                success=False
            )
            # Don't raise - continue indexing other items

    async def index_conversation(self, conversation_data: Dict[str, Any]) -> None:
        """
        Index a single conversation.

        Args:
            conversation_data: Conversation dictionary with fields (id, user_id, title, etc.)

        Fetches messages for the conversation and includes them in content.
        """
        try:
            # Get messages for content
            messages_query = text("""
                SELECT content
                FROM chat_messages
                WHERE conversation_id = :conversation_id
                ORDER BY created_at
            """)
            messages_result = self.db.execute(
                messages_query,
                {"conversation_id": conversation_data["id"]}
            ).fetchall()

            message_content = " ".join([row[0] for row in messages_result if row[0]])

            content = f"{conversation_data.get('title', '')} {message_content}"
            tags = self._extract_tags(content)

            # Insert into search index
            query = text("""
                INSERT OR REPLACE INTO search_index (
                    entity_type, entity_id, user_id, case_id, title, content, tags, created_at,
                    message_count
                ) VALUES (
                    :entity_type, :entity_id, :user_id, :case_id, :title, :content, :tags, :created_at,
                    :message_count
                )
            """)

            self.db.execute(query, {
                "entity_type": "conversation",
                "entity_id": conversation_data["id"],
                "user_id": conversation_data["user_id"],
                "case_id": conversation_data.get("case_id"),
                "title": conversation_data.get("title", "Untitled Conversation"),
                "content": content,
                "tags": tags,
                "created_at": conversation_data.get("created_at", datetime.utcnow().isoformat()),
                "message_count": conversation_data.get("message_count", len(messages_result))
            })
            self.db.commit()

        except Exception as error:
            log_audit_event(
                db=self.db,
                event_type="search_index.index_conversation",
                user_id=str(conversation_data.get("user_id")),
                resource_type="conversation",
                resource_id=str(conversation_data.get("id")),
                action="index",
                details={
                    "case_id": conversation_data.get("case_id"),
                    "error": str(error)
                },
                success=False
            )
            # Don't raise - continue indexing other items

    async def index_note(self, note_data: Dict[str, Any]) -> None:
        """
        Index a single note.

        Args:
            note_data: Note dictionary with fields (id, user_id, title, content, etc.)

        Decrypts encrypted content before indexing.
        """
        try:
            # Decrypt content if needed
            content = await self._decrypt_if_needed(note_data.get("content", ""))
            title = note_data.get("title") or "Untitled Note"

            full_content = f"{title} {content}"
            tags = self._extract_tags(full_content)

            # Insert into search index
            query = text("""
                INSERT OR REPLACE INTO search_index (
                    entity_type, entity_id, user_id, case_id, title, content, tags, created_at,
                    is_pinned
                ) VALUES (
                    :entity_type, :entity_id, :user_id, :case_id, :title, :content, :tags, :created_at,
                    :is_pinned
                )
            """)

            self.db.execute(query, {
                "entity_type": "note",
                "entity_id": note_data["id"],
                "user_id": note_data["user_id"],
                "case_id": note_data.get("case_id"),
                "title": title,
                "content": full_content,
                "tags": tags,
                "created_at": note_data.get("created_at", datetime.utcnow().isoformat()),
                "is_pinned": 1 if note_data.get("is_pinned") else 0
            })
            self.db.commit()

        except Exception as error:
            log_audit_event(
                db=self.db,
                event_type="search_index.index_note",
                user_id=str(note_data.get("user_id")),
                resource_type="note",
                resource_id=str(note_data.get("id")),
                action="index",
                details={
                    "case_id": note_data.get("case_id"),
                    "error": str(error)
                },
                success=False
            )
            # Don't raise - continue indexing other items

    async def remove_from_index(self, entity_type: str, entity_id: int) -> None:
        """
        Remove an item from the search index.

        Args:
            entity_type: Type of entity ("case", "evidence", "conversation", "note")
            entity_id: Entity ID to remove
        """
        try:
            query = text("""
                DELETE FROM search_index
                WHERE entity_type = :entity_type AND entity_id = :entity_id
            """)
            self.db.execute(query, {
                "entity_type": entity_type,
                "entity_id": entity_id
            })
            self.db.commit()

            log_audit_event(
                db=self.db,
                event_type="search_index.remove",
                user_id="system",
                resource_type=entity_type,
                resource_id=str(entity_id),
                action="delete",
                success=True
            )

        except Exception as error:
            log_audit_event(
                db=self.db,
                event_type="search_index.remove",
                user_id="system",
                resource_type=entity_type,
                resource_id=str(entity_id),
                action="delete",
                details={"error": str(error)},
                success=False
            )
            raise Exception(f"Failed to remove {entity_type} {entity_id} from index: {str(error)}")

    async def update_in_index(self, entity_type: str, entity_id: int) -> None:
        """
        Update an item in the search index by re-indexing it.

        Args:
            entity_type: Type of entity ("case", "evidence", "conversation", "note")
            entity_id: Entity ID to update

        Raises:
            Exception: If entity not found or update fails
        """
        try:
            if entity_type == "case":
                case_data = await self._get_case_by_id(entity_id)
                if case_data:
                    await self.index_case(case_data)

            elif entity_type == "evidence":
                evidence_data = await self._get_evidence_by_id(entity_id)
                if evidence_data:
                    await self.index_evidence(evidence_data)

            elif entity_type == "conversation":
                conversation_data = await self._get_conversation_by_id(entity_id)
                if conversation_data:
                    await self.index_conversation(conversation_data)

            elif entity_type == "note":
                note_data = await self._get_note_by_id(entity_id)
                if note_data:
                    await self.index_note(note_data)

        except Exception as error:
            log_audit_event(
                db=self.db,
                event_type="search_index.update",
                user_id="system",
                resource_type=entity_type,
                resource_id=str(entity_id),
                action="update",
                details={"error": str(error)},
                success=False
            )
            raise Exception(f"Failed to update {entity_type} {entity_id} in index: {str(error)}")

    async def optimize_index(self) -> None:
        """
        Optimize the FTS5 search index for better performance.

        Runs FTS5 'rebuild' and 'optimize' commands.

        Raises:
            Exception: If optimization fails
        """
        try:
            # Rebuild FTS5 index
            self.db.execute(text('INSERT INTO search_index(search_index) VALUES("rebuild")'))

            # Optimize FTS5 index
            self.db.execute(text('INSERT INTO search_index(search_index) VALUES("optimize")'))

            self.db.commit()

            log_audit_event(
                db=self.db,
                event_type="search_index.optimize",
                user_id="system",
                resource_type="search_index",
                resource_id="global",
                action="optimize",
                success=True
            )

        except Exception as error:
            log_audit_event(
                db=self.db,
                event_type="search_index.optimize",
                user_id="system",
                resource_type="search_index",
                resource_id="global",
                action="optimize",
                details={"error": str(error)},
                success=False
            )
            raise Exception(f"Failed to optimize search index: {str(error)}")

    async def get_index_stats(self) -> Dict[str, Any]:
        """
        Get index statistics.

        Returns:
            Dictionary with:
                - total_documents: Total number of indexed documents
                - documents_by_type: Count of documents by entity type
                - last_updated: ISO timestamp of most recent indexed document
        """
        try:
            # Total documents
            total_query = text("SELECT COUNT(*) as count FROM search_index")
            total_result = self.db.execute(total_query).fetchone()
            total_documents = total_result[0] if total_result else 0

            # By type
            by_type_query = text("""
                SELECT entity_type, COUNT(*) as count
                FROM search_index
                GROUP BY entity_type
            """)
            by_type_results = self.db.execute(by_type_query).fetchall()
            documents_by_type = {row[0]: row[1] for row in by_type_results}

            # Last updated
            last_update_query = text("""
                SELECT MAX(created_at) as last_updated
                FROM search_index
            """)
            last_update_result = self.db.execute(last_update_query).fetchone()
            last_updated = last_update_result[0] if last_update_result else None

            return {
                "total_documents": total_documents,
                "documents_by_type": documents_by_type,
                "last_updated": last_updated
            }

        except Exception as error:
            raise Exception(f"Failed to get index stats: {str(error)}")

    # ===== PRIVATE HELPER METHODS =====

    async def _decrypt_if_needed(self, content: str) -> str:
        """
        Decrypt content if it appears to be encrypted.

        Args:
            content: Raw content (may be encrypted JSON or plaintext)

        Returns:
            Decrypted content or original content if not encrypted
        """
        if not content or not self.encryption_service:
            return content

        try:
            # Check if content is a JSON string representing EncryptedData
            if content.strip().startswith("{") and "ciphertext" in content:
                parsed = json.loads(content)
                if self.encryption_service.is_encrypted(parsed):
                    decrypted = self.encryption_service.decrypt(EncryptedData.from_dict(parsed))
                    return decrypted or content
            return content
        except Exception:
            # If parsing/decryption fails, return original content
            return content

    def _extract_tags(self, content: str) -> str:
        """
        Extract tags from content (hashtags, dates, emails, phone numbers).

        Args:
            content: Text content to extract tags from

        Returns:
            Space-separated string of extracted tags
        """
        tags: List[str] = []

        if not content:
            return ""

        # Extract hashtags
        hashtags = re.findall(r"#\w+", content)
        tags.extend([tag[1:] for tag in hashtags])  # Remove # prefix

        # Extract dates (YYYY-MM-DD format)
        dates = re.findall(r"\d{4}-\d{2}-\d{2}", content)
        tags.extend(dates)

        # Extract email addresses
        emails = re.findall(r"[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}", content)
        tags.extend(emails)

        # Extract phone numbers (basic pattern)
        phones = re.findall(r"\+?[\d\s()-]+\d{4,}", content)
        tags.extend(phones)

        return " ".join(tags)

    async def _get_user_cases(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all cases for a user."""
        query = text("SELECT * FROM cases WHERE user_id = :user_id")
        results = self.db.execute(query, {"user_id": user_id}).fetchall()
        return [dict(row._mapping) for row in results]

    async def _get_user_evidence(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all evidence for a user."""
        query = text("""
            SELECT e.*
            FROM evidence e
            INNER JOIN cases c ON e.case_id = c.id
            WHERE c.user_id = :user_id
        """)
        results = self.db.execute(query, {"user_id": user_id}).fetchall()
        return [dict(row._mapping) for row in results]

    async def _get_user_conversations(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all conversations for a user."""
        query = text("SELECT * FROM chat_conversations WHERE user_id = :user_id")
        results = self.db.execute(query, {"user_id": user_id}).fetchall()
        return [dict(row._mapping) for row in results]

    async def _get_user_notes(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all notes for a user."""
        query = text("SELECT * FROM notes WHERE user_id = :user_id")
        results = self.db.execute(query, {"user_id": user_id}).fetchall()
        return [dict(row._mapping) for row in results]

    async def _get_case_by_id(self, case_id: int) -> Optional[Dict[str, Any]]:
        """Get a case by ID."""
        query = text("SELECT * FROM cases WHERE id = :case_id")
        result = self.db.execute(query, {"case_id": case_id}).fetchone()
        return dict(result._mapping) if result else None

    async def _get_evidence_by_id(self, evidence_id: int) -> Optional[Dict[str, Any]]:
        """Get evidence by ID."""
        query = text("SELECT * FROM evidence WHERE id = :evidence_id")
        result = self.db.execute(query, {"evidence_id": evidence_id}).fetchone()
        return dict(result._mapping) if result else None

    async def _get_conversation_by_id(self, conversation_id: int) -> Optional[Dict[str, Any]]:
        """Get conversation by ID."""
        query = text("SELECT * FROM chat_conversations WHERE id = :conversation_id")
        result = self.db.execute(query, {"conversation_id": conversation_id}).fetchone()
        return dict(result._mapping) if result else None

    async def _get_note_by_id(self, note_id: int) -> Optional[Dict[str, Any]]:
        """Get note by ID."""
        query = text("SELECT * FROM notes WHERE id = :note_id")
        result = self.db.execute(query, {"note_id": note_id}).fetchone()
        return dict(result._mapping) if result else None
