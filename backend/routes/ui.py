"""
UI Dialog Routes for Justice Companion.
Migrated from electron/ipc-handlers/ui.ts

ARCHITECTURAL LIMITATION:
==========================
Native file dialogs (Electron's dialog API) require a desktop environment
and direct access to OS-level dialog APIs. These features CANNOT be implemented
in a pure HTTP/REST backend because:

1. Electron dialogs are native OS dialogs (Windows File Explorer, macOS Finder, etc.)
2. They require Electron's BrowserWindow context to display modally
3. HTTP backends run as separate processes without GUI capabilities
4. Browser security model prevents HTTP servers from opening OS file dialogs

FRONTEND ALTERNATIVES:
======================
When migrating from Electron IPC to an HTTP backend, use these alternatives:

**File Open Dialog:**
- Flutter (mobile/desktop): file_picker or image_picker
- Flutter web: FilePicker.platform.pickFiles or dart:html FileUploadInputElement

**File Save Dialog:**
- Flutter: file_saver or share_plus for saving/exporting files
- Flutter web: AnchorElement(download: ...) with a Blob URL

**Example Flutter (web) snippet:**
```dart
import 'package:file_picker/file_picker.dart';

final result = await FilePicker.platform.pickFiles(
  allowMultiple: true,
  type: FileType.custom,
  allowedExtensions: ['pdf', 'docx'],
);

if (result != null) {
  final files = result.files;
  // Handle selected files.
}
```

These endpoints return HTTP 501 Not Implemented with explanatory error messages.
"""

from typing import List, Optional
from enum import Enum

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="/dialog", tags=["ui"])

# ===== PYDANTIC MODELS =====

class FileFilter(BaseModel):
    """
    File type filter for dialog (e.g., {name: "Images", extensions: ["jpg", "png"]})
    """

    name: str = Field(..., description="Human-readable filter name (e.g., 'Images')")
    extensions: List[str] = Field(
        ..., description="File extensions without dots (e.g., ['jpg', 'png'])"
    )

class DialogProperty(str, Enum):
    """
    Properties for file open dialog (Electron dialog.showOpenDialog options)
    """

    OPEN_FILE = "openFile"
    OPEN_DIRECTORY = "openDirectory"
    MULTI_SELECTIONS = "multiSelections"
    SHOW_HIDDEN_FILES = "showHiddenFiles"
    CREATE_DIRECTORY = "createDirectory"
    PROMPT_TO_CREATE = "promptToCreate"
    NO_RESOLVE_ALIASES = "noResolveAliases"
    TREAT_PACKAGE_AS_DIRECTORY = "treatPackageAsDirectory"

class OpenDialogRequest(BaseModel):
    """
    Request body for opening file/folder selection dialog.

    Mimics Electron's dialog.showOpenDialog options.
    """

    title: Optional[str] = Field(None, description="Dialog window title")
    default_path: Optional[str] = Field(
        None, description="Default directory to open", alias="defaultPath"
    )
    button_label: Optional[str] = Field(
        None, description="Custom label for confirm button", alias="buttonLabel"
    )
    filters: Optional[List[FileFilter]] = Field(None, description="File type filters")
    properties: Optional[List[DialogProperty]] = Field(
        None,
        description="Dialog behavior properties (openFile, openDirectory, multiSelections, etc.)",
    )
    message: Optional[str] = Field(
        None, description="Message displayed above input boxes (macOS only)"
    )

    class Config:
        populate_by_name = True  # Allow both snake_case and camelCase

class SaveDialogRequest(BaseModel):
    """
    Request body for opening file save dialog.

    Mimics Electron's dialog.showSaveDialog options.
    """

    title: Optional[str] = Field(None, description="Dialog window title")
    default_path: Optional[str] = Field(None, description="Default file path", alias="defaultPath")
    button_label: Optional[str] = Field(
        None, description="Custom label for confirm button", alias="buttonLabel"
    )
    filters: Optional[List[FileFilter]] = Field(None, description="File type filters")
    message: Optional[str] = Field(
        None, description="Message displayed above input boxes (macOS only)"
    )
    name_field_label: Optional[str] = Field(
        None,
        description="Custom label for filename text field (macOS only)",
        alias="nameFieldLabel",
    )
    show_tag_field: Optional[bool] = Field(
        None, description="Show tags input box (macOS only)", alias="showsTagField"
    )

    class Config:
        populate_by_name = True  # Allow both snake_case and camelCase

