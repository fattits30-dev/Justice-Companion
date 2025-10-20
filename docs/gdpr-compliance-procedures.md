# GDPR Compliance Procedures - Justice Companion

**Document Version:** 1.0
**Last Updated:** 2025-10-20
**Classification:** Internal - Compliance
**Review Cycle:** Quarterly

---

## Table of Contents
1. [Overview](#overview)
2. [Data Protection Principles](#data-protection-principles)
3. [User Rights Implementation](#user-rights-implementation)
4. [Data Export Procedures (Article 20)](#data-export-procedures-article-20)
5. [Data Deletion Procedures (Article 17)](#data-deletion-procedures-article-17)
6. [Consent Management](#consent-management)
7. [Data Breach Response](#data-breach-response)
8. [Audit and Compliance](#audit-and-compliance)
9. [Technical Implementation](#technical-implementation)

---

## Overview

This document outlines the procedures for maintaining GDPR compliance in the Justice Companion application. All procedures must be followed to ensure compliance with the General Data Protection Regulation (EU) 2016/679.

### Scope
- All personal data processed by Justice Companion
- All users within the European Economic Area (EEA)
- All data controllers and processors

### Key Stakeholders
- Data Protection Officer (DPO): [To be appointed]
- Development Team: Implementation and maintenance
- Legal Team: Compliance verification
- Users: Data subjects with rights under GDPR

---

## Data Protection Principles

### 1. Lawfulness, Fairness, and Transparency
- Process data only with explicit consent
- Inform users clearly about data processing
- Maintain transparency logs

### 2. Purpose Limitation
- Collect data only for legal case management
- No secondary processing without consent
- Document all processing purposes

### 3. Data Minimization
- Collect only necessary data
- Regular reviews to remove unnecessary fields
- Anonymous analytics only

### 4. Accuracy
- Allow users to update their data
- Regular data quality checks
- Automated validation rules

### 5. Storage Limitation
- Retention periods defined per data type
- Automatic deletion after retention expires
- User-controlled deletion available

### 6. Integrity and Confidentiality
- AES-256-GCM encryption for sensitive fields
- Secure key management
- Access controls and audit logging

---

## User Rights Implementation

### Right to Access (Article 15)
Users can request all data held about them.

**Implementation:**
```typescript
// Location: Settings → Privacy → My Data
async function handleAccessRequest(userId: string) {
  // 1. Verify user identity
  const verified = await verifyUserIdentity(userId);
  if (!verified) throw new UnauthorizedError();

  // 2. Gather all user data
  const userData = await gatherUserData(userId);

  // 3. Generate report
  const report = generateAccessReport(userData);

  // 4. Log access request
  await auditLogger.log('gdpr.access', userId);

  // 5. Provide secure download
  return secureDownload(report);
}
```

### Right to Rectification (Article 16)
Users can correct inaccurate data.

**Implementation:**
- Edit profile in Settings → Account
- Update case information in Case Details
- Modify evidence in Evidence Manager
- All changes logged in audit trail

### Right to Erasure (Article 17)
Users can request deletion of their data.

**See:** [Data Deletion Procedures](#data-deletion-procedures-article-17)

### Right to Data Portability (Article 20)
Users can export data in machine-readable format.

**See:** [Data Export Procedures](#data-export-procedures-article-20)

### Right to Object (Article 21)
Users can object to specific processing.

**Implementation:**
- Granular consent controls in Settings → Privacy
- Opt-out of AI processing
- Disable analytics collection

---

## Data Export Procedures (Article 20)

### Trigger Events
- User request via Settings → GDPR → Export Data
- Account closure request
- Legal requirement
- Data portability request

### Export Process

#### Step 1: Authentication
```typescript
async function initiateDataExport(sessionId: string) {
  // Verify session
  const session = await validateSession(sessionId);
  if (!session) throw new UnauthorizedError();

  // Re-authenticate for sensitive operation
  const reauth = await requestReauthentication(session.userId);
  if (!reauth) throw new UnauthorizedError();

  return session.userId;
}
```

#### Step 2: Data Collection
```typescript
async function collectUserData(userId: string) {
  const data = {
    // User profile
    profile: await userRepository.getProfile(userId),

    // Cases (decrypted)
    cases: await caseRepository.getAllByUser(userId, { decrypt: true }),

    // Evidence (metadata only, files separate)
    evidence: await evidenceRepository.getAllByUser(userId),

    // Chat history (if consented)
    chats: await chatRepository.getHistory(userId),

    // Documents
    documents: await documentRepository.getAllByUser(userId),

    // Timeline events
    timeline: await timelineRepository.getAllByUser(userId),

    // Audit logs (user's actions only)
    auditLogs: await auditRepository.getUserLogs(userId),

    // Consent records
    consents: await consentRepository.getAll(userId)
  };

  return data;
}
```

#### Step 3: Format and Package
```typescript
async function packageExportData(data: UserData) {
  // Format as JSON (GDPR requires machine-readable)
  const jsonExport = {
    exportVersion: '1.0',
    exportDate: new Date().toISOString(),
    dataSubject: data.profile,
    legalCases: data.cases,
    evidence: data.evidence,
    communications: data.chats,
    documents: data.documents,
    timeline: data.timeline,
    auditTrail: data.auditLogs,
    consentRecords: data.consents
  };

  // Encrypt export file
  const encrypted = await encryptionService.encryptFile(
    JSON.stringify(jsonExport, null, 2)
  );

  // Create ZIP with JSON and evidence files
  const zip = await createExportZip(encrypted, data.evidence);

  return zip;
}
```

#### Step 4: Delivery
```typescript
async function deliverExport(userId: string, exportFile: Buffer) {
  // Generate secure download link (expires in 48 hours)
  const downloadLink = await generateSecureLink(exportFile, '48h');

  // Notify user
  await notificationService.send(userId, {
    type: 'gdpr.export.ready',
    message: 'Your data export is ready',
    link: downloadLink,
    expiresAt: new Date(Date.now() + 48 * 3600 * 1000)
  });

  // Log delivery
  await auditLogger.log('gdpr.export.delivered', userId);

  return downloadLink;
}
```

### Export Format Specification
```json
{
  "exportVersion": "1.0",
  "exportDate": "2025-10-20T10:00:00Z",
  "dataSubject": {
    "userId": "uuid",
    "username": "string",
    "email": "string",
    "createdAt": "datetime",
    "profile": {}
  },
  "legalCases": [
    {
      "caseId": "uuid",
      "title": "string",
      "description": "string",
      "type": "string",
      "status": "string",
      "createdAt": "datetime",
      "evidence": [],
      "timeline": []
    }
  ],
  "consentRecords": [
    {
      "type": "string",
      "granted": "boolean",
      "timestamp": "datetime",
      "version": "string"
    }
  ]
}
```

---

## Data Deletion Procedures (Article 17)

### Trigger Events
- User request via Settings → GDPR → Delete My Data
- Retention period expiration
- Withdrawal of consent
- Legal requirement

### Deletion Process

#### Step 1: Verification
```typescript
async function initiateDataDeletion(sessionId: string) {
  // Multi-factor verification for deletion
  const session = await validateSession(sessionId);
  const emailVerified = await sendDeletionEmail(session.userId);
  const confirmed = await confirmDeletionDialog();

  if (!session || !emailVerified || !confirmed) {
    throw new UnauthorizedError('Deletion verification failed');
  }

  return session.userId;
}
```

#### Step 2: Soft Delete (30-day retention)
```typescript
async function softDeleteUserData(userId: string) {
  const deletionDate = new Date();
  const retentionEnd = new Date(deletionDate);
  retentionEnd.setDate(retentionEnd.getDate() + 30);

  // Mark for deletion
  await db.transaction(async (trx) => {
    // Update user record
    await trx.update(users)
      .set({
        deletionRequested: deletionDate,
        scheduledDeletion: retentionEnd,
        active: false
      })
      .where(eq(users.id, userId));

    // Deactivate all sessions
    await trx.update(sessions)
      .set({ active: false })
      .where(eq(sessions.userId, userId));

    // Log soft deletion
    await auditLogger.logWithTrx(trx, 'gdpr.deletion.soft', userId);
  });

  // Schedule hard deletion
  await scheduleHardDeletion(userId, retentionEnd);

  return retentionEnd;
}
```

#### Step 3: Hard Delete (after retention)
```typescript
async function hardDeleteUserData(userId: string) {
  await db.transaction(async (trx) => {
    // Delete in order of dependencies

    // 1. Delete chat messages
    await trx.delete(chatMessages)
      .where(eq(chatMessages.userId, userId));

    // 2. Delete evidence
    const evidenceFiles = await trx.select()
      .from(evidence)
      .where(eq(evidence.userId, userId));

    for (const file of evidenceFiles) {
      await deletePhysicalFile(file.filePath);
    }

    await trx.delete(evidence)
      .where(eq(evidence.userId, userId));

    // 3. Delete timeline events
    await trx.delete(timelineEvents)
      .where(eq(timelineEvents.userId, userId));

    // 4. Delete legal issues
    await trx.delete(legalIssues)
      .where(eq(legalIssues.userId, userId));

    // 5. Delete cases
    await trx.delete(cases)
      .where(eq(cases.userId, userId));

    // 6. Delete user facts
    await trx.delete(userFacts)
      .where(eq(userFacts.userId, userId));

    // 7. Delete consent records
    await trx.delete(consents)
      .where(eq(consents.userId, userId));

    // 8. Anonymize audit logs (keep for legal requirements)
    await trx.update(auditLogs)
      .set({
        userId: 'DELETED_USER',
        userIdentifier: crypto.randomUUID()
      })
      .where(eq(auditLogs.userId, userId));

    // 9. Finally, delete user
    await trx.delete(users)
      .where(eq(users.id, userId));

    // Log completion
    await auditLogger.logWithTrx(trx, 'gdpr.deletion.hard', 'SYSTEM');
  });
}
```

#### Step 4: Confirmation
```typescript
async function confirmDeletion(userId: string) {
  // Send confirmation email
  await emailService.send({
    template: 'gdpr.deletion.complete',
    to: lastKnownEmail,
    subject: 'Your data has been deleted',
    data: {
      deletionDate: new Date(),
      dataCategories: [
        'Personal profile',
        'Legal cases',
        'Evidence files',
        'Chat history',
        'Documents'
      ]
    }
  });

  // Create deletion certificate
  const certificate = {
    certificateId: crypto.randomUUID(),
    userId: hashUserId(userId), // One-way hash for proof
    deletionDate: new Date(),
    dataCategories: ['profile', 'cases', 'evidence', 'chats', 'documents'],
    signature: await signDeletionCertificate(userId)
  };

  return certificate;
}
```

### Data Retention Exceptions
Some data may be retained for legal obligations:

| Data Type | Retention Period | Legal Basis |
|-----------|------------------|-------------|
| Financial records | 7 years | Tax law |
| Audit logs (anonymized) | 3 years | Security |
| Legal hold data | Until released | Court order |
| Backup data | 90 days | Recovery |

---

## Consent Management

### Consent Types
```typescript
enum ConsentType {
  DATA_PROCESSING = 'data_processing',     // Required
  ENCRYPTION = 'encryption',               // Recommended
  AI_PROCESSING = 'ai_processing',        // Optional
  ANALYTICS = 'analytics',                // Optional
  MARKETING = 'marketing'                 // Optional
}
```

### Recording Consent
```typescript
async function recordConsent(
  userId: string,
  type: ConsentType,
  granted: boolean
) {
  const consent = {
    userId,
    type,
    granted,
    timestamp: new Date(),
    ipAddress: await getClientIP(),
    version: CONSENT_VERSION,
    method: 'explicit_checkbox',
    withdrawable: true
  };

  await consentRepository.create(consent);
  await auditLogger.log('consent.recorded', userId, { type, granted });

  return consent;
}
```

### Withdrawing Consent
```typescript
async function withdrawConsent(
  userId: string,
  type: ConsentType
) {
  // Check if consent can be withdrawn
  if (type === ConsentType.DATA_PROCESSING) {
    // Cannot withdraw - required for service
    throw new Error('Cannot withdraw required consent');
  }

  // Record withdrawal
  await recordConsent(userId, type, false);

  // Apply withdrawal effects
  switch (type) {
    case ConsentType.AI_PROCESSING:
      await disableAIFeatures(userId);
      break;
    case ConsentType.ANALYTICS:
      await excludeFromAnalytics(userId);
      break;
    case ConsentType.MARKETING:
      await unsubscribeFromMarketing(userId);
      break;
  }

  return true;
}
```

---

## Data Breach Response

### Detection and Assessment (0-1 hour)
```typescript
async function handleDataBreach(breach: DataBreachEvent) {
  // 1. Assess severity
  const severity = assessBreachSeverity(breach);

  // 2. Contain breach
  await containBreach(breach);

  // 3. Preserve evidence
  await preserveEvidence(breach);

  // 4. Initial assessment
  const assessment = {
    timestamp: new Date(),
    affectedUsers: await identifyAffectedUsers(breach),
    dataTypes: identifyDataTypes(breach),
    severity,
    riskLevel: calculateRiskLevel(breach)
  };

  return assessment;
}
```

### Notification (within 72 hours)

#### Supervisory Authority Notification
```typescript
async function notifySupervisoryAuthority(assessment: BreachAssessment) {
  if (assessment.riskLevel >= RiskLevel.MEDIUM) {
    const notification = {
      incidentId: crypto.randomUUID(),
      natureOfBreach: assessment.breachType,
      categoriesOfData: assessment.dataTypes,
      approximateNumberOfSubjects: assessment.affectedUsers.length,
      categoriesOfSubjects: ['EU residents'],
      nameOfController: 'Justice Companion Ltd',
      contactDetails: DPO_CONTACT,
      likelyConsequences: assessment.consequences,
      measuresTaken: assessment.mitigation,
      crossBorderBreach: false
    };

    await sendToAuthority(ICO_API_ENDPOINT, notification);
    await auditLogger.log('gdpr.breach.authority.notified', 'SYSTEM', notification);
  }
}
```

#### User Notification
```typescript
async function notifyAffectedUsers(assessment: BreachAssessment) {
  if (assessment.riskLevel >= RiskLevel.HIGH) {
    for (const userId of assessment.affectedUsers) {
      await notificationService.send(userId, {
        type: 'security.breach',
        severity: 'high',
        subject: 'Important Security Notice',
        message: generateBreachNotification(assessment),
        recommendations: [
          'Change your password immediately',
          'Review recent account activity',
          'Enable two-factor authentication'
        ]
      });
    }
  }
}
```

---

## Audit and Compliance

### Regular Audits
- **Monthly:** Consent validity check
- **Quarterly:** Data minimization review
- **Bi-annual:** Full GDPR compliance audit
- **Annual:** Third-party security assessment

### Compliance Metrics
```typescript
interface ComplianceMetrics {
  accessRequestsHandled: number;
  averageResponseTime: number; // hours
  deletionRequestsCompleted: number;
  exportRequestsCompleted: number;
  consentWithdrawals: number;
  dataBreaches: number;
  authorityNotifications: number;
}

async function generateComplianceReport(): Promise<ComplianceMetrics> {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);

  return {
    accessRequestsHandled: await countRequests('access', startDate),
    averageResponseTime: await avgResponseTime(startDate),
    deletionRequestsCompleted: await countRequests('deletion', startDate),
    exportRequestsCompleted: await countRequests('export', startDate),
    consentWithdrawals: await countConsentChanges(false, startDate),
    dataBreaches: await countBreaches(startDate),
    authorityNotifications: await countNotifications(startDate)
  };
}
```

---

## Technical Implementation

### Database Schema Requirements
```sql
-- Consent tracking
CREATE TABLE consent_records (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  consent_type TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  timestamp TEXT NOT NULL,
  version TEXT NOT NULL,
  ip_address TEXT,
  withdrawal_timestamp TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- GDPR requests
CREATE TABLE gdpr_requests (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  request_type TEXT NOT NULL, -- 'access', 'export', 'deletion', 'rectification'
  status TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
  requested_at TEXT NOT NULL,
  completed_at TEXT,
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Deletion schedule
CREATE TABLE deletion_schedule (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  soft_deleted_at TEXT NOT NULL,
  scheduled_hard_delete TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### API Endpoints
```typescript
// GDPR-specific IPC channels
ipcMain.handle('gdpr:export', handleExportRequest);
ipcMain.handle('gdpr:delete', handleDeletionRequest);
ipcMain.handle('gdpr:access', handleAccessRequest);
ipcMain.handle('gdpr:rectify', handleRectificationRequest);
ipcMain.handle('gdpr:consent:update', handleConsentUpdate);
ipcMain.handle('gdpr:consent:list', handleConsentList);
```

### Monitoring and Alerts
```typescript
// Monitor GDPR compliance
setInterval(async () => {
  // Check pending requests > 30 days
  const overdueRequests = await checkOverdueRequests();
  if (overdueRequests.length > 0) {
    await alertDPO('Overdue GDPR requests', overdueRequests);
  }

  // Check scheduled deletions
  const pendingDeletions = await checkPendingDeletions();
  for (const deletion of pendingDeletions) {
    await hardDeleteUserData(deletion.userId);
  }

  // Generate compliance metrics
  const metrics = await generateComplianceMetrics();
  await storeMetrics(metrics);
}, 24 * 3600 * 1000); // Daily
```

---

## Appendix A: Legal References

- [GDPR Full Text](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [Article 15 - Right of access](https://gdpr-info.eu/art-15-gdpr/)
- [Article 16 - Right to rectification](https://gdpr-info.eu/art-16-gdpr/)
- [Article 17 - Right to erasure](https://gdpr-info.eu/art-17-gdpr/)
- [Article 20 - Right to data portability](https://gdpr-info.eu/art-20-gdpr/)
- [Article 21 - Right to object](https://gdpr-info.eu/art-21-gdpr/)
- [Article 32 - Security of processing](https://gdpr-info.eu/art-32-gdpr/)
- [Article 33 - Breach notification to authority](https://gdpr-info.eu/art-33-gdpr/)
- [Article 34 - Breach notification to data subject](https://gdpr-info.eu/art-34-gdpr/)

## Appendix B: Contact Information

- **Data Protection Officer**: [To be appointed]
- **Legal Team**: legal@justicecompanion.com
- **Security Team**: security@justicecompanion.com
- **ICO (UK)**: https://ico.org.uk/
- **Emergency Hotline**: [To be established]

---

**Document Review History:**
- v1.0 - Initial version (2025-10-20)
- Next review: 2025-11-20

**Approval:**
- Technical Lead: [Pending]
- Legal Counsel: [Pending]
- DPO: [To be appointed]