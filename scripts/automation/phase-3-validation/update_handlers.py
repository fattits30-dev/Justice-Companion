#!/usr/bin/env python3
"""
Script to analyze IPC handlers in electron/main.ts that need ValidationMiddleware integration.
"""

# List of all IPC channels that need updating
channels = [
    'CASE_CREATE', 'CASE_GET_BY_ID', 'CASE_GET_ALL', 'CASE_UPDATE', 'CASE_DELETE', 'CASE_CLOSE',
    'CASE_GET_STATISTICS', 'EVIDENCE_CREATE', 'EVIDENCE_GET_BY_ID', 'EVIDENCE_GET_ALL',
    'EVIDENCE_GET_BY_CASE', 'EVIDENCE_UPDATE', 'EVIDENCE_DELETE',
    'AI_CHECK_STATUS', 'AI_CONFIGURE', 'AI_TEST_CONNECTION', 'AI_CHAT', 'AI_STREAM_START',
    'FILE_SELECT', 'FILE_UPLOAD', 'FILE_VIEW', 'FILE_DOWNLOAD', 'FILE_PRINT', 'FILE_EMAIL',
    'CONVERSATION_GET', 'MESSAGE_ADD',
    'PROFILE_GET', 'PROFILE_UPDATE',
    'MODEL_IS_DOWNLOADED', 'MODEL_DELETE',
    'GDPR_EXPORT_USER_DATA', 'GDPR_DELETE_USER_DATA',
    'AUTH_REGISTER', 'AUTH_LOGIN', 'AUTH_LOGOUT', 'AUTH_CHANGE_PASSWORD',
    'CONSENT_GRANT', 'CONSENT_REVOKE', 'CONSENT_HAS_CONSENT'
]

print(f"Total channels to update: {len(channels)}")

# Channels already updated
updated = ['CASE_CREATE', 'CASE_GET_BY_ID']
remaining = [c for c in channels if c not in updated]

print(f"Already updated: {len(updated)}")
print(f"Remaining: {len(remaining)}")
print("\nRemaining channels:")
for c in remaining:
    print(f"  - {c}")