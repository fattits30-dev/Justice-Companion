import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../app/theme.dart';
import '../../domain/entities/chat_entity.dart';
import '../../providers/providers.dart';

/// Provider for sidebar collapsed state
final sidebarCollapsedProvider = StateProvider<bool>((ref) => false);

/// Main shell with collapsible sidebar (Claude/ChatGPT style)
class MainShell extends ConsumerStatefulWidget {
  final Widget child;

  const MainShell({super.key, required this.child});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(conversationsNotifierProvider.notifier).loadConversations();
    });
  }

  @override
  Widget build(BuildContext context) {
    final isCollapsed = ref.watch(sidebarCollapsedProvider);
    final authState = ref.watch(authNotifierProvider);
    final username = authState.maybeWhen(
      authenticated: (user, _) => user.username,
      offline: (user) => user.username,
      orElse: () => 'User',
    );

    return Scaffold(
      body: Row(
        children: [
          // Animated collapsible sidebar
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeInOut,
            width: isCollapsed ? 0 : 260,
            child: isCollapsed
                ? const SizedBox.shrink()
                : _CollapsibleSidebar(username: username),
          ),
          // Main content with toggle button
          Expanded(
            child: Stack(
              children: [
                widget.child,
                // Floating toggle button (top-left)
                Positioned(
                  top: 12,
                  left: 12,
                  child: _SidebarToggleButton(isCollapsed: isCollapsed),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Sidebar toggle button
class _SidebarToggleButton extends ConsumerWidget {
  final bool isCollapsed;

  const _SidebarToggleButton({required this.isCollapsed});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          ref.read(sidebarCollapsedProvider.notifier).state = !isCollapsed;
        },
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppTheme.surface.withValues(alpha: 0.9),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.1),
            ),
          ),
          child: Icon(
            isCollapsed ? Icons.menu_rounded : Icons.menu_open_rounded,
            size: 20,
            color: AppTheme.textSecondary,
          ),
        ),
      ),
    ).animate().fadeIn(duration: 200.ms);
  }
}

/// Collapsible sidebar content
class _CollapsibleSidebar extends ConsumerWidget {
  final String username;

