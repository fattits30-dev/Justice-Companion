#!/usr/bin/env python3
"""
Batch update all IPC handlers with ValidationMiddleware.
This script will read the current main.ts and output the update commands.
"""

import re

# Map of handlers and their request usage patterns
handler_configs = {
    'CASE_UPDATE': {'uses': ['request.id', 'request.input']},
    'CASE_DELETE': {'uses': ['request.id']},
    'CASE_CLOSE': {'uses': ['request.id']},
    'CASE_GET_STATISTICS': {'uses': []},  # No request params used
    'EVIDENCE_CREATE': {'uses': ['request.input']},
    'EVIDENCE_GET_BY_ID': {'uses': ['request.id']},
    'EVIDENCE_GET_ALL': {'uses': ['request.evidenceType']},
    'EVIDENCE_GET_BY_CASE': {'uses': ['request.caseId']},
    'EVIDENCE_UPDATE': {'uses': ['request.id', 'request.input']},
    'EVIDENCE_DELETE': {'uses': ['request.id']},
    'AI_CHECK_STATUS': {'uses': []},
    'AI_CONFIGURE': {'uses': ['request.provider', 'request.config']},
    'AI_TEST_CONNECTION': {'uses': ['request.provider', 'request.config']},
    'AI_CHAT': {'uses': ['request.message', 'request.caseId', 'request.modelId']},
    'AI_STREAM_START': {'uses': ['request.message', 'request.caseId', 'request.modelId', 'request.conversationId']},
    'FILE_SELECT': {'uses': []},  # Has default empty object
    'FILE_UPLOAD': {'uses': ['request.caseId', 'request.evidenceType', 'request.filePaths']},
    'FILE_VIEW': {'uses': ['request.filePath']},
    'FILE_DOWNLOAD': {'uses': ['request.filePath', 'request.fileName']},
    'FILE_PRINT': {'uses': ['request.filePath']},
    'FILE_EMAIL': {'uses': ['request.filePaths', 'request.subject', 'request.body']},
    'CONVERSATION_GET': {'uses': ['request.id']},
    'MESSAGE_ADD': {'uses': ['request.conversationId', 'request.message']},
    'PROFILE_GET': {'uses': []},
    'PROFILE_UPDATE': {'uses': ['request.preferences']},
    'MODEL_IS_DOWNLOADED': {'uses': ['request.modelId']},
    'MODEL_DELETE': {'uses': ['request.modelId']},
    'GDPR_EXPORT_USER_DATA': {'uses': []},
    'GDPR_DELETE_USER_DATA': {'uses': ['request.confirmation']},
    'AUTH_REGISTER': {'uses': ['request.username', 'request.email', 'request.password']},
    'AUTH_LOGIN': {'uses': ['request.username', 'request.password', 'request.rememberMe']},
    'AUTH_LOGOUT': {'uses': []},
    'AUTH_CHANGE_PASSWORD': {'uses': ['request.currentPassword', 'request.newPassword']},
    'CONSENT_GRANT': {'uses': ['request.consentType']},
    'CONSENT_REVOKE': {'uses': ['request.consentType']},
    'CONSENT_HAS_CONSENT': {'uses': ['request.consentType']},
}

print("Handler configuration mapping created.")
print(f"Total handlers to update: {len(handler_configs)}")

# Generate the validation integration template for each
for channel, config in handler_configs.items():
    uses = config['uses']

    # Determine how to replace request references
    replacements = []
    for use in uses:
        # Convert request.X to validationResult.data.X
        old_ref = use
        new_ref = use.replace('request.', 'validationResult.data.')
        replacements.append((old_ref, new_ref))

    print(f"\n{channel}:")
    print(f"  Uses: {uses}")
    if replacements:
        print(f"  Replace:")
        for old, new in replacements:
            print(f"    {old} -> {new}")