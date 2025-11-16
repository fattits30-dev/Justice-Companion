# KeyManager Migration Guide

Complete guide for migrating from plaintext `.env` key storage to OS-level secure storage.

## Overview

This guide covers migrating Justice Companion's encryption key from plaintext `.env` storage (CVSS 9.1 vulnerability) to OS-native secure storage using the `KeyManager` service.

**Migration Benefits:**
- ✓ Eliminates plaintext key storage
- ✓ Uses OS-level encryption (DPAPI/Keychain/Secret Service)
- ✓ Prevents key exposure in version control
- ✓ Complies with security best practices
- ✓ Zero downtime migration

## Prerequisites

### 1. Install Dependencies

Ensure `keyring` library is installed:

```bash
pip install keyring>=25.5.0
```

### 2. Platform-Specific Setup

**Linux Only:**
```bash
# Ubuntu/Debian
sudo apt-get install gnome-keyring libsecret-1-dev

# Fedora
sudo dnf install gnome-keyring libsecret-devel

# Arch
sudo pacman -S gnome-keyring libsecret
```

**macOS/Windows:** No additional setup required.

### 3. Backup Current Key

Before migration, backup your current encryption key:

```bash
# Copy .env file to secure backup location
cp .env .env.backup.$(date +%Y%m%d)

# Store backup securely (NOT in git repository)
mv .env.backup.* /secure/backup/location/
```

## Migration Steps

### Step 1: Locate Current Key

Find your current encryption key in `.env` file:

```bash
# .env file
ENCRYPTION_KEY_BASE64=<your-current-key>
```

### Step 2: Run Migration Script

Create and run the migration script:

```python
# migrate_key.py
import asyncio
import os
from dotenv import load_dotenv
from backend.services.key_manager import KeyManager

async def migrate():
    """Migrate encryption key from .env to secure storage."""
    print("Starting key migration...")

    # Load .env file
    load_dotenv()
    env_key = os.getenv("ENCRYPTION_KEY_BASE64")

    if not env_key:
        print("✗ No ENCRYPTION_KEY_BASE64 found in .env file")
        return False

    print(f"✓ Found key in .env: {env_key[:16]}...")

    # Initialize KeyManager
    user_data_path = os.path.expanduser("~/.justice-companion")
    key_manager = KeyManager(user_data_path)

    # Check if already migrated
    if await key_manager.has_key():
        print("⚠ Key already exists in secure storage")
        response = input("Overwrite existing key? (yes/no): ")
        if response.lower() != "yes":
            print("Migration cancelled")
            return False

    # Migrate key
    try:
        await key_manager.migrate_from_env(env_key)
        print("✓ Key migrated to secure storage")

        # Validate migration
        result = await key_manager.validate_key_file()
        if result["valid"]:
            print("✓ Migration validated successfully")
            return True
        else:
            print(f"✗ Validation failed: {result['error']}")
            return False

    except Exception as e:
        print(f"✗ Migration failed: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(migrate())

    if success:
        print("\n" + "=" * 60)
        print("MIGRATION COMPLETE")
        print("=" * 60)
        print("\nNext steps:")
        print("1. ✓ Key is now stored in OS secure storage")
        print("2. ⚠ REMOVE ENCRYPTION_KEY_BASE64 from .env file")
        print("3. ✓ Commit .env changes (without the key)")
        print("4. ✓ Test application to verify key loading")
        print("\nIMPORTANT: Keep .env.backup in a secure location!")
    else:
        print("\n✗ Migration failed. Check errors above.")
```

Run the migration:

```bash
python migrate_key.py
```

### Step 3: Remove Key from .env

After successful migration, remove the key from `.env` file:

```bash
# Edit .env file
# Remove this line:
# ENCRYPTION_KEY_BASE64=<key>

# Or use sed (Linux/macOS)
sed -i '/ENCRYPTION_KEY_BASE64=/d' .env

# Or PowerShell (Windows)
(Get-Content .env) | Where-Object { $_ -notmatch "ENCRYPTION_KEY_BASE64=" } | Set-Content .env
```

### Step 4: Update Application Code

Update your application to use `KeyManager` instead of loading from `.env`:

**Before (Old Code):**
```python
import os
from dotenv import load_dotenv
from backend.services.encryption_service import EncryptionService

load_dotenv()
key_base64 = os.getenv("ENCRYPTION_KEY_BASE64")
key = base64.b64decode(key_base64)
encryption_service = EncryptionService(key)
```

**After (New Code):**
```python
from backend.services.key_manager import KeyManager
from backend.services.encryption_service import EncryptionService

# Initialize KeyManager
user_data_path = os.path.expanduser("~/.justice-companion")
key_manager = KeyManager(user_data_path)

# Get key from secure storage
key = await key_manager.get_key()
encryption_service = EncryptionService(key)
```

