"""
Dashboard repository for aggregate queries and statistics.

Extracts all database queries from routes/dashboard.py into a clean repository layer.

Features:
- User statistics aggregation (cases, evidence, deadlines)
- Upcoming and overdue deadline queries
- Activity feed queries across entities
- Chart data queries (timeline, distribution)
"""

from typing import List, Dict, Any, Tuple
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from sqlalchemy import text


class DashboardRepository:
    """
    Repository for dashboard aggregate queries.
    
    Handles all complex queries that span multiple entities
    for dashboard statistics and widgets.
    """
    
    def __init__(self, db: Session):
        """
        Initialize dashboard repository.
        
        Args:
            db: SQLAlchemy session
        """
        self.db = db
    
    # ===== STATISTICS QUERIES =====
    
    def get_evidence_count(self, user_id: int) -> int:
        """
        Get total evidence count for user's cases.
        
        Args:
            user_id: User ID
            
        Returns:
            Total evidence count
        """
        query = text("""
            SELECT COUNT(*) as count
            FROM evidence
            WHERE case_id IN (SELECT id FROM cases WHERE user_id = :user_id)
        """)
        result = self.db.execute(query, {"user_id": user_id}).fetchone()
        return result.count if result else 0
    
    def get_deadline_counts(self, user_id: int) -> Dict[str, int]:
        """
        Get deadline counts for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            Dictionary with total, overdue, and upcoming counts
        """
        # Total deadlines
        total_query = text("""
            SELECT COUNT(*) as count
            FROM deadlines
            WHERE user_id = :user_id AND deleted_at IS NULL
        """)
        total_result = self.db.execute(total_query, {"user_id": user_id}).fetchone()
        total = total_result.count if total_result else 0
        
        # Overdue deadlines
        now = datetime.utcnow().isoformat()
        overdue_query = text("""
            SELECT COUNT(*) as count
            FROM deadlines
            WHERE user_id = :user_id
              AND deleted_at IS NULL
              AND status != 'completed'
              AND deadline_date < :now
        """)
        overdue_result = self.db.execute(
            overdue_query, {"user_id": user_id, "now": now}
        ).fetchone()
        overdue = overdue_result.count if overdue_result else 0
        
        # Upcoming (not overdue, not completed)
        upcoming_query = text("""
            SELECT COUNT(*) as count
            FROM deadlines
            WHERE user_id = :user_id
              AND deleted_at IS NULL
              AND status != 'completed'
              AND deadline_date >= :now
        """)
        upcoming_result = self.db.execute(
            upcoming_query, {"user_id": user_id, "now": now}
        ).fetchone()
        upcoming = upcoming_result.count if upcoming_result else 0
        
        return {
            "total": total,
            "overdue": overdue,
            "upcoming": upcoming,
        }
    
    # ===== DEADLINE WIDGET QUERIES =====
    
    def get_upcoming_deadlines_with_cases(
        self, user_id: int, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get upcoming deadlines with case information.
        
        Args:
            user_id: User ID
            limit: Maximum number of results
            
        Returns:
            List of deadline dictionaries with case info
        """
        query = text("""
            SELECT
                d.id,
                d.title,
                d.deadline_date,
                d.priority,
                d.case_id,
                c.title as case_title
            FROM deadlines d
            LEFT JOIN cases c ON d.case_id = c.id
            WHERE d.user_id = :user_id
              AND d.status != 'completed'
              AND d.deleted_at IS NULL
            ORDER BY d.deadline_date ASC
            LIMIT :limit
        """)
        
        results = self.db.execute(
            query, {"user_id": user_id, "limit": limit}
        ).fetchall()
        
        now = datetime.utcnow()
        deadlines = []
        
        for row in results:
            try:
                deadline_date_str = row.deadline_date
                if deadline_date_str:
                    deadline_date = datetime.fromisoformat(
                        deadline_date_str.replace("Z", "+00:00")
                    )
                    days_until = (deadline_date - now).days
                    is_overdue = deadline_date < now
                else:
                    days_until = None
                    is_overdue = False
                
                deadlines.append({
                    "id": row.id,
                    "title": row.title,
                    "deadlineDate": deadline_date_str,
                    "priority": row.priority,
                    "daysUntil": days_until,
                    "isOverdue": is_overdue,
                    "caseId": row.case_id,
                    "caseTitle": row.case_title,
                })
            except (ValueError, AttributeError):
                # Skip deadlines with invalid dates
                continue
        
        return deadlines
    
    def get_total_upcoming_deadlines(self, user_id: int) -> int:
        """
        Get total count of upcoming deadlines.
        
        Args:
            user_id: User ID
            
        Returns:
            Total count
        """
        query = text("""
            SELECT COUNT(*) as count
            FROM deadlines
            WHERE user_id = :user_id
              AND status != 'completed'
              AND deleted_at IS NULL
        """)
        result = self.db.execute(query, {"user_id": user_id}).fetchone()
        return result.count if result else 0
    
    # ===== ACTIVITY QUERIES =====
    
    def get_recent_case_activity(
        self, user_id: int, limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Get recent case updates for activity feed.
        
        Args:
            user_id: User ID
            limit: Maximum number of results
            
        Returns:
            List of activity dictionaries
        """
        query = text("""
            SELECT
                id,
                'case' as type,
                title,
                updated_at,
                status
            FROM cases
            WHERE user_id = :user_id
            ORDER BY updated_at DESC
            LIMIT :limit
        """)
        
        results = self.db.execute(
            query, {"user_id": user_id, "limit": limit}
        ).fetchall()
        
        return [
            {
                "id": row.id,
                "type": "case",
                "action": "updated",
                "title": row.title,
                "timestamp": row.updated_at,
                "metadata": {"status": row.status},
            }
            for row in results
        ]
    
    def get_recent_evidence_activity(
        self, user_id: int, limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Get recent evidence uploads for activity feed.
        
        Args:
            user_id: User ID
            limit: Maximum number of results
            
        Returns:
            List of activity dictionaries
        """
        query = text("""
            SELECT
                e.id,
                'evidence' as type,
                e.title,
                e.created_at,
                e.evidence_type,
                e.case_id,
                c.title as case_title
            FROM evidence e
            LEFT JOIN cases c ON e.case_id = c.id
            WHERE e.user_id = :user_id
            ORDER BY e.created_at DESC
            LIMIT :limit
        """)
        
        results = self.db.execute(
            query, {"user_id": user_id, "limit": limit}
        ).fetchall()
        
        return [
            {
                "id": row.id,
                "type": "evidence",
                "action": "uploaded",
                "title": row.title,
                "timestamp": row.created_at,
                "metadata": {
                    "evidenceType": row.evidence_type,
                    "caseId": row.case_id,
                    "caseTitle": row.case_title,
                },
            }
            for row in results
        ]
    
    def get_recent_deadline_activity(
        self, user_id: int, limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Get recent deadline changes for activity feed.
        
        Args:
            user_id: User ID
            limit: Maximum number of results
            
        Returns:
            List of activity dictionaries
        """
        query = text("""
            SELECT
                d.id,
                'deadline' as type,
                d.title,
                d.updated_at,
                d.status,
                d.case_id,
                c.title as case_title
            FROM deadlines d
            LEFT JOIN cases c ON d.case_id = c.id
            WHERE d.user_id = :user_id
              AND d.deleted_at IS NULL
            ORDER BY d.updated_at DESC
            LIMIT :limit
        """)
        
        results = self.db.execute(
            query, {"user_id": user_id, "limit": limit}
        ).fetchall()
        
        return [
            {
                "id": row.id,
                "type": "deadline",
                "action": "updated",
                "title": row.title,
                "timestamp": row.updated_at,
                "metadata": {
                    "status": row.status,
                    "caseId": row.case_id,
                    "caseTitle": row.case_title,
                },
            }
            for row in results
        ]
    
    def get_combined_activity(
        self, user_id: int, limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get combined activity feed from all entities.
        
        Args:
            user_id: User ID
            limit: Maximum number of results
            
        Returns:
            List of activity dictionaries, sorted by timestamp
        """
        # Get activities from all sources
        case_activity = self.get_recent_case_activity(user_id, 20)
        evidence_activity = self.get_recent_evidence_activity(user_id, 20)
        deadline_activity = self.get_recent_deadline_activity(user_id, 20)
        
        # Combine and sort by timestamp
        all_activity = case_activity + evidence_activity + deadline_activity
        sorted_activity = sorted(
            all_activity,
            key=lambda a: a["timestamp"] if a["timestamp"] else "",
            reverse=True,
        )
        
        return sorted_activity[:limit]
    
    # ===== CHART QUERIES =====
    
    def get_cases_timeline(
        self, user_id: int, days: int = 30
    ) -> Tuple[List[Dict[str, Any]], str, str]:
        """
        Get cases created timeline for chart.
        
        Args:
            user_id: User ID
            days: Number of days to include
            
        Returns:
            Tuple of (data points, start_date, end_date)
        """
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        query = text("""
            SELECT
                DATE(created_at) as date,
                COUNT(*) as count
            FROM cases
            WHERE user_id = :user_id
              AND created_at >= :start_date
              AND created_at <= :end_date
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        """)
        
        results = self.db.execute(
            query,
            {
                "user_id": user_id,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            },
        ).fetchall()
        
        data_points = [
            {"date": row.date, "count": row.count}
            for row in results
        ]
        
        return (
            data_points,
            start_date.date().isoformat(),
            end_date.date().isoformat(),
        )
    
    # ===== SUMMARY QUERIES =====
    
    def get_dashboard_summary(self, user_id: int) -> Dict[str, Any]:
        """
        Get complete dashboard summary in a single call.
        
        Args:
            user_id: User ID
            
        Returns:
            Dictionary with all dashboard statistics
        """
        evidence_count = self.get_evidence_count(user_id)
        deadline_counts = self.get_deadline_counts(user_id)
        
        return {
            "evidenceCount": evidence_count,
            "deadlines": deadline_counts,
        }
