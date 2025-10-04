import { useState, useRef, useEffect, type KeyboardEvent, type ChangeEvent } from 'react';
import { BiMicrophone, BiPaperclip, BiSend, BiX } from 'react-icons/bi';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';

/**
 * Props for FloatingChatInput component
 */
interface FloatingChatInputProps {
  /** Callback when user sends a message */
  onSend: (message: string) => void;
  /** Whether input is disabled (e.g., during streaming) */
  disabled?: boolean;
  /** Placeholder text for the textarea */
  placeholder?: string;
  /** Whether sidebar is open (adjusts positioning) */
  isSidebarOpen?: boolean;
}

interface UploadedFile {
  fileName: string;
  fileSize: number;
  extractedText?: string;
}

/**
 * FloatingChatInput - ChatGPT-style floating input with voice and upload
 *
 * Features:
 * - Floating centered at bottom
 * - Voice input button (left)
 * - File upload button (left of voice)
 * - Auto-resize textarea
 * - Send button (right)
 * - Keyboard shortcuts
 * - Calm blue theme
 *
 * @param props - FloatingChatInputProps
 * @returns React component
 */
export function FloatingChatInput({
  onSend,
  disabled = false,
  placeholder = 'Ask a legal question...',
  isSidebarOpen = false
}: FloatingChatInputProps) {
  const [value, setValue] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice recognition hook
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    error: voiceError,
  } = useVoiceRecognition();

  // Auto-resize textarea based on content (max 5 lines ≈ 120px)
  const MAX_HEIGHT = 120;

  // Update value when voice transcript changes
  useEffect(() => {
    if (transcript) {
      setValue(prev => {
        const newValue = prev ? `${prev} ${transcript}` : transcript;
        return newValue;
      });
    }
  }, [transcript]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, MAX_HEIGHT);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    setValue(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = (): void => {
    let messageToSend = value.trim();

    // Include file text if file is uploaded
    if (uploadedFile?.extractedText) {
      messageToSend = `${messageToSend}\n\n[Attached file: ${uploadedFile.fileName}]\n${uploadedFile.extractedText}`;
    }

    if (messageToSend && !disabled) {
      onSend(messageToSend);
      setValue('');
      setUploadedFile(null);
    }
  };

  const handleVoiceClick = (): void => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleFileClick = async (): Promise<void> => {
    try {
      const selectResult = await window.justiceAPI.selectFile({
        filters: [
          { name: 'Documents', extensions: ['pdf', 'docx', 'txt'] },
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png'] },
        ],
        properties: ['openFile'],
      });

      if (selectResult.success && !selectResult.canceled && selectResult.filePaths.length > 0) {
        const filePath = selectResult.filePaths[0];

        const uploadResult = await window.justiceAPI.uploadFile(filePath);

        if (uploadResult.success) {
          setUploadedFile({
            fileName: uploadResult.fileName,
            fileSize: uploadResult.fileSize,
            extractedText: uploadResult.extractedText,
          });
        } else {
          console.error('File upload failed:', uploadResult.error);
        }
      }
    } catch (error) {
      console.error('File selection error:', error);
    }
  };

  const handleRemoveFile = (): void => {
    setUploadedFile(null);
  };

  const isButtonDisabled = disabled || (!value.trim() && !uploadedFile);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={`fixed bottom-6 w-full ${isSidebarOpen ? 'max-w-3xl' : 'max-w-5xl'} px-6 z-50 animate-slide-up transition-all duration-300 ${
      isSidebarOpen ? 'left-[calc(50%+160px)] -translate-x-1/2' : 'left-1/2 -translate-x-1/2'
    }`}>
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200">
        {/* File Preview (if file uploaded) */}
        {uploadedFile && (
          <div className="border-b border-gray-200 p-3">
            <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
              <BiPaperclip className="w-4 h-4 text-blue-600" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{uploadedFile.fileName}</div>
                <div className="text-xs text-gray-500">{formatFileSize(uploadedFile.fileSize)}</div>
              </div>
              <button
                onClick={handleRemoveFile}
                className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                aria-label="Remove file"
              >
                <BiX className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Voice Error Display */}
        {voiceError && (
          <div className="border-b border-gray-200 p-3">
            <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {voiceError}
            </div>
          </div>
        )}

        <div className="flex items-end gap-2 p-3">
          {/* File Upload Button */}
          <button
            type="button"
            onClick={handleFileClick}
            disabled={disabled || !!uploadedFile}
            aria-label="Attach file"
            className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BiPaperclip className="w-5 h-5" />
          </button>

          {/* Voice Input Button */}
          <button
            type="button"
            onClick={handleVoiceClick}
            disabled={disabled}
            aria-label={isListening ? 'Stop listening' : 'Start voice input'}
            className={`p-2.5 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
              isListening
                ? 'text-red-600 bg-red-50 animate-pulse'
                : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            <BiMicrophone className="w-5 h-5" />
          </button>

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              aria-label="Message input"
              aria-disabled={disabled}
              className={`
                w-full resize-none rounded-lg border-0 px-3 py-2
                focus:outline-none focus:ring-0
                transition-colors bg-transparent
                ${
                  disabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-900'
                }
              `}
              rows={1}
              style={{ minHeight: '40px', maxHeight: `${MAX_HEIGHT}px` }}
            />
            {/* Interim transcript display */}
            {interimTranscript && (
              <div className="absolute bottom-full left-0 right-0 mb-1 px-3 py-1 bg-gray-100 rounded text-sm text-gray-500 italic">
                {interimTranscript}...
              </div>
            )}
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={isButtonDisabled}
            aria-label="Send message"
            className={`
              p-2.5 rounded-lg transition-all
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${
                isButtonDisabled
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }
            `}
          >
            <BiSend className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
