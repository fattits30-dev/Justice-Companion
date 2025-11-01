#!/usr/bin/env python3
"""
Apply validation middleware updates to all IPC handlers in main.ts
"""


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
                if 'const' in lines[j] and 'userId' not in lines[j] and 'validationResult' not in lines[j]:
                    # Insert business logic comment before the first const declaration
                    # that is not userId or validationResult
                    if '//' not in lines[j] or '//' not in lines[j].split('//')[0]:
                        # Insert comment before the const line
                        updated_lines.insert(len(updated_lines) - (len(lines) - j), '// 3. BUSINESS LOGIC:')
                    break

            # Insert validation code after try {
            updated_lines.insert(len(updated_lines) - (len(lines) - i - 1), validation_code.strip())
            break

    return '\n'.join(updated_lines)
