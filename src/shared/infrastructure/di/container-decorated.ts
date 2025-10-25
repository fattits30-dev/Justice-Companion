/**
 * Decorated Container Configuration
 *
 * Example of how to integrate the decorator pattern with the DI container.
 * This demonstrates wrapping repositories with decorators for cross-cutting concerns.
 */

import 'reflect-metadata';
import { Container } from 'inversify';
import { z } from 'zod';
import { TYPES } from './types.ts';
import type {
  IDatabase,
  IEncryptionService,
  IAuditLogger,
  ICaseRepository,
  IEvidenceRepository,
  IUserRepository,
  ICacheService,
} from './interfaces.ts';

// Import implementations
import { getDb } from '../../../db/database.ts';
import { EncryptionService } from '../../../services/EncryptionService.ts';
import { AuditLogger } from '../../../services/AuditLogger.ts';
import { CacheService } from '../../../services/CacheService.ts';

// Import Repositories
import { CaseRepository } from '../../../repositories/CaseRepository.ts';
import { EvidenceRepository } from '../../../repositories/EvidenceRepository.ts';
import { UserRepository } from '../../../repositories/UserRepository.ts';

// Import Decorators
import { DecoratorFactory, DecoratorPresets } from '../../../repositories/decorators/index.ts';

// Import validation schemas
import { createCaseSchema, updateCaseSchema } from '../../../models/schemas/CaseSchemas.ts';
import { createEvidenceSchema, updateEvidenceSchema } from '../../../models/schemas/EvidenceSchemas.ts';
import { createUserSchema, updateUserSchema } from '../../../models/schemas/UserSchemas.ts';

/**
 * Enhanced container options with decorator configuration
 */
export interface DecoratedContainerOptions {
  environment?: 'production' | 'development' | 'test';
  encryptionKey?: string;
  database?: IDatabase;
  verbose?: boolean;
  enableDecorators?: boolean;
}

/**
 * Creates a container with decorated repositories
 */
