declare module "@beshkenadze/eyecite" {
  export interface Citation {
    fullCitation: string;
    shortCitation?: string;
    reporter?: string;
    volume?: string;
    page?: string;
    year?: string;
    plaintiff?: string;
    defendant?: string;
    [key: string]: any;
  }

  export function getCitations(
    text: string,
    options?: Record<string, unknown>,
  ): Citation[];
  export function cleanText(text: string, options?: string | string[]): string;
  export function annotateCitations(text: string, citations: any[]): string;
}