class OpenDialogResponse(BaseModel):
    """
    Response from file open dialog.
    """

    canceled: bool = Field(..., description="True if user canceled the dialog")
    file_paths: List[str] = Field(
        default_factory=list, description="Selected file/folder paths", alias="filePaths"
    )

    class Config:
        populate_by_name = True  # Allow both snake_case and camelCase

class SaveDialogResponse(BaseModel):
    """
    Response from file save dialog.
    """

    canceled: bool = Field(..., description="True if user canceled the dialog")
    file_path: Optional[str] = Field(None, description="Selected save path", alias="filePath")

    class Config:
        populate_by_name = True  # Allow both snake_case and camelCase

# ===== ERROR RESPONSE HELPERS =====

def create_not_implemented_response(feature: str, alternatives: List[str]) -> JSONResponse:
    """
    Create consistent 501 Not Implemented response with helpful alternatives.

    Args:
        feature: Name of the unimplemented feature
        alternatives: List of alternative approaches

    Returns:
        JSONResponse with 501 status and detailed error
    """
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={
            "error": "Not Implemented",
            "message": f"{feature} requires Electron desktop environment and cannot be implemented in HTTP backend",
            "reason": "Native OS dialogs require direct access to window managers and GUI APIs",
            "alternatives": alternatives,
            "recommendation": "Use Flutter file picker and download/export APIs instead",
        },
    )

# ===== ROUTES =====

@router.post(
    "/open",
    response_model=OpenDialogResponse,
    status_code=status.HTTP_501_NOT_IMPLEMENTED,
    responses={
        501: {
            "description": "Native file dialogs not available in HTTP backend",
            "content": {
                "application/json": {
                    "example": {
                        "error": "Not Implemented",
                        "message": "File open dialog requires Electron desktop environment",
                        "alternatives": [
                            "Use Flutter file_picker",
                            "Use Flutter image_picker",
                            "Use dart:html FileUploadInputElement on web",
                        ],
                    }
                }
            },
        }
    },
)
async def show_open_dialog(request: OpenDialogRequest):
    """
    Show native file/folder selection dialog.

    **ARCHITECTURAL LIMITATION:**
    This endpoint cannot be implemented in HTTP backend because native OS file dialogs
    require desktop environment with direct GUI access.

    **Original Electron Implementation:**
    ```typescript
    ipcMain.handle('dialog:showOpenDialog', async (_event, options) => {
        const result = await dialog.showOpenDialog(mainWindow, options);
        return result;
    });
    ```

    **Frontend Migration Guide:**
    Replace Electron IPC calls with Flutter file picker:

    ```dart
    // OLD (Electron IPC):
    // const { filePaths } = await window.electron.dialog.showOpenDialog(options);

    // NEW (Flutter):
    final result = await FilePicker.platform.pickFiles(
      allowMultiple: true,
      type: FileType.custom,
      allowedExtensions: ['pdf', 'docx'],
    );
    if (result != null) {
      final files = result.files;
      // Handle selected files.
    }
    ```

    **Recommended Packages:**
    - file_picker: Cross-platform file picker
    - image_picker: Camera/gallery file access
    - file_saver: Save/export files on desktop/web

    **Args:**
        request: Dialog configuration (title, filters, properties, etc.)

    **Returns:**
        JSONResponse with 501 Not Implemented status
    """
    return create_not_implemented_response(
        feature="File open dialog (dialog.showOpenDialog)",
        alternatives=[
            "Use Flutter file_picker for file selection",
            "Use image_picker for camera/gallery access",
            "Use FileUploadInputElement on Flutter web",
            "For directories on web: use file_picker with directory support (where available)",
            "For advanced web access: File System Access API (Chromium-based browsers)",
        ],
    )

