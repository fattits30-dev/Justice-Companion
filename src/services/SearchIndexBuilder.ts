import type { Database } from '../db/database.ts';
import type { CaseRepository } from '../repositories/CaseRepository.ts';
import type { EvidenceRepository } from '../repositories/EvidenceRepository.ts';
import type { ChatConversationRepository } from '../repositories/ChatConversationRepository.ts';
import type { NotesRepository } from '../repositories/NotesRepository.ts';
import type { EncryptionService } from './EncryptionService.ts';
import type { Case } from '../domains/cases/entities/Case.ts';
import type { Evidence } from '../domains/evidence/entities/Evidence.ts';
import type { ChatConversation } from '../models/ChatConversation.ts';
import type { Note } from '../models/Note.ts';

export class SearchIndexBuilder {
  constructor(
    private db: Database,
    private caseRepo: CaseRepository,
    private evidenceRepo: EvidenceRepository,
    private chatRepo: ChatConversationRepository,
    private notesRepo: NotesRepository,
    private encryptionService: EncryptionService,
  ) {}

  /**
   * Rebuild the entire search index from scratch
   */
  async rebuildIndex(): Promise<void> {
    console.log('Starting search index rebuild...');

    try {
      // Start a transaction for consistency
      this.db.prepare('BEGIN').run();

      // Clear existing index
      this.clearIndex();

      // Get all users
      const users = this.db.prepare('SELECT id FROM users').all() as { id: number }[];

      for (const user of users) {
        console.log(`Indexing data for user ${user.id}...`);

        // Index cases
        const cases = await this.caseRepo.getByUserId(user.id);
        for (const caseItem of cases) {
          await this.indexCase(caseItem);
        }

        // Index evidence
        const evidence = await this.evidenceRepo.getAllForUser(user.id);
        for (const item of evidence) {
          await this.indexEvidence(item);
        }

        // Index conversations
        const conversations = await this.chatRepo.getUserConversations(user.id);
        for (const conv of conversations) {
          await this.indexConversation(conv);
        }

        // Index notes
        const notes = await this.notesRepo.getUserNotes(user.id);
        for (const note of notes) {
          await this.indexNote(note);
        }
      }

      // Commit transaction
      this.db.prepare('COMMIT').run();
      console.log('Search index rebuild completed successfully');
    } catch (error) {
      // Rollback on error
      this.db.prepare('ROLLBACK').run();
      console.error('Search index rebuild failed:', error);
      throw error;
    }
  }

  /**
   * Clear the entire search index
   */
  private clearIndex(): void {
    this.db.prepare('DELETE FROM search_index').run();
    console.log('Search index cleared');
  }

