/**
 * Notes Repository - Local IndexedDB Storage
 *
 * Handles CRUD operations for case notes with encrypted content.
 */

import {} from "../db";
import { BaseRepository, type BaseEntity } from "./BaseRepository";

/**
 * Note entity interface
 */
export interface LocalNote extends BaseEntity {
  id: number;
  caseId: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a new note
 */
export interface CreateNoteInput {
  caseId: number;
  title: string;
  content: string;
}

/**
 * Input for updating a note
 */
export interface UpdateNoteInput {
  title?: string;
  content?: string;
}

/**
 * Notes repository for local storage
 */
export class NotesRepository extends BaseRepository<"notes", LocalNote> {
  constructor() {
    super("notes", {
      // Note content is encrypted
      encryptedFields: ["content"],
      requireEncryption: true,
    });
  }

  /**
   * Create a new note
   */
  async create(input: CreateNoteInput): Promise<LocalNote> {
    const data = {
      caseId: input.caseId,
      title: input.title,
      content: input.content,
    };

    return super.create(
      data as Omit<LocalNote, "id" | "createdAt" | "updatedAt">,
    );
  }

  /**
   * Find all notes for a case
   */
  async findByCaseId(caseId: number): Promise<LocalNote[]> {
    const db = await this.getDb();
    const results = await db.getAllFromIndex("notes", "by-case", caseId);

    const decrypted: LocalNote[] = [];
    for (const item of results) {
      const dec = await this.decryptFields(
        item as unknown as Record<string, unknown>,
      );
      decrypted.push(dec as unknown as LocalNote);
    }

    // Sort by createdAt descending (newest first)
    decrypted.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    return decrypted;
  }

  /**
   * Search notes by title or content
   */
  async search(query: string): Promise<LocalNote[]> {
    const all = await this.findAll();
    const lowerQuery = query.toLowerCase();

    return all.filter(
      (note) =>
        note.title.toLowerCase().includes(lowerQuery) ||
        note.content.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * Search notes within a specific case
   */
  async searchInCase(caseId: number, query: string): Promise<LocalNote[]> {
    const caseNotes = await this.findByCaseId(caseId);
    const lowerQuery = query.toLowerCase();

    return caseNotes.filter(
      (note) =>
        note.title.toLowerCase().includes(lowerQuery) ||
        note.content.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * Delete all notes for a case
   */
  async deleteByCaseId(caseId: number): Promise<number> {
    const notes = await this.findByCaseId(caseId);
    let deleted = 0;

    for (const note of notes) {
      if (await this.delete(note.id)) {
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Count notes for a case
   */
  async countByCaseId(caseId: number): Promise<number> {
    const notes = await this.findByCaseId(caseId);
    return notes.length;
  }
}

/**
 * Singleton instance
 */
let notesRepositoryInstance: NotesRepository | null = null;

export function getNotesRepository(): NotesRepository {
  if (!notesRepositoryInstance) {
    notesRepositoryInstance = new NotesRepository();
  }
  return notesRepositoryInstance;
}
