#!/usr/bin/env python3
"""
Final script to update ALL remaining IPC handlers with ValidationMiddleware.
This will read the main.ts file and update all handlers that don't have validation yet.
"""

import re


def update_handler(content, channel_name, field_replacements):
    """Update a specific handler with validation middleware."""

    # Find the handler
    # Look for patterns like: ipcMain.handle(IPC_CHANNELS.CHANNEL_NAME, async ...
    pattern = rf'(ipcMain\.handle\(IPC_CHANNELS\.{channel_name},[\s\S]*?\}}[\s]*\)\);)'

    match = re.search(pattern, content)
    if not match:
        print(f"[X] {channel_name} - handler not found")
        return content

    handler_code = match.group(1)

    # Check if already has validation
    if 'validationMiddleware.validate' in handler_code:
        print(f"[SKIP] {channel_name} - already has validation")
        return content

    # Find the request parameter name
    param_match = re.search(r'async \([^,]+,\s*(_?)(\w+):\s*\w+', handler_code)
    if not param_match:
        print(f"[X] {channel_name} - could not find request parameter")
        return content

    request_param = (param_match.group(1) or '') + param_match.group(2)

    # Split handler into lines for processing
    lines = handler_code.split('\n')
    new_lines = []

    # Process line by line
    i = 0
    while i < len(lines):
        line = lines[i]
        new_lines.append(line)

        # Insert validation after 'try {'
        if 'try {' in line:
            # Add validation code
            validation_block = f"""      // 1. VALIDATION: Validate input before authorization
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
            new_lines.append(validation_block)

            # Update next authorization comment if present
            if i + 1 < len(lines):
                next_line = lines[i + 1]
                if 'Authorization:' in next_line:
                    lines[i + 1] = next_line.replace('// Authorization:', '// 2. AUTHORIZATION:').replace('Authorization:', '2. AUTHORIZATION:')

                # Look for business logic start
                for j in range(i + 1, min(i + 15, len(lines))):
                    if ('const' in lines[j] or 'let' in lines[j] or 'var' in lines[j]) and 'userId' not in lines[j]:
                        if '// 3. BUSINESS LOGIC:' not in lines[j] and '// Get' not in lines[j]:
                            lines[j] = '      // 3. BUSINESS LOGIC: Use validated data\n' + lines[j]
                            break

        i += 1

    # Join the updated lines
    updated_handler = '\n'.join(new_lines)

    # Apply field replacements
    for old_field, new_field in field_replacements:
        # Use word boundaries to avoid partial replacements
        # But be careful not to replace in comments or strings
        updated_handler = re.sub(
            rf'\b{re.escape(old_field)}\b(?![^"]*"[^"]*(?:"[^"]*"[^"]*)*$)',
            new_field,
            updated_handler
        )

    # Replace in content
    content = content.replace(handler_code, updated_handler)
    print(f"[OK] {channel_name} - updated successfully")

    return content


# Define all handlers that need updating with their field replacements
handlers_to_update = [
    # Evidence handlers
    ('EVIDENCE_CREATE', [('request.input.caseId', 'validationResult.data.input.caseId'), ('request.input', 'validationResult.data.input')]),
    ('EVIDENCE_GET_BY_ID', [('request.id', 'validationResult.data.id')]),
    ('EVIDENCE_GET_ALL', [('request.evidenceType', 'validationResult.data.evidenceType')]),
    ('EVIDENCE_GET_BY_CASE', [('request.caseId', 'validationResult.data.caseId')]),
    ('EVIDENCE_UPDATE', [('request.id', 'validationResult.data.id'), ('request.input', 'validationResult.data.input')]),
    ('EVIDENCE_DELETE', [('request.id', 'validationResult.data.id')]),

    # AI handlers
    ('AI_CHECK_STATUS', []),
    ('AI_CONFIGURE', [('request.provider', 'validationResult.data.provider'), ('request.config', 'validationResult.data.config')]),
    ('AI_TEST_CONNECTION', [('request.provider', 'validationResult.data.provider'), ('request.config', 'validationResult.data.config')]),
    ('AI_CHAT', [('request.message', 'validationResult.data.message'), ('request.caseId', 'validationResult.data.caseId'), ('request.modelId', 'validationResult.data.modelId')]),
    ('AI_STREAM_START', [('request.message', 'validationResult.data.message'), ('request.caseId', 'validationResult.data.caseId'), ('request.modelId', 'validationResult.data.modelId'), ('request.conversationId', 'validationResult.data.conversationId')]),

    # File handlers
    ('FILE_SELECT', []),
    ('FILE_UPLOAD', [('request.caseId', 'validationResult.data.caseId'), ('request.evidenceType', 'validationResult.data.evidenceType'), ('request.filePaths', 'validationResult.data.filePaths')]),
    ('FILE_VIEW', [('request.filePath', 'validationResult.data.filePath')]),
    ('FILE_DOWNLOAD', [('request.filePath', 'validationResult.data.filePath'), ('request.fileName', 'validationResult.data.fileName')]),
    ('FILE_PRINT', [('request.filePath', 'validationResult.data.filePath')]),
    ('FILE_EMAIL', [('request.filePaths', 'validationResult.data.filePaths'), ('request.subject', 'validationResult.data.subject'), ('request.body', 'validationResult.data.body')]),

    # Conversation/Message handlers
    ('CONVERSATION_GET', [('request.id', 'validationResult.data.id')]),
    ('MESSAGE_ADD', [('request.conversationId', 'validationResult.data.conversationId'), ('request.message', 'validationResult.data.message')]),

    # Profile handlers
    ('PROFILE_GET', []),
    ('PROFILE_UPDATE', [('request.preferences', 'validationResult.data.preferences')]),

    # Model handlers
    ('MODEL_IS_DOWNLOADED', [('request.modelId', 'validationResult.data.modelId')]),
    ('MODEL_DELETE', [('request.modelId', 'validationResult.data.modelId')]),

    # GDPR handlers
    ('GDPR_EXPORT_USER_DATA', []),
    ('GDPR_DELETE_USER_DATA', [('request.confirmation', 'validationResult.data.confirmation')]),

    # Auth handlers
    ('AUTH_REGISTER', [('request.username', 'validationResult.data.username'), ('request.email', 'validationResult.data.email'), ('request.password', 'validationResult.data.password')]),
    ('AUTH_LOGIN', [('request.username', 'validationResult.data.username'), ('request.password', 'validationResult.data.password'), ('request.rememberMe', 'validationResult.data.rememberMe')]),
    ('AUTH_LOGOUT', []),
    ('AUTH_CHANGE_PASSWORD', [('request.currentPassword', 'validationResult.data.currentPassword'), ('request.newPassword', 'validationResult.data.newPassword')]),

    # Consent handlers
    ('CONSENT_GRANT', [('request.consentType', 'validationResult.data.consentType')]),
    ('CONSENT_REVOKE', [('request.consentType', 'validationResult.data.consentType')]),
    ('CONSENT_HAS_CONSENT', [('request.consentType', 'validationResult.data.consentType')]),
]

# Read the file
print("Reading electron/main.ts...")
with open('electron/main.ts', encoding='utf-8') as f:
    content = f.read()

print(f"\nProcessing {len(handlers_to_update)} handlers...\n")

# Update each handler
updated_count = 0
skipped_count = 0
failed_count = 0

for channel_name, field_replacements in handlers_to_update:
    original_content = content
    content = update_handler(content, channel_name, field_replacements)

    if content != original_content:
        if 'already has validation' in content:
            skipped_count += 1
        else:
            updated_count += 1
    else:
        failed_count += 1

# Write the updated content back
print("\nWriting updated content back to electron/main.ts...")
with open('electron/main.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"""
========================================
Update Summary:
========================================
[OK] Updated: {updated_count} handlers
[SKIP] Skipped: {skipped_count} handlers (already had validation)
[X] Failed:  {failed_count} handlers

Total processed: {len(handlers_to_update)}
========================================
""")
