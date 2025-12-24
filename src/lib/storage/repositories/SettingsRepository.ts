/**
 * Settings Repository - Local IndexedDB Storage
 *
 * Handles app settings including PIN configuration and AI provider settings.
 * This is a key-value store, different from other entity repositories.
 */

import { /* openDatabase */ } from "../db";

/**
 * Settings keys
 */
export type SettingsKey =
  | "pin_salt"
  | "pin_verification_hash"
  | "pin_enabled"
  | "ai_provider"
  | "ai_model"
  | "theme"
  | "last_backup"
  | "data_version";

/**
 * Setting entry
 */
export interface SettingEntry {
  key: string;
  value: string;
  updatedAt: string;
}

/**
 * AI Provider configuration
 */
export interface AIProviderConfig {
  provider: "openai" | "anthropic";
  apiKey: string;
  model: string;
  enabled: boolean;
}

/**
 * Settings repository (key-value store)
 */
export class SettingsRepository {
  /**
   * Get a setting value
   */
  async get(key: SettingsKey): Promise<string | null> {
    const db = await openDatabase();
    const entry = await db.get("settings", key);
    return entry?.value ?? null;
  }

  /**
   * Set a setting value
   */
  async set(key: SettingsKey, value: string): Promise<void> {
    const db = await openDatabase();
    await db.put("settings", {
      key,
      value,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Delete a setting
   */
  async delete(key: SettingsKey): Promise<void> {
    const db = await openDatabase();
    await db.delete("settings", key);
  }

  /**
   * Get all settings
   */
  async getAll(): Promise<Record<string, string>> {
    const db = await openDatabase();
    const all = await db.getAll("settings");
    const result: Record<string, string> = {};
    for (const entry of all) {
      result[entry.key] = entry.value;
    }
    return result;
  }

  /**
   * Check if PIN is configured
   */
  async isPinConfigured(): Promise<boolean> {
    const salt = await this.get("pin_salt");
    const hash = await this.get("pin_verification_hash");
    return salt !== null && hash !== null;
  }

  /**
   * Check if PIN protection is enabled
   */
  async isPinEnabled(): Promise<boolean> {
    const enabled = await this.get("pin_enabled");
    return enabled === "true";
  }

  /**
   * Get PIN configuration
   */
  async getPinConfig(): Promise<{ salt: string; hash: string } | null> {
    const salt = await this.get("pin_salt");
    const hash = await this.get("pin_verification_hash");

    if (!salt || !hash) {
      return null;
    }

    return { salt, hash };
  }

  /**
   * Save PIN configuration
   */
  async savePinConfig(salt: string, hash: string): Promise<void> {
    await this.set("pin_salt", salt);
    await this.set("pin_verification_hash", hash);
    await this.set("pin_enabled", "true");
  }

  /**
   * Clear PIN configuration (disable PIN protection)
   */
  async clearPinConfig(): Promise<void> {
    await this.delete("pin_salt");
    await this.delete("pin_verification_hash");
    await this.set("pin_enabled", "false");
  }

  /**
   * Get current AI provider
   */
  async getAIProvider(): Promise<"openai" | "anthropic" | null> {
    const provider = await this.get("ai_provider");
    if (provider === "openai" || provider === "anthropic") {
      return provider;
    }
    return null;
  }

  /**
   * Set AI provider
   */
  async setAIProvider(provider: "openai" | "anthropic"): Promise<void> {
    await this.set("ai_provider", provider);
  }

  /**
   * Get AI model
   */
  async getAIModel(): Promise<string | null> {
    return this.get("ai_model");
  }

  /**
   * Set AI model
   */
  async setAIModel(model: string): Promise<void> {
    await this.set("ai_model", model);
  }

  /**
   * Get theme preference
   */
  async getTheme(): Promise<"light" | "dark" | "system"> {
    const theme = await this.get("theme");
    if (theme === "light" || theme === "dark" || theme === "system") {
      return theme;
    }
    return "system";
  }

  /**
   * Set theme preference
   */
  async setTheme(theme: "light" | "dark" | "system"): Promise<void> {
    await this.set("theme", theme);
  }

  /**
   * Record backup timestamp
   */
  async recordBackup(): Promise<void> {
    await this.set("last_backup", new Date().toISOString());
  }

  /**
   * Get last backup timestamp
   */
  async getLastBackup(): Promise<Date | null> {
    const timestamp = await this.get("last_backup");
    if (timestamp) {
      return new Date(timestamp);
    }
    return null;
  }
}

/**
 * Singleton instance
 */
let settingsRepositoryInstance: SettingsRepository | null = null;

export function getSettingsRepository(): SettingsRepository {
  if (!settingsRepositoryInstance) {
    settingsRepositoryInstance = new SettingsRepository();
  }
  return settingsRepositoryInstance;
}
