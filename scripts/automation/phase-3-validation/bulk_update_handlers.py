#!/usr/bin/env python3
"""
Bulk update all remaining IPC handlers with ValidationMiddleware.
This script generates the sed commands to update all handlers.
"""

handlers = [
    # Evidence handlers
    ('EVIDENCE_CREATE', ['request.input']),
    ('EVIDENCE_GET_BY_ID', ['request.id']),
    ('EVIDENCE_GET_ALL', ['request.evidenceType']),
    ('EVIDENCE_GET_BY_CASE', ['request.caseId']),
    ('EVIDENCE_UPDATE', ['request.id', 'request.input']),
    ('EVIDENCE_DELETE', ['request.id']),

    # AI handlers
    ('AI_CHECK_STATUS', []),
    ('AI_CONFIGURE', ['request.provider', 'request.config']),
    ('AI_TEST_CONNECTION', ['request.provider', 'request.config']),
    ('AI_CHAT', ['request.message', 'request.caseId', 'request.modelId']),
    ('AI_STREAM_START', ['request.message', 'request.caseId', 'request.modelId', 'request.conversationId']),

    # File handlers
    ('FILE_SELECT', []),
    ('FILE_UPLOAD', ['request.caseId', 'request.evidenceType', 'request.filePaths']),
    ('FILE_VIEW', ['request.filePath']),
    ('FILE_DOWNLOAD', ['request.filePath', 'request.fileName']),
    ('FILE_PRINT', ['request.filePath']),
    ('FILE_EMAIL', ['request.filePaths', 'request.subject', 'request.body']),

    # Conversation/Message handlers
    ('CONVERSATION_GET', ['request.id']),
    ('MESSAGE_ADD', ['request.conversationId', 'request.message']),

    # Profile handlers
    ('PROFILE_GET', []),
    ('PROFILE_UPDATE', ['request.preferences']),

    # Model handlers
    ('MODEL_IS_DOWNLOADED', ['request.modelId']),
    ('MODEL_DELETE', ['request.modelId']),

    # GDPR handlers
    ('GDPR_EXPORT_USER_DATA', []),
    ('GDPR_DELETE_USER_DATA', ['request.confirmation']),

    # Auth handlers
    ('AUTH_REGISTER', ['request.username', 'request.email', 'request.password']),
    ('AUTH_LOGIN', ['request.username', 'request.password', 'request.rememberMe']),
    ('AUTH_LOGOUT', []),
    ('AUTH_CHANGE_PASSWORD', ['request.currentPassword', 'request.newPassword']),

    # Consent handlers
    ('CONSENT_GRANT', ['request.consentType']),
    ('CONSENT_REVOKE', ['request.consentType']),
    ('CONSENT_HAS_CONSENT', ['request.consentType']),
]

# Already done
done = ['CASE_CREATE', 'CASE_GET_BY_ID', 'CASE_GET_ALL', 'CASE_UPDATE', 'CASE_DELETE', 'CASE_CLOSE', 'CASE_GET_STATISTICS']

print(f"Total handlers to update: {len(handlers)}")
print(f"Already done: {done}")
print(f"\nRemaining: {len(handlers)}")

for handler, fields in handlers:
    print(f"\n# {handler}")
    if fields:
        print(f"  Fields: {', '.join(fields)}")
