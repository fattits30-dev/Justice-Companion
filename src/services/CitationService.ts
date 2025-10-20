import { getCitations, cleanText, annotateCitations, type Citation } from '@beshkenadze/eyecite';
import { logger } from '../utils/logger.ts';

/**
 * Citation Service
 *
 * Handles legal citation extraction, parsing, and formatting using eyecite-js.
 * Supports all major citation types: case law, statutes, regulations, and more.
 */

export interface ExtractedCitation {
  text: string;
  type: string;
  span: [number, number];
  metadata: {
    volume?: string;
    reporter?: string;
    page?: string;
    year?: string;
    court?: string;
    plaintiff?: string;
    defendant?: string;
    section?: string;
    chapter?: string;
    pinCite?: string;
  };
}

export class CitationService {
  /**
   * Extract all legal citations from text
   *
   * @param text - The text to parse for citations
   * @returns Array of extracted citations with metadata
   */
  static extractCitations(text: string): ExtractedCitation[] {
    try {
      if (!text || text.trim().length === 0) {
        return [];
      }

      // Clean text (remove HTML, normalize whitespace)
      const cleaned = cleanText(text, ['html', 'inline_whitespace']);

      // Extract citations with overlap handling to avoid duplicates
      const citations = getCitations(cleaned, {
        overlapHandling: 'parent-only',
        removeAmbiguous: false,
      });

      logger.info('CitationService', 'Extracted citations', {
        count: citations.length,
        textLength: text.length,
      });

      // Convert to our format
      return citations.map((citation) => this.convertCitation(citation));
    } catch (error) {
      logger.error('CitationService', 'Failed to extract citations', { error });
      return [];
    }
  }

  /**
   * Convert eyecite citation object to our format
   */
  private static convertCitation(citation: Citation): ExtractedCitation {
    const type = citation.constructor.name;
    const span = citation.span();
    const metadata: ExtractedCitation['metadata'] = {};

    // Extract metadata based on citation type
    // Use direct property access since eyecite returns dynamic citation objects
    const groups = citation.groups;
    const citationMetadata = citation.metadata;

    // Extract available metadata
    if (groups.volume) {
      metadata.volume = groups.volume;
    }
    if (groups.reporter) {
      metadata.reporter = groups.reporter;
    }
    if (groups.page) {
      metadata.page = groups.page;
    }
    if (groups.section) {
      metadata.section = groups.section;
    }
    if (groups.chapter) {
      metadata.chapter = groups.chapter;
    }

    if (citationMetadata) {
      if (citationMetadata.year) {
        metadata.year = citationMetadata.year;
      }
      if (citationMetadata.court) {
        metadata.court = citationMetadata.court;
      }
      if (citationMetadata.plaintiff) {
        metadata.plaintiff = citationMetadata.plaintiff;
      }
      if (citationMetadata.defendant) {
        metadata.defendant = citationMetadata.defendant;
      }
      if (citationMetadata.pin_cite) {
        metadata.pinCite = citationMetadata.pin_cite;
      }
    }

    return {
      text: citation.matched_text(),
      type,
      span,
      metadata,
    };
  }

  /**
   * Highlight citations in text with HTML markup
   *
   * @param text - The text containing citations
   * @returns HTML string with citations wrapped in <mark> tags
   */
  static highlightCitations(text: string): string {
    try {
      if (!text || text.trim().length === 0) {
        return text;
      }

      const cleaned = cleanText(text, ['html', 'inline_whitespace']);
      const citations = getCitations(cleaned, {
        overlapHandling: 'parent-only',
      });

      if (citations.length === 0) {
        return text;
      }

      // Add <mark> tags with data attributes for styling
      return annotateCitations(
        cleaned,
        citations.map((c) => [
          c.span(),
          '<mark class="legal-citation" data-citation-type="' + c.constructor.name + '">',
          '</mark>',
        ]),
      );
    } catch (error) {
      logger.error('CitationService', 'Failed to highlight citations', {
        error,
      });
      return text;
    }
  }

  /**
   * Format citation for display (human-readable)
   */
  static formatCitation(citation: ExtractedCitation): string {
    if (citation.type === 'FullCaseCitation') {
      const { volume, reporter, page, year, court } = citation.metadata;
      let formatted = `${volume} ${reporter} ${page}`;
      if (year) {
        formatted += ` (${year})`;
      }
      if (court && court !== 'scotus') {
        formatted += ` (${court.toUpperCase()})`;
      }
      return formatted;
    } else if (citation.type === 'FullLawCitation') {
      const { reporter, section, chapter } = citation.metadata;
      let formatted = reporter || '';
      if (chapter) {
        formatted += ` ch. ${chapter}`;
      }
      if (section) {
        formatted += ` § ${section}`;
      }
      return formatted;
    } else if (citation.type === 'ShortCaseCitation') {
      const { volume, reporter, page } = citation.metadata;
      return `${volume} ${reporter}, at ${page}`;
    } else if (citation.type === 'IdCitation') {
      const { pinCite } = citation.metadata;
      return pinCite ? `Id. ${pinCite}` : 'Id.';
    } else if (citation.type === 'SupraCitation') {
      return citation.text;
    }

    return citation.text;
  }

  /**
   * Get a link to the citation in CourtListener (if applicable)
   */
  static getCourtListenerLink(citation: ExtractedCitation): string | null {
    if (citation.type === 'FullCaseCitation') {
      const { volume, reporter, page } = citation.metadata;
      if (volume && reporter && page) {
        const query = encodeURIComponent(`${volume} ${reporter} ${page}`);
        return `https://www.courtlistener.com/?q=${query}`;
      }
    }
    return null;
  }
}
