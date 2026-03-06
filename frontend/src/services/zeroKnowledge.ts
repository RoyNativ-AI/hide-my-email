/**
 * Zero-Knowledge Client-Side Encryption
 *
 * Privacy Principles:
 * 1. All encryption happens in browser
 * 2. Server never sees plaintext
 * 3. Master key derived from password (never sent to server)
 * 4. Server stores only encrypted blobs
 * 5. No recovery if password lost - by design!
 */

import { Buffer } from 'buffer';

export class ZeroKnowledgeCrypto {
  private masterKey: CryptoKey | null = null;
  private static instance: ZeroKnowledgeCrypto;

  private constructor() {}

  public static getInstance(): ZeroKnowledgeCrypto {
    if (!ZeroKnowledgeCrypto.instance) {
      ZeroKnowledgeCrypto.instance = new ZeroKnowledgeCrypto();
    }
    return ZeroKnowledgeCrypto.instance;
  }

  /**
   * Derive master key from password
   * Uses PBKDF2 with 100,000 iterations
   *
   * WARNING: If password is lost, all data is permanently lost!
   */
  public async deriveMasterKey(password: string, salt?: Uint8Array): Promise<{ key: CryptoKey; salt: Uint8Array }> {
    const enc = new TextEncoder();
    const passwordBuffer = enc.encode(password);

    // Generate or use provided salt
    const keySalt = salt || crypto.getRandomValues(new Uint8Array(16));

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive AES-GCM key
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: keySalt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false, // not extractable - for security
      ['encrypt', 'decrypt']
    );

    this.masterKey = key;
    return { key, salt: keySalt };
  }

  /**
   * Encrypt data with master key
   * Returns: iv:ciphertext (base64)
   */
  public async encrypt(plaintext: string, key?: CryptoKey): Promise<string> {
    const cryptoKey = key || this.masterKey;
    if (!cryptoKey) {
      throw new Error('Master key not initialized. Call deriveMasterKey first.');
    }

    const enc = new TextEncoder();
    const data = enc.encode(plaintext);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      data
    );

    // Combine iv + ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Return as base64
    return this.arrayBufferToBase64(combined);
  }

  /**
   * Decrypt data with master key
   */
  public async decrypt(ciphertext: string, key?: CryptoKey): Promise<string> {
    const cryptoKey = key || this.masterKey;
    if (!cryptoKey) {
      throw new Error('Master key not initialized. Call deriveMasterKey first.');
    }

    // Decode from base64
    const combined = this.base64ToArrayBuffer(ciphertext);

    // Extract IV and ciphertext
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    // Decrypt
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      data
    );

    const dec = new TextDecoder();
    return dec.decode(plaintext);
  }

  /**
   * Hash data (one-way, for lookups)
   * Uses SHA-256
   */
  public async hash(data: string): Promise<string> {
    const enc = new TextEncoder();
    const buffer = enc.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return this.arrayBufferToHex(hashBuffer);
  }

  /**
   * Generate random alias
   */
  public generateRandomAlias(length: number = 12): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const randomBytes = crypto.getRandomValues(new Uint8Array(length));

    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[randomBytes[i] % chars.length];
    }

    return result;
  }

  /**
   * Export encrypted vault (for backup)
   * User must remember password to restore!
   */
  public async exportVault(data: any, password: string): Promise<string> {
    const { key, salt } = await this.deriveMasterKey(password);
    const jsonData = JSON.stringify(data);
    const encrypted = await this.encrypt(jsonData, key);

    // Format: salt:encrypted_data
    const saltBase64 = this.arrayBufferToBase64(salt);
    return `${saltBase64}:${encrypted}`;
  }

  /**
   * Import encrypted vault (from backup)
   */
  public async importVault(vault: string, password: string): Promise<any> {
    const [saltBase64, encrypted] = vault.split(':');
    const salt = this.base64ToArrayBuffer(saltBase64);

    const { key } = await this.deriveMasterKey(password, salt);
    const decrypted = await this.decrypt(encrypted, key);

    return JSON.parse(decrypted);
  }

  /**
   * Secure password check
   * Returns entropy bits (higher = better)
   */
  public checkPasswordStrength(password: string): {
    score: number;
    entropy: number;
    feedback: string;
  } {
    const entropy = this.calculateEntropy(password);

    if (entropy < 40) {
      return { score: 0, entropy, feedback: 'Very weak - use at least 12 characters' };
    } else if (entropy < 60) {
      return { score: 1, entropy, feedback: 'Weak - add numbers and symbols' };
    } else if (entropy < 80) {
      return { score: 2, entropy, feedback: 'Fair - consider adding more characters' };
    } else if (entropy < 100) {
      return { score: 3, entropy, feedback: 'Good' };
    } else {
      return { score: 4, entropy, feedback: 'Excellent' };
    }
  }

  private calculateEntropy(password: string): number {
    let charset = 0;
    if (/[a-z]/.test(password)) charset += 26;
    if (/[A-Z]/.test(password)) charset += 26;
    if (/[0-9]/.test(password)) charset += 10;
    if (/[^a-zA-Z0-9]/.test(password)) charset += 32;

    return Math.log2(Math.pow(charset, password.length));
  }

  // Utility functions
  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  private arrayBufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Clear master key from memory
   * Call on logout for security
   */
  public clearMasterKey(): void {
    this.masterKey = null;
  }
}

// Singleton instance
export const zk = ZeroKnowledgeCrypto.getInstance();

/**
 * Usage Example:
 *
 * // On signup/login
 * const { salt } = await zk.deriveMasterKey(userPassword);
 * localStorage.setItem('salt', btoa(String.fromCharCode(...salt)));
 *
 * // Creating alias (client-side)
 * const alias = zk.generateRandomAlias();
 * const encryptedAlias = await zk.encrypt(alias);
 * const encryptedRecipient = await zk.encrypt('user@gmail.com');
 *
 * // Send to server (server only sees encrypted blobs)
 * await api.post('/aliases', {
 *   alias_encrypted: encryptedAlias,
 *   recipient_encrypted: encryptedRecipient,
 *   alias_hash: await zk.hash(alias) // for routing
 * });
 *
 * // Server can route emails but never knows real addresses!
 */
