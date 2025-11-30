/**
 * Type declarations for html2pdf.js
 */
declare module "html2pdf.js" {
  interface Html2PdfOptions {
    margin?: number | [number, number, number, number];
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: {
      scale?: number;
      useCORS?: boolean;
      allowTaint?: boolean;
      logging?: boolean;
    };
    jsPDF?: {
      unit?: string;
      format?: string;
      orientation?: string;
    };
  }

  interface Html2Pdf {
    set(options: Html2PdfOptions): Html2Pdf;
    from(element: HTMLElement | string): Html2Pdf;
    save(): Promise<void>;
    output(type: string, options?: unknown): Promise<Blob | string>;
    toPdf(): Html2Pdf;
    get(type: string): Promise<unknown>;
  }

  function html2pdf(): Html2Pdf;
  function html2pdf(
    element: HTMLElement | string,
    options?: Html2PdfOptions,
  ): Html2Pdf;

  export = html2pdf;
}
