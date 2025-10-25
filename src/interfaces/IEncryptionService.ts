// src/interfaces/IEncryptionService.ts
export interface IEncryptionService {
  encrypt(text: string): string;
  decrypt(encryptedText: string): string | Promise<string>;
  hash(password: string, salt?: string): string;
  compare(password: string, hash: string): boolean;
  generateSalt(): string;
}