import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../app/theme.dart';

/// Message input widget with glassmorphism design
class MessageInput extends StatefulWidget {
  final TextEditingController controller;
  final FocusNode? focusNode;
  final bool enabled;
  final bool isLoading;
  final VoidCallback onSend;
  final VoidCallback? onCancel;
  final VoidCallback? onAttachFile;
  final List<String>? attachedFiles;
  final Function(int)? onRemoveFile;
  final int maxLength;

  const MessageInput({
    super.key,
    required this.controller,
    this.focusNode,
    this.enabled = true,
    this.isLoading = false,
    required this.onSend,
    this.onCancel,
    this.onAttachFile,
    this.attachedFiles,
    this.onRemoveFile,
    this.maxLength = 10000,
  });

  @override
  State<MessageInput> createState() => _MessageInputState();
}

class _MessageInputState extends State<MessageInput> {
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onTextChanged);
    _hasText = widget.controller.text.isNotEmpty;
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onTextChanged);
    super.dispose();
  }

  void _onTextChanged() {
    final hasText = widget.controller.text.trim().isNotEmpty;
    if (hasText != _hasText) {
      setState(() => _hasText = hasText);
    }
  }

  void _handleSend() {
    if (widget.controller.text.trim().isEmpty) return;
    widget.onSend();
  }

  @override
  Widget build(BuildContext context) {
    final attachedFiles = widget.attachedFiles ?? [];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface.withValues(alpha: 0.8),
        border: Border(
          top: BorderSide(
            color: Colors.white.withValues(alpha: 0.05),
            width: 1,
          ),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Attached files row
            if (attachedFiles.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: attachedFiles.asMap().entries.map((entry) {
                      final index = entry.key;
                      final fileName = entry.value;
                      return _buildFileChip(fileName, index);
                    }).toList(),
                  ),
                ),
              ),

            // Input row
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                // Attach file button
                _buildAttachButton(),

                const SizedBox(width: 8),

                // Text field
                Expanded(
                  child: GlassContainer(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    borderRadius: 24,
                    child: TextField(
                      controller: widget.controller,
                      focusNode: widget.focusNode,
                      enabled: widget.enabled && !widget.isLoading,
                      maxLines: 4,
                      minLines: 1,
                      maxLength: widget.maxLength,
                      textInputAction: TextInputAction.newline,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 15,
                        color: AppTheme.textPrimary,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Ask me anything...',
                        hintStyle: GoogleFonts.plusJakartaSans(
                          fontSize: 15,
                          color: AppTheme.textMuted,
                        ),
                        border: InputBorder.none,
                        counterText: '',
                        isDense: true,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  ),
                ),

                const SizedBox(width: 12),

                // Send/Cancel button
                _buildActionButton(),
              ],
            ),

            // Character count
            if (_hasText && widget.controller.text.length > 100)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Align(
                  alignment: Alignment.centerRight,
                  child: Text(
                    '${widget.controller.text.length}/${widget.maxLength}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: widget.controller.text.length > widget.maxLength * 0.9
                              ? AppTheme.warning
                              : AppTheme.textMuted,
                          fontSize: 11,
                        ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildAttachButton() {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: widget.enabled && !widget.isLoading ? widget.onAttachFile : null,
        borderRadius: BorderRadius.circular(24),
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: AppTheme.surfaceLight.withValues(alpha: 0.5),
            shape: BoxShape.circle,
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.1),
            ),
          ),
          child: Icon(
            Icons.attach_file_rounded,
            color: widget.enabled && !widget.isLoading
                ? AppTheme.textSecondary
                : AppTheme.textMuted,
            size: 20,
          ),
        ),
      ),
    );
  }

  Widget _buildFileChip(String fileName, int index) {
    // Get file extension for icon
    final ext = fileName.split('.').last.toLowerCase();
    IconData icon;
    Color iconColor;

    switch (ext) {
      case 'pdf':
        icon = Icons.picture_as_pdf_rounded;
        iconColor = Colors.red.shade400;
        break;
      case 'doc':
      case 'docx':
        icon = Icons.description_rounded;
        iconColor = Colors.blue.shade400;
        break;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        icon = Icons.image_rounded;
        iconColor = Colors.green.shade400;
        break;
      default:
        icon = Icons.insert_drive_file_rounded;
        iconColor = AppTheme.textSecondary;
    }

    return Container(
      margin: const EdgeInsets.only(right: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.surfaceLight.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.1),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: iconColor),
          const SizedBox(width: 8),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 120),
            child: Text(
              fileName,
              style: GoogleFonts.inter(
                fontSize: 12,
                color: AppTheme.textPrimary,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 6),
          GestureDetector(
            onTap: () => widget.onRemoveFile?.call(index),
            child: Icon(
              Icons.close_rounded,
              size: 16,
              color: AppTheme.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton() {
    if (widget.isLoading) {
      // Show cancel button during streaming
      return Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: AppTheme.error.withValues(alpha: 0.2),
          shape: BoxShape.circle,
          border: Border.all(
            color: AppTheme.error.withValues(alpha: 0.3),
            width: 1,
          ),
        ),
        child: IconButton(
          onPressed: widget.onCancel,
          icon: const Icon(
            Icons.stop_rounded,
            color: AppTheme.error,
            size: 24,
          ),
        ),
      ).animate().scale(begin: const Offset(0.8, 0.8), curve: Curves.easeOutBack);
    }

    // Show send button
    final canSend = _hasText && widget.enabled;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        gradient: canSend ? AppTheme.primaryGradient : null,
        color: canSend ? null : AppTheme.surfaceLight,
        shape: BoxShape.circle,
        boxShadow: canSend
            ? [
                BoxShadow(
                  color: AppTheme.primary.withValues(alpha: 0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: IconButton(
        onPressed: canSend ? _handleSend : null,
        icon: Icon(
          Icons.send_rounded,
          color: canSend ? const Color(0xFF1A1A1A) : AppTheme.textMuted,
          size: 22,
        ),
      ),
    );
  }
}
