import 'package:flutter_test/flutter_test.dart';

import 'package:justice_companion/domain/enums/case_enums.dart';
import 'package:justice_companion/domain/entities/case_entity.dart';
import 'package:justice_companion/domain/entities/evidence_entity.dart';
import 'package:justice_companion/domain/entities/deadline_entity.dart';
import 'package:justice_companion/domain/entities/user_entity.dart';

void main() {
  group('CaseType Enum', () {
    test('has all expected values', () {
      expect(CaseType.values.length, equals(6));
      expect(CaseType.values, contains(CaseType.employment));
      expect(CaseType.values, contains(CaseType.housing));
      expect(CaseType.values, contains(CaseType.consumer));
      expect(CaseType.values, contains(CaseType.family));
      expect(CaseType.values, contains(CaseType.debt));
      expect(CaseType.values, contains(CaseType.other));
    });

    test('displayName returns correct values', () {
      expect(CaseType.employment.displayName, equals('Employment'));
      expect(CaseType.housing.displayName, equals('Housing'));
      expect(CaseType.consumer.displayName, equals('Consumer'));
      expect(CaseType.family.displayName, equals('Family'));
      expect(CaseType.debt.displayName, equals('Debt'));
      expect(CaseType.other.displayName, equals('Other'));
    });

    test('fromString parses correctly', () {
      expect(CaseType.fromString('employment'), equals(CaseType.employment));
      expect(CaseType.fromString('unknown'), equals(CaseType.other));
    });
  });

  group('CaseStatus Enum', () {
    test('has all expected values', () {
      expect(CaseStatus.values.length, equals(3));
      expect(CaseStatus.values, contains(CaseStatus.active));
      expect(CaseStatus.values, contains(CaseStatus.pending));
      expect(CaseStatus.values, contains(CaseStatus.closed));
    });

    test('displayName returns correct values', () {
      expect(CaseStatus.active.displayName, equals('Active'));
      expect(CaseStatus.pending.displayName, equals('Pending'));
      expect(CaseStatus.closed.displayName, equals('Closed'));
    });
  });

  group('EvidenceType Enum', () {
    test('has all expected values', () {
      expect(EvidenceType.values.length, equals(6));
      expect(EvidenceType.values, contains(EvidenceType.document));
      expect(EvidenceType.values, contains(EvidenceType.photo));
      expect(EvidenceType.values, contains(EvidenceType.email));
      expect(EvidenceType.values, contains(EvidenceType.recording));
      expect(EvidenceType.values, contains(EvidenceType.note));
      expect(EvidenceType.values, contains(EvidenceType.witness));
    });

    test('displayName returns correct values', () {
      expect(EvidenceType.document.displayName, equals('Document'));
      expect(EvidenceType.photo.displayName, equals('Photo'));
      expect(EvidenceType.email.displayName, equals('Email'));
      expect(EvidenceType.recording.displayName, equals('Recording'));
      expect(EvidenceType.note.displayName, equals('Note'));
      expect(EvidenceType.witness.displayName, equals('Witness'));
    });

    test('icon returns correct values', () {
      expect(EvidenceType.document.icon, equals('file-text'));
      expect(EvidenceType.photo.icon, equals('image'));
      expect(EvidenceType.email.icon, equals('mail'));
    });
  });

  group('DeadlinePriority Enum', () {
    test('has all expected values', () {
      expect(DeadlinePriority.values.length, equals(4));
      expect(DeadlinePriority.values, contains(DeadlinePriority.low));
      expect(DeadlinePriority.values, contains(DeadlinePriority.medium));
      expect(DeadlinePriority.values, contains(DeadlinePriority.high));
      expect(DeadlinePriority.values, contains(DeadlinePriority.critical));
    });

    test('displayName returns correct values', () {
      expect(DeadlinePriority.low.displayName, equals('Low'));
      expect(DeadlinePriority.medium.displayName, equals('Medium'));
      expect(DeadlinePriority.high.displayName, equals('High'));
      expect(DeadlinePriority.critical.displayName, equals('Critical'));
    });
  });

  group('DeadlineStatus Enum', () {
    test('has all expected values', () {
      expect(DeadlineStatus.values.length, equals(3));
      expect(DeadlineStatus.values, contains(DeadlineStatus.upcoming));
      expect(DeadlineStatus.values, contains(DeadlineStatus.overdue));
      expect(DeadlineStatus.values, contains(DeadlineStatus.completed));
    });

    test('displayName returns correct values', () {
      expect(DeadlineStatus.upcoming.displayName, equals('Upcoming'));
      expect(DeadlineStatus.overdue.displayName, equals('Overdue'));
      expect(DeadlineStatus.completed.displayName, equals('Completed'));
    });
  });

  group('CaseEntity', () {
    test('can be created with required fields', () {
      final now = DateTime.now();
      final caseEntity = CaseEntity(
        id: 1,
        userId: 1,
        title: 'Test Case',
        caseType: CaseType.employment,
        status: CaseStatus.active,
        createdAt: now,
        updatedAt: now,
      );

      expect(caseEntity.id, equals(1));
      expect(caseEntity.title, equals('Test Case'));
      expect(caseEntity.caseType, equals(CaseType.employment));
      expect(caseEntity.status, equals(CaseStatus.active));
    });

    test('equality works correctly', () {
      final now = DateTime.now();
      final case1 = CaseEntity(
        id: 1,
        userId: 1,
        title: 'Test Case',
        caseType: CaseType.employment,
        status: CaseStatus.active,
        createdAt: now,
        updatedAt: now,
      );
      final case2 = CaseEntity(
        id: 1,
        userId: 1,
        title: 'Test Case',
        caseType: CaseType.employment,
        status: CaseStatus.active,
        createdAt: now,
        updatedAt: now,
      );

      expect(case1, equals(case2));
    });

    test('copyWith works correctly', () {
      final now = DateTime.now();
      final original = CaseEntity(
        id: 1,
        userId: 1,
        title: 'Original Title',
        caseType: CaseType.employment,
        status: CaseStatus.active,
        createdAt: now,
        updatedAt: now,
      );

      final modified = original.copyWith(title: 'New Title');

      expect(modified.title, equals('New Title'));
      expect(modified.id, equals(original.id));
      expect(modified.caseType, equals(original.caseType));
    });
  });

  group('EvidenceEntity', () {
    test('can be created with required fields', () {
      final now = DateTime.now();
      final evidence = EvidenceEntity(
        id: 1,
        caseId: 1,
        title: 'Test Evidence',
        evidenceType: EvidenceType.document,
        createdAt: now,
        updatedAt: now,
      );

      expect(evidence.id, equals(1));
      expect(evidence.title, equals('Test Evidence'));
      expect(evidence.evidenceType, equals(EvidenceType.document));
    });

    test('optional fields work correctly', () {
      final now = DateTime.now();
      final evidence = EvidenceEntity(
        id: 1,
        caseId: 1,
        title: 'Test Evidence',
        evidenceType: EvidenceType.document,
        filePath: '/path/to/file.pdf',
        content: 'Some content',
        obtainedDate: now,
        createdAt: now,
        updatedAt: now,
      );

      expect(evidence.filePath, equals('/path/to/file.pdf'));
      expect(evidence.content, equals('Some content'));
      expect(evidence.obtainedDate, equals(now));
    });
  });

  group('DeadlineEntity', () {
    test('can be created with required fields', () {
      final now = DateTime.now();
      final dueDate = now.add(const Duration(days: 7));
      final deadline = DeadlineEntity(
        id: 1,
        caseId: 1,
        userId: 1,
        title: 'File Motion',
        deadlineDate: dueDate,
        priority: DeadlinePriority.high,
        status: DeadlineStatus.upcoming,
        createdAt: now,
        updatedAt: now,
      );

      expect(deadline.id, equals(1));
      expect(deadline.title, equals('File Motion'));
      expect(deadline.priority, equals(DeadlinePriority.high));
      expect(deadline.status, equals(DeadlineStatus.upcoming));
    });
  });

  group('UserEntity', () {
    test('can be created with required fields', () {
      final now = DateTime.now();
      final user = UserEntity(
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        createdAt: now,
      );

      expect(user.id, equals(1));
      expect(user.username, equals('testuser'));
      expect(user.email, equals('test@example.com'));
    });

    test('optional name fields work', () {
      final now = DateTime.now();
      final userWithName = UserEntity(
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: now,
      );

      expect(userWithName.firstName, equals('John'));
      expect(userWithName.lastName, equals('Doe'));
    });

    test('default values are applied', () {
      final now = DateTime.now();
      final user = UserEntity(
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        createdAt: now,
      );

      expect(user.role, equals('user'));
      expect(user.isActive, isTrue);
    });
  });

  group('SessionEntity', () {
    test('can be created with required fields', () {
      final now = DateTime.now();
      final expiresAt = now.add(const Duration(days: 30));
      final session = SessionEntity(
        id: 'sess-1',
        userId: 1,
        expiresAt: expiresAt,
      );

      expect(session.id, equals('sess-1'));
      expect(session.userId, equals(1));
      expect(session.expiresAt, equals(expiresAt));
    });

    test('default values are applied', () {
      final now = DateTime.now();
      final session = SessionEntity(
        id: 'sess-1',
        userId: 1,
        expiresAt: now.add(const Duration(hours: 1)),
      );

      expect(session.rememberMe, isFalse);
    });
  });

  group('CaseCreate', () {
    test('can be created with required fields', () {
      final input = CaseCreate(
        title: 'New Case',
        caseType: CaseType.housing,
      );

      expect(input.title, equals('New Case'));
      expect(input.caseType, equals(CaseType.housing));
      expect(input.status, equals(CaseStatus.active)); // default
    });
  });

  group('LoginInput', () {
    test('can be created with required fields', () {
      final input = LoginInput(
        identifier: 'user@example.com',
        password: 'password123',
      );

      expect(input.identifier, equals('user@example.com'));
      expect(input.password, equals('password123'));
      expect(input.rememberMe, isFalse); // default
    });
  });
}