  const _CollapsibleSidebar({required this.username});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentPath = GoRouterState.of(context).uri.path;
    final conversationsState = ref.watch(conversationsNotifierProvider);
    final conversations = conversationsState.conversations;

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface, // Use theme surface color
        border: Border(
          right: BorderSide(
            color: Colors.white.withValues(alpha: 0.08),
          ),
        ),
      ),
      child: Column(
        children: [
          const SizedBox(height: 12),

          // New Chat button (prominent, like ChatGPT)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: _NewChatButton(ref: ref),
          ),

          const SizedBox(height: 12),

          // Navigation items at the top
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Column(
              children: [
                _NavItem(
                  icon: Icons.dashboard_outlined,
                  label: 'Dashboard',
                  isSelected: currentPath == '/',
                  onTap: () => context.go('/'),
                ),
                _NavItem(
                  icon: Icons.folder_outlined,
                  label: 'Cases',
                  isSelected: currentPath.startsWith('/cases'),
                  onTap: () => context.go('/cases'),
                ),
                _NavItem(
                  icon: Icons.attach_file_outlined,
                  label: 'Evidence',
                  isSelected: currentPath.startsWith('/evidence'),
                  onTap: () => context.go('/evidence'),
                ),
                _NavItem(
                  icon: Icons.schedule_outlined,
                  label: 'Timeline',
                  isSelected: currentPath.startsWith('/timeline'),
                  onTap: () => context.go('/timeline'),
                ),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // Divider
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 12),
            height: 1,
            color: Colors.white.withValues(alpha: 0.06),
          ),

          // Past chats label
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Row(
              children: [
                Text(
                  'Past chats',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Colors.white.withValues(alpha: 0.4),
                    letterSpacing: 0.3,
                  ),
                ),
              ],
            ),
          ),

          // Chat history section (middle, scrollable)
          Expanded(
            child: _ChatHistorySection(
              conversations: conversations,
              isLoading: conversationsState.isLoading,
              currentPath: currentPath,
            ),
          ),

          // Divider
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 12),
            height: 1,
            color: Colors.white.withValues(alpha: 0.06),
          ),

          // Bottom section: settings + profile
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              children: [
                _NavItem(
                  icon: Icons.settings_outlined,
                  label: 'Settings',
                  isSelected: currentPath.startsWith('/settings'),
                  onTap: () => context.go('/settings'),
                ),

                const SizedBox(height: 8),

                // Profile/Account button
                _ProfileButton(username: username, ref: ref),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// New Chat button (ChatGPT style)
class _NewChatButton extends StatelessWidget {
  final WidgetRef ref;

  const _NewChatButton({required this.ref});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          ref.read(chatNotifierProvider.notifier).clearConversation();
          context.go('/chat');
        },
        borderRadius: BorderRadius.circular(8),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.15),
            ),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              Icon(
                Icons.add_rounded,
                size: 18,
                color: AppTheme.textPrimary,
              ),
              const SizedBox(width: 10),
              Text(
                'New chat',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: AppTheme.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Chat history section
class _ChatHistorySection extends StatelessWidget {
  final List<ConversationEntity> conversations;
  final bool isLoading;
  final String currentPath;

  const _ChatHistorySection({
    required this.conversations,
    required this.isLoading,
    required this.currentPath,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(20),
          child: SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ),
      );
    }

    if (conversations.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const SizedBox(height: 20),
            Icon(
              Icons.chat_bubble_outline_rounded,
              size: 28,
              color: Colors.white.withValues(alpha: 0.2),
            ),
            const SizedBox(height: 8),
            Text(
              'No chat history',
              style: GoogleFonts.inter(
                fontSize: 13,
                color: Colors.white.withValues(alpha: 0.4),
              ),
            ),
          ],
        ),
      );
    }

    // Group conversations by date
    final today = DateTime.now();
    final yesterday = today.subtract(const Duration(days: 1));
    final lastWeek = today.subtract(const Duration(days: 7));

    final todayChats = <ConversationEntity>[];
    final yesterdayChats = <ConversationEntity>[];
    final lastWeekChats = <ConversationEntity>[];
    final olderChats = <ConversationEntity>[];

    for (final chat in conversations) {
      if (_isSameDay(chat.updatedAt, today)) {
        todayChats.add(chat);
      } else if (_isSameDay(chat.updatedAt, yesterday)) {
        yesterdayChats.add(chat);
      } else if (chat.updatedAt.isAfter(lastWeek)) {
        lastWeekChats.add(chat);
      } else {
        olderChats.add(chat);
      }
    }

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      children: [
        if (todayChats.isNotEmpty) ...[
          _DateHeader(label: 'Today'),
          ...todayChats.map((c) => _ChatItem(
                chat: c,
                isSelected: currentPath == '/chat/${c.id}',
              )),
        ],
        if (yesterdayChats.isNotEmpty) ...[
          _DateHeader(label: 'Yesterday'),
          ...yesterdayChats.map((c) => _ChatItem(
                chat: c,
                isSelected: currentPath == '/chat/${c.id}',
              )),
        ],
        if (lastWeekChats.isNotEmpty) ...[
          _DateHeader(label: 'Previous 7 Days'),
          ...lastWeekChats.map((c) => _ChatItem(
                chat: c,
                isSelected: currentPath == '/chat/${c.id}',
              )),
        ],
        if (olderChats.isNotEmpty) ...[
          _DateHeader(label: 'Older'),
          ...olderChats.map((c) => _ChatItem(
                chat: c,
                isSelected: currentPath == '/chat/${c.id}',
              )),
        ],
      ],
    );
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }
}

