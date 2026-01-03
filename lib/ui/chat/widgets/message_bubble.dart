import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../../app/theme.dart';
import '../../../domain/entities/chat_entity.dart';

/// Message bubble widget for displaying chat messages
class MessageBubble extends StatelessWidget {
  final MessageEntity message;
  final bool isStreaming;
  final String? streamingText;
  final bool animate;
  final VoidCallback? onRegenerate;
  final String? previousUserMessage;

  const MessageBubble({
    super.key,
    required this.message,
    this.isStreaming = false,
    this.streamingText,
    this.animate = false,
    this.onRegenerate,
    this.previousUserMessage,
  });

  bool get isUser => message.role == MessageRole.user;

  @override
  Widget build(BuildContext context) {
    final content = isStreaming ? (streamingText ?? '') : message.content;

    Widget bubble = Container(
      margin: EdgeInsets.only(
        left: isUser ? 48 : 0,
        right: isUser ? 0 : 48,
        bottom: 12,
      ),
      child: Column(
        crossAxisAlignment:
            isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          // Message bubble
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              gradient: isUser ? AppTheme.primaryGradient : null,
              color: isUser ? null : AppTheme.surfaceLight.withValues(alpha: 0.6),
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(16),
                topRight: const Radius.circular(16),
                bottomLeft: Radius.circular(isUser ? 16 : 4),
                bottomRight: Radius.circular(isUser ? 4 : 16),
              ),
              border: isUser
                  ? null
                  : Border.all(
                      color: Colors.white.withValues(alpha: 0.08),
                      width: 1,
                    ),
              boxShadow: [
                BoxShadow(
                  color: isUser
                      ? AppTheme.primary.withValues(alpha: 0.2)
                      : Colors.black.withValues(alpha: 0.1),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (isUser)
                  Text(
                    content,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 15,
                      color: const Color(0xFF1A1A1A),
                      height: 1.5,
                    ),
                  )
                else
                  _buildMarkdownContent(context, content),

                // Streaming cursor
                if (isStreaming)
                  Container(
                    margin: const EdgeInsets.only(top: 4),
                    width: 8,
                    height: 16,
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  )
                      .animate(onPlay: (c) => c.repeat(reverse: true))
                      .fadeIn(duration: 500.ms)
                      .fadeOut(duration: 500.ms),
              ],
            ),
          ),

          // Timestamp and actions
          Padding(
            padding: const EdgeInsets.only(top: 4, left: 4, right: 4),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _formatTime(message.timestamp),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.textMuted,
                        fontSize: 11,
                      ),
                ),
                if (!isUser && !isStreaming) ...[
                  const SizedBox(width: 8),
                  _CopyButton(content: content),
                  if (onRegenerate != null) ...[
                    const SizedBox(width: 8),
                    _RegenerateButton(onRegenerate: onRegenerate!),
                  ],
                ],
              ],
            ),
          ),
        ],
      ),
    );

    if (animate) {
      bubble = bubble
          .animate()
          .fadeIn(duration: 300.ms)
          .slideX(begin: isUser ? 0.1 : -0.1, end: 0);
    }

    return bubble;
  }

  Widget _buildMarkdownContent(BuildContext context, String content) {
    return MarkdownBody(
      data: content,
      selectable: true,
      styleSheet: MarkdownStyleSheet(
        p: GoogleFonts.plusJakartaSans(
          fontSize: 15,
          color: AppTheme.textPrimary,
          height: 1.5,
        ),
        h1: GoogleFonts.plusJakartaSans(
          fontSize: 22,
          fontWeight: FontWeight.w700,
          color: AppTheme.textPrimary,
        ),
        h2: GoogleFonts.plusJakartaSans(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: AppTheme.textPrimary,
        ),
        h3: GoogleFonts.plusJakartaSans(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: AppTheme.textPrimary,
        ),
        code: GoogleFonts.firaCode(
          fontSize: 13,
          color: AppTheme.primary,
          backgroundColor: AppTheme.surface.withValues(alpha: 0.5),
        ),
        codeblockDecoration: BoxDecoration(
          color: AppTheme.surface.withValues(alpha: 0.8),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: Colors.white.withValues(alpha: 0.05),
          ),
        ),
        blockquote: GoogleFonts.plusJakartaSans(
          fontSize: 15,
          fontStyle: FontStyle.italic,
          color: AppTheme.textSecondary,
        ),
        blockquoteDecoration: BoxDecoration(
          border: Border(
            left: BorderSide(
              color: AppTheme.primary.withValues(alpha: 0.5),
              width: 3,
            ),
          ),
        ),
        listBullet: GoogleFonts.plusJakartaSans(
          fontSize: 15,
          color: AppTheme.textPrimary,
        ),
        a: GoogleFonts.plusJakartaSans(
          fontSize: 15,
          color: AppTheme.primary,
          decoration: TextDecoration.underline,
        ),
        em: GoogleFonts.plusJakartaSans(
          fontSize: 15,
          fontStyle: FontStyle.italic,
          color: AppTheme.textPrimary,
        ),
        strong: GoogleFonts.plusJakartaSans(
          fontSize: 15,
          fontWeight: FontWeight.w700,
          color: AppTheme.textPrimary,
        ),
      ),
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final messageDate = DateTime(time.year, time.month, time.day);

    if (messageDate == today) {
      return DateFormat.jm().format(time);
    } else if (messageDate == today.subtract(const Duration(days: 1))) {
      return 'Yesterday ${DateFormat.jm().format(time)}';
    } else {
      return DateFormat.MMMd().add_jm().format(time);
    }
  }
}

/// Copy button widget
class _CopyButton extends StatefulWidget {
  final String content;

  const _CopyButton({required this.content});

  @override
  State<_CopyButton> createState() => _CopyButtonState();
}

class _CopyButtonState extends State<_CopyButton> {
  bool _copied = false;

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: widget.content));
    setState(() => _copied = true);
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) {
      setState(() => _copied = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _copy,
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 200),
        child: Icon(
          _copied ? Icons.check_rounded : Icons.copy_rounded,
          key: ValueKey(_copied),
          size: 14,
          color: _copied ? AppTheme.success : AppTheme.textMuted,
        ),
      ),
    );
  }
}

/// Regenerate button widget
class _RegenerateButton extends StatefulWidget {
  final VoidCallback onRegenerate;

  const _RegenerateButton({required this.onRegenerate});

  @override
  State<_RegenerateButton> createState() => _RegenerateButtonState();
}

class _RegenerateButtonState extends State<_RegenerateButton> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: GestureDetector(
        onTap: widget.onRegenerate,
        child: Tooltip(
          message: 'Regenerate response',
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            child: Icon(
              Icons.refresh_rounded,
              size: 14,
              color: _isHovered ? AppTheme.primary : AppTheme.textMuted,
            ),
          ),
        ),
      ),
    );
  }
}
