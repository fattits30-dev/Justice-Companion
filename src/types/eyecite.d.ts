/**
 * Type definitions for @beshkenadze/eyecite
 * A legal citation extraction library
 */

declare module '@beshkenadze/eyecite' {
  export interface CitationGroups {
    volume?: string;
    reporter?: string;
    page?: string;
    section?: string;
    chapter?: string;
    [key: string]: string | undefined;
  }

  export interface CitationMetadata {
    year?: string;
    court?: string;
    plaintiff?: string;
    defendant?: string;
    pin_cite?: string;
    [key: string]: string | undefined;
  }

  export interface Citation {
    constructor: {
      name: string;
    };
    groups: CitationGroups;
    metadata?: CitationMetadata;
    span: () => [number, number];
    matched_text: () => string;
    [key: string]: unknown;
  }

  export interface GetCitationsOptions {
    overlapHandling?: 'parent-only' | 'child-only' | 'all';
    removeAmbiguous?: boolean;
    [key: string]: unknown;
  }

  export type CleanTextOption = 'html' | 'inline_whitespace' | 'all_whitespace';

  export function getCitations(
    text: string,
    options?: GetCitationsOptions
  ): Citation[];

  export function cleanText(
    text: string,
    options: CleanTextOption[]
  ): string;

  export type AnnotationData = [
    span: [number, number],
    openTag: string,
    closeTag: string
  ];

  export function annotateCitations(
    text: string,
    annotations: AnnotationData[]
  ): string;

  // Add other exports as needed
  export const patterns: Record<string, RegExp>;
}