### Step 5: Test Migration

Verify the migration works correctly:

```python
# test_migration.py
import asyncio
from backend.services.key_manager import KeyManager
from backend.services.encryption_service import EncryptionService

async def test_migration():
    """Test that migrated key works correctly."""
    print("Testing migrated key...")

    # Initialize KeyManager
    user_data_path = os.path.expanduser("~/.justice-companion")
    key_manager = KeyManager(user_data_path)

    # Check key exists
    if not await key_manager.has_key():
        print("✗ Key not found in secure storage")
        return False

    # Validate key
    result = await key_manager.validate_key_file()
    if not result["valid"]:
        print(f"✗ Key validation failed: {result['error']}")
        return False

    print("✓ Key found and valid")

    # Test encryption
    key = await key_manager.get_key()
    encryption_service = EncryptionService(key)

    test_data = "Test encryption after migration"
    encrypted = encryption_service.encrypt(test_data)
    decrypted = encryption_service.decrypt(encrypted)

    if test_data == decrypted:
        print("✓ Encryption/decryption working correctly")
        return True
    else:
        print("✗ Encryption test failed")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_migration())

    if success:
        print("\n✓ Migration test PASSED")
    else:
        print("\n✗ Migration test FAILED")
```

Run the test:

```bash
python test_migration.py
```

### Step 6: Deploy to Production

1. **Backup Production Database:**
   ```bash
   # Backup database before migration
   cp ~/.justice-companion/justice-companion.db ~/backups/justice-companion.db.$(date +%Y%m%d)
   ```

2. **Run Migration on Production Server:**
   ```bash
   # SSH into production server
   ssh user@production-server

   # Run migration script
   python migrate_key.py
   ```

3. **Restart Application:**
   ```bash
   # Restart backend service
   systemctl restart justice-companion-backend

   # Or if using PM2
   pm2 restart justice-companion
   ```

4. **Verify Application:**
   ```bash
   # Check logs for successful key loading
   tail -f /var/log/justice-companion/backend.log

   # Should see:
   # [KeyManager] Using keyring backend: WinVaultKeyring (or similar)
   # [KeyManager] Key loaded successfully
   ```

## Rollback Procedure

If migration fails, you can rollback:

### Step 1: Restore .env Key

```bash
# Restore from backup
cp /secure/backup/location/.env.backup.YYYYMMDD .env
```

### Step 2: Revert Code Changes

```bash
# Checkout previous version
git checkout HEAD~1 -- backend/services/

# Or manually restore old code
```

### Step 3: Restart Application

```bash
# Restart with old configuration
systemctl restart justice-companion-backend
```

## Migration Verification Checklist

After migration, verify:

- [ ] Key exists in secure storage: `await key_manager.has_key()` returns `True`
- [ ] Key validation passes: `await key_manager.validate_key_file()` returns `{"valid": True}`
- [ ] Encryption works: Test encrypt/decrypt cycle
- [ ] Key removed from `.env` file
- [ ] `.env` file committed without key
- [ ] Backup stored securely outside repository
- [ ] Application logs show successful key loading
- [ ] All encrypted data still accessible
- [ ] No errors in application logs

## Common Migration Issues

### Issue 1: "OS-level encryption is not available"

**Linux:** Install keyring backend:
```bash
sudo apt-get install gnome-keyring libsecret-1-dev
```

**Verify backend:**
```python
import keyring
backend = keyring.get_keyring()
print(backend.__class__.__name__)  # Should not be "fail.Keyring"
```

### Issue 2: "Encryption key not found after migration"

**Check migration completed:**
```python
key_manager = KeyManager(user_data_path)
print(await key_manager.has_key())  # Should be True
```

**Re-run migration:**
```bash
python migrate_key.py
```

### Issue 3: "Invalid key length"

**Verify .env key:**
```python
import base64
env_key = os.getenv("ENCRYPTION_KEY_BASE64")
key_bytes = base64.b64decode(env_key)
print(len(key_bytes))  # Should be 32
```

**Generate new key if invalid:**
```python
new_key = await key_manager.generate_new_key()
# Re-encrypt all data with new key
```

### Issue 4: "Application can't decrypt existing data"

**Verify key match:**
```python
import base64

# Old key from backup
old_key = base64.b64decode(os.getenv("ENCRYPTION_KEY_BASE64"))

# New key from secure storage
new_key = await key_manager.get_key()

print(old_key == new_key)  # Should be True
```

**If keys don't match, restore and re-migrate:**
```bash
# Restore .env from backup
cp .env.backup .env

# Re-run migration
python migrate_key.py
```

## Environment-Specific Migration

### Development Environment

