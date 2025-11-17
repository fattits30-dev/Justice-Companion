"""
GDPR Article 20 - Data Portability Implementation

This class handles exporting all user data in a machine-readable format
with proper decryption of sensitive fields.

Migrated from: src/services/gdpr/DataExporter.ts

Features:
- Export data from 13 tables (all user-associated data)
- Decrypt all encrypted fields using EncryptionService
- Machine-readable JSON format
- Schema version tracking
- GDPR Article 20 compliance
"""

import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.services.encryption_service import EncryptionService, EncryptedData

# Configure logger
logger = logging.getLogger(__name__)


class TableExport:
    """Represents exported data from a single table."""

    def __init__(self, table_name: str, records: List[Dict[str, Any]], count: int):
        """
        Initialize table export.

        Args:
            table_name: Name of the database table
            records: List of record dictionaries (decrypted if applicable)
            count: Number of records exported
        """
        self.table_name = table_name
        self.records = records
        self.count = count

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {"tableName": self.table_name, "records": self.records, "count": self.count}


class ExportMetadata:
    """Metadata about the export operation."""

    def __init__(
        self,
        export_date: str,
        user_id: int,
        schema_version: str,
        export_format: str,
        total_records: int,
    ):
        """
        Initialize export metadata.

        Args:
            export_date: ISO 8601 timestamp of export
            user_id: User ID that requested export
            schema_version: Database schema version at time of export
            export_format: Export format (json or csv)
            total_records: Total number of records across all tables
        """
        self.export_date = export_date
        self.user_id = user_id
        self.schema_version = schema_version
        self.format = export_format
        self.total_records = total_records

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "exportDate": self.export_date,
            "userId": self.user_id,
            "schemaVersion": self.schema_version,
            "format": self.format,
            "totalRecords": self.total_records,
        }


class UserDataExport:
    """Complete user data export."""

    def __init__(self, metadata: ExportMetadata, user_data: Dict[str, TableExport]):
        """
        Initialize user data export.

        Args:
            metadata: Export metadata
            user_data: Dictionary of table exports keyed by table name
        """
        self.metadata = metadata
        self.user_data = user_data

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "metadata": self.metadata.to_dict(),
            "userData": {
                key: table_export.to_dict() for key, table_export in self.user_data.items()
            },
        }


class GdprExportOptions:
    """Options for GDPR data export."""

    def __init__(
        self,
        export_format: str = "json",
        include_files: bool = False,
        date_range: Optional[Dict[str, str]] = None,
    ):
        """
        Initialize export options.

        Args:
            export_format: Export format (json or csv)
            include_files: Include file attachments in export
            date_range: Optional date range filter with 'start' and 'end' keys
        """
        self.format = export_format
        self.include_files = include_files
        self.date_range = date_range


