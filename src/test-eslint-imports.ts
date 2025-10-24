// Test file for ESLint import/extensions rule enforcement
// This file contains intentional errors to verify the rule works
// @ts-nocheck - This file is for ESLint testing only

// ❌ Should error - missing .ts extension
import { UserRepository } from '../repositories/UserRepository.ts';

// ✅ Should pass - correct .ts extension
import { AuditLogger } from '../services/AuditLogger.ts';

// ✅ Should pass - npm package (no extension)
import { z } from 'zod';

export const testImports = () => {
  console.log('Testing ESLint import extensions rule');
};
