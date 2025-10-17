/**
 * Type declarations for @beshkenadze/eyecite
 *
 * eyecite-js is a TypeScript port of the eyecite legal citation extraction library.
 * This file provides type definitions for the library's exports.
 */

declare module '@beshkenadze/eyecite' {
  /**
   * Citation groups - common fields extracted from citation text
   */
  export interface CitationGroups {
    volume?: string;
    reporter?: string;
    page?: string;
    section?: string;
    chapter?: string;
    [key: string]: string | undefined;
  }

  /**
   * Citation metadata - additional context about the citation
   */
  export interface CitationMetadata {
    year?: string;
    court?: string;
    plaintiff?: string;
    defendant?: string;
    pin_cite?: string;
    [key: string]: string | undefined;
  }

  /**
   * Base Citation class
   */
  export interface Citation {
    groups: CitationGroups;
    metadata?: CitationMetadata;
    span(): [number, number];
    matched_text(): string;
  }

  /**
   * Full case citation (e.g., "123 F.3d 456 (5th Cir. 2001)")
   */
  export interface FullCaseCitation extends Citation {
    groups: CitationGroups & {
      volume: string;
      reporter: string;
      page: string;
    };
    metadata?: CitationMetadata & {
      year?: string;
      court?: string;
      plaintiff?: string;
      defendant?: string;
      pin_cite?: string;
    };
  }

  /**
   * Full law citation (e.g., "42 U.S.C. § 1983")
   */
  export interface FullLawCitation extends Citation {
    groups: CitationGroups & {
      reporter: string;
      section?: string;
      chapter?: string;
    };
  }

  /**
   * Short case citation (e.g., "123 F.3d, at 789")
   */
  export interface ShortCaseCitation extends Citation {
    groups: CitationGroups & {
      volume: string;
      reporter: string;
      page: string;
    };
    metadata?: CitationMetadata & {
      pin_cite?: string;
    };
  }

  /**
   * Id. citation (e.g., "Id. at 10")
   */
  export interface IdCitation extends Citation {
    metadata?: CitationMetadata & {
      pin_cite?: string;
    };
  }

  /**
   * Supra citation (e.g., "Smith, supra, at 123")
   */
  export interface SupraCitation extends Citation {
    metadata?: CitationMetadata & {
      pin_cite?: string;
    };
  }

  /**
   * Options for citation extraction
   */
  export interface GetCitationsOptions {
    /**
     * How to handle overlapping citations
     * - 'parent-only': Keep only parent citations when overlap detected
     * - 'child-only': Keep only child citations
     * - 'all': Keep all citations
     */
    overlapHandling?: 'parent-only' | 'child-only' | 'all';

    /**
     * Remove ambiguous citations
     */
    removeAmbiguous?: boolean;
  }

  /**
   * Text cleaning operations
   */
  export type CleanOperation = 'html' | 'inline_whitespace' | 'all_whitespace';

  /**
   * Extract citations from text
   *
   * @param text - The text to parse
   * @param options - Extraction options
   * @returns Array of Citation objects
   */
  export function getCitations(text: string, options?: GetCitationsOptions): Citation[];

  /**
   * Clean text before citation extraction
   *
   * @param text - The text to clean
   * @param operations - Array of cleaning operations to perform
   * @returns Cleaned text
   */
  export function cleanText(text: string, operations: CleanOperation[]): string;

  /**
   * Annotate citations in text with custom markup
   *
   * @param text - The text containing citations
   * @param annotations - Array of [span, prefix, suffix] tuples
   * @returns Annotated text with markup
   */
  export function annotateCitations(
    text: string,
    annotations: Array<[[number, number], string, string]>
  ): string;
}
