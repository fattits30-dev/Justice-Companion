"""
Example usage of DeadlineReminderScheduler service.

This file demonstrates how to integrate the deadline reminder scheduler
into your application for automated deadline notifications.

Usage scenarios:
1. Starting scheduler on application startup
2. Manual deadline checks
3. Monitoring scheduler status
4. Graceful shutdown
"""

import asyncio
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.models.base import Base
from backend.models.user import User
from backend.models.case import Case
from backend.models.deadline import Deadline, DeadlineStatus, DeadlinePriority
from backend.models.notification import NotificationPreferences
from backend.services.deadline_reminder_scheduler import DeadlineReminderScheduler
from backend.services.notification_service import NotificationService
from backend.services.audit_logger import AuditLogger


# Example 1: Basic Integration in FastAPI Application
# ====================================================

"""
# In your main FastAPI app file (e.g., main.py):

from fastapi import FastAPI
from backend.services.deadline_reminder_scheduler import DeadlineReminderScheduler

app = FastAPI()

# Global scheduler instance
scheduler: Optional[DeadlineReminderScheduler] = None


@app.on_event("startup")
async def startup_event():
    '''Initialize and start deadline reminder scheduler on app startup.'''
    global scheduler

    # Initialize database session
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    # Initialize services
    notification_service = NotificationService(db=db, audit_logger=audit_logger)
    audit_logger = AuditLogger(db=db)

    # Create and start scheduler
    scheduler = DeadlineReminderScheduler(
        db=db,
        notification_service=notification_service,
        audit_logger=audit_logger,
        check_interval=3600  # Check every hour
    )

    scheduler.start()
    print("Deadline reminder scheduler started")


@app.on_event("shutdown")
async def shutdown_event():
    '''Stop scheduler gracefully on app shutdown.'''
    global scheduler

    if scheduler:
        scheduler.stop()
        print("Deadline reminder scheduler stopped")


@app.get("/api/scheduler/status")
async def get_scheduler_status():
    '''API endpoint to check scheduler status.'''
    if not scheduler:
        return {"error": "Scheduler not initialized"}

    return scheduler.get_stats()


@app.post("/api/scheduler/check-now")
async def trigger_manual_check():
    '''API endpoint to manually trigger deadline check.'''
    if not scheduler:
        return {"error": "Scheduler not initialized"}

    await scheduler.check_now()
    return {"message": "Manual check completed"}
"""


# Example 2: Standalone Script for Testing
# =========================================

