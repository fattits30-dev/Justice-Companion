import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:file_picker/file_picker.dart';

import '../../../app/theme.dart';
import '../../../domain/entities/chat_entity.dart';
import '../../../providers/providers.dart';
import '../widgets/message_bubble.dart';
import '../widgets/message_input.dart';
import '../widgets/typing_indicator.dart';

/// Main chat screen with AI assistant
class ChatScreen extends ConsumerStatefulWidget {
  final int? conversationId;
  final int? caseId;

  const ChatScreen({
    super.key,
    this.conversationId,
    this.caseId,
  });

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _inputController = TextEditingController();
  final _scrollController = ScrollController();
  final _focusNode = FocusNode();
  final List<String> _attachedFiles = [];
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    // Load conversation if ID provided
    if (widget.conversationId != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref
            .read(chatNotifierProvider.notifier)
            .loadConversation(widget.conversationId!);
      });
    }
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      Future.delayed(const Duration(milliseconds: 100), () {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      });
    }
  }

  void _handleSend() {
    final message = _inputController.text.trim();
    if (message.isEmpty) return;

    _inputController.clear();

    // Clear attached files after sending (file upload not yet implemented in backend)
    setState(() => _attachedFiles.clear());

    ref.read(chatNotifierProvider.notifier).sendMessage(
          message,
          caseId: widget.caseId,
        );

    _scrollToBottom();
  }

  void _handleRegenerate(String originalMessage) {
    // Re-send the original message to regenerate response
    ref.read(chatNotifierProvider.notifier).sendMessage(
          originalMessage,
          caseId: widget.caseId,
        );
    _scrollToBottom();
  }

  void _handleCancel() {
    ref.read(chatNotifierProvider.notifier).cancelStream();
  }

  void _handleNewChat() {
    ref.read(chatNotifierProvider.notifier).clearConversation();
    _inputController.clear();
    setState(() => _attachedFiles.clear());
  }

  Future<void> _handleAttachFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'],
        allowMultiple: true,
      );

      if (result != null && result.files.isNotEmpty) {
        setState(() {
          for (final file in result.files) {
            if (file.name.isNotEmpty && !_attachedFiles.contains(file.name)) {
              _attachedFiles.add(file.name);
            }
          }
        });
      }
    } catch (e) {
      // Show error snackbar
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not attach file: $e'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    }
  }

  void _handleRemoveFile(int index) {
    setState(() {
      if (index >= 0 && index < _attachedFiles.length) {
        _attachedFiles.removeAt(index);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final chatState = ref.watch(chatNotifierProvider);
    final messages = chatState.messages;
    final isStreaming = chatState.isStreaming;
    final partialResponse = chatState.partialResponse;

    // Listen for state changes to scroll and show errors
    ref.listen<ChatState>(chatNotifierProvider, (previous, next) {
      if (next.messages.length > (previous?.messages.length ?? 0)) {
        _scrollToBottom();
      }

      // Show error snackbar
      if (next.hasError && !(previous?.hasError ?? false)) {
        final errorMessage = next.errorMessage ?? 'An error occurred';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    errorMessage,
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
              ],
            ),
            backgroundColor: AppTheme.error,
            behavior: SnackBarBehavior.floating,
            action: SnackBarAction(
              label: 'Dismiss',
              textColor: Colors.white,
              onPressed: () {
                ref.read(chatNotifierProvider.notifier).clearError();
              },
            ),
          ),
        );
      }
    });

    return Scaffold(
      key: _scaffoldKey,
      endDrawer: _buildHistoryDrawer(),
      body: AnimatedGradientBackground(
        child: SafeArea(
          child: Column(
            children: [
              // Header
              _buildHeader(context),

              // Messages list
              Expanded(
                child: messages.isEmpty && !isStreaming
                    ? _buildEmptyState(context)
                    : _buildMessagesList(
                        messages,
                        isStreaming,
                        partialResponse,
                      ),
              ),

              // Input area
              MessageInput(
                controller: _inputController,
                focusNode: _focusNode,
                enabled: chatState.canSendMessage,
                isLoading: isStreaming,
                onSend: _handleSend,
                onCancel: _handleCancel,
                onAttachFile: _handleAttachFile,
                attachedFiles: _attachedFiles,
                onRemoveFile: _handleRemoveFile,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(56, 8, 8, 8), // Left padding for toggle button
      child: Row(
        children: [
          // Title
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'AI Assistant',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
                Text(
                  'Powered by HuggingFace AI',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.textMuted,
                        fontSize: 12,
                      ),
                ),
              ],
            ),
          ),

          // History button
          IconButton(
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.history_rounded, size: 20),
            ),
            tooltip: 'Conversation history',
            onPressed: () {
              // Load conversations and open drawer
              ref.read(conversationsNotifierProvider.notifier).loadConversations();
              _scaffoldKey.currentState?.openEndDrawer();
            },
          ),

          // New chat button
          IconButton(
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.add_rounded, size: 20),
            ),
            tooltip: 'New chat',
            onPressed: _handleNewChat,
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms);
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // AI Icon
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: AppTheme.primaryGradient,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primary.withValues(alpha: 0.3),
                    blurRadius: 24,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: const Icon(
                Icons.auto_awesome_rounded,
                size: 40,
                color: Color(0xFF1A1A1A),
              ),
            )
                .animate()
                .fadeIn(duration: 500.ms)
                .scale(begin: const Offset(0.8, 0.8), curve: Curves.easeOutBack),

            const SizedBox(height: 24),

            GradientText(
              text: 'How can I help?',
              style: GoogleFonts.playfairDisplay(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.5,
              ),
              textAlign: TextAlign.center,
            ).animate().fadeIn(delay: 100.ms, duration: 400.ms),

            const SizedBox(height: 12),

            Text(
              'I can help you with case research, legal questions,\ndocument analysis, and more.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.textSecondary,
                  ),
              textAlign: TextAlign.center,
            ).animate().fadeIn(delay: 200.ms, duration: 400.ms),

            const SizedBox(height: 32),

            // Suggested prompts
            Wrap(
              spacing: 12,
              runSpacing: 12,
              alignment: WrapAlignment.center,
              children: [
                _buildSuggestionChip('Summarize my case'),
                _buildSuggestionChip('Find relevant precedents'),
                _buildSuggestionChip('Draft a motion'),
                _buildSuggestionChip('Explain legal terms'),
              ],
            ).animate().fadeIn(delay: 300.ms, duration: 400.ms),
          ],
        ),
      ),
    );
  }

  Widget _buildSuggestionChip(String text) {
    return GestureDetector(
      onTap: () {
        _inputController.text = text;
        _focusNode.requestFocus();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
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
            Icon(
              Icons.auto_awesome_rounded,
              size: 14,
              color: AppTheme.primary.withValues(alpha: 0.7),
            ),
            const SizedBox(width: 8),
            Text(
              text,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppTheme.textSecondary,
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessagesList(
    List<MessageEntity> messages,
    bool isStreaming,
    String partialResponse,
  ) {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      itemCount: messages.length + (isStreaming && partialResponse.isEmpty ? 1 : 0),
      itemBuilder: (context, index) {
        // Show typing indicator while waiting for first token
        if (index == messages.length && isStreaming && partialResponse.isEmpty) {
          return const TypingIndicator();
        }

        final message = messages[index];
        final isLastAiMessage =
            index == messages.length - 1 && message.role == MessageRole.assistant;

        // Find the previous user message for regeneration
        String? previousUserMessage;
        if (message.role == MessageRole.assistant && index > 0) {
          for (int i = index - 1; i >= 0; i--) {
            if (messages[i].role == MessageRole.user) {
              previousUserMessage = messages[i].content;
              break;
            }
          }
        }

        // Show streaming partial response for last AI message
        if (isStreaming && isLastAiMessage) {
          return MessageBubble(
            message: message,
            isStreaming: true,
            streamingText: partialResponse.isNotEmpty ? partialResponse : message.content,
            animate: index == messages.length - 1,
          );
        }

        return MessageBubble(
          message: message,
          animate: index >= messages.length - 2,
          onRegenerate: message.role == MessageRole.assistant && previousUserMessage != null
              ? () => _handleRegenerate(previousUserMessage!)
              : null,
          previousUserMessage: previousUserMessage,
        );
      },
    );
  }

  Widget _buildHistoryDrawer() {
    final conversationsState = ref.watch(conversationsNotifierProvider);
    final conversations = conversationsState.conversations;
    final isLoading = conversationsState.isLoading;

    return Drawer(
      backgroundColor: AppTheme.surface,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drawer header
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: Colors.white.withValues(alpha: 0.1),
                  ),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      gradient: AppTheme.primaryGradient,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.history_rounded,
                      color: Color(0xFF1A1A1A),
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Chat History',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                ],
              ),
            ),

            // Conversations list
            Expanded(
              child: isLoading
                  ? const Center(
                      child: CircularProgressIndicator(
                        color: AppTheme.primary,
                      ),
                    )
                  : conversations.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.chat_bubble_outline_rounded,
                                size: 48,
                                color: AppTheme.textMuted,
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'No conversations yet',
                                style: GoogleFonts.plusJakartaSans(
                                  color: AppTheme.textMuted,
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          itemCount: conversations.length,
                          itemBuilder: (context, index) {
                            final conversation = conversations[index];
                            return _buildConversationTile(conversation);
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConversationTile(ConversationEntity conversation) {
    final isCurrentConversation =
        ref.watch(chatNotifierProvider).conversationId == conversation.id;

    return Dismissible(
      key: Key('conversation_${conversation.id}'),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        color: AppTheme.error.withValues(alpha: 0.2),
        child: const Icon(
          Icons.delete_outline_rounded,
          color: AppTheme.error,
        ),
      ),
      confirmDismiss: (direction) async {
        return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            backgroundColor: AppTheme.surface,
            title: Text(
              'Delete Conversation?',
              style: GoogleFonts.plusJakartaSans(
                color: AppTheme.textPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
            content: Text(
              'This action cannot be undone.',
              style: GoogleFonts.plusJakartaSans(
                color: AppTheme.textSecondary,
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: Text(
                  'Cancel',
                  style: GoogleFonts.plusJakartaSans(
                    color: AppTheme.textSecondary,
                  ),
                ),
              ),
              TextButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: Text(
                  'Delete',
                  style: GoogleFonts.plusJakartaSans(
                    color: AppTheme.error,
                  ),
                ),
              ),
            ],
          ),
        ) ?? false;
      },
      onDismissed: (direction) {
        ref.read(conversationsNotifierProvider.notifier)
            .deleteConversation(conversation.id);
      },
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: isCurrentConversation
                ? AppTheme.primary.withValues(alpha: 0.2)
                : AppTheme.surfaceLight.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            Icons.chat_bubble_outline_rounded,
            size: 18,
            color: isCurrentConversation ? AppTheme.primary : AppTheme.textMuted,
          ),
        ),
        title: Text(
          conversation.title,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 14,
            fontWeight: isCurrentConversation ? FontWeight.w600 : FontWeight.w500,
            color: isCurrentConversation ? AppTheme.primary : AppTheme.textPrimary,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          _formatConversationDate(conversation.updatedAt),
          style: GoogleFonts.plusJakartaSans(
            fontSize: 12,
            color: AppTheme.textMuted,
          ),
        ),
        trailing: PopupMenuButton<String>(
          icon: Icon(
            Icons.more_vert_rounded,
            size: 18,
            color: AppTheme.textMuted,
          ),
          color: AppTheme.surface,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(
              color: Colors.white.withValues(alpha: 0.1),
            ),
          ),
          itemBuilder: (context) => [
            PopupMenuItem(
              value: 'rename',
              child: Row(
                children: [
                  Icon(Icons.edit_rounded, size: 18, color: AppTheme.textSecondary),
                  const SizedBox(width: 12),
                  Text(
                    'Rename',
                    style: GoogleFonts.plusJakartaSans(
                      color: AppTheme.textPrimary,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            PopupMenuItem(
              value: 'export',
              child: Row(
                children: [
                  Icon(Icons.download_rounded, size: 18, color: AppTheme.textSecondary),
                  const SizedBox(width: 12),
                  Text(
                    'Export',
                    style: GoogleFonts.plusJakartaSans(
                      color: AppTheme.textPrimary,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            const PopupMenuDivider(),
            PopupMenuItem(
              value: 'delete',
              child: Row(
                children: [
                  Icon(Icons.delete_outline_rounded, size: 18, color: AppTheme.error),
                  const SizedBox(width: 12),
                  Text(
                    'Delete',
                    style: GoogleFonts.plusJakartaSans(
                      color: AppTheme.error,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
          ],
          onSelected: (value) => _handleConversationAction(value, conversation),
        ),
        onTap: () {
          Navigator.of(context).pop(); // Close drawer
          ref.read(chatNotifierProvider.notifier)
              .loadConversation(conversation.id);
        },
      ),
    );
  }

  void _handleConversationAction(String action, ConversationEntity conversation) {
    switch (action) {
      case 'rename':
        _showRenameDialog(conversation);
        break;
      case 'export':
        _exportConversation(conversation);
        break;
      case 'delete':
        _confirmDeleteConversation(conversation);
        break;
    }
  }

  void _showRenameDialog(ConversationEntity conversation) {
    final controller = TextEditingController(text: conversation.title);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.surface,
        title: Text(
          'Rename Conversation',
          style: GoogleFonts.plusJakartaSans(
            color: AppTheme.textPrimary,
            fontWeight: FontWeight.w600,
          ),
        ),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: GoogleFonts.plusJakartaSans(color: AppTheme.textPrimary),
          decoration: InputDecoration(
            hintText: 'Enter new name',
            hintStyle: GoogleFonts.plusJakartaSans(color: AppTheme.textMuted),
            filled: true,
            fillColor: AppTheme.surfaceLight,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text(
              'Cancel',
              style: GoogleFonts.plusJakartaSans(color: AppTheme.textSecondary),
            ),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              // TODO: Implement rename API call when backend supports it
              ScaffoldMessenger.of(this.context).showSnackBar(
                SnackBar(
                  content: Text('Renamed to: ${controller.text}'),
                  backgroundColor: AppTheme.success,
                ),
              );
            },
            child: Text(
              'Rename',
              style: GoogleFonts.plusJakartaSans(color: AppTheme.primary),
            ),
          ),
        ],
      ),
    );
  }

  void _exportConversation(ConversationEntity conversation) {
    // TODO: Implement export functionality
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Export feature coming soon'),
        backgroundColor: AppTheme.info,
      ),
    );
  }

  Future<void> _confirmDeleteConversation(ConversationEntity conversation) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.surface,
        title: Text(
          'Delete Conversation?',
          style: GoogleFonts.plusJakartaSans(
            color: AppTheme.textPrimary,
            fontWeight: FontWeight.w600,
          ),
        ),
        content: Text(
          'This action cannot be undone.',
          style: GoogleFonts.plusJakartaSans(color: AppTheme.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(
              'Cancel',
              style: GoogleFonts.plusJakartaSans(color: AppTheme.textSecondary),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(
              'Delete',
              style: GoogleFonts.plusJakartaSans(color: AppTheme.error),
            ),
          ),
        ],
      ),
    ) ?? false;

    if (confirmed) {
      ref.read(conversationsNotifierProvider.notifier)
          .deleteConversation(conversation.id);
    }
  }

  String _formatConversationDate(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final conversationDate = DateTime(date.year, date.month, date.day);

    if (conversationDate == today) {
      return 'Today';
    } else if (conversationDate == today.subtract(const Duration(days: 1))) {
      return 'Yesterday';
    } else if (now.difference(date).inDays < 7) {
      final weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return weekdays[date.weekday - 1];
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }
}
