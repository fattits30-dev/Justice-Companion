import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../app/theme.dart';
import '../../../providers/providers.dart';

/// PIN unlock screen with modern glassmorphism design
class PinUnlockScreen extends ConsumerStatefulWidget {
  const PinUnlockScreen({super.key});

  @override
  ConsumerState<PinUnlockScreen> createState() => _PinUnlockScreenState();
}

class _PinUnlockScreenState extends ConsumerState<PinUnlockScreen> {
  final _pinController = TextEditingController();
  final _focusNode = FocusNode();
  bool _isLoading = false;
  int _attempts = 0;
  static const int _maxAttempts = 5;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _pinController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _handleUnlock() async {
    if (_pinController.text.length < 4) return;

    setState(() => _isLoading = true);

    await ref
        .read(authNotifierProvider.notifier)
        .unlockWithPin(_pinController.text);

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  void _handleLoginInstead() {
    // Clear auth state and go to login
    ref.read(authNotifierProvider.notifier).logout();
    context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);
    final isLoading = authState is AuthLoading || _isLoading;

    // Listen for errors
    ref.listen<AuthState>(authNotifierProvider, (previous, next) {
      if (next is AuthError) {
        setState(() {
          _attempts++;
          _pinController.clear();
        });

        // Haptic feedback on error
        HapticFeedback.heavyImpact();

        if (_attempts >= _maxAttempts) {
          // Too many attempts - force login
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: const [
                  Icon(Icons.error_outline, color: Colors.white),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text('Too many attempts. Please sign in again.'),
                  ),
                ],
              ),
              backgroundColor: AppTheme.error,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              margin: const EdgeInsets.all(16),
            ),
          );
          _handleLoginInstead();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.error_outline, color: Colors.white),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      '${next.message} (${_maxAttempts - _attempts} attempts remaining)',
                    ),
                  ),
                ],
              ),
              backgroundColor: AppTheme.error,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              margin: const EdgeInsets.all(16),
            ),
          );
        }
      }
    });

    return Scaffold(
      body: AnimatedGradientBackground(
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Header
                    Column(
                          children: [
                            Container(
                              width: 80,
                              height: 80,
                              decoration: BoxDecoration(
                                gradient: AppTheme.primaryGradient,
                                borderRadius: BorderRadius.circular(20),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppTheme.primary.withValues(
                                      alpha: 0.3,
                                    ),
                                    blurRadius: 24,
                                    offset: const Offset(0, 8),
                                  ),
                                ],
                              ),
                              child: const Icon(
                                Icons.lock_outline_rounded,
                                size: 40,
                                color: Color(0xFF1A1A1A),
                              ),
                            ),
                            const SizedBox(height: 24),
                            GradientText(
                              text: 'Welcome Back',
                              style: GoogleFonts.playfairDisplay(
                                fontSize: 32,
                                fontWeight: FontWeight.w700,
                                letterSpacing: -1,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Enter your PIN to unlock',
                              style: Theme.of(context).textTheme.bodyMedium
                                  ?.copyWith(color: AppTheme.textSecondary),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        )
                        .animate()
                        .fadeIn(duration: 600.ms)
                        .slideY(begin: -0.1, end: 0),

                    const SizedBox(height: 40),

                    // PIN input card
                    GlassContainer(
                          padding: const EdgeInsets.symmetric(
                            vertical: 32,
                            horizontal: 24,
                          ),
                          child: Column(
                            children: [
                              _PinInput(
                                controller: _pinController,
                                focusNode: _focusNode,
                                enabled: !isLoading,
                                onCompleted: (_) => _handleUnlock(),
                              ),
                              const SizedBox(height: 28),

                              // Unlock button
                              _buildPrimaryButton(
                                label: 'Unlock',
                                onPressed: _handleUnlock,
                                isLoading: isLoading,
                                enabled: _pinController.text.length >= 4,
                              ),
                            ],
                          ),
                        )
                        .animate()
                        .fadeIn(delay: 100.ms, duration: 500.ms)
                        .slideY(begin: 0.1, end: 0),

                    const SizedBox(height: 24),

                    // Divider
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            height: 1,
                            color: Colors.white.withValues(alpha: 0.1),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: Text(
                            'or',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ),
                        Expanded(
                          child: Container(
                            height: 1,
                            color: Colors.white.withValues(alpha: 0.1),
                          ),
                        ),
                      ],
                    ).animate().fadeIn(delay: 200.ms, duration: 400.ms),

                    const SizedBox(height: 24),

                    // Login instead
                    _buildSecondaryButton(
                      label: 'Sign In with Password',
                      icon: Icons.login_rounded,
                      onPressed: isLoading ? null : _handleLoginInstead,
                    ).animate().fadeIn(delay: 300.ms, duration: 400.ms),

                    const SizedBox(height: 16),

                    // Attempts remaining indicator
                    if (_attempts > 0)
                      Text(
                        '${_maxAttempts - _attempts} attempts remaining',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: _attempts >= 3
                              ? AppTheme.warning
                              : AppTheme.textMuted,
                        ),
                      ).animate().fadeIn(duration: 300.ms),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPrimaryButton({
    required String label,
    required VoidCallback onPressed,
    bool isLoading = false,
    bool enabled = true,
  }) {
    return Container(
      height: 56,
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: enabled ? AppTheme.primaryGradient : null,
        color: enabled ? null : AppTheme.surfaceLight,
        borderRadius: BorderRadius.circular(14),
        boxShadow: enabled
            ? [
                BoxShadow(
                  color: AppTheme.primary.withValues(alpha: 0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: ElevatedButton(
        onPressed: (!enabled || isLoading) ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
        child: isLoading
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: Color(0xFF1A1A1A),
                ),
              )
            : Text(
                label,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: enabled ? const Color(0xFF1A1A1A) : AppTheme.textMuted,
                ),
              ),
      ),
    );
  }

  Widget _buildSecondaryButton({
    required String label,
    required IconData icon,
    VoidCallback? onPressed,
  }) {
    return SizedBox(
      height: 56,
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, size: 20),
        label: Text(label),
        style: OutlinedButton.styleFrom(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
    );
  }
}

