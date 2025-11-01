#!/usr/bin/env python3
"""
Batch update all IPC handlers with ValidationMiddleware.
This script will read the current main.ts and output the update commands.
"""


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
    'GDPR_DELETE_USER_DATA': {'uses': []}
}
