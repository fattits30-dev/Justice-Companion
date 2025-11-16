"""
SessionManager Service - Usage Examples

This file demonstrates various usage patterns for the SessionManager service.
Run individual functions to see the service in action.
"""

import asyncio
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.base import Base
from backend.models.user import User
from backend.services.session_manager import SessionManager, get_session_manager


# ============================================================================
# Database Setup
# ============================================================================

def setup_test_database():
    """Create in-memory test database with sample data."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    # Create test users
    users = [
        User(
            username="john_doe",
            email="john@example.com",
            password_hash="dummy_hash_1",
            password_salt="dummy_salt_1",
            role="user",
            is_active=True
        ),
        User(
            username="jane_smith",
            email="jane@example.com",
            password_hash="dummy_hash_2",
            password_salt="dummy_salt_2",
            role="admin",
            is_active=True
        ),
        User(
            username="inactive_user",
            email="inactive@example.com",
            password_hash="dummy_hash_3",
            password_salt="dummy_salt_3",
            role="user",
            is_active=False
        )
    ]

    for user in users:
        db.add(user)

    db.commit()

    return db, engine


# ============================================================================
# Example 1: Basic Session Creation and Validation
# ============================================================================

async def example_basic_session():
    """
    Example 1: Basic session creation and validation.

    Demonstrates:
    - Creating a session for a user
    - Validating the session
    - Destroying the session (logout)
    """
    print("\n" + "="*70)
    print("Example 1: Basic Session Creation and Validation")
    print("="*70 + "\n")

    db, engine = setup_test_database()

    try:
        # Initialize SessionManager without cache
        manager = SessionManager(db=db, enable_memory_cache=False)

        # Get test user
        user = db.query(User).filter(User.username == "john_doe").first()
        print(f"User: {user.username} (ID: {user.id})")

        # Create session
        print("\n1. Creating session...")
        session_id = await manager.create_session(
            user_id=user.id,
            username=user.username,
            remember_me=False
        )
        print(f"   ✓ Session created: {session_id}")

        # Validate session
        print("\n2. Validating session...")
        result = await manager.validate_session(session_id)
        print(f"   ✓ Session valid: {result.valid}")
        print(f"   ✓ User ID: {result.user_id}")
        print(f"   ✓ Username: {result.username}")

        # Destroy session
        print("\n3. Destroying session (logout)...")
        success = await manager.destroy_session(session_id)
        print(f"   ✓ Session destroyed: {success}")

        # Validate again (should be invalid)
        print("\n4. Validating destroyed session...")
        result = await manager.validate_session(session_id)
        print(f"   ✓ Session valid: {result.valid} (should be False)")

    finally:
        db.close()
        engine.dispose()


# ============================================================================
# Example 2: Remember Me Sessions
# ============================================================================

async def example_remember_me():
    """
    Example 2: Remember Me sessions with extended expiration.

    Demonstrates:
    - Creating a remember_me session (30 days)
    - Comparing expiration times
    """
    print("\n" + "="*70)
    print("Example 2: Remember Me Sessions")
    print("="*70 + "\n")

    db, engine = setup_test_database()

    try:
        manager = SessionManager(db=db, enable_memory_cache=False)
        user = db.query(User).filter(User.username == "john_doe").first()

        # Create standard session (24 hours)
        print("1. Creating standard session (24 hours)...")
        standard_session_id = await manager.create_session(
            user_id=user.id,
            username=user.username,
            remember_me=False
        )

        from backend.models.session import Session as SessionModel
        standard_session = db.query(SessionModel).filter(
            SessionModel.id == standard_session_id
        ).first()

        expiry_delta = standard_session.expires_at - standard_session.created_at
        hours = expiry_delta.total_seconds() / 3600
        print(f"   ✓ Session ID: {standard_session_id}")
        print(f"   ✓ Expires in: {hours:.1f} hours")

        # Create remember_me session (30 days)
        print("\n2. Creating remember_me session (30 days)...")
        remember_session_id = await manager.create_session(
            user_id=user.id,
            username=user.username,
            remember_me=True
        )

        remember_session = db.query(SessionModel).filter(
            SessionModel.id == remember_session_id
        ).first()

        expiry_delta = remember_session.expires_at - remember_session.created_at
        days = expiry_delta.total_seconds() / 86400
        print(f"   ✓ Session ID: {remember_session_id}")
        print(f"   ✓ Expires in: {days:.1f} days")

        # Compare
        print("\n3. Comparison:")
        print(f"   Standard session: {hours:.1f} hours")
        print(f"   Remember Me session: {days:.1f} days")
        print(f"   Difference: {days / (hours / 24):.1f}x longer")

    finally:
        db.close()
        engine.dispose()


# ============================================================================
# Example 3: Memory Cache Performance
# ============================================================================

async def example_memory_cache():
    """
    Example 3: Memory cache for fast validation.

    Demonstrates:
    - Enabling memory cache
    - Cache hit performance
    - Session count monitoring
    """
    print("\n" + "="*70)
    print("Example 3: Memory Cache Performance")
    print("="*70 + "\n")

    db, engine = setup_test_database()

    try:
        # Manager WITH cache
        manager_cached = SessionManager(db=db, enable_memory_cache=True)
        user = db.query(User).filter(User.username == "john_doe").first()

        print("1. Creating sessions with cache enabled...")
        session_ids = []
        for i in range(3):
            session_id = await manager_cached.create_session(
                user_id=user.id,
                username=user.username,
                remember_me=False
            )
            session_ids.append(session_id)
            print(f"   ✓ Session {i+1}: {session_id}")

        # Check counts
        print("\n2. Session counts:")
        counts = manager_cached.get_session_count()
        print(f"   Memory cache: {counts['memory_cache']} sessions")
        print(f"   Database: {counts['database']} sessions")
        print(f"   Active: {counts['active']} sessions")

        # Validate (should hit cache)
        print("\n3. Validating sessions (cache hits)...")
        for i, session_id in enumerate(session_ids):
            result = await manager_cached.validate_session(session_id)
            print(f"   ✓ Session {i+1}: valid={result.valid}, user={result.username}")

        # Get active session IDs
        print("\n4. Active session IDs (from cache):")
        active_ids = manager_cached.get_active_session_ids()
        for i, session_id in enumerate(active_ids):
            print(f"   {i+1}. {session_id}")

    finally:
        db.close()
        engine.dispose()


# ============================================================================
# Example 4: Session Cleanup
# ============================================================================

async def example_cleanup():
    """
    Example 4: Automatic expired session cleanup.

    Demonstrates:
    - Creating multiple sessions
    - Manually expiring sessions
    - Running cleanup
    """
    print("\n" + "="*70)
    print("Example 4: Session Cleanup")
    print("="*70 + "\n")

    db, engine = setup_test_database()

    try:
        manager = SessionManager(db=db, enable_memory_cache=True)
        user = db.query(User).filter(User.username == "john_doe").first()

        # Create 5 sessions
        print("1. Creating 5 sessions...")
        session_ids = []
        for i in range(5):
            session_id = await manager.create_session(
                user_id=user.id,
                username=user.username,
                remember_me=False
            )
            session_ids.append(session_id)

        counts = manager.get_session_count()
        print(f"   ✓ Total sessions: {counts['database']}")

        # Manually expire 3 sessions
        print("\n2. Manually expiring 3 sessions...")
        from datetime import timedelta, timezone
        from backend.models.session import Session as SessionModel

        for i in range(3):
            db_session = db.query(SessionModel).filter(
                SessionModel.id == session_ids[i]
            ).first()
            db_session.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)

            # Also expire in cache
            if session_ids[i] in manager._memory_cache:
                manager._memory_cache[session_ids[i]].expires_at = \
                    datetime.now(timezone.utc) - timedelta(hours=1)

        db.commit()
        print(f"   ✓ Expired sessions: {session_ids[:3]}")

        # Run cleanup
        print("\n3. Running cleanup...")
        cleaned_count = await manager.cleanup_expired_sessions()
        print(f"   ✓ Cleaned up: {cleaned_count} sessions")

        # Check counts
        counts = manager.get_session_count()
        print(f"\n4. Remaining sessions:")
        print(f"   Memory cache: {counts['memory_cache']}")
        print(f"   Database: {counts['database']}")
        print(f"   Active: {counts['active']}")

    finally:
        db.close()
        engine.dispose()


# ============================================================================
# Example 5: User Session Management
# ============================================================================

async def example_user_sessions():
    """
    Example 5: Managing multiple sessions for a user.

    Demonstrates:
    - Creating multiple sessions for a user
    - Listing all user sessions
    - Revoking specific sessions
    - Revoking all except current session
    """
    print("\n" + "="*70)
    print("Example 5: User Session Management")
    print("="*70 + "\n")

    db, engine = setup_test_database()

    try:
        manager = SessionManager(db=db, enable_memory_cache=True)
        user = db.query(User).filter(User.username == "john_doe").first()

        # Create 3 sessions (simulating multiple devices)
        print("1. Creating 3 sessions (multiple devices)...")
        session_ids = []
        devices = ["Chrome on Windows", "Safari on iPhone", "Firefox on Linux"]

        for i, device in enumerate(devices):
            session_id = await manager.create_session(
                user_id=user.id,
                username=user.username,
                remember_me=False,
                ip_address=f"192.168.1.{100+i}",
                user_agent=device
            )
            session_ids.append(session_id)
            print(f"   ✓ Device {i+1}: {device}")
            print(f"      Session: {session_id}")

        # Get all user sessions
        print("\n2. Listing all active sessions for user...")
        sessions = await manager.get_user_sessions(user.id)
        print(f"   Total sessions: {len(sessions)}")

        for i, session in enumerate(sessions):
            print(f"\n   Session {i+1}:")
            print(f"      ID: {session['id']}")
            print(f"      IP: {session['ip_address']}")
            print(f"      User Agent: {session['user_agent']}")
            print(f"      Created: {session['created_at']}")

        # Revoke all sessions except current one
        print("\n3. Revoking all sessions except current one...")
        current_session_id = session_ids[0]  # Simulate current session
        print(f"   Current session (keeping): {current_session_id}")

        revoked = await manager.revoke_user_sessions(
            user_id=user.id,
            except_session_id=current_session_id
        )
        print(f"   ✓ Revoked: {revoked} sessions")

        # Verify only current session remains
        remaining_sessions = await manager.get_user_sessions(user.id)
        print(f"\n4. Remaining sessions: {len(remaining_sessions)}")
        for session in remaining_sessions:
            print(f"   ✓ {session['id']} (current session)")

    finally:
        db.close()
        engine.dispose()


# ============================================================================
# Example 6: Security Event (Password Change)
# ============================================================================

async def example_security_event():
    """
    Example 6: Handling security events (password change).

    Demonstrates:
    - Creating multiple sessions
    - Simulating password change
    - Revoking all sessions except current
    - Force re-authentication
    """
    print("\n" + "="*70)
    print("Example 6: Security Event (Password Change)")
    print("="*70 + "\n")

    db, engine = setup_test_database()

    try:
        manager = SessionManager(db=db, enable_memory_cache=True)
        user = db.query(User).filter(User.username == "john_doe").first()

        # Create 4 sessions
        print("1. User logs in from 4 devices...")
        session_ids = []
        for i in range(4):
            session_id = await manager.create_session(
                user_id=user.id,
                username=user.username,
                remember_me=False
            )
            session_ids.append(session_id)

        print(f"   ✓ Total sessions: {len(session_ids)}")

        # Simulate password change from one device
        print("\n2. User changes password from device 1...")
        current_session_id = session_ids[0]
        print(f"   Current device session: {current_session_id}")

        # Revoke all other sessions for security
        print("\n3. Revoking all other sessions for security...")
        revoked = await manager.revoke_user_sessions(
            user_id=user.id,
            except_session_id=current_session_id
        )
        print(f"   ✓ Revoked: {revoked} sessions")
        print(f"   ✓ Current session preserved")

        # Verify other sessions are invalid
        print("\n4. Validating other device sessions (should be invalid)...")
        for i, session_id in enumerate(session_ids[1:], start=2):
            result = await manager.validate_session(session_id)
            status = "✗ Invalid" if not result.valid else "✓ Valid"
            print(f"   Device {i}: {status}")

        # Verify current session is still valid
        print("\n5. Validating current device session (should be valid)...")
        result = await manager.validate_session(current_session_id)
        status = "✓ Valid" if result.valid else "✗ Invalid"
        print(f"   Current device: {status}")

    finally:
        db.close()
        engine.dispose()


# ============================================================================
# Example 7: Inactive User Handling
# ============================================================================

async def example_inactive_user():
    """
    Example 7: Handling inactive user sessions.

    Demonstrates:
    - Creating session for active user
    - Deactivating user account
    - Session validation fails for inactive user
    """
    print("\n" + "="*70)
    print("Example 7: Inactive User Handling")
    print("="*70 + "\n")

    db, engine = setup_test_database()

    try:
        manager = SessionManager(db=db, enable_memory_cache=False)

        # Create user
        user = User(
            username="temp_user",
            email="temp@example.com",
            password_hash="hash",
            password_salt="salt",
            role="user",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create session
        print("1. Creating session for active user...")
        session_id = await manager.create_session(
            user_id=user.id,
            username=user.username,
            remember_me=False
        )
        print(f"   ✓ Session created: {session_id}")

        # Validate (should be valid)
        print("\n2. Validating session (user active)...")
        result = await manager.validate_session(session_id)
        print(f"   ✓ Session valid: {result.valid}")

        # Deactivate user
        print("\n3. Deactivating user account...")
        user.is_active = False
        db.commit()
        print(f"   ✓ User {user.username} deactivated")

        # Validate (should be invalid)
        print("\n4. Validating session (user inactive)...")
        result = await manager.validate_session(session_id)
        print(f"   ✗ Session valid: {result.valid} (should be False)")
        print(f"   ✓ Session automatically invalidated for inactive user")

    finally:
        db.close()
        engine.dispose()


# ============================================================================
# Example 8: Singleton Pattern
# ============================================================================

async def example_singleton():
    """
    Example 8: Using get_session_manager() singleton.

    Demonstrates:
    - Getting singleton instance
    - Verifying same instance returned
    - Singleton pattern benefits
    """
    print("\n" + "="*70)
    print("Example 8: Singleton Pattern")
    print("="*70 + "\n")

    db, engine = setup_test_database()

    try:
        print("1. Getting SessionManager singleton instance...")
        manager1 = get_session_manager(db, enable_memory_cache=True)
        print(f"   ✓ Manager 1: {id(manager1)}")

        print("\n2. Getting SessionManager singleton instance again...")
        manager2 = get_session_manager(db, enable_memory_cache=True)
        print(f"   ✓ Manager 2: {id(manager2)}")

        print("\n3. Comparing instances...")
        if manager1 is manager2:
            print("   ✓ Same instance returned (singleton pattern working)")
        else:
            print("   ✗ Different instances (singleton pattern not working)")

        print("\n4. Benefits of singleton pattern:")
        print("   - Single memory cache shared across requests")
        print("   - Consistent configuration")
        print("   - Reduced memory overhead")

    finally:
        db.close()
        engine.dispose()


# ============================================================================
# Main Function - Run All Examples
# ============================================================================

async def run_all_examples():
    """Run all examples sequentially."""
    print("\n" + "="*70)
    print("SessionManager Service - Usage Examples")
    print("="*70)

    examples = [
        ("Basic Session Creation and Validation", example_basic_session),
        ("Remember Me Sessions", example_remember_me),
        ("Memory Cache Performance", example_memory_cache),
        ("Session Cleanup", example_cleanup),
        ("User Session Management", example_user_sessions),
        ("Security Event (Password Change)", example_security_event),
        ("Inactive User Handling", example_inactive_user),
        ("Singleton Pattern", example_singleton),
    ]

    for i, (name, example_func) in enumerate(examples, start=1):
        try:
            await example_func()
        except Exception as e:
            print(f"\n✗ Example {i} failed: {e}")

        if i < len(examples):
            input("\nPress Enter to continue to next example...")

    print("\n" + "="*70)
    print("All examples completed!")
    print("="*70 + "\n")


# ============================================================================
# Entry Point
# ============================================================================

if __name__ == "__main__":
    print("\nSessionManager Service - Usage Examples")
    print("Choose an example to run:")
    print("  1. Basic Session Creation and Validation")
    print("  2. Remember Me Sessions")
    print("  3. Memory Cache Performance")
    print("  4. Session Cleanup")
    print("  5. User Session Management")
    print("  6. Security Event (Password Change)")
    print("  7. Inactive User Handling")
    print("  8. Singleton Pattern")
    print("  9. Run All Examples")
    print("  0. Exit")

    choice = input("\nEnter choice (0-9): ").strip()

    examples = {
        "1": example_basic_session,
        "2": example_remember_me,
        "3": example_memory_cache,
        "4": example_cleanup,
        "5": example_user_sessions,
        "6": example_security_event,
        "7": example_inactive_user,
        "8": example_singleton,
        "9": run_all_examples,
    }

    if choice == "0":
        print("Exiting...")
    elif choice in examples:
        asyncio.run(examples[choice]())
    else:
        print(f"Invalid choice: {choice}")