  /**
   * Index a single case
   */
  async indexCase(caseItem: Case): Promise<void> {
    try {
      // Decrypt sensitive fields if needed
      const title = await this.decryptIfNeeded(caseItem.title);
      const description = caseItem.description ? await this.decryptIfNeeded(caseItem.description) : '';

      const content = `${title} ${description} ${caseItem.caseType} ${caseItem.status}`;
      const tags = this.extractTags(content);

      // Insert into search index
      this.db.prepare(`
        INSERT OR REPLACE INTO search_index (
          entity_type, entity_id, user_id, case_id, title, content, tags, created_at,
          status, case_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'case',
        caseItem.id,
        caseItem.userId,
        caseItem.id,
        title,
        content,
        tags,
        caseItem.createdAt,
        caseItem.status,
        caseItem.caseType
      );
    } catch (error) {
      console.error(`Failed to index case ${caseItem.id}:`, error);
    }
  }

  /**
   * Index a single evidence item
   */
  async indexEvidence(evidence: Evidence): Promise<void> {
    try {
      // Get the associated case to determine user
      const caseItem = await this.caseRepo.get(evidence.caseId);
      if (!caseItem) return;

      // Decrypt sensitive fields if needed
      const title = await this.decryptIfNeeded(evidence.title);
      const content = evidence.content ? await this.decryptIfNeeded(evidence.content) : '';
      const filePath = evidence.filePath ? await this.decryptIfNeeded(evidence.filePath) : '';

      const fullContent = `${title} ${content} ${evidence.evidenceType}`;
      const tags = this.extractTags(fullContent);

      // Insert into search index
      this.db.prepare(`
        INSERT OR REPLACE INTO search_index (
          entity_type, entity_id, user_id, case_id, title, content, tags, created_at,
          evidence_type, file_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'evidence',
        evidence.id,
        caseItem.userId,
        evidence.caseId,
        title,
        fullContent,
        tags,
        evidence.createdAt,
        evidence.evidenceType,
        filePath
      );
    } catch (error) {
      console.error(`Failed to index evidence ${evidence.id}:`, error);
    }
  }

  /**
   * Index a single conversation
   */
  async indexConversation(conversation: ChatConversation): Promise<void> {
    try {
      // Get messages for content
      const messages = await this.chatRepo.getConversationMessages(conversation.id);
      const messageContent = messages.map(m => m.content).join(' ');

      const content = `${conversation.title} ${messageContent}`;
      const tags = this.extractTags(content);

      // Insert into search index
      this.db.prepare(`
        INSERT OR REPLACE INTO search_index (
          entity_type, entity_id, user_id, case_id, title, content, tags, created_at,
          message_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'conversation',
        conversation.id,
        conversation.userId,
        conversation.caseId,
        conversation.title,
        content,
        tags,
        conversation.createdAt,
        conversation.messageCount
      );
    } catch (error) {
      console.error(`Failed to index conversation ${conversation.id}:`, error);
    }
  }

  /**
   * Index a single note
   */
  async indexNote(note: Note): Promise<void> {
    try {
      // Decrypt content if needed
      const content = await this.decryptIfNeeded(note.content);
      const title = note.title || 'Untitled Note';

      const fullContent = `${title} ${content}`;
      const tags = this.extractTags(fullContent);

      // Insert into search index
      this.db.prepare(`
        INSERT OR REPLACE INTO search_index (
          entity_type, entity_id, user_id, case_id, title, content, tags, created_at,
          is_pinned
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'note',
        note.id,
        note.userId,
        note.caseId,
        title,
        fullContent,
        tags,
        note.createdAt,
        note.isPinned ? 1 : 0
      );
    } catch (error) {
      console.error(`Failed to index note ${note.id}:`, error);
    }
  }

  /**
   * Remove an item from the search index
   */
  async removeFromIndex(entityType: string, entityId: number): Promise<void> {
    this.db.prepare('DELETE FROM search_index WHERE entity_type = ? AND entity_id = ?')
      .run(entityType, entityId);
  }

  /**
   * Update an item in the search index
   */
  async updateInIndex(entityType: string, entityId: number): Promise<void> {
    try {
      switch (entityType) {
        case 'case':
          const caseItem = await this.caseRepo.get(entityId);
          if (caseItem) await this.indexCase(caseItem);
          break;
        case 'evidence':
          const evidence = await this.evidenceRepo.get(entityId);
          if (evidence) await this.indexEvidence(evidence);
          break;
        case 'conversation':
          const conversation = await this.chatRepo.getConversation(entityId);
          if (conversation) await this.indexConversation(conversation);
          break;
        case 'note':
          const note = await this.notesRepo.getNote(entityId);
          if (note) await this.indexNote(note);
          break;
      }
    } catch (error) {
      console.error(`Failed to update ${entityType} ${entityId} in index:`, error);
    }
  }

  /**
   * Decrypt content if it appears to be encrypted
   */
  private async decryptIfNeeded(content: string): Promise<string> {
    try {
      // Check if content looks like encrypted data (base64 with specific pattern)
      if (content && content.includes(':') && content.length > 50) {
        return await this.encryptionService.decrypt(content);
      }
      return content;
    } catch (error) {
      // If decryption fails, return original content
      return content;
    }
  }

  /**
   * Extract tags from content (hashtags or important keywords)
   */
  private extractTags(content: string): string {
    const tags: string[] = [];

    // Extract hashtags
    const hashtags = content.match(/#\w+/g) || [];
    tags.push(...hashtags.map(tag => tag.substring(1)));

    // Extract dates (YYYY-MM-DD format)
    const dates = content.match(/\d{4}-\d{2}-\d{2}/g) || [];
    tags.push(...dates);

    // Extract email addresses
    const emails = content.match(/[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/g) || [];
    tags.push(...emails);

    // Extract phone numbers (basic pattern)
    const phones = content.match(/\+?[\d\s()-]+\d{4,}/g) || [];
    tags.push(...phones);

    return tags.join(' ');
  }

  /**
   * Optimize the search index for better performance
   */
  async optimizeIndex(): Promise<void> {
    try {
      // Rebuild FTS5 index
      this.db.prepare('INSERT INTO search_index(search_index) VALUES("rebuild")').run();

      // Optimize FTS5 index
      this.db.prepare('INSERT INTO search_index(search_index) VALUES("optimize")').run();

      console.log('Search index optimized successfully');
    } catch (error) {
      console.error('Failed to optimize search index:', error);
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<{
    totalDocuments: number;
    documentsByType: Record<string, number>;
    lastUpdated: string | null;
  }> {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM search_index').get() as { count: number };

    const byType = this.db.prepare(`
      SELECT entity_type, COUNT(*) as count
      FROM search_index
      GROUP BY entity_type
    `).all() as { entity_type: string; count: number }[];

    const lastUpdate = this.db.prepare(`
      SELECT MAX(created_at) as last_updated
      FROM search_index
    `).get() as { last_updated: string | null };

    const typeMap: Record<string, number> = {};
    for (const row of byType) {
      typeMap[row.entity_type] = row.count;
    }

    return {
      totalDocuments: total.count,
      documentsByType: typeMap,
      lastUpdated: lastUpdate.last_updated,
    };
  }
}