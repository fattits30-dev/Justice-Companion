import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../app/theme.dart';
import '../../../providers/providers.dart';

/// PIN setup screen with modern glassmorphism design
class PinSetupScreen extends ConsumerStatefulWidget {
  const PinSetupScreen({super.key});

  @override
  ConsumerState<PinSetupScreen> createState() => _PinSetupScreenState();
}

class _PinSetupScreenState extends ConsumerState<PinSetupScreen> {
  final _pinController = TextEditingController();
  final _confirmPinController = TextEditingController();
  final _pinFocusNode = FocusNode();
  final _confirmFocusNode = FocusNode();

  bool _isLoading = false;
  bool _isSuccess = false;
  int _step = 1; // 1 = enter PIN, 2 = confirm PIN

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _pinFocusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _pinController.dispose();
    _confirmPinController.dispose();
    _pinFocusNode.dispose();
    _confirmFocusNode.dispose();
    super.dispose();
  }

  void _handlePinCompleted(String pin) {
    if (pin.length >= 4) {
      setState(() => _step = 2);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _confirmFocusNode.requestFocus();
      });
    }
  }

  Future<void> _handleConfirmCompleted(String confirmPin) async {
    if (confirmPin != _pinController.text) {
      HapticFeedback.heavyImpact();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: const [
              Icon(Icons.error_outline, color: Colors.white),
              SizedBox(width: 12),
              Expanded(child: Text('PINs do not match. Please try again.')),
            ],
          ),
          backgroundColor: AppTheme.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(16),
        ),
      );
      setState(() {
        _step = 1;
        _pinController.clear();
        _confirmPinController.clear();
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _pinFocusNode.requestFocus();
      });
      return;
    }

    setState(() => _isLoading = true);

    final success = await ref
        .read(authNotifierProvider.notifier)
        .setupPin(_pinController.text);

    if (mounted) {
      setState(() => _isLoading = false);

      if (success) {
        HapticFeedback.mediumImpact();
        setState(() => _isSuccess = true);
      }
    }
  }

  void _handleBack() {
    if (_step == 2) {
      setState(() {
        _step = 1;
        _confirmPinController.clear();
      });
      _pinFocusNode.requestFocus();
    } else {
      context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    // Listen for errors
    ref.listen<AuthState>(authNotifierProvider, (previous, next) {
      if (next is AuthError) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(child: Text(next.message)),
              ],
            ),
            backgroundColor: AppTheme.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: const EdgeInsets.all(16),
          ),
        );
      }
    });

    return Scaffold(
      body: AnimatedGradientBackground(
        child: SafeArea(
          child: Column(
            children: [
              // Custom app bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                child: Row(
                  children: [
                    if (!_isSuccess)
                      IconButton(
                        icon: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.arrow_back_rounded, size: 20),
                        ),
                        onPressed: _isLoading ? null : _handleBack,
                      ),
                  ],
                ),
              ).animate().fadeIn(duration: 400.ms),

              // Content
              Expanded(
                child: Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 420),
                      child: _isSuccess
                          ? _buildSuccessContent()
                          : _step == 1
                              ? _buildEnterPinContent()
                              : _buildConfirmPinContent(),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEnterPinContent() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Header
        Column(
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                gradient: AppTheme.primaryGradient,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primary.withValues(alpha: 0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: const Icon(
                Icons.pin_outlined,
                size: 32,
                color: Color(0xFF1A1A1A),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Create Your PIN',
              style: GoogleFonts.playfairDisplay(
                fontSize: 28,
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Enter a 4-6 digit PIN for quick offline access',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.textSecondary,
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        )
            .animate()
            .fadeIn(duration: 500.ms)
            .slideY(begin: -0.1, end: 0),

        const SizedBox(height: 40),

        // PIN input
        GlassContainer(
          padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
          child: Column(
            children: [
              _PinInputDisplay(
                controller: _pinController,
                focusNode: _pinFocusNode,
                enabled: !_isLoading,
                onCompleted: _handlePinCompleted,
              ),
              const SizedBox(height: 28),

              // Continue button
              _buildPrimaryButton(
                label: 'Continue',
                onPressed: () => _handlePinCompleted(_pinController.text),
                enabled: _pinController.text.length >= 4,
              ),
            ],
          ),
        )
            .animate()
            .fadeIn(delay: 100.ms, duration: 500.ms)
            .slideY(begin: 0.1, end: 0),

        const SizedBox(height: 28),

        // Skip button
        GestureDetector(
          onTap: () => context.pop(),
          child: Text(
            'Skip for now',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.textSecondary,
                ),
          ),
        )
            .animate()
            .fadeIn(delay: 200.ms, duration: 400.ms),
      ],
    );
  }

  Widget _buildConfirmPinContent() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Header
        Column(
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                gradient: AppTheme.primaryGradient,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primary.withValues(alpha: 0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: const Icon(
                Icons.verified_user_outlined,
                size: 32,
                color: Color(0xFF1A1A1A),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Confirm Your PIN',
              style: GoogleFonts.playfairDisplay(
                fontSize: 28,
                fontWeight: FontWeight.w600,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Re-enter your PIN to confirm',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.textSecondary,
                  ),
              textAlign: TextAlign.center,
            ),
          ],
        )
            .animate()
            .fadeIn(duration: 500.ms)
            .slideY(begin: -0.1, end: 0),

        const SizedBox(height: 40),

        // Confirm PIN input
        GlassContainer(
          padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
          child: Column(
            children: [
              _PinInputDisplay(
                controller: _confirmPinController,
                focusNode: _confirmFocusNode,
                enabled: !_isLoading,
                onCompleted: _handleConfirmCompleted,
                pinLength: _pinController.text.length,
              ),
              const SizedBox(height: 28),

              // Confirm button
              _buildPrimaryButton(
                label: 'Set Up PIN',
                onPressed: () => _handleConfirmCompleted(_confirmPinController.text),
                isLoading: _isLoading,
                enabled: _confirmPinController.text.length == _pinController.text.length,
              ),
            ],
          ),
        )
            .animate()
            .fadeIn(delay: 100.ms, duration: 500.ms)
            .slideY(begin: 0.1, end: 0),
      ],
    );
  }

  Widget _buildSuccessContent() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Success icon
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: AppTheme.success.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Icon(
            Icons.check_circle_outline_rounded,
            size: 40,
            color: AppTheme.success,
          ),
        )
            .animate()
            .fadeIn(duration: 500.ms)
            .scale(begin: const Offset(0.8, 0.8), curve: Curves.easeOutBack),

        const SizedBox(height: 24),

        Text(
          'PIN Set Up!',
          style: GoogleFonts.playfairDisplay(
            fontSize: 28,
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimary,
          ),
        )
            .animate()
            .fadeIn(delay: 100.ms, duration: 400.ms),

        const SizedBox(height: 8),

        Text(
          'You can now use your PIN to\nquickly access the app offline',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppTheme.textSecondary,
              ),
          textAlign: TextAlign.center,
        )
            .animate()
            .fadeIn(delay: 200.ms, duration: 400.ms),

        const SizedBox(height: 32),

        // Info card
        GlassContainer(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.info.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.security_rounded,
                  color: AppTheme.info,
                  size: 20,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Text(
                  'Your PIN is stored securely on this device and never sent to our servers.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.textSecondary,
                      ),
                ),
              ),
            ],
          ),
        )
            .animate()
            .fadeIn(delay: 300.ms, duration: 500.ms)
            .slideY(begin: 0.1, end: 0),

        const SizedBox(height: 32),

        // Continue button
        SizedBox(
          width: double.infinity,
          child: _buildPrimaryButton(
            label: 'Continue',
            onPressed: () => context.go('/'),
          ),
        )
            .animate()
            .fadeIn(delay: 400.ms, duration: 400.ms),
      ],
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
}

/// PIN input display widget
class _PinInputDisplay extends StatefulWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final bool enabled;
  final void Function(String)? onCompleted;
  final int pinLength;

  const _PinInputDisplay({
    required this.controller,
    required this.focusNode,
    this.enabled = true,
    this.onCompleted,
    this.pinLength = 6,
  });

  @override
  State<_PinInputDisplay> createState() => _PinInputDisplayState();
}

class _PinInputDisplayState extends State<_PinInputDisplay> {
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
    if (widget.controller.text.length >= 4 &&
        widget.controller.text.length <= widget.pinLength) {
      // Debounce to allow user to enter more digits
      Future.delayed(const Duration(milliseconds: 500), () {
        if (widget.controller.text.length >= 4) {
          widget.onCompleted?.call(widget.controller.text);
        }
      });
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

          // Pin length indicator
          const SizedBox(height: 16),
          Text(
            '${widget.controller.text.length} / ${widget.pinLength} digits',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppTheme.textMuted,
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
