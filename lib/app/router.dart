import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/providers.dart';
import '../ui/auth/screens/login_screen.dart';
import '../ui/auth/screens/register_screen.dart';
import '../ui/auth/screens/forgot_password_screen.dart';
import '../ui/auth/screens/reset_password_screen.dart';
import '../ui/auth/screens/pin_unlock_screen.dart';
import '../ui/auth/screens/pin_setup_screen.dart';
import '../ui/chat/screens/chat_screen.dart';
import '../ui/dashboard/dashboard_screen.dart';
import '../ui/shared/main_shell.dart';

/// Route paths constants
class AppRoutes {
  // Auth routes
  static const login = '/login';
  static const register = '/register';
  static const forgotPassword = '/forgot-password';
  static const resetPassword = '/reset-password';
  static const pinUnlock = '/pin-unlock';
  static const pinSetup = '/pin-setup';

  // Main app routes
  static const dashboard = '/';
  static const cases = '/cases';
  static const caseDetail = '/cases/:id';
  static const evidence = '/evidence';
  static const chat = '/chat';
  static const timeline = '/timeline';
  static const settings = '/settings';
  static const changePassword = '/settings/change-password';

  // Helper to build case detail path
  static String caseDetailPath(int id) => '/cases/$id';
}

/// App router configuration with auth guards
final routerProvider = Provider<GoRouter>((ref) {
  // Watch auth state for redirects
  final authState = ref.watch(authNotifierProvider);

  return GoRouter(
    initialLocation: AppRoutes.login,
    debugLogDiagnostics: true,

    // Redirect based on auth state
    redirect: (context, state) {
      final currentPath = state.matchedLocation;

      // Auth routes that don't require authentication
      final authRoutes = [
        AppRoutes.login,
        AppRoutes.register,
        AppRoutes.forgotPassword,
        AppRoutes.resetPassword,
      ];

      final isAuthRoute = authRoutes.any((route) => currentPath.startsWith(route));
      final isPinUnlockRoute = currentPath == AppRoutes.pinUnlock;

      // Handle different auth states
      return authState.when(
        initial: () => null, // Wait for auth check
        loading: () => null, // Wait for auth operation

        authenticated: (user, session) {
          // If on auth route, redirect to dashboard
          if (isAuthRoute || isPinUnlockRoute) {
            return AppRoutes.dashboard;
          }
          return null;
        },

        unauthenticated: () {
          // If on protected route, redirect to login
          if (!isAuthRoute) {
            return AppRoutes.login;
          }
          return null;
        },

        pinLocked: () {
          // If PIN locked, go to unlock screen
          if (!isPinUnlockRoute) {
            return AppRoutes.pinUnlock;
          }
          return null;
        },

        offline: (user) {
          // In offline mode, allow access to main routes
          if (isAuthRoute || isPinUnlockRoute) {
            return AppRoutes.dashboard;
          }
          return null;
        },

        error: (message, code) {
          // On error, go to login
          if (!isAuthRoute) {
            return AppRoutes.login;
          }
          return null;
        },
      );
    },

    routes: [
      // ============ Auth Routes ============
      GoRoute(
        path: AppRoutes.login,
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.register,
        name: 'register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: AppRoutes.forgotPassword,
        name: 'forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: AppRoutes.resetPassword,
        name: 'reset-password',
        builder: (context, state) {
          final token = state.uri.queryParameters['token'];
          return ResetPasswordScreen(token: token);
        },
      ),
      GoRoute(
        path: AppRoutes.pinUnlock,
        name: 'pin-unlock',
        builder: (context, state) => const PinUnlockScreen(),
      ),
      GoRoute(
        path: AppRoutes.pinSetup,
        name: 'pin-setup',
        builder: (context, state) => const PinSetupScreen(),
      ),

      // ============ Main App Routes (Authenticated with persistent sidebar) ============
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: AppRoutes.dashboard,
            name: 'dashboard',
            builder: (context, state) => const DashboardScreen(),
          ),
          // Cases
          GoRoute(
            path: '/cases',
            name: 'cases',
            builder: (context, state) => const Scaffold(
              body: Center(child: Text('Cases Screen - Coming Soon')),
            ),
          ),
          GoRoute(
            path: '/cases/:id',
            name: 'case-detail',
            builder: (context, state) {
              final id = state.pathParameters['id']!;
              return Scaffold(
                body: Center(child: Text('Case Detail: $id - Coming Soon')),
              );
            },
          ),

          // Evidence
          GoRoute(
            path: '/evidence',
            name: 'evidence',
            builder: (context, state) => const Scaffold(
              body: Center(child: Text('Evidence Screen - Coming Soon')),
            ),
          ),

          // Chat
          GoRoute(
            path: '/chat',
            name: 'chat',
            builder: (context, state) {
              final caseId = state.uri.queryParameters['caseId'];
              return ChatScreen(
                caseId: caseId != null ? int.tryParse(caseId) : null,
              );
            },
          ),
          GoRoute(
            path: '/chat/:conversationId',
            name: 'chat-conversation',
            builder: (context, state) {
              final conversationId = state.pathParameters['conversationId']!;
              final caseId = state.uri.queryParameters['caseId'];
              return ChatScreen(
                conversationId: int.parse(conversationId),
                caseId: caseId != null ? int.tryParse(caseId) : null,
              );
            },
          ),

          // Timeline
          GoRoute(
            path: '/timeline',
            name: 'timeline',
            builder: (context, state) => const Scaffold(
              body: Center(child: Text('Timeline - Coming Soon')),
            ),
          ),

          // Settings
          GoRoute(
            path: '/settings',
            name: 'settings',
            builder: (context, state) => const Scaffold(
              body: Center(child: Text('Settings - Coming Soon')),
            ),
          ),
          GoRoute(
            path: '/settings/change-password',
            name: 'change-password',
            builder: (context, state) => const Scaffold(
              body: Center(child: Text('Change Password - Coming Soon')),
            ),
          ),
        ],
      ),
    ],

    // Error page
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text('Page not found: ${state.uri}'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => context.go(AppRoutes.dashboard),
              child: const Text('Go Home'),
            ),
          ],
        ),
      ),
    ),
  );
});

/// Extension for easier navigation
extension GoRouterExtension on BuildContext {
  void goToCaseDetail(int id) => go(AppRoutes.caseDetailPath(id));
  void goToLogin() => go(AppRoutes.login);
  void goToRegister() => go(AppRoutes.register);
  void goToDashboard() => go(AppRoutes.dashboard);
  void goToForgotPassword() => go(AppRoutes.forgotPassword);
  void goToResetPassword(String token) =>
      go('${AppRoutes.resetPassword}?token=$token');
  void goToPinSetup() => go(AppRoutes.pinSetup);
}
