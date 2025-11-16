# DecryptionCache Quick Reference

**Python Service:** `backend/services/decryption_cache.py`

## Quick Start

```python
from backend.services.decryption_cache import get_decryption_cache

# Get singleton instance
cache = get_decryption_cache()

# Basic operations
cache.set("key", "value")           # Cache value
value = cache.get("key")            # Get value (returns None if expired)
cache.clear()                       # Clear all cache
```

## Common Patterns

### 1. Cache Decrypted Database Values

```python
def get_case_title(case_id: int) -> str:
    cache_key = f"cases:{case_id}:title"

    # Try cache first
    cached = cache.get(cache_key)
    if cached:
        return cached

    # Cache miss - fetch and decrypt
    encrypted = db.execute("SELECT title FROM cases WHERE id = ?", (case_id,))
    decrypted = decrypt(encrypted)

    # Store in cache
    cache.set(cache_key, decrypted)
    return decrypted
```

### 2. Invalidate After Updates

```python
def update_case(case_id: int, title: str):
    # Update database
    db.execute("UPDATE cases SET title = ? WHERE id = ?", (encrypt(title), case_id))

    # Invalidate cache entries for this case
    cache.invalidate_entity("cases", case_id)
```

### 3. Clear Cache on Logout

```python
def logout():
    cache.clear(reason="User logout")
    # GDPR compliance: ensures session isolation
```

### 4. GDPR Erasure (Article 17)

```python
def delete_user_account(user_id: str):
    # Clear cached user data
    cache.clear_user_data(user_id)

    # Then delete from database...
```

### 5. GDPR Access Report (Article 15)

```python
def generate_gdpr_report(user_id: str):
    # Get cached data report
    cache_report = cache.get_user_cache_report(user_id)

    # Include in GDPR export
    return {
        "cached_data": cache_report,
        "database_data": get_db_data(user_id)
    }
```

## Key Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `get(key)` | Get cached value | `str` or `None` |
| `set(key, value, ttl=None)` | Cache value | `None` |
| `invalidate_entity(entity, id)` | Invalidate entity entries | `int` (count) |
| `invalidate_entity_type(entity)` | Invalidate all entity type | `int` (count) |
| `clear(reason="...")` | Clear entire cache | `int` (count) |
| `clear_user_data(user_id)` | GDPR Article 17 erasure | `int` (count) |
| `get_user_cache_report(user_id)` | GDPR Article 15 report | `List[Dict]` |
| `get_stats()` | Cache statistics | `Dict` |
| `cleanup_expired()` | Manual cleanup | `int` (count) |

## Configuration

```python
from backend.services.decryption_cache import DecryptionCache

# Custom configuration
cache = DecryptionCache(
    audit_logger=audit_logger,  # Optional
    max_size=500,               # Default: 1000
    default_ttl=600             # Default: 300 (5 min)
)
```

## Cache Key Format

**Convention:** `{entity}:{id}:{field}`

```python
# Good keys (structured)
"cases:123:title"
"cases:123:description"
"evidence:456:file_path"
"user:789:profile"

# Bad keys (unstructured)
"case_123_title"           # Won't work with invalidate_entity
"title_for_case_123"       # Wrong order
```

## Monitoring

```python
stats = cache.get_stats()

print(f"Hit rate: {stats['hit_rate']}%")
print(f"Size: {stats['size']}/{stats['max_size']}")
print(f"Evictions: {stats['evictions']}")

# Low hit rate? Consider:
# - Longer TTL
# - Larger max_size
# - More consistent cache keys
```

## TTL Guidelines

| Data Type | Recommended TTL | Reasoning |
|-----------|----------------|-----------|
| Case details | 300s (5 min) | Moderate changes |
| Evidence metadata | 300s (5 min) | Moderate changes |
| User profiles | 600s (10 min) | Infrequent changes |
| AI chat messages | 180s (3 min) | Frequent changes |
| System settings | 900s (15 min) | Rare changes |

## Thread Safety

**All methods are thread-safe** - No additional locking needed:

```python
# Safe to call from multiple threads
def worker_thread(thread_id):
    for i in range(1000):
        cache.set(f"thread{thread_id}:key{i}", f"value{i}")
        cache.get(f"thread{thread_id}:key{i}")
```

## Security Checklist