async def standalone_scheduler_demo():
    """
    Standalone demo showing scheduler usage outside of FastAPI.

    This is useful for:
    - Testing scheduler functionality
    - Running as a background service
    - Development and debugging
    """

    # Setup in-memory database for demo
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    # Create test data
    print("Setting up test data...")

    # Create user
    user = User(
        username="demo_user",
        password_hash="hash",
        password_salt="salt"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create notification preferences (reminders enabled)
    prefs = NotificationPreferences(
        user_id=user.id,
        deadline_reminders_enabled=True,
        deadline_reminder_days=7  # Remind 7 days before deadline
    )
    db.add(prefs)
    db.commit()

    # Create case
    case = Case(
        user_id=user.id,
        title="Example Legal Case",
        status="active"
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    # Create upcoming deadlines
    deadlines = [
        Deadline(
            user_id=user.id,
            case_id=case.id,
            title="File Motion to Dismiss",
            description="Submit motion by this date",
            deadline_date=(datetime.now() + timedelta(days=3)).isoformat(),
            priority=DeadlinePriority.HIGH.value,
            status=DeadlineStatus.UPCOMING.value
        ),
        Deadline(
            user_id=user.id,
            case_id=case.id,
            title="Discovery Response Due",
            description="Respond to discovery requests",
            deadline_date=(datetime.now() + timedelta(days=5)).isoformat(),
            priority=DeadlinePriority.MEDIUM.value,
            status=DeadlineStatus.UPCOMING.value
        ),
        Deadline(
            user_id=user.id,
            case_id=case.id,
            title="Trial Preparation Meeting",
            deadline_date=(datetime.now() + timedelta(days=30)).isoformat(),
            priority=DeadlinePriority.LOW.value,
            status=DeadlineStatus.UPCOMING.value
        )
    ]

    for deadline in deadlines:
        db.add(deadline)

    db.commit()

    print(f"Created {len(deadlines)} test deadlines")

    # Initialize services
    audit_logger = AuditLogger(db=db)
    notification_service = NotificationService(db=db, audit_logger=audit_logger)

    # Create scheduler
    scheduler = DeadlineReminderScheduler(
        db=db,
        notification_service=notification_service,
        audit_logger=audit_logger,
        check_interval=5  # Check every 5 seconds for demo
    )

    print("\nStarting deadline reminder scheduler...")
    scheduler.start()

    # Get initial stats
    stats = scheduler.get_stats()
    print(f"Scheduler running: {stats['is_running']}")
    print(f"Check interval: {stats['check_interval_seconds']} seconds")

    # Let scheduler run for a few checks
    print("\nRunning scheduler for 15 seconds...")
    await asyncio.sleep(15)

    # Get updated stats
    stats = scheduler.get_stats()
    print(f"\nReminders sent: {stats['sent_reminders_count']}")

    # Manual check
    print("\nTriggering manual check...")
    await scheduler.check_now()

    # Get final stats
    stats = scheduler.get_stats()
    print(f"Total reminders tracked: {stats['sent_reminders_count']}")

    # Stop scheduler
    print("\nStopping scheduler...")
    scheduler.stop()

    print("Demo completed!")

    db.close()


# Example 3: Custom Scheduler with Different Intervals
# ====================================================

class CustomDeadlineScheduler:
    """
    Wrapper around DeadlineReminderScheduler with custom configuration.

    This example shows how to create a custom scheduler with:
    - Different check intervals based on time of day
    - Custom notification logic
    - Integration with other services
    """

    def __init__(
        self,
        db,
        notification_service,
        audit_logger=None
    ):
        # Create scheduler with default interval
        self.scheduler = DeadlineReminderScheduler(
            db=db,
            notification_service=notification_service,
            audit_logger=audit_logger,
            check_interval=1800  # 30 minutes default
        )

        self.db = db

    async def start_business_hours_schedule(self):
        """
        Start scheduler with more frequent checks during business hours.

        This could be enhanced to:
        - Check every 15 minutes during business hours (9am-5pm)
        - Check every 2 hours during off-hours
        - Skip checks during maintenance windows
        """
        self.scheduler.start()

        # In a real implementation, you might adjust check_interval
        # based on current time
        current_hour = datetime.now().hour

        if 9 <= current_hour < 17:
            # Business hours - more frequent checks
            self.scheduler.check_interval = 900  # 15 minutes
        else:
            # Off-hours - less frequent checks
            self.scheduler.check_interval = 7200  # 2 hours

    async def check_critical_deadlines_only(self):
        """
        Custom check that only processes critical priority deadlines.

        This demonstrates how to extend scheduler functionality
        for special use cases.
        """
        # Get all users with reminders enabled
        users_with_reminders = self.db.query(NotificationPreferences).filter(
            NotificationPreferences.deadline_reminders_enabled == True
        ).all()

        for prefs in users_with_reminders:
            # Get only critical deadlines
            critical_deadlines = self.db.query(Deadline).filter(
                Deadline.user_id == prefs.user_id,
                Deadline.priority == DeadlinePriority.CRITICAL.value,
                Deadline.status != DeadlineStatus.COMPLETED.value,
                Deadline.deleted_at.is_(None)
            ).all()

            # Process critical deadlines with scheduler logic
            for deadline in critical_deadlines:
                deadline_date = datetime.fromisoformat(
                    deadline.deadline_date.replace('Z', '+00:00')
                )

                # Send immediate notification for critical deadlines
                # within next 24 hours
                if deadline_date <= datetime.now() + timedelta(days=1):
                    await self.scheduler._create_deadline_reminder_notification(
                        prefs.user_id,
                        deadline
                    )

    def stop(self):
        """Stop the scheduler."""
        self.scheduler.stop()


# Example 4: Monitoring and Alerting
# ==================================

class SchedulerMonitor:
    """
    Monitor deadline reminder scheduler health and performance.

    This example shows how to:
    - Track scheduler uptime
    - Monitor notification delivery success rate
    - Alert on scheduler failures
    """

    def __init__(self, scheduler: DeadlineReminderScheduler):
        self.scheduler = scheduler
        self.start_time = None
        self.check_count = 0
        self.error_count = 0

    def on_scheduler_start(self):
        """Called when scheduler starts."""
        self.start_time = datetime.now()
        self.check_count = 0
        self.error_count = 0
        print(f"[MONITOR] Scheduler started at {self.start_time}")

    def on_scheduler_stop(self):
        """Called when scheduler stops."""
        if self.start_time:
            uptime = datetime.now() - self.start_time
            print(f"[MONITOR] Scheduler stopped after {uptime}")
            print(f"[MONITOR] Total checks: {self.check_count}")
            print(f"[MONITOR] Errors: {self.error_count}")

    async def on_check_complete(self, success: bool):
        """Called after each deadline check."""
        self.check_count += 1

        if not success:
            self.error_count += 1

            # Alert if error rate is high
            if self.error_count > 5:
                print(f"[ALERT] High error rate detected: {self.error_count} errors")

    def get_health_status(self) -> dict:
        """Get scheduler health status."""
        if not self.start_time:
            return {"status": "not_started"}

        uptime = (datetime.now() - self.start_time).total_seconds()
        error_rate = (
            self.error_count / self.check_count if self.check_count > 0 else 0
        )

        return {
            "status": "healthy" if error_rate < 0.1 else "degraded",
            "uptime_seconds": uptime,
            "total_checks": self.check_count,
            "error_count": self.error_count,
            "error_rate": error_rate,
            "is_running": self.scheduler.is_running
        }


# Run standalone demo
if __name__ == "__main__":
    print("=" * 60)
    print("Deadline Reminder Scheduler Demo")
    print("=" * 60)

    asyncio.run(standalone_scheduler_demo())