class DataExporter:
    """
    GDPR Article 20 - Data Portability Service.

    Exports all user data across 13 tables with proper decryption of
    sensitive fields.

    Usage:
        exporter = DataExporter(db, encryption_service)
        export_result = exporter.export_all_user_data(user_id)
        exporter.save_to_file(export_result, "export.json")
    """

    def __init__(self, db: Session, encryption_service: EncryptionService):
        """
        Initialize DataExporter.

        Args:
            db: SQLAlchemy database session
            encryption_service: Encryption service for decrypting fields
        """
        self.db = db
        self.encryption_service = encryption_service

    def export_all_user_data(
        self, user_id: int, options: Optional[GdprExportOptions] = None
    ) -> UserDataExport:
        """
        Export all user data across 13 tables with decryption.

        Args:
            user_id: User ID to export data for
            options: Export options (format, filters, etc.)

        Returns:
            UserDataExport object with all user data

        Security:
            - Password hashes are NEVER exported (security requirement)
            - All encrypted fields are decrypted before export
            - Session tokens are excluded from export
        """
        if options is None:
            options = GdprExportOptions()

        export_date = datetime.now(timezone.utc).isoformat()

        # Export all user data from each table
        user_data = {
            "profile": self._export_user_profile(user_id),
            "cases": self._export_cases(user_id),
            "evidence": self._export_evidence(user_id),
            "legalIssues": self._export_legal_issues(user_id),
            "timelineEvents": self._export_timeline_events(user_id),
            "actions": self._export_actions(user_id),
            "notes": self._export_notes(user_id),
            "chatConversations": self._export_chat_conversations(user_id),
            "chatMessages": self._export_chat_messages(user_id),
            "userFacts": self._export_user_facts(user_id),
            "caseFacts": self._export_case_facts(user_id),
            "sessions": self._export_sessions(user_id),
            "consents": self._export_consents(user_id),
        }

        # Calculate total records
        total_records = self._count_total_records(user_data)

        # Create metadata
        metadata = ExportMetadata(
            export_date=export_date,
            user_id=user_id,
            schema_version=self._get_schema_version(),
            export_format=options.format,
            total_records=total_records,
        )

        return UserDataExport(metadata=metadata, user_data=user_data)

    def _export_user_profile(self, user_id: int) -> TableExport:
        """
        Export user profile (from users table).

        WARNING: Password hash is NEVER exported (security).

        Args:
            user_id: User ID to export

        Returns:
            TableExport with user profile data
        """
        query = text(
            """
            SELECT
                id, username, email, created_at, updated_at, last_login_at
            FROM users
            WHERE id = :user_id
        """
        )

        result = self.db.execute(query, {"user_id": user_id})
        row = result.fetchone()

        if row:
            user = dict(row._mapping)
            # Convert datetime objects to ISO strings
            for key in ["created_at", "updated_at", "last_login_at"]:
                if user.get(key):
                    user[key] = user[key].isoformat()
            records = [user]
        else:
            records = []

        return TableExport(table_name="users", records=records, count=len(records))

    def _export_cases(self, user_id: int) -> TableExport:
        """
        Export all cases owned by user.

        Decrypts: description (if encrypted)

        Args:
            user_id: User ID to export cases for

        Returns:
            TableExport with case data
        """
        query = text(
            """
            SELECT * FROM cases
            WHERE user_id = :user_id
            ORDER BY created_at DESC
        """
        )

        result = self.db.execute(query, {"user_id": user_id})
        cases = [dict(row._mapping) for row in result.fetchall()]

        # Decrypt encrypted fields
        decrypted_cases = []
        for case in cases:
            # Convert datetime objects
            for key in ["created_at", "updated_at"]:
                if case.get(key):
                    case[key] = case[key].isoformat()

            # Decrypt description if encrypted
            if case.get("description"):
                case["description"] = self._try_decrypt_field(case["description"])

            decrypted_cases.append(case)

        return TableExport(table_name="cases", records=decrypted_cases, count=len(decrypted_cases))

    def _export_evidence(self, user_id: int) -> TableExport:
        """
        Export all evidence for user's cases.

        Decrypts: content (if encrypted)

        Args:
            user_id: User ID to export evidence for

        Returns:
            TableExport with evidence data
        """
        query = text(
            """
            SELECT e.*
            FROM evidence e
            JOIN cases c ON e.case_id = c.id
            WHERE c.user_id = :user_id
            ORDER BY e.created_at DESC
        """
        )

        result = self.db.execute(query, {"user_id": user_id})
        evidence_records = [dict(row._mapping) for row in result.fetchall()]

        # Decrypt encrypted fields
        decrypted_evidence = []
        for record in evidence_records:
            # Convert datetime objects
            for key in ["created_at", "updated_at"]:
                if record.get(key):
                    record[key] = record[key].isoformat()

            # Decrypt content if encrypted
            if record.get("content"):
                record["content"] = self._try_decrypt_field(record["content"])

            decrypted_evidence.append(record)

        return TableExport(
            table_name="evidence", records=decrypted_evidence, count=len(decrypted_evidence)
        )

    def _export_legal_issues(self, user_id: int) -> TableExport:
        """
        Export legal issues for user's cases.

        Args:
            user_id: User ID to export legal issues for

        Returns:
            TableExport with legal issues data
        """
        query = text(
            """
            SELECT li.*
            FROM legal_issues li
            JOIN cases c ON li.case_id = c.id
            WHERE c.user_id = :user_id
            ORDER BY li.created_at DESC
        """
        )

        result = self.db.execute(query, {"user_id": user_id})
        issues = [dict(row._mapping) for row in result.fetchall()]

        # Convert datetime objects
        for issue in issues:
            for key in ["created_at", "updated_at"]:
                if issue.get(key):
                    issue[key] = issue[key].isoformat()

        return TableExport(table_name="legal_issues", records=issues, count=len(issues))

    def _export_timeline_events(self, user_id: int) -> TableExport:
        """
        Export timeline events for user's cases.

        Decrypts: description (if encrypted)

        Args:
            user_id: User ID to export timeline events for

        Returns:
            TableExport with timeline events data
        """
        query = text(
            """
            SELECT te.*
            FROM timeline_events te
            JOIN cases c ON te.case_id = c.id
            WHERE c.user_id = :user_id
            ORDER BY te.event_date DESC
        """
        )

        result = self.db.execute(query, {"user_id": user_id})
        events = [dict(row._mapping) for row in result.fetchall()]

        # Decrypt descriptions
        decrypted_events = []
        for event in events:
            # Convert datetime objects
            for key in ["event_date", "created_at", "updated_at"]:
                if event.get(key):
                    event[key] = event[key].isoformat()

            # Decrypt description if encrypted
            if event.get("description"):
                event["description"] = self._try_decrypt_field(event["description"])

            decrypted_events.append(event)

        return TableExport(
            table_name="timeline_events", records=decrypted_events, count=len(decrypted_events)
        )

    def _export_actions(self, user_id: int) -> TableExport:
        """
        Export actions for user's cases.

        Decrypts: description (if encrypted)

        Args:
            user_id: User ID to export actions for

        Returns:
            TableExport with actions data
        """
        query = text(
            """
            SELECT a.*
            FROM actions a
            JOIN cases c ON a.case_id = c.id
            WHERE c.user_id = :user_id
            ORDER BY a.due_date DESC
        """
        )

        result = self.db.execute(query, {"user_id": user_id})
        actions = [dict(row._mapping) for row in result.fetchall()]

        # Decrypt descriptions
        decrypted_actions = []
        for action in actions:
            # Convert datetime objects
            for key in ["due_date", "completed_at", "created_at", "updated_at"]:
                if action.get(key):
                    action[key] = action[key].isoformat()

            # Decrypt description if encrypted
            if action.get("description"):
                action["description"] = self._try_decrypt_field(action["description"])

            decrypted_actions.append(action)

        return TableExport(
            table_name="actions", records=decrypted_actions, count=len(decrypted_actions)
        )

    def _export_notes(self, user_id: int) -> TableExport:
        """
        Export notes for user's cases.

        Decrypts: content (if encrypted)

        Args:
            user_id: User ID to export notes for

        Returns:
            TableExport with notes data
        """
        query = text(
            """
            SELECT n.*
            FROM notes n
            JOIN cases c ON n.case_id = c.id
            WHERE c.user_id = :user_id
            ORDER BY n.created_at DESC
        """
        )

        result = self.db.execute(query, {"user_id": user_id})
        notes = [dict(row._mapping) for row in result.fetchall()]

        # Decrypt content
        decrypted_notes = []
        for note in notes:
            # Convert datetime objects
            for key in ["created_at", "updated_at"]:
                if note.get(key):
                    note[key] = note[key].isoformat()

            # Decrypt content if encrypted
            if note.get("content"):
                note["content"] = self._try_decrypt_field(note["content"])

            decrypted_notes.append(note)

        return TableExport(table_name="notes", records=decrypted_notes, count=len(decrypted_notes))

    def _export_chat_conversations(self, user_id: int) -> TableExport:
        """
        Export chat conversations.

        Args:
            user_id: User ID to export conversations for

        Returns:
            TableExport with chat conversations data
        """
        query = text(
            """
            SELECT * FROM chat_conversations
            WHERE user_id = :user_id
            ORDER BY created_at DESC
        """
        )

        result = self.db.execute(query, {"user_id": user_id})
        conversations = [dict(row._mapping) for row in result.fetchall()]

        # Convert datetime objects
        for conversation in conversations:
            for key in ["created_at", "updated_at"]:
                if conversation.get(key):
                    conversation[key] = conversation[key].isoformat()

        return TableExport(
            table_name="chat_conversations", records=conversations, count=len(conversations)
        )

    def _export_chat_messages(self, user_id: int) -> TableExport:
        """
        Export chat messages.

        Decrypts: message, response (if user consented to encryption)

        Args:
            user_id: User ID to export messages for

        Returns:
            TableExport with chat messages data
        """
        query = text(
            """
            SELECT m.*
            FROM chat_messages m
            JOIN chat_conversations c ON m.conversation_id = c.id
            WHERE c.user_id = :user_id
            ORDER BY m.timestamp DESC
        """
        )

        result = self.db.execute(query, {"user_id": user_id})
        messages = [dict(row._mapping) for row in result.fetchall()]

        # Decrypt if encrypted
        decrypted_messages = []
        for msg in messages:
            # Convert datetime objects
            if msg.get("timestamp"):
                msg["timestamp"] = msg["timestamp"].isoformat()

            # Decrypt message if encrypted
            if msg.get("message"):
                msg["message"] = self._try_decrypt_field(msg["message"])

            # Decrypt response if encrypted
            if msg.get("response"):
                msg["response"] = self._try_decrypt_field(msg["response"])

            decrypted_messages.append(msg)

        return TableExport(
            table_name="chat_messages", records=decrypted_messages, count=len(decrypted_messages)
        )

    def _export_user_facts(self, user_id: int) -> TableExport:
        """
        Export user facts.

        Args:
            user_id: User ID to export facts for

        Returns:
            TableExport with user facts data
        """
        query = text(
            """
            SELECT * FROM user_facts
            WHERE user_id = :user_id
            ORDER BY created_at DESC
        """
        )

        result = self.db.execute(query, {"user_id": user_id})
        facts = [dict(row._mapping) for row in result.fetchall()]

        # Convert datetime objects
        for fact in facts:
            for key in ["created_at", "updated_at"]:
                if fact.get(key):
                    fact[key] = fact[key].isoformat()

        return TableExport(table_name="user_facts", records=facts, count=len(facts))

    def _export_case_facts(self, user_id: int) -> TableExport:
        """
        Export case facts for user's cases.

        Args:
            user_id: User ID to export case facts for

        Returns:
            TableExport with case facts data
        """
        query = text(
            """
            SELECT cf.*
            FROM case_facts cf
            JOIN cases c ON cf.case_id = c.id
            WHERE c.user_id = :user_id
            ORDER BY cf.created_at DESC
        """
        )

        result = self.db.execute(query, {"user_id": user_id})
        facts = [dict(row._mapping) for row in result.fetchall()]

        # Convert datetime objects
        for fact in facts:
            for key in ["created_at", "updated_at"]:
                if fact.get(key):
                    fact[key] = fact[key].isoformat()

        return TableExport(table_name="case_facts", records=facts, count=len(facts))

    def _export_sessions(self, user_id: int) -> TableExport:
        """
        Export active sessions.

        WARNING: Session tokens are NEVER exported (security).

        Args:
            user_id: User ID to export sessions for

        Returns:
            TableExport with session data
        """
        query = text(
            """
            SELECT id, user_id, created_at, expires_at, ip_address, user_agent
            FROM sessions
            WHERE user_id = :user_id
            ORDER BY created_at DESC
        """
        )

        result = self.db.execute(query, {"user_id": user_id})
        sessions = [dict(row._mapping) for row in result.fetchall()]

        # Convert datetime objects
        for session in sessions:
            for key in ["created_at", "expires_at"]:
                if session.get(key):
                    session[key] = session[key].isoformat()

        return TableExport(table_name="sessions", records=sessions, count=len(sessions))

    def _export_consents(self, user_id: int) -> TableExport:
        """
        Export consent records (GDPR requires preservation).

        Args:
            user_id: User ID to export consents for

        Returns:
            TableExport with consent data
        """
        query = text(
            """
            SELECT * FROM consents
            WHERE user_id = :user_id
            ORDER BY created_at DESC
        """
        )

        result = self.db.execute(query, {"user_id": user_id})
        consents = [dict(row._mapping) for row in result.fetchall()]

        # Convert datetime objects
        for consent in consents:
            for key in ["created_at", "updated_at"]:
                if consent.get(key):
                    consent[key] = consent[key].isoformat()

        return TableExport(table_name="consents", records=consents, count=len(consents))

    def _try_decrypt_field(self, field_value: str) -> str:
        """
        Attempt to decrypt a field if it's encrypted.

        Args:
            field_value: Field value (potentially encrypted JSON string)

        Returns:
            Decrypted plaintext if encrypted, original value if not
        """
        try:
            # Try to parse as JSON
            encrypted_data = json.loads(field_value)

            # Check if it has encrypted structure
            if (
                isinstance(encrypted_data, dict)
                and "ciphertext" in encrypted_data
                and "iv" in encrypted_data
            ):
                # Convert to EncryptedData object
                encrypted_obj = EncryptedData.from_dict(encrypted_data)
                # Decrypt
                return self.encryption_service.decrypt(encrypted_obj)
            else:
                # Not encrypted, return as-is
                return field_value
        except (json.JSONDecodeError, Exception):
            # Not JSON or decryption failed, return original
            return field_value

    def _get_schema_version(self) -> str:
        """
        Get current database schema version from migrations table.

        Returns:
            Schema version string or "0" if not available
        """
        try:
            query = text(
                """
                SELECT MAX(version) as version FROM migrations
            """
            )
            result = self.db.execute(query)
            row = result.fetchone()
            return str(row.version) if row and row.version else "0"
        except Exception:
            return "0"

    def _count_total_records(self, user_data: Dict[str, TableExport]) -> int:
        """
        Count total records across all tables.

        Args:
            user_data: Dictionary of table exports

        Returns:
            Total record count
        """
        return sum(table_export.count for table_export in user_data.values())

    def save_to_file(self, export_data: UserDataExport, file_path: str) -> None:
        """
        Save exported data to file.

        Args:
            export_data: UserDataExport object to save
            file_path: Path to save file (absolute or relative)

        Raises:
            IOError: If file cannot be written
        """
        try:
            # Create parent directories if they don't exist
            Path(file_path).parent.mkdir(parents=True, exist_ok=True)

            # Convert to dictionary and save as JSON
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(export_data.to_dict(), f, indent=2, ensure_ascii=False)

            logger.info(f"Exported user data to {file_path}")
        except Exception as error:
            logger.error(f"Failed to save export to file: {error}")
            raise IOError(f"Failed to save export to {file_path}: {error}")
