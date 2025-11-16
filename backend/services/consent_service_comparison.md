# ConsentService: TypeScript vs Python Side-by-Side Comparison

## Service Initialization

### TypeScript (InversifyJS DI)
```typescript
@injectable()
export class ConsentService {
  private readonly CURRENT_PRIVACY_VERSION = "1.0";

  constructor(
    @inject(TYPES.ConsentRepository)
    private consentRepository: IConsentRepository,
    @inject(TYPES.AuditLogger) private auditLogger: IAuditLogger
  ) {}
}
```

### Python (Direct Injection)
```python
class ConsentService:
    CURRENT_PRIVACY_VERSION = "1.0"

    def __init__(
        self,
        db: Session,
        audit_logger: Optional[AuditLogger] = None
    ):
        self.db = db
        self.audit_logger = audit_logger
```

---

## Grant Consent

### TypeScript
```typescript
grantConsent(userId: number, consentType: ConsentType): Consent {
  const consent = this.consentRepository.create({
    userId,
    consentType,
    granted: true,
    grantedAt: new Date().toISOString(),
    version: this.CURRENT_PRIVACY_VERSION,
  });

  this.auditLogger?.log({
    eventType: "consent.granted",
    userId: userId.toString(),
    resourceType: "consent",
    resourceId: consent.id.toString(),
    action: "create",
    success: true,
    details: {
      consentType,
      version: this.CURRENT_PRIVACY_VERSION,
    },
  });

  return consent;
}
```

### Python
```python
def grant_consent(
    self,
    user_id: int,
    consent_type: ConsentType
) -> Consent:
    # Check if active consent already exists
    existing_consent = self._find_active_consent(user_id, consent_type)
    if existing_consent:
        return existing_consent

    # Create new consent record
    now = datetime.now(timezone.utc)
    consent = Consent(
        user_id=user_id,
        consent_type=consent_type.value if isinstance(consent_type, ConsentType) else consent_type,
        granted=True,
        granted_at=now,
        version=self.CURRENT_PRIVACY_VERSION,
        revoked_at=None
    )

    self.db.add(consent)
    self.db.commit()
    self.db.refresh(consent)

    # Audit log the consent grant
    self._log_audit(
        event_type="consent.granted",
        user_id=user_id,
        resource_id=str(consent.id),
        action="create",
        success=True,
        details={
            "consentType": consent.consent_type,
            "version": self.CURRENT_PRIVACY_VERSION
        }
    )

    return consent
```

---

## Revoke Consent

### TypeScript
```typescript
revokeConsent(userId: number, consentType: ConsentType): void {
  const consent = this.consentRepository.findActiveConsent(
    userId,
    consentType
  );

  if (consent) {
    this.consentRepository.revoke(consent.id);

    this.auditLogger?.log({
      eventType: "consent.revoked",
      userId: userId.toString(),
      resourceType: "consent",
      resourceId: consent.id.toString(),
      action: "update",
      success: true,
      details: { consentType },
    });
  }
}
```

### Python
```python
def revoke_consent(
    self,
    user_id: int,
    consent_type: ConsentType
) -> None:
    # Find active consent
    consent = self._find_active_consent(user_id, consent_type)

    if consent:
        # Update revoked_at timestamp (only field that can be modified)
        consent.revoked_at = datetime.now(timezone.utc)
        self.db.commit()

        # Audit log the consent revocation
        self._log_audit(
            event_type="consent.revoked",
            user_id=user_id,
            resource_id=str(consent.id),
            action="update",
            success=True,
            details={"consentType": consent.consent_type}
        )
```

---

## Check Active Consent

### TypeScript
```typescript
hasActiveConsent(userId: number, consentType: ConsentType): boolean {
  const consent = this.consentRepository.findActiveConsent(
    userId,
    consentType
  );
  return consent !== null;
}
```

### Python
```python
def has_active_consent(
    self,
    user_id: int,
    consent_type: ConsentType
) -> bool:
    consent = self._find_active_consent(user_id, consent_type)
    return consent is not None
```

---

## Get Active Consents

### TypeScript
```typescript
getActiveConsents(userId: number): Consent[] {
  const allConsents = this.consentRepository.listByUser(userId);
  return allConsents.filter((consent) => !consent.revokedAt);
}
```

### Python
```python
def get_active_consents(
    self,
    user_id: int
) -> List[Consent]:
    consents = self.db.query(Consent).filter(
        and_(
            Consent.user_id == user_id,
            Consent.revoked_at.is_(None)
        )
    ).all()

    return consents
```

---

## Grant All Consents

