import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../app/theme.dart';
import '../../providers/providers.dart';

/// Dashboard screen with modern glassmorphism design
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authNotifierProvider);
    final username = authState.maybeWhen(
      authenticated: (user, _) => user.username,
      offline: (user) => user.username,
      orElse: () => 'User',
    );
    final greeting = _getGreeting();

    return Scaffold(
      body: AnimatedGradientBackground(
        child: SafeArea(
          child: Column(
            children: [
              // Custom App Bar
              _buildAppBar(context, ref, username),

              // Content
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Welcome Section
                      _buildWelcomeSection(context, username, greeting)
                          .animate()
                          .fadeIn(duration: 500.ms)
                          .slideX(begin: -0.1, end: 0),

                      const SizedBox(height: 28),

                      // Stats Grid
                      _buildStatsGrid(context)
                          .animate()
                          .fadeIn(delay: 200.ms, duration: 500.ms)
                          .slideY(begin: 0.1, end: 0),

                      const SizedBox(height: 28),

                      // Quick Actions
                      _buildQuickActions(context)
                          .animate()
                          .fadeIn(delay: 400.ms, duration: 500.ms),

                      const SizedBox(height: 28),

                      // Recent Cases
                      _buildRecentCases(context)
                          .animate()
                          .fadeIn(delay: 600.ms, duration: 500.ms)
                          .slideY(begin: 0.1, end: 0),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  Widget _buildAppBar(BuildContext context, WidgetRef ref, String username) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(56, 12, 16, 12), // Left padding for toggle button
      child: Row(
        children: [
          const Spacer(),

              // Search button
              GestureDetector(
                onTap: () {
                  // TODO: Open search
                },
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.1),
                    ),
                  ),
                  child: const Icon(Icons.search_rounded, size: 22),
                ),
              ),

              const SizedBox(width: 12),

              // Notifications
              Stack(
                children: [
                  GestureDetector(
                    onTap: () {
                      // TODO: Show notifications
                    },
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.1),
                        ),
                      ),
                      child: const Icon(Icons.notifications_outlined, size: 22),
                    ),
                  ),
                  Positioned(
                    right: 8,
                    top: 8,
                    child: Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: AppTheme.error,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: AppTheme.background,
                          width: 2,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms);
  }

  Widget _buildWelcomeSection(
      BuildContext context, String username, String greeting) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          greeting,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppTheme.textSecondary,
              ),
        ),
        const SizedBox(height: 4),
        Row(
          children: [
            Text(
              username,
              style: GoogleFonts.playfairDisplay(
                fontSize: 28,
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              '👋',
              style: const TextStyle(fontSize: 24),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          "Here's an overview of your legal cases",
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppTheme.textSecondary,
              ),
        ),
      ],
    );
  }

  Widget _buildStatsGrid(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _StatCard(
                title: 'Active Cases',
                value: '3',
                icon: Icons.folder_open_rounded,
                gradient: const LinearGradient(
                  colors: [Color(0xFF8B5CF6), Color(0xFF6366F1)],
                ),
                onTap: () => context.push('/cases'),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _StatCard(
                title: 'Evidence Files',
                value: '12',
                icon: Icons.attach_file_rounded,
                gradient: const LinearGradient(
                  colors: [Color(0xFF10B981), Color(0xFF059669)],
                ),
                onTap: () => context.push('/evidence'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _StatCard(
                title: 'Deadlines',
                value: '5',
                icon: Icons.event_rounded,
                gradient: const LinearGradient(
                  colors: [Color(0xFFF59E0B), Color(0xFFD97706)],
                ),
                onTap: () => context.push('/timeline'),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _StatCard(
                title: 'Overdue',
                value: '1',
                icon: Icons.warning_amber_rounded,
                gradient: const LinearGradient(
                  colors: [Color(0xFFEF4444), Color(0xFFDC2626)],
                ),
                onTap: () => context.push('/timeline'),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Quick Actions',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
          ],
        ),
        const SizedBox(height: 16),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _ActionChip(
                label: 'New Case',
                icon: Icons.add_rounded,
                color: AppTheme.primary,
                onTap: () {},
              ),
              const SizedBox(width: 12),
              _ActionChip(
                label: 'Upload Evidence',
                icon: Icons.upload_file_rounded,
                color: AppTheme.success,
                onTap: () {},
              ),
              const SizedBox(width: 12),
              _ActionChip(
                label: 'AI Assistant',
                icon: Icons.smart_toy_rounded,
                color: AppTheme.info,
                onTap: () => context.push('/chat'),
              ),
              const SizedBox(width: 12),
              _ActionChip(
                label: 'Add Deadline',
                icon: Icons.event_note_rounded,
                color: AppTheme.warning,
                onTap: () {},
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildRecentCases(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Recent Cases',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            TextButton(
              onPressed: () => context.push('/cases'),
              child: Text(
                'View All',
                style: TextStyle(
                  color: AppTheme.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _CaseCard(
          title: 'Smith v. ABC Corp',
          type: 'Employment',
          status: 'Active',
          updatedAt: DateTime.now().subtract(const Duration(hours: 2)),
          onTap: () => context.push('/cases/1'),
        )
            .animate()
            .fadeIn(delay: 100.ms, duration: 300.ms)
            .slideX(begin: 0.05, end: 0),
        const SizedBox(height: 12),
        _CaseCard(
          title: 'Housing Dispute',
          type: 'Housing',
          status: 'Pending',
          updatedAt: DateTime.now().subtract(const Duration(days: 1)),
          onTap: () => context.push('/cases/2'),
        )
            .animate()
            .fadeIn(delay: 200.ms, duration: 300.ms)
            .slideX(begin: 0.05, end: 0),
        const SizedBox(height: 12),
        _CaseCard(
          title: 'Consumer Rights Claim',
          type: 'Consumer',
          status: 'In Review',
          updatedAt: DateTime.now().subtract(const Duration(days: 3)),
          onTap: () => context.push('/cases/3'),
        )
            .animate()
            .fadeIn(delay: 300.ms, duration: 300.ms)
            .slideX(begin: 0.05, end: 0),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Gradient gradient;
  final VoidCallback onTap;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.gradient,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppTheme.surfaceLight.withValues(alpha: 0.4),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: Colors.white.withValues(alpha: 0.08),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    gradient: gradient,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: Colors.white, size: 20),
                ),
                Text(
                  value,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 32,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              title,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.textSecondary,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _ActionChip({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.15),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: color.withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(width: 8),
            Text(
              label,
              style: GoogleFonts.plusJakartaSans(
                color: color,
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CaseCard extends StatelessWidget {
  final String title;
  final String type;
  final String status;
  final DateTime updatedAt;
  final VoidCallback onTap;

  const _CaseCard({
    required this.title,
    required this.type,
    required this.status,
    required this.updatedAt,
    required this.onTap,
  });

  String _formatTime(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  @override
  Widget build(BuildContext context) {
    final typeColor = AppTheme.getCaseTypeColor(type);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.surfaceLight.withValues(alpha: 0.4),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: Colors.white.withValues(alpha: 0.08),
          ),
        ),
        child: Row(
          children: [
            // Color indicator
            Container(
              width: 4,
              height: 50,
              decoration: BoxDecoration(
                color: typeColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 16),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: typeColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          type,
                          style:
                              Theme.of(context).textTheme.labelSmall?.copyWith(
                                    color: typeColor,
                                    fontWeight: FontWeight.w600,
                                  ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Icon(
                        Icons.access_time_rounded,
                        size: 14,
                        color: AppTheme.textMuted,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _formatTime(updatedAt),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: AppTheme.textMuted,
                            ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            // Status & Arrow
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppTheme.surfaceElevated,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    status,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: AppTheme.textSecondary,
                        ),
                  ),
                ),
                const SizedBox(height: 12),
                Icon(
                  Icons.arrow_forward_ios_rounded,
                  size: 16,
                  color: AppTheme.textMuted,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
