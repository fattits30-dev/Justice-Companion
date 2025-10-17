#!/usr/bin/env python3
"""
Apply validation middleware updates to all IPC handlers in main.ts
"""

import re

def add_validation_to_handler(handler_code, channel_name, replacements):
    """Add validation middleware to a handler and apply replacements."""

    # Check if already has validation
    if 'validationMiddleware.validate' in handler_code:
        return handler_code

    lines = handler_code.split('\n')
    updated_lines = []

    # Find the try { line and insert validation after it
    for i, line in enumerate(lines):
        updated_lines.append(line)

        if 'try {' in line:
            # Determine the request parameter name
            request_param = 'request'
            if '(_event, _request:' in handler_code or '(_, _request:' in handler_code:
                request_param = '_request'
            elif '(_event, request:' in handler_code or '(_, request:' in handler_code:
                request_param = 'request'

            validation_code = f"""      // 1. VALIDATION: Validate input before authorization
      const validationResult = await validationMiddleware.validate(
        IPC_CHANNELS.{channel_name},
        {request_param}
      );

      if (!validationResult.success) {{
        return {{
          success: false,
          error: 'Validation failed',
          errors: validationResult.errors
        }};
      }}
"""

            # Check if next line has Authorization comment and update it
            if i + 1 < len(lines) and '// Authorization:' in lines[i + 1]:
                lines[i + 1] = lines[i + 1].replace('// Authorization:', '// 2. AUTHORIZATION:')
            elif i + 1 < len(lines) and 'Authorization:' in lines[i + 1]:
                lines[i + 1] = lines[i + 1].replace('Authorization:', '2. AUTHORIZATION:')

            # Add business logic comment if needed
            for j in range(i + 1, min(i + 20, len(lines))):
                if 'const' in lines[j] and not 'userId' in lines[j] and not 'validationResult' in lines[j]:
                    # Found first business logic line
                    lines[j] = f'      // 3. BUSINESS LOGIC: Use validated data\n{lines[j]}'
                    break

            updated_lines.append(validation_code)

    # Join lines and apply replacements
    result = '\n'.join(updated_lines)

    # Apply field replacements
    for old, new in replacements:
        # Only replace in non-comment lines
        result = re.sub(r'(?<!//.*)\b' + re.escape(old) + r'\b', new, result)

    return result


# Read the current main.ts file
with open('electron/main.ts', 'r') as f:
    content = f.read()

# Define handlers and their replacements
handlers_to_update = {
    'CASE_DELETE': [('request.id', 'validationResult.data.id')],
    'CASE_CLOSE': [('request.id', 'validationResult.data.id')],
    'CASE_GET_STATISTICS': [],
    'EVIDENCE_CREATE': [('request.input', 'validationResult.data.input')],
    'EVIDENCE_GET_BY_ID': [('request.id', 'validationResult.data.id')],
    'EVIDENCE_GET_ALL': [('request.evidenceType', 'validationResult.data.evidenceType')],
    'EVIDENCE_GET_BY_CASE': [('request.caseId', 'validationResult.data.caseId')],
    'EVIDENCE_UPDATE': [('request.id', 'validationResult.data.id'), ('request.input', 'validationResult.data.input')],
    'EVIDENCE_DELETE': [('request.id', 'validationResult.data.id')],
    'AI_CHECK_STATUS': [],
    'AI_CONFIGURE': [('request.provider', 'validationResult.data.provider'), ('request.config', 'validationResult.data.config')],
    'AI_TEST_CONNECTION': [('request.provider', 'validationResult.data.provider'), ('request.config', 'validationResult.data.config')],
    'AI_CHAT': [('request.message', 'validationResult.data.message'), ('request.caseId', 'validationResult.data.caseId'), ('request.modelId', 'validationResult.data.modelId')],
    'AI_STREAM_START': [('request.message', 'validationResult.data.message'), ('request.caseId', 'validationResult.data.caseId'), ('request.modelId', 'validationResult.data.modelId'), ('request.conversationId', 'validationResult.data.conversationId')],
    'FILE_SELECT': [],
    'FILE_UPLOAD': [('request.caseId', 'validationResult.data.caseId'), ('request.evidenceType', 'validationResult.data.evidenceType'), ('request.filePaths', 'validationResult.data.filePaths')],
    'FILE_VIEW': [('request.filePath', 'validationResult.data.filePath')],
    'FILE_DOWNLOAD': [('request.filePath', 'validationResult.data.filePath'), ('request.fileName', 'validationResult.data.fileName')],
    'FILE_PRINT': [('request.filePath', 'validationResult.data.filePath')],
    'FILE_EMAIL': [('request.filePaths', 'validationResult.data.filePaths'), ('request.subject', 'validationResult.data.subject'), ('request.body', 'validationResult.data.body')],
    'CONVERSATION_GET': [('request.id', 'validationResult.data.id')],
    'MESSAGE_ADD': [('request.conversationId', 'validationResult.data.conversationId'), ('request.message', 'validationResult.data.message')],
    'PROFILE_GET': [],
    'PROFILE_UPDATE': [('request.preferences', 'validationResult.data.preferences')],
    'MODEL_IS_DOWNLOADED': [('request.modelId', 'validationResult.data.modelId')],
    'MODEL_DELETE': [('request.modelId', 'validationResult.data.modelId')],
    'GDPR_EXPORT_USER_DATA': [],
    'GDPR_DELETE_USER_DATA': [('request.confirmation', 'validationResult.data.confirmation')],
    'AUTH_REGISTER': [('request.username', 'validationResult.data.username'), ('request.email', 'validationResult.data.email'), ('request.password', 'validationResult.data.password')],
    'AUTH_LOGIN': [('request.username', 'validationResult.data.username'), ('request.password', 'validationResult.data.password'), ('request.rememberMe', 'validationResult.data.rememberMe')],
    'AUTH_LOGOUT': [],
    'AUTH_CHANGE_PASSWORD': [('request.currentPassword', 'validationResult.data.currentPassword'), ('request.newPassword', 'validationResult.data.newPassword')],
    'CONSENT_GRANT': [('request.consentType', 'validationResult.data.consentType')],
    'CONSENT_REVOKE': [('request.consentType', 'validationResult.data.consentType')],
    'CONSENT_HAS_CONSENT': [('request.consentType', 'validationResult.data.consentType')],
}

# Count updates
updated_count = 0
skipped_count = 0

for channel, replacements in handlers_to_update.items():
    # Find the handler in the content
    pattern = rf'(ipcMain\.handle\(IPC_CHANNELS\.{channel},[\s\S]*?\}}\)\);)'
    match = re.search(pattern, content)

    if match:
        handler_code = match.group(1)

        if 'validationMiddleware.validate' in handler_code:
            print(f"✓ {channel} - already has validation")
            skipped_count += 1
        else:
            updated_handler = add_validation_to_handler(handler_code, channel, replacements)
            content = content.replace(handler_code, updated_handler)
            print(f"✓ {channel} - updated")
            updated_count += 1
    else:
        print(f"✗ {channel} - not found")

# Write the updated content back
with open('electron/main.ts', 'w') as f:
    f.write(content)

print(f"\n✅ Updated {updated_count} handlers")
print(f"⏭️ Skipped {skipped_count} handlers (already had validation)")
print(f"Total: {updated_count + skipped_count}/{len(handlers_to_update)}")