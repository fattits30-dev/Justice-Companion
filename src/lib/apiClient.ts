/**
 * API Client - Backward Compatibility Re-export
 *
 * This file maintains backward compatibility by re-exporting from the modular API structure.
 * All imports from './lib/apiClient' will continue to work.
 */

export {
  apiClient,
  ApiClientCombined as ApiClient,
  ApiError,
  type ApiResponse,
  type PaginatedResponse,
  type ApiClientConfig,
} from './api/index.ts';

export { default } from './api/index.ts';
