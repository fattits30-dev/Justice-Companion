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
When migrating from Electron IPC to HTTP backend, use these alternatives:

**File Open Dialog:**
- HTML: <input type="file" multiple>
- React: <input type="file" onChange={handleFileSelect} />
- Libraries: react-dropzone, react-file-picker

**File Save Dialog:**
- Browser download: <a href={fileBlob} download="filename.ext">
- JavaScript: URL.createObjectURL() + programmatic <a> click
- Libraries: file-saver, downloadjs

**Example React Component:**
```tsx
// Replace IPC dialog call:
// const { filePaths } = await window.electron.dialog.showOpenDialog(options)

// With HTML file input:
<input
  type="file"
  multiple
  accept=".pdf,.docx"
  onChange={(e) => {
    const files = Array.from(e.target.files || []);
    handleFilesSelected(files);
  }}
/>
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
            "recommendation": "Use HTML file input elements or browser download APIs instead",
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
                            "Use HTML <input type='file' multiple>",
                            "Use react-dropzone library",
                            "Use File API: document.createElement('input')",
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
    Replace Electron IPC calls with HTML file input:

    ```tsx
    // OLD (Electron IPC):
    const { filePaths, canceled } = await window.electron.dialog.showOpenDialog({
        title: "Select Files",
        filters: [{ name: "Documents", extensions: ["pdf", "docx"] }],
        properties: ["openFile", "multiSelections"]
    });

    // NEW (HTML5 File API):
    <input
        type="file"
        multiple
        accept=".pdf,.docx"
        onChange={(e) => {
            const files = Array.from(e.target.files || []);
            const filePaths = files.map(f => f.name);
            handleFilesSelected(files);
        }}
    />
    ```

    **Recommended Libraries:**
    - react-dropzone: Drag-and-drop file uploads with styling
    - react-file-picker: Material UI file picker
    - filepond: Beautiful file upload component

    **Args:**
        request: Dialog configuration (title, filters, properties, etc.)

    **Returns:**
        JSONResponse with 501 Not Implemented status
    """
    return create_not_implemented_response(
        feature="File open dialog (dialog.showOpenDialog)",
        alternatives=[
            "Use HTML <input type='file' multiple> element",
            "Use react-dropzone library for drag-and-drop uploads",
            "Use browser File API: document.createElement('input')",
            "For directories: Use <input webkitdirectory> (Chromium-based browsers)",
            "For full file system access: Use File System Access API (Chrome 86+)",
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
                            "Use browser download: <a download='filename.ext'>",
                            "Use file-saver library: saveAs(blob, filename)",
                            "Use File System Access API (Chrome 86+)",
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
    Replace Electron IPC calls with browser download APIs:

    ```tsx
    // OLD (Electron IPC):
    const { filePath, canceled } = await window.electron.dialog.showSaveDialog({
        title: "Save Export",
        defaultPath: "export.json",
        filters: [{ name: "JSON", extensions: ["json"] }]
    });

    // NEW (Browser Download):
    import { saveAs } from 'file-saver';

    const blob = new Blob([jsonData], { type: 'application/json' });
    saveAs(blob, 'export.json');

    // OR (vanilla JS):
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export.json';
    a.click();
    URL.revokeObjectURL(url);
    ```

    **Recommended Libraries:**
    - file-saver: Simple saveAs() function for blobs
    - downloadjs: Trigger browser downloads
    - StreamSaver.js: Stream large files without memory limits
    - File System Access API: Full filesystem access (Chrome 86+)

    **Args:**
        request: Dialog configuration (title, defaultPath, filters, etc.)

    **Returns:**
        JSONResponse with 501 Not Implemented status
    """
    return create_not_implemented_response(
        feature="File save dialog (dialog.showSaveDialog)",
        alternatives=[
            "Use browser download: <a href={blobUrl} download='filename.ext'>",
            "Use file-saver library: saveAs(blob, filename)",
            "Use downloadjs library for simple downloads",
            "Use StreamSaver.js for large file downloads (>100MB)",
            "Use File System Access API for full filesystem access (Chrome 86+)",
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

    This endpoint helps frontend code detect whether it's running in Electron
    (with native dialog support) or HTTP backend (browser-only APIs).

    **Usage in Frontend:**
    ```tsx
    const { data: capabilities } = await fetch('/dialog/capabilities');

    if (capabilities.native_dialogs) {
        // Use Electron IPC
        window.electron.dialog.showOpenDialog(options);
    } else {
        // Use HTML file input
        inputElement.click();
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
            "html_file_input",
            "browser_download",
            "file_api",
            "blob_api",
            "drag_drop_upload",
        ],
        "recommended_libraries": [
            {
                "name": "react-dropzone",
                "purpose": "File upload with drag-and-drop",
                "url": "https://react-dropzone.js.org/",
            },
            {
                "name": "file-saver",
                "purpose": "Browser file downloads",
                "url": "https://github.com/eligrey/FileSaver.js",
            },
            {
                "name": "StreamSaver.js",
                "purpose": "Large file downloads (>100MB)",
                "url": "https://github.com/jimmywarting/StreamSaver.js",
            },
        ],
        "browser_apis": {
            "file_input": {
                "description": "HTML <input type='file'>",
                "support": "All browsers",
                "multiple_files": True,
                "folder_selection": "Chromium only (webkitdirectory)",
            },
            "file_system_access_api": {
                "description": "Full filesystem access API",
                "support": "Chrome 86+, Edge 86+",
                "url": "https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API",
            },
            "download_api": {
                "description": "Programmatic downloads via <a download>",
                "support": "All browsers",
            },
        },
        "migration_notes": [
            "Replace dialog.showOpenDialog() with HTML file input",
            "Replace dialog.showSaveDialog() with browser download",
            "Use File System Access API for advanced file operations (Chrome 86+)",
            "Consider react-dropzone for better UX",
        ],
    }