/// Date header for chat groups
class _DateHeader extends StatelessWidget {
  final String label;

  const _DateHeader({required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 16, 8, 6),
      child: Text(
        label,
        style: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: Colors.white.withValues(alpha: 0.4),
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}

/// Individual chat item (ChatGPT style)
class _ChatItem extends StatefulWidget {
  final ConversationEntity chat;
  final bool isSelected;

  const _ChatItem({
    required this.chat,
    required this.isSelected,
  });

  @override
  State<_ChatItem> createState() => _ChatItemState();
}

class _ChatItemState extends State<_ChatItem> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => context.go('/chat/${widget.chat.id}'),
          borderRadius: BorderRadius.circular(8),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: widget.isSelected
                  ? Colors.white.withValues(alpha: 0.08)
                  : _isHovered
                      ? Colors.white.withValues(alpha: 0.04)
                      : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.chat_bubble_outline_rounded,
                  size: 16,
                  color: Colors.white.withValues(alpha: 0.5),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    widget.chat.title,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                      color: AppTheme.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                // Show menu on hover
                if (_isHovered || widget.isSelected)
                  Icon(
                    Icons.more_horiz_rounded,
                    size: 16,
                    color: Colors.white.withValues(alpha: 0.4),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Nav item
class _NavItem extends StatefulWidget {
  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _NavItem({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  State<_NavItem> createState() => _NavItemState();
}

class _NavItemState extends State<_NavItem> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: widget.onTap,
          borderRadius: BorderRadius.circular(8),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: widget.isSelected
                  ? Colors.white.withValues(alpha: 0.08)
                  : _isHovered
                      ? Colors.white.withValues(alpha: 0.04)
                      : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(
                  widget.icon,
                  size: 18,
                  color: widget.isSelected
                      ? AppTheme.textPrimary
                      : Colors.white.withValues(alpha: 0.6),
                ),
                const SizedBox(width: 10),
                Text(
                  widget.label,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: widget.isSelected ? FontWeight.w500 : FontWeight.w400,
                    color: widget.isSelected
                        ? AppTheme.textPrimary
                        : Colors.white.withValues(alpha: 0.7),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Profile button at bottom
class _ProfileButton extends StatefulWidget {
  final String username;
  final WidgetRef ref;

  const _ProfileButton({required this.username, required this.ref});

  @override
  State<_ProfileButton> createState() => _ProfileButtonState();
}

class _ProfileButtonState extends State<_ProfileButton> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _showProfileMenu(context),
          borderRadius: BorderRadius.circular(8),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: _isHovered
                  ? Colors.white.withValues(alpha: 0.04)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                // Avatar
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    gradient: AppTheme.primaryGradient,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Center(
                    child: Text(
                      widget.username.isNotEmpty
                          ? widget.username[0].toUpperCase()
                          : 'U',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF1A1A1A),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    widget.username,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: AppTheme.textPrimary,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Icon(
                  Icons.more_horiz_rounded,
                  size: 18,
                  color: Colors.white.withValues(alpha: 0.4),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showProfileMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.surfaceElevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              width: 32,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            _MenuOption(
              icon: Icons.person_outline_rounded,
              label: 'Profile settings',
              onTap: () {
                Navigator.pop(ctx);
                context.go('/settings');
              },
            ),
            _MenuOption(
              icon: Icons.logout_rounded,
              label: 'Log out',
              isDestructive: true,
              onTap: () {
                Navigator.pop(ctx);
                widget.ref.read(authNotifierProvider.notifier).logout();
              },
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}

/// Menu option in bottom sheet
class _MenuOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool isDestructive;

  const _MenuOption({
    required this.icon,
    required this.label,
    required this.onTap,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = isDestructive ? AppTheme.error : AppTheme.textPrimary;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          child: Row(
            children: [
              Icon(icon, size: 20, color: color),
              const SizedBox(width: 14),
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