export function createDecoratedContainer(options: DecoratedContainerOptions = {}): Container {
  const container = new Container({
    defaultScope: 'Singleton',
  });

  const {
    environment = 'production',
    encryptionKey,
    database,
    verbose = false,
    enableDecorators = true
  } = options;

  if (verbose) {
    console.log(`[DI] Creating decorated container for environment: ${environment}`);
  }

  // ==========================================
  // Core Infrastructure (Singleton)
  // ==========================================

  // Database
  if (database) {
    container.bind<IDatabase>(TYPES.Database).toConstantValue(database);
  } else {
    container.bind<IDatabase>(TYPES.Database).toDynamicValue(() => getDb());
  }

  // EncryptionService
  container
    .bind<IEncryptionService>(TYPES.EncryptionService)
    .toDynamicValue((): IEncryptionService => {
      const key =
        encryptionKey ||
        process.env.ENCRYPTION_KEY_BASE64 ||
        (environment === 'test'
          ? Buffer.from('test-key-for-testing-32-bytes!!!').toString('base64')
          : undefined);

      if (!key && environment !== 'test') {
        throw new Error('Encryption key is required in production/development environments');
      }

      return new EncryptionService(key!) as unknown as IEncryptionService;
    })
    .inSingletonScope();

  // AuditLogger
  container
    .bind<IAuditLogger>(TYPES.AuditLogger)
    .toDynamicValue((): IAuditLogger => {
      const db = container.get<IDatabase>(TYPES.Database);
      return new AuditLogger(db) as unknown as IAuditLogger;
    })
    .inSingletonScope();

  // CacheService
  container
    .bind<ICacheService>(TYPES.CacheService)
    .to(CacheService)
    .inSingletonScope();

  // ==========================================
  // Decorated Repositories
  // ==========================================

  if (enableDecorators) {
    // CaseRepository with full decorator stack
    container.bind<ICaseRepository>(TYPES.CaseRepository).toDynamicValue((): ICaseRepository => {
      const encryptionService = container.get<IEncryptionService>(TYPES.EncryptionService) as unknown as EncryptionService;
      const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger) as unknown as AuditLogger;

      const baseRepo = new CaseRepository(encryptionService, auditLogger);

      // Use preset based on environment
      if (environment === 'production') {
        return DecoratorPresets.production(container, baseRepo, {
          create: createCaseSchema,
          update: updateCaseSchema
        }) as unknown as ICaseRepository;
      } else if (environment === 'development') {
        return DecoratorPresets.development(container, baseRepo, {
          create: createCaseSchema,
          update: updateCaseSchema
        }) as unknown as ICaseRepository;
      } else {
        // Test environment - minimal decorators
        return DecoratorFactory.wrapRepository(container, baseRepo, {
          enableCaching: false,
          enableValidation: true,
          enableLogging: false,
          enableErrorHandling: true,
          schemas: {
            create: createCaseSchema,
            update: updateCaseSchema
          }
        }) as unknown as ICaseRepository;
      }
    }).inTransientScope();

    // EvidenceRepository with custom configuration
    container.bind<IEvidenceRepository>(TYPES.EvidenceRepository).toDynamicValue((): IEvidenceRepository => {
      const encryptionService = container.get<IEncryptionService>(TYPES.EncryptionService) as unknown as EncryptionService;
      const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger) as unknown as AuditLogger;

      const baseRepo = new EvidenceRepository(encryptionService, auditLogger);

      // Use builder pattern for custom configuration
      return DecoratorFactory
        .builder(container, baseRepo)
        .withCaching(600) // 10 minutes TTL for evidence
        .withValidation({
          create: createEvidenceSchema,
          update: updateEvidenceSchema
        })
        .withLogging({
          logReads: false, // Don't log reads for evidence (performance)
          logWrites: true,
          logErrors: true,
          logPerformance: environment === 'development',
          sensitiveFields: ['filePath', 'content']
        })
        .withErrorHandling({
          includeStackTrace: environment === 'development',
          convertToRepositoryErrors: true
        })
        .build() as unknown as IEvidenceRepository;
    }).inTransientScope();

    // UserRepository with read optimization
    container.bind<IUserRepository>(TYPES.UserRepository).toDynamicValue((): IUserRepository => {
      const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger) as unknown as AuditLogger;

      const baseRepo = new UserRepository(auditLogger);

      // Use read-optimized preset for user repository
      return DecoratorPresets.readOptimized(
        container,
        baseRepo
      ) as unknown as IUserRepository;
    }).inTransientScope();

  } else {
    // Non-decorated repositories (original implementation)
    container.bind<ICaseRepository>(TYPES.CaseRepository).toDynamicValue((): ICaseRepository => {
      const encryptionService = container.get<IEncryptionService>(TYPES.EncryptionService) as unknown as EncryptionService;
      const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger) as unknown as AuditLogger;
      return new CaseRepository(encryptionService, auditLogger) as unknown as ICaseRepository;
    }).inTransientScope();

    container.bind<IEvidenceRepository>(TYPES.EvidenceRepository).toDynamicValue((): IEvidenceRepository => {
      const encryptionService = container.get<IEncryptionService>(TYPES.EncryptionService) as unknown as EncryptionService;
      const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger) as unknown as AuditLogger;
      return new EvidenceRepository(encryptionService, auditLogger) as unknown as IEvidenceRepository;
    });

    container.bind<IUserRepository>(TYPES.UserRepository).toDynamicValue((): IUserRepository => {
      const auditLogger = container.get<IAuditLogger>(TYPES.AuditLogger) as unknown as AuditLogger;
      return new UserRepository(auditLogger) as unknown as IUserRepository;
    });
  }

  return container;
}

/**
 * Default container export with decorators enabled
 */
export const decoratedContainer = createDecoratedContainer({
  environment: process.env.NODE_ENV as 'production' | 'development' | 'test' || 'development',
  enableDecorators: true,
  verbose: process.env.DEBUG === 'true'
});