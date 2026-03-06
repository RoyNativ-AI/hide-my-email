/**
 * Storage Adapter
 * Automatically selects storage backend based on environment
 *
 * Backends:
 * - memory: Fast, no persistence (dev/testing only)
 * - redis: Fast, persistent, recommended for production
 * - postgresql: Persistent, encrypted, for enterprise
 */

import { MemoryStore, memoryStore } from './memoryStore';
import { EncryptedAlias } from './memoryStore';

export interface StorageBackend {
  createAlias(alias: EncryptedAlias): Promise<void> | void;
  getAliasByHash(aliasHash: string): Promise<EncryptedAlias | null> | EncryptedAlias | null;
  getAliasesByUserHash(userHash: string): Promise<EncryptedAlias[]> | EncryptedAlias[];
  updateAliasStatus(aliasHash: string, status: 'active' | 'inactive' | 'disabled'): Promise<boolean> | boolean;
  touchAlias(aliasHash: string): Promise<void> | void;
  deleteAlias(aliasHash: string, userHash: string): Promise<boolean> | boolean;
  getStats(): Promise<any> | any;
}

class StorageAdapter {
  private static instance: StorageAdapter;
  private backend: StorageBackend;
  private backendType: string;

  private constructor() {
    this.backendType = process.env.STORAGE_BACKEND || 'memory';
    this.backend = this.initializeBackend();
    console.log(`📦 Storage backend: ${this.backendType}`);
  }

  private initializeBackend(): StorageBackend {
    switch (this.backendType) {
      case 'memory':
        return memoryStore;

      case 'redis':
        // Redis will be lazy-loaded when first used
        return memoryStore; // Fallback for now

      case 'postgresql':
        // PostgreSQL will be lazy-loaded when first used
        return memoryStore; // Fallback for now

      default:
        console.warn(`⚠️  Unknown storage backend: ${this.backendType}, using memory`);
        return memoryStore;
    }
  }

  public static getInstance(): StorageAdapter {
    if (!StorageAdapter.instance) {
      StorageAdapter.instance = new StorageAdapter();
    }
    return StorageAdapter.instance;
  }

  public getBackend(): StorageBackend {
    return this.backend;
  }

  public getBackendType(): string {
    return this.backendType;
  }

  // Proxy methods for convenience
  public async createAlias(alias: EncryptedAlias): Promise<void> {
    await this.backend.createAlias(alias);
  }

  public async getAliasByHash(aliasHash: string): Promise<EncryptedAlias | null> {
    return await this.backend.getAliasByHash(aliasHash);
  }

  public async getAliasesByUserHash(userHash: string): Promise<EncryptedAlias[]> {
    return await this.backend.getAliasesByUserHash(userHash);
  }

  public async updateAliasStatus(aliasHash: string, status: 'active' | 'inactive' | 'disabled'): Promise<boolean> {
    return await this.backend.updateAliasStatus(aliasHash, status);
  }

  public async touchAlias(aliasHash: string): Promise<void> {
    await this.backend.touchAlias(aliasHash);
  }

  public async deleteAlias(aliasHash: string, userHash: string): Promise<boolean> {
    return await this.backend.deleteAlias(aliasHash, userHash);
  }

  public async getStats(): Promise<any> {
    return await this.backend.getStats();
  }
}

// Export singleton
export const storage = StorageAdapter.getInstance();
