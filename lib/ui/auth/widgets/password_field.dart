import 'package:flutter/material.dart';
import '../../../app/theme.dart';
import 'auth_text_field.dart';

/// Password field with visibility toggle
class PasswordField extends StatefulWidget {
  final TextEditingController? controller;
  final String label;
  final String? hint;
  final String? Function(String?)? validator;
  final void Function(String)? onChanged;
  final void Function(String)? onSubmitted;
  final TextInputAction? textInputAction;
  final bool autofocus;
  final bool enabled;
  final FocusNode? focusNode;
  final bool showStrengthIndicator;

  const PasswordField({
    super.key,
    this.controller,
    this.label = 'Password',
    this.hint,
    this.validator,
    this.onChanged,
    this.onSubmitted,
    this.textInputAction,
    this.autofocus = false,
    this.enabled = true,
    this.focusNode,
    this.showStrengthIndicator = false,
  });

  @override
  State<PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<PasswordField> {
  bool _obscureText = true;
  String _password = '';

  @override
  void initState() {
    super.initState();
    _password = widget.controller?.text ?? '';
    widget.controller?.addListener(_onPasswordChanged);
  }

  @override
  void dispose() {
    widget.controller?.removeListener(_onPasswordChanged);
    super.dispose();
  }

  void _onPasswordChanged() {
    setState(() {
      _password = widget.controller?.text ?? '';
    });
  }

  void _toggleVisibility() {
    setState(() {
      _obscureText = !_obscureText;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AuthTextField(
          controller: widget.controller,
          label: widget.label,
          hint: widget.hint,
          prefixIcon: Icons.lock_outline,
          obscureText: _obscureText,
          textInputAction: widget.textInputAction,
          validator: widget.validator,
          onChanged: (value) {
            setState(() => _password = value);
            widget.onChanged?.call(value);
          },
          onSubmitted: widget.onSubmitted,
          autofocus: widget.autofocus,
          enabled: widget.enabled,
          focusNode: widget.focusNode,
          suffix: IconButton(
            icon: Icon(
              _obscureText ? Icons.visibility_outlined : Icons.visibility_off_outlined,
              color: AppTheme.textSecondary,
              size: 20,
            ),
            onPressed: widget.enabled ? _toggleVisibility : null,
            splashRadius: 20,
          ),
        ),
        if (widget.showStrengthIndicator && _password.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: _PasswordStrengthIndicator(password: _password),
          ),
      ],
    );
  }
}

/// Password strength indicator
class _PasswordStrengthIndicator extends StatelessWidget {
  final String password;

  const _PasswordStrengthIndicator({required this.password});

  @override
  Widget build(BuildContext context) {
    final strength = _calculateStrength();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: LinearProgressIndicator(
                value: strength.value,
                backgroundColor: AppTheme.surfaceLight,
                valueColor: AlwaysStoppedAnimation<Color>(strength.color),
                minHeight: 4,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 12),
            Text(
              strength.label,
              style: TextStyle(
                color: strength.color,
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        if (!strength.isValid)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              'Must be 12+ chars with uppercase, lowercase, and number',
              style: TextStyle(
                color: AppTheme.textMuted,
                fontSize: 11,
              ),
            ),
          ),
      ],
    );
  }

  _PasswordStrength _calculateStrength() {
    if (password.isEmpty) {
      return _PasswordStrength.none;
    }

    int score = 0;

    // Length checks
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;

    // Character type checks
    if (password.contains(RegExp(r'[a-z]'))) score++;
    if (password.contains(RegExp(r'[A-Z]'))) score++;
    if (password.contains(RegExp(r'[0-9]'))) score++;
    if (password.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]'))) score++;

    if (score <= 2) return _PasswordStrength.weak;
    if (score <= 4) return _PasswordStrength.fair;
    if (score <= 6) return _PasswordStrength.good;
    return _PasswordStrength.strong;
  }
}

enum _PasswordStrength {
  none(0.0, 'Too short', AppTheme.textMuted, false),
  weak(0.25, 'Weak', AppTheme.error, false),
  fair(0.5, 'Fair', AppTheme.warning, false),
  good(0.75, 'Good', AppTheme.info, true),
  strong(1.0, 'Strong', AppTheme.success, true);

  final double value;
  final String label;
  final Color color;
  final bool isValid;

  const _PasswordStrength(this.value, this.label, this.color, this.isValid);
}

/// Validators for password fields
class PasswordValidators {
  /// Validate password meets requirements
  static String? validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Password is required';
    }
    if (value.length < 12) {
      return 'Password must be at least 12 characters';
    }
    if (!value.contains(RegExp(r'[a-z]'))) {
      return 'Password must contain a lowercase letter';
    }
    if (!value.contains(RegExp(r'[A-Z]'))) {
      return 'Password must contain an uppercase letter';
    }
    if (!value.contains(RegExp(r'[0-9]'))) {
      return 'Password must contain a number';
    }
    return null;
  }

  /// Create a confirm password validator
  static String? Function(String?) confirmPassword(TextEditingController passwordController) {
    return (String? value) {
      if (value == null || value.isEmpty) {
        return 'Please confirm your password';
      }
      if (value != passwordController.text) {
        return 'Passwords do not match';
      }
      return null;
    };
  }
}