- [ ] Cache cleared on logout (`cache.clear()`)
- [ ] Cache invalidated after DB updates
- [ ] Audit logger passed to constructor (if available)
- [ ] Short TTL (5-10 minutes max)
- [ ] GDPR erasure implemented (`clear_user_data()`)
- [ ] GDPR access report implemented (`get_user_cache_report()`)

## Performance Tips

1. **Use cache for hot paths only** - Don't cache rarely accessed data
2. **Keep values small** - Large values waste memory
3. **Use consistent key format** - Enables pattern-based invalidation
4. **Monitor hit rate** - Aim for >70% hit rate
5. **Tune TTL** - Balance freshness vs hit rate

## Common Mistakes

### ❌ Don't Do This

```python
# Mistake 1: Inconsistent key format
cache.set("case_123", "value")      # Wrong
cache.set("123:cases:title", "value")  # Wrong

# Mistake 2: Forgetting to invalidate
db.execute("UPDATE cases SET title = ?", (title,))
# Forgot: cache.invalidate_entity("cases", case_id)

# Mistake 3: Caching without TTL awareness
cache.set("key", "value")  # Will expire in 5 minutes!

# Mistake 4: Not clearing on logout
def logout():
    session.clear()
    # Forgot: cache.clear()
```

### ✅ Do This

```python
# Correct 1: Consistent key format
cache.set("cases:123:title", "value")

# Correct 2: Always invalidate after updates
db.execute("UPDATE cases SET title = ?", (title,))
cache.invalidate_entity("cases", case_id)

# Correct 3: Custom TTL for long-lived data
cache.set("key", "value", ttl=600)  # 10 minutes

# Correct 4: Clear on logout
def logout():
    cache.clear(reason="User logout")
    session.clear()
```

## Troubleshooting

### Problem: Cache always misses

**Solution:**
```python
stats = cache.get_stats()
print(f"Evictions: {stats['evictions']}")  # High evictions?

# If TTL too short:
cache = DecryptionCache(default_ttl=600)  # 10 minutes

# If cache too small:
cache = DecryptionCache(max_size=2000)  # Increase size
```

### Problem: Stale data in cache

**Solution:**
```python
# Always invalidate after updates
def update_entity(entity, id, data):
    db.update(entity, id, data)
    cache.invalidate_entity(entity, id)  # Critical!
```

### Problem: Memory usage growing

**Solution:**
```python
# Check cache size
stats = cache.get_stats()
if stats['size'] > 900:
    # Near capacity - increase max_size or decrease TTL
    pass

# Manually cleanup expired entries
removed = cache.cleanup_expired()
print(f"Removed {removed} expired entries")
```

## Testing

```python
# Unit test example
def test_cache_operations():
    from backend.services.decryption_cache import reset_decryption_cache

    # Reset singleton for clean state
    reset_decryption_cache()

    cache = get_decryption_cache()

    # Test basic operations
    cache.set("test:key", "value")
    assert cache.get("test:key") == "value"

    # Test expiration
    import time
    cache.set("test:expire", "value", ttl=1)
    time.sleep(1.5)
    assert cache.get("test:expire") is None
```

## Integration Examples

### With EncryptionService

```python
class EncryptionService:
    def __init__(self, db, audit_logger):
        self.db = db
        self.cache = get_decryption_cache(audit_logger=audit_logger)

    def decrypt_field(self, table, id, field):
        key = f"{table}:{id}:{field}"

        cached = self.cache.get(key)
        if cached:
            return cached

        encrypted = self._fetch(table, id, field)
        decrypted = self._decrypt(encrypted)
        self.cache.set(key, decrypted)

        return decrypted
```

### With FastAPI Endpoint

```python
from fastapi import APIRouter, Depends

router = APIRouter()

@router.get("/cache/stats")
async def get_cache_stats():
    cache = get_decryption_cache()
    return cache.get_stats()

@router.post("/cache/clear")
async def clear_cache():
    cache = get_decryption_cache()
    cleared = cache.clear(reason="Manual clear")
    return {"cleared": cleared}
```

## Documentation

**Full docs:** See `DECRYPTION_CACHE_README.md`
**Migration guide:** See `DECRYPTION_CACHE_MIGRATION.md`
**Source code:** `backend/services/decryption_cache.py`
**Tests:** `backend/services/test_decryption_cache.py`

---

**Quick Help:**
- Questions? Check `DECRYPTION_CACHE_README.md`
- Examples? Check `test_decryption_cache.py`
- Migration? Check `DECRYPTION_CACHE_MIGRATION.md`