/// PIN input widget with individual digit boxes
class _PinInput extends StatefulWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final bool enabled;
  final void Function(String)? onCompleted;
  final int pinLength;

  const _PinInput({
    required this.controller,
    required this.focusNode,
    this.enabled = true,
    this.onCompleted,
    this.pinLength = 4,
  });

  @override
  State<_PinInput> createState() => _PinInputState();
}

class _PinInputState extends State<_PinInput> {
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onTextChanged);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onTextChanged);
    super.dispose();
  }

  void _onTextChanged() {
    setState(() {});
    if (widget.controller.text.length >= 4) {
      widget.onCompleted?.call(widget.controller.text);
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => widget.focusNode.requestFocus(),
      child: Column(
        children: [
          // Hidden text field for input
          SizedBox(
            height: 0,
            child: TextField(
              controller: widget.controller,
              focusNode: widget.focusNode,
              keyboardType: TextInputType.number,
              inputFormatters: [
                FilteringTextInputFormatter.digitsOnly,
                LengthLimitingTextInputFormatter(widget.pinLength),
              ],
              enabled: widget.enabled,
              obscureText: true,
              autofocus: true,
              decoration: const InputDecoration(border: InputBorder.none),
            ),
          ),

          // Visual PIN display
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              widget.pinLength,
              (index) => _buildPinDigit(index),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPinDigit(int index) {
    final isActive = widget.controller.text.length == index;
    final isFilled = widget.controller.text.length > index;

    return Container(
      width: 44,
      height: 56,
      margin: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        color: AppTheme.surfaceLight.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isActive
              ? AppTheme.primary
              : isFilled
              ? AppTheme.primary.withValues(alpha: 0.5)
              : Colors.white.withValues(alpha: 0.1),
          width: isActive ? 2 : 1,
        ),
        boxShadow: isActive
            ? [
                BoxShadow(
                  color: AppTheme.primary.withValues(alpha: 0.2),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ]
            : null,
      ),
      child: Center(
        child: isFilled
            ? Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(
                  gradient: AppTheme.primaryGradient,
                  shape: BoxShape.circle,
                ),
              )
            : null,
      ),
    );
  }
}