```python
# dev_migrate.py
import asyncio
from backend.services.key_manager import KeyManager

async def dev_migrate():
    """Development environment migration."""
    key_manager = KeyManager("./dev-data")

    # Migrate from .env.development
    with open(".env.development") as f:
        for line in f:
            if line.startswith("ENCRYPTION_KEY_BASE64="):
                env_key = line.split("=")[1].strip()
                await key_manager.migrate_from_env(env_key)
                print("✓ Dev key migrated")
                return

asyncio.run(dev_migrate())
```

### Staging Environment

```python
# staging_migrate.py
import asyncio
from backend.services.key_manager import KeyManager

async def staging_migrate():
    """Staging environment migration."""
    key_manager = KeyManager("/var/lib/justice-companion-staging")

    # Migrate from .env.staging
    with open(".env.staging") as f:
        for line in f:
            if line.startswith("ENCRYPTION_KEY_BASE64="):
                env_key = line.split("=")[1].strip()
                await key_manager.migrate_from_env(env_key)
                print("✓ Staging key migrated")
                return

asyncio.run(staging_migrate())
```

### Production Environment

```python
# prod_migrate.py
import asyncio
import logging
from backend.services.key_manager import KeyManager

# Configure logging
logging.basicConfig(level=logging.INFO)

async def prod_migrate():
    """Production environment migration with extra validation."""
    key_manager = KeyManager("/var/lib/justice-companion")

    # Load from .env.production
    with open(".env.production") as f:
        for line in f:
            if line.startswith("ENCRYPTION_KEY_BASE64="):
                env_key = line.split("=")[1].strip()

                # Validate before migration
                import base64
                key_bytes = base64.b64decode(env_key)
                if len(key_bytes) != 32:
                    raise ValueError("Invalid key length")

                # Migrate
                await key_manager.migrate_from_env(env_key)
                print("✓ Production key migrated")

                # Validate migration
                result = await key_manager.validate_key_file()
                if not result["valid"]:
                    raise Exception(f"Validation failed: {result['error']}")

                print("✓ Migration validated")
                return

asyncio.run(prod_migrate())
```

## Post-Migration Security Audit

After migration, verify security:

```python
# security_audit.py
import asyncio
import os
from backend.services.key_manager import KeyManager

async def security_audit():
    """Run security audit after migration."""
    print("Running post-migration security audit...\n")

    key_manager = KeyManager(os.path.expanduser("~/.justice-companion"))

    # 1. Check .env file
    print("1. Checking .env file...")
    with open(".env") as f:
        content = f.read()
        if "ENCRYPTION_KEY_BASE64" in content:
            print("   ✗ FAIL: Key still in .env file")
        else:
            print("   ✓ PASS: Key removed from .env")

    # 2. Check secure storage
    print("\n2. Checking secure storage...")
    if await key_manager.has_key():
        print("   ✓ PASS: Key in secure storage")
    else:
        print("   ✗ FAIL: Key not in secure storage")

    # 3. Validate key
    print("\n3. Validating key...")
    result = await key_manager.validate_key_file()
    if result["valid"]:
        print("   ✓ PASS: Key is valid")
    else:
        print(f"   ✗ FAIL: {result['error']}")

    # 4. Check backend
    print("\n4. Checking backend...")
    info = key_manager.get_backend_info()
    if info["encryption_available"]:
        print(f"   ✓ PASS: Using {info['backend']}")
    else:
        print("   ✗ FAIL: Encryption not available")

    # 5. Test encryption
    print("\n5. Testing encryption...")
    try:
        from backend.services.encryption_service import EncryptionService
        key = await key_manager.get_key()
        service = EncryptionService(key)

        test_data = "Security audit test"
        encrypted = service.encrypt(test_data)
        decrypted = service.decrypt(encrypted)

        if test_data == decrypted:
            print("   ✓ PASS: Encryption working")
        else:
            print("   ✗ FAIL: Decryption mismatch")
    except Exception as e:
        print(f"   ✗ FAIL: {e}")

    print("\n✓ Security audit complete")

if __name__ == "__main__":
    asyncio.run(security_audit())
```

Run the audit:

```bash
python security_audit.py
```

## Additional Resources

- [KeyManager README](./KEY_MANAGER_README.md) - Complete API documentation
- [Example Usage](./example_key_manager.py) - Practical examples
- [EncryptionService](./encryption_service.py) - Encryption implementation
- [SecureStorageService](./secure_storage_service.py) - API key storage

## Support

If you encounter issues during migration:

1. Check the [Troubleshooting](#common-migration-issues) section
2. Review application logs
3. Verify backup exists before proceeding
4. Contact development team if issues persist

## License

Part of Justice Companion - Privacy-first legal case management system.