@router.post(
    "/save",
    response_model=SaveDialogResponse,
    status_code=status.HTTP_501_NOT_IMPLEMENTED,
    responses={
        501: {
            "description": "Native file dialogs not available in HTTP backend",
            "content": {
                "application/json": {
                    "example": {
                        "error": "Not Implemented",
                        "message": "File save dialog requires Electron desktop environment",
                        "alternatives": [
                            "Use Flutter file_saver or share_plus",
                            "Use AnchorElement(download: ...) on Flutter web",
                            "Use File System Access API (Chromium-based browsers)",
                        ],
                    }
                }
            },
        }
    },
)
async def show_save_dialog(request: SaveDialogRequest):
    """
    Show native file save dialog.

    **ARCHITECTURAL LIMITATION:**
    This endpoint cannot be implemented in HTTP backend because native OS file save dialogs
    require desktop environment with direct GUI access.

    **Original Electron Implementation:**
    ```typescript
    ipcMain.handle('dialog:showSaveDialog', async (_event, options) => {
        const result = await dialog.showSaveDialog(mainWindow, options);
        return result;
    });
    ```

    **Frontend Migration Guide:**
    Replace Electron IPC calls with Flutter export APIs:

    ```dart
    // OLD (Electron IPC):
    // const { filePath } = await window.electron.dialog.showSaveDialog(options);

    // NEW (Flutter):
    import 'dart:convert';
    import 'package:file_saver/file_saver.dart';

    final bytes = utf8.encode(jsonData);
    await FileSaver.instance.saveFile(
      name: 'export',
      bytes: bytes,
      ext: 'json',
      mimeType: MimeType.json,
    );
    ```

    For Flutter web, you can also use dart:html AnchorElement with a Blob URL.

    **Recommended Packages:**
    - file_saver: Save/export files across platforms
    - share_plus: Share files from mobile/desktop
    - printing: PDF export workflows (optional)

    **Args:**
        request: Dialog configuration (title, defaultPath, filters, etc.)

    **Returns:**
        JSONResponse with 501 Not Implemented status
    """
    return create_not_implemented_response(
        feature="File save dialog (dialog.showSaveDialog)",
        alternatives=[
            "Use file_saver to save bytes on desktop/mobile/web",
            "Use share_plus to export files from mobile",
            "Use AnchorElement(download: ...) on Flutter web",
            "Use File System Access API for full filesystem access (Chromium-based browsers)",
        ],
    )

# ===== ADDITIONAL HELPER ENDPOINT =====

@router.get(
    "/capabilities",
    status_code=status.HTTP_200_OK,
    responses={
        200: {
            "description": "UI capabilities information",
            "content": {
                "application/json": {
                    "example": {
                        "native_dialogs": False,
                        "file_upload": True,
                        "file_download": True,
                        "supported_features": ["html_file_input", "browser_download", "file_api"],
                    }
                }
            },
        }
    },
)
async def get_ui_capabilities():
    """
    Get information about available UI capabilities in HTTP backend.

    This endpoint helps frontend code detect whether native dialogs are supported
    or if it should fall back to Flutter/web file APIs.

    **Usage in Frontend (Flutter):**
    ```dart
    final capabilities = await apiClient.get<Map<String, dynamic>>('/dialog/capabilities');

    if (capabilities['native_dialogs'] == true) {
      // Use platform-native dialogs if available.
    } else {
      // Use file_picker or web download APIs.
    }
    ```

    **Returns:**
        JSON object with capability flags and supported features
    """
    return {
        "native_dialogs": False,
        "native_file_system": False,
        "file_upload": True,
        "file_download": True,
        "supported_features": [
            "flutter_file_picker",
            "flutter_file_saver",
            "web_download",
            "blob_api",
        ],
        "recommended_libraries": [
            {
                "name": "file_picker",
                "purpose": "Cross-platform file picker",
                "url": "https://pub.dev/packages/file_picker",
            },
            {
                "name": "file_saver",
                "purpose": "Save/export files across platforms",
                "url": "https://pub.dev/packages/file_saver",
            },
            {
                "name": "share_plus",
                "purpose": "Share/export files from mobile/desktop",
                "url": "https://pub.dev/packages/share_plus",
            },
        ],
        "browser_apis": {
            "file_input": {
                "description": "dart:html FileUploadInputElement",
                "support": "Flutter web only",
                "multiple_files": True,
                "folder_selection": "Chromium only (webkitdirectory)",
            },
            "file_system_access_api": {
                "description": "Full filesystem access API",
                "support": "Chrome 86+, Edge 86+",
                "url": "https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API",
            },
            "download_api": {
                "description": "Programmatic downloads via AnchorElement(download: ...)",
                "support": "Flutter web only",
            },
        },
        "migration_notes": [
            "Replace dialog.showOpenDialog() with file_picker",
            "Replace dialog.showSaveDialog() with file_saver or share_plus",
            "Use File System Access API for advanced web file operations",
        ],
    }
