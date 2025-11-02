/**
 * Decorated Container Configuration
 *
 * Example of how to integrate the decorator pattern with the DI container.
 * This demonstrates wrapping repositories with decorators for cross-cutting concerns.
 */

import 'reflect-metadata';
import { Container } from 'inversify';
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
    console.warn(`[DI] Creating decorated container for environment: ${environment}`);
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

  // Encryption Service
  container.bind<IEncryptionService>(TYPES.EncryptionService)
    .to(EncryptionService)
    .inSingletonScope();

  // Audit Logger
  container.bind<IAuditLogger>(TYPES.AuditLogger)
    .to(AuditLogger)
    .inSingletonScope();

  // Cache Service
  container.bind<ICacheService>(TYPES.CacheService)
    .to(CacheService)
    .inSingletonScope();

  // ==========================================
  // Repositories (with optional decoration)
  // ==========================================

  // Case Repository
  if (enableDecorators) {
    container.bind<ICaseRepository>(TYPES.CaseRepository)
      .toDynamicValue(() => {
        const repo = new CaseRepository(container.get(TYPES.Database));
        return DecoratorFactory.createDecorator(
          DecoratorPresets.Logging,
          repo,
          container.get(TYPES.AuditLogger)
        );
      })
      .inSingletonScope();
  } else {
    container.bind<ICaseRepository>(TYPES.CaseRepository)
      .to(CaseRepository)
      .inSingletonScope();
  }

  // Evidence Repository
  if (enableDecorators) {
    container.bind<IEvidenceRepository>(TYPES.EvidenceRepository)
      .toDynamicValue(() => {
        const repo = new EvidenceRepository(container.get(TYPES.Database));
        return DecoratorFactory.createDecorator(
          DecoratorPresets.Logging,
          repo,
          container.get(TYPES.AuditLogger)
        );
      })
      .inSingletonScope();
  } else {
    container.bind<IEvidenceRepository>(TYPES.EvidenceRepository)
      .to(EvidenceRepository)
      .inSingletonScope();
  }

  // User Repository
  if (enableDecorators) {
    container.bind<IUserRepository>(TYPES.UserRepository)
      .toDynamicValue(() => {
        const repo = new UserRepository(container.get(TYPES.Database));
        return DecoratorFactory.createDecorator(
          DecoratorPresets.Logging,
          repo,
          container.get(TYPES.AuditLogger)
        );
      })
      .inSingletonScope();
  } else {
    container.bind<IUserRepository>(TYPES.UserRepository)
      .to(UserRepository)
      .inSingletonScope();
  }

  return container;
}