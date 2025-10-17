#!/usr/bin/env python3
"""
Generate update commands for all remaining IPC handlers.
"""

import json

# Handlers already updated
updated = ['CASE_CREATE', 'CASE_GET_BY_ID', 'CASE_GET_ALL', 'CASE_UPDATE']

# All remaining handlers with their patterns
handlers = [
    # Simple ID-based handlers
    ('CASE_DELETE', ['request.id']),
    ('CASE_CLOSE', ['request.id']),
    ('EVIDENCE_GET_BY_ID', ['request.id']),
    ('EVIDENCE_DELETE', ['request.id']),
    ('CONVERSATION_GET', ['request.id']),
    ('MODEL_IS_DOWNLOADED', ['request.modelId']),
    ('MODEL_DELETE', ['request.modelId']),

    # Input-based handlers
    ('EVIDENCE_CREATE', ['request.input.caseId', 'request.input']),
    ('EVIDENCE_UPDATE', ['request.id', 'request.input']),

    # Specific field handlers
    ('EVIDENCE_GET_BY_CASE', ['request.caseId']),
    ('EVIDENCE_GET_ALL', ['request.evidenceType']),
    ('FILE_VIEW', ['request.filePath']),
    ('FILE_DOWNLOAD', ['request.filePath', 'request.fileName']),
    ('FILE_PRINT', ['request.filePath']),
    ('FILE_EMAIL', ['request.filePaths', 'request.subject', 'request.body']),
    ('FILE_UPLOAD', ['request.caseId', 'request.evidenceType', 'request.filePaths']),
    ('MESSAGE_ADD', ['request.conversationId', 'request.message']),
    ('PROFILE_UPDATE', ['request.preferences']),
    ('GDPR_DELETE_USER_DATA', ['request.confirmation']),

    # AI handlers
    ('AI_CONFIGURE', ['request.provider', 'request.config']),
    ('AI_TEST_CONNECTION', ['request.provider', 'request.config']),
    ('AI_CHAT', ['request.message', 'request.caseId', 'request.modelId']),
    ('AI_STREAM_START', ['request.message', 'request.caseId', 'request.modelId', 'request.conversationId']),

    # Auth handlers
    ('AUTH_REGISTER', ['request.username', 'request.email', 'request.password']),
    ('AUTH_LOGIN', ['request.username', 'request.password', 'request.rememberMe']),
    ('AUTH_CHANGE_PASSWORD', ['request.currentPassword', 'request.newPassword']),

    # Consent handlers
    ('CONSENT_GRANT', ['request.consentType']),
    ('CONSENT_REVOKE', ['request.consentType']),
    ('CONSENT_HAS_CONSENT', ['request.consentType']),

    # No-param handlers
    ('CASE_GET_STATISTICS', []),
    ('AI_CHECK_STATUS', []),
    ('FILE_SELECT', []),
    ('PROFILE_GET', []),
    ('GDPR_EXPORT_USER_DATA', []),
    ('AUTH_LOGOUT', []),
]

print(f"Total handlers to update: {len(handlers)}")
print(f"Already updated: {updated}")
print("")

# Generate replacements for each handler
for handler_name, fields in handlers:
    if handler_name in updated:
        continue

    print(f"\n# {handler_name}")
    print("Fields to replace:")
    for field in fields:
        new_field = field.replace('request.', 'validationResult.data.')
        print(f"  {field} -> {new_field}")