### TypeScript
```typescript
grantAllConsents(userId: number): Consent[] {
  const types: ConsentType[] = [
    "data_processing",
    "encryption",
    "ai_processing",
    "marketing",
  ];
  const consents: Consent[] = [];

  for (const type of types) {
    // Check if consent already exists
    const existing = this.consentRepository.findActiveConsent(userId, type);
    if (!existing) {
      const consent = this.grantConsent(userId, type);
      consents.push(consent);
    }
  }

  return consents;
}
```

### Python
```python
def grant_all_consents(
    self,
    user_id: int
) -> List[Consent]:
    consent_types = [
        ConsentType.DATA_PROCESSING,
        ConsentType.ENCRYPTION,
        ConsentType.AI_PROCESSING,
        ConsentType.MARKETING,
    ]

    created_consents: List[Consent] = []

    for consent_type in consent_types:
        # Check if consent already exists
        existing = self._find_active_consent(user_id, consent_type)
        if not existing:
            # Grant new consent
            consent = self.grant_consent(user_id, consent_type)
            created_consents.append(consent)

    return created_consents
```

---

## Revoke All Consents

### TypeScript
```typescript
revokeAllConsents(userId: number): void {
  const activeConsents = this.getActiveConsents(userId);

  for (const consent of activeConsents) {
    this.consentRepository.revoke(consent.id);
  }

  // Always log revoke all event (even if no consents exist)
  this.auditLogger?.log({
    eventType: "consent.revoked",
    userId: userId.toString(),
    resourceType: "consent",
    resourceId: "all",
    action: "update",
    success: true,
    details: {
      reason: "All consents revoked",
      revokedCount: activeConsents.length,
    },
  });
}
```

### Python
```python
def revoke_all_consents(
    self,
    user_id: int
) -> None:
    # Get all active consents
    active_consents = self.get_active_consents(user_id)

    # Revoke each active consent
    now = datetime.now(timezone.utc)
    for consent in active_consents:
        consent.revoked_at = now

    if active_consents:
        self.db.commit()

    # Always log revoke all event (even if no consents exist)
    self._log_audit(
        event_type="consent.revoked",
        user_id=user_id,
        resource_id="all",
        action="update",
        success=True,
        details={
            "reason": "All consents revoked",
            "revokedCount": len(active_consents)
        }
    )
```

---

## Key Differences

| Aspect | TypeScript | Python |
|--------|-----------|--------|
| **DI Framework** | InversifyJS with decorators | Direct constructor injection |
| **Repository Pattern** | Separate `ConsentRepository` class | Direct SQLAlchemy queries in service |
| **Naming** | camelCase | snake_case |
| **Date/Time** | `new Date().toISOString()` | `datetime.now(timezone.utc)` |
| **Null Check** | `consent !== null` | `consent is not None` |
| **Type Hints** | TypeScript type annotations | Python type hints (PEP 484) |
| **Optional Chaining** | `this.auditLogger?.log(...)` | `if self.audit_logger: ...` |
| **Array Filter** | `arr.filter(x => !x.revokedAt)` | SQLAlchemy query with `is_(None)` |
| **Enum Values** | String literal union type | Python `Enum` class |

---

## Enhanced Features in Python Version

1. **Duplicate Prevention**: Python version checks for existing active consent before creating new record
2. **Helper Method**: Private `_find_active_consent()` method to reduce code duplication
3. **Audit Helper**: Private `_log_audit()` method for cleaner audit logging
4. **Batch Operations**: More efficient revoke_all_consents using single commit
5. **Type Safety**: Pydantic models for input validation (GrantConsentInput, ConsentResponse)

---

## Testing Comparison

### TypeScript Test (Example)
```typescript
describe('ConsentService', () => {
  it('should grant consent', () => {
    const consent = consentService.grantConsent(1, 'data_processing');
    expect(consent.granted).toBe(true);
    expect(consent.consentType).toBe('data_processing');
  });
});
```

### Python Test (Example)
```python
def test_grant_consent(db_session):
    consent_service = ConsentService(db_session)
    consent = consent_service.grant_consent(1, ConsentType.DATA_PROCESSING)

    assert consent.granted is True
    assert consent.consent_type == "data_processing"
    assert consent.revoked_at is None
```

---

## Migration Checklist

- [x] ConsentType enum converted
- [x] Consent model created with SQLAlchemy
- [x] All 9 methods converted
- [x] Audit logging integrated
- [x] Type hints added
- [x] Pydantic models for validation
- [x] Documentation strings added
- [x] Error handling implemented
- [x] Idempotency ensured
- [x] GDPR compliance maintained
- [ ] Unit tests written
- [ ] Integration tests written
- [ ] FastAPI endpoint created
