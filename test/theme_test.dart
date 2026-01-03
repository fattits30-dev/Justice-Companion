import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:justice_companion/app/theme.dart';

void main() {
  group('Case Type Colors', () {
    test('employment case returns violet color', () {
      expect(AppTheme.getCaseTypeColor('employment'), equals(AppTheme.caseEmployment));
    });

    test('housing case returns orange color', () {
      expect(AppTheme.getCaseTypeColor('housing'), equals(AppTheme.caseHousing));
    });

    test('consumer case returns emerald color', () {
      expect(AppTheme.getCaseTypeColor('consumer'), equals(AppTheme.caseConsumer));
    });

    test('family case returns pink color', () {
      expect(AppTheme.getCaseTypeColor('family'), equals(AppTheme.caseFamily));
    });

    test('debt case returns amber color', () {
      expect(AppTheme.getCaseTypeColor('debt'), equals(AppTheme.caseDebt));
    });

    test('unknown case type returns gray color', () {
      expect(AppTheme.getCaseTypeColor('unknown'), equals(AppTheme.caseOther));
    });

    test('case type matching is case insensitive', () {
      expect(AppTheme.getCaseTypeColor('EMPLOYMENT'), equals(AppTheme.caseEmployment));
      expect(AppTheme.getCaseTypeColor('Housing'), equals(AppTheme.caseHousing));
    });
  });

  group('Priority Colors', () {
    test('low priority returns green color', () {
      expect(AppTheme.getPriorityColor('low'), equals(AppTheme.priorityLow));
    });

    test('medium priority returns amber color', () {
      expect(AppTheme.getPriorityColor('medium'), equals(AppTheme.priorityMedium));
    });

    test('high priority returns orange color', () {
      expect(AppTheme.getPriorityColor('high'), equals(AppTheme.priorityHigh));
    });

    test('critical priority returns red color', () {
      expect(AppTheme.getPriorityColor('critical'), equals(AppTheme.priorityCritical));
    });

    test('unknown priority returns muted color', () {
      expect(AppTheme.getPriorityColor('unknown'), equals(AppTheme.textMuted));
    });

    test('priority matching is case insensitive', () {
      expect(AppTheme.getPriorityColor('LOW'), equals(AppTheme.priorityLow));
      expect(AppTheme.getPriorityColor('Critical'), equals(AppTheme.priorityCritical));
    });
  });

  group('Color Constants', () {
    test('primary colors are defined correctly', () {
      expect(AppTheme.primary, equals(const Color(0xFFD4A853)));
      expect(AppTheme.primaryDark, equals(const Color(0xFFB8923F)));
      expect(AppTheme.primaryLight, equals(const Color(0xFFE8C77B)));
    });

    test('surface colors are defined correctly', () {
      expect(AppTheme.background, equals(const Color(0xFF1A2332)));
      expect(AppTheme.surface, equals(const Color(0xFF243447)));
      expect(AppTheme.surfaceLight, equals(const Color(0xFF3D4F63)));
    });

    test('text colors are defined correctly', () {
      expect(AppTheme.textPrimary, equals(const Color(0xFFF1F5F9)));
      expect(AppTheme.textSecondary, equals(const Color(0xFF94A3B8)));
      expect(AppTheme.textMuted, equals(const Color(0xFF64748B)));
    });

    test('status colors are defined correctly', () {
      expect(AppTheme.success, equals(const Color(0xFF10B981)));
      expect(AppTheme.warning, equals(const Color(0xFFF59E0B)));
      expect(AppTheme.error, equals(const Color(0xFFEF4444)));
      expect(AppTheme.info, equals(const Color(0xFF3B82F6)));
    });

    test('case type colors are defined', () {
      expect(AppTheme.caseEmployment, equals(const Color(0xFF8B5CF6)));
      expect(AppTheme.caseHousing, equals(const Color(0xFFF97316)));
      expect(AppTheme.caseConsumer, equals(const Color(0xFF10B981)));
      expect(AppTheme.caseFamily, equals(const Color(0xFFEC4899)));
      expect(AppTheme.caseDebt, equals(const Color(0xFFF59E0B)));
      expect(AppTheme.caseOther, equals(const Color(0xFF6B7280)));
    });

    test('priority colors are defined', () {
      expect(AppTheme.priorityLow, equals(const Color(0xFF10B981)));
      expect(AppTheme.priorityMedium, equals(const Color(0xFFF59E0B)));
      expect(AppTheme.priorityHigh, equals(const Color(0xFFF97316)));
      expect(AppTheme.priorityCritical, equals(const Color(0xFFEF4444)));
    });
  });
}
