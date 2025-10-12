# AuthorizationMiddleware Test Coverage Report

## Summary

**File**: `src/middleware/AuthorizationMiddleware.ts`
**Test File**: `src/middleware/AuthorizationMiddleware.test.ts`
**Total Tests**: 39
**Status**: ✅ All Passing

## Coverage Metrics

- **Functions**: 6/6 (100%)
- **Lines**: 93/93 (100%)
- **Branches**: 19/19 (100%)
- **Overall**: 100% Coverage ✨

## Test Organization

### 1. verifyCaseOwnership (7 tests)
- ✅ Case exists and user is owner (success)
- ✅ Case has null userId for backward compatibility
- ✅ Case does not exist (throws error)
- ✅ Audit logging when case not found
- ✅ User is not owner (throws error)
- ✅ Audit logging when user is not owner
- ✅ Works without audit logger

### 2. verifyAdminRole (4 tests)
- ✅ User has admin role (success)
- ✅ User is not admin (throws error)
- ✅ Audit logging when user is not admin
- ✅ Works without audit logger

### 3. verifyUserActive (4 tests)
- ✅ User is active (success)
- ✅ User is not active (throws error)
- ✅ Audit logging when user is not active
- ✅ Works without audit logger

### 4. verifyCanModifyUser (6 tests)
- ✅ User modifies themselves (success)
- ✅ Admin modifies another user (success)
- ✅ Admin modifies themselves (success)
- ✅ Non-admin tries to modify another user (throws error)
- ✅ Audit logging when non-admin tries to modify another user
- ✅ Works without audit logger

### 5. AuthorizationError (4 tests)
- ✅ Is an instance of Error
- ✅ Has correct name property
- ✅ Has correct message property
- ✅ Is catchable as specific error type

### 6. Edge Cases (4 tests)
- ✅ Handles zero IDs correctly
- ✅ Handles negative IDs correctly
- ✅ Handles very large IDs correctly
- ✅ Converts numeric IDs to strings in audit logs

### 7. Security Scenarios (5 tests)
- ✅ Prevents horizontal privilege escalation
- ✅ Prevents vertical privilege escalation
- ✅ Prevents inactive users from accessing resources
- ✅ Prevents non-admin users from modifying other users
- ✅ Allows admins to perform all admin operations

### 8. Audit Logging Coverage (5 tests)
- ✅ Audits all authorization failures for case ownership
- ✅ Audits admin role failures
- ✅ Audits inactive user failures
- ✅ Audits user modification failures
- ✅ Does not audit successful authorizations

## Testing Approach

### Mocking Strategy
- **CaseRepository**: Mocked using `vi.mock()` to control case data responses
- **AuditLogger**: Mocked to verify audit logging behavior without side effects

### Test Fixtures
- `createMockUser()`: Factory function for creating test User objects
- `createMockCase()`: Factory function for creating test Case objects
- Both support partial overrides for flexible test data

### Key Test Patterns
1. **Happy Path Testing**: Validates successful authorization scenarios
2. **Error Path Testing**: Verifies correct error handling and error messages
3. **Audit Trail Testing**: Ensures all failures are logged with correct details
4. **Optional Dependency Testing**: Validates behavior when audit logger is undefined
5. **Edge Case Testing**: Tests boundary conditions (zero, negative, max IDs)
6. **Security Testing**: Validates prevention of privilege escalation attacks

## Security Coverage

The tests comprehensively validate:

1. **Horizontal Privilege Escalation Prevention**
   - Users cannot access other users' cases
   - Proper ownership verification for all resources

2. **Vertical Privilege Escalation Prevention**
   - Regular users cannot access admin-only features
   - Role-based access control enforcement

3. **Account State Enforcement**
   - Inactive users are denied access to resources
   - Active status is validated before authorization

4. **User Modification Controls**
   - Users can only modify their own accounts
   - Only admins can modify other users' accounts

## Audit Logging

Every authorization failure is logged with:
- Event type: `authorization.denied`
- User ID (as string)
- Resource type and ID
- Action being attempted
- Success status: `false`
- Failure reason in details

## Error Messages

All error messages are descriptive and user-friendly:
- "Case not found"
- "Access denied: you do not own this case"
- "Access denied: admin role required"
- "Account is inactive"
- "Access denied: you can only modify your own account"

## Test Execution

```bash
# Run tests
pnpm test src/middleware/AuthorizationMiddleware.test.ts -- --run

# Run with coverage
pnpm test src/middleware/AuthorizationMiddleware.test.ts -- --run --coverage

# Run in watch mode
pnpm test src/middleware/AuthorizationMiddleware.test.ts
```

## Notes

- All tests use Vitest framework
- Mocks are cleared before each test with `beforeEach()`
- Tests follow existing codebase patterns
- No database dependencies required (all mocked)
- Tests are fast and isolated

---

**Generated**: 2025-10-12
**Test Framework**: Vitest 3.2.4
**Code Quality**: 100% Coverage, All Tests Passing ✅
