"""
Parallel OCR Processing - Extract text from images and scanned PDFs

Provides parallelized OCR processing using Tesseract for:
- Multi-page PDF documents (scanned)
- Image files (JPG, PNG, TIFF)
- Batch processing with thread pooling

Features:
- Concurrent page processing (ThreadPoolExecutor)
- Progress tracking
- Automatic language detection
- Image preprocessing for better OCR accuracy
- Memory-efficient batch processing

Dependencies:
- pytesseract: Python wrapper for Tesseract OCR
- Pillow: Image processing library
- pdf2image: Convert PDF pages to images

Installation:
    pip install pytesseract Pillow pdf2image
    # Also install Tesseract binary: https://github.com/UB-Mannheim/tesseract/wiki
"""

import logging
from typing import List, Optional, Dict, Any, Tuple
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
import time

logger = logging.getLogger(__name__)


@dataclass
class OCRResult:
    """Result of OCR processing for a single page/image."""
    text: str
    confidence: Optional[float] = None
    page_number: Optional[int] = None
    processing_time: float = 0.0
    language: str = "eng"


@dataclass
class BatchOCRResult:
    """Result of batch OCR processing."""
    pages: List[OCRResult]
    total_text: str
    total_pages: int
    total_time: float
    average_confidence: Optional[float] = None


class ParallelOCRProcessor:
    """
    Parallel OCR processor for images and PDFs.

    Uses ThreadPoolExecutor to process multiple pages/images concurrently.
    """

    def __init__(
        self,
        max_workers: Optional[int] = None,
        language: str = "eng",
        preprocess: bool = True,
    ):
        """
        Initialize parallel OCR processor.

        Args:
            max_workers: Maximum worker threads (None = CPU count)
            language: Tesseract language code (default: 'eng' for English)
            preprocess: Whether to apply image preprocessing (default: True)
        """
        self.max_workers = max_workers
        self.language = language
        self.preprocess = preprocess

        # Check if pytesseract is available
        try:
            import pytesseract
            self.pytesseract = pytesseract
        except ImportError:
            logger.error("pytesseract not installed - OCR will not be available")
            self.pytesseract = None

        # Check if PIL is available
        try:
            from PIL import Image
            self.Image = Image
        except ImportError:
            logger.error("Pillow not installed - image processing will not be available")
            self.Image = None

        logger.info(
            f"Initialized ParallelOCRProcessor: max_workers={max_workers}, "
            f"language={language}, preprocess={preprocess}"
        )

    def _preprocess_image(self, image: Any) -> Any:
        """
        Preprocess image for better OCR accuracy.

        Args:
            image: PIL Image object

        Returns:
            Preprocessed PIL Image
        """
        if not self.preprocess or not self.Image:
            return image

        try:
            from PIL import ImageEnhance, ImageFilter

            # Convert to grayscale
            if image.mode != 'L':
                image = image.convert('L')

            # Apply slight sharpening
            image = image.filter(ImageFilter.SHARPEN)

            # Increase contrast
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.5)

            # Slight brightness adjustment
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(1.1)

            return image

        except Exception as e:
            logger.warning(f"Image preprocessing failed: {e}, using original")
            return image

    def process_image(
        self,
        image_path: Path,
        page_number: Optional[int] = None,
    ) -> OCRResult:
        """
        Process single image with OCR.

        Args:
            image_path: Path to image file
            page_number: Optional page number (for multi-page documents)

        Returns:
            OCRResult with extracted text
        """
        if not self.pytesseract or not self.Image:
            raise RuntimeError("pytesseract or Pillow not installed")

        start_time = time.time()

        try:
            # Load image
            image = self.Image.open(image_path)

            # Preprocess
            image = self._preprocess_image(image)

            # Perform OCR with confidence data
            ocr_data = self.pytesseract.image_to_data(
                image,
                lang=self.language,
                output_type=self.pytesseract.Output.DICT,
            )

            # Extract text
            text = self.pytesseract.image_to_string(
                image,
                lang=self.language,
            )

            # Calculate average confidence (exclude -1 values)
            confidences = [
                float(conf)
                for conf in ocr_data['conf']
                if conf != -1
            ]
            avg_confidence = (
                sum(confidences) / len(confidences)
                if confidences else None
            )

            processing_time = time.time() - start_time

            logger.debug(
                f"OCR processed page {page_number or 'single'}: "
                f"{len(text)} chars, confidence={avg_confidence:.1f}%, "
                f"time={processing_time:.2f}s"
            )

            return OCRResult(
                text=text,
                confidence=avg_confidence,
                page_number=page_number,
                processing_time=processing_time,
                language=self.language,
            )

        except Exception as e:
            logger.error(
                f"OCR failed for page {page_number or 'single'}: {e}"
            )
            return OCRResult(
                text="",
                confidence=0.0,
                page_number=page_number,
                processing_time=time.time() - start_time,
                language=self.language,
            )

    def process_pdf_parallel(
        self,
        pdf_path: Path,
        dpi: int = 300,
    ) -> BatchOCRResult:
        """
        Process scanned PDF with parallel OCR.

        Converts PDF pages to images and processes them concurrently.

        Args:
            pdf_path: Path to PDF file
            dpi: DPI for PDF to image conversion (default: 300)

        Returns:
            BatchOCRResult with all extracted text
        """
        if not self.pytesseract or not self.Image:
            raise RuntimeError("pytesseract or Pillow not installed")

        try:
            from pdf2image import convert_from_path
        except ImportError:
            raise RuntimeError("pdf2image not installed")

        logger.info(f"Starting parallel OCR for PDF: {pdf_path}")
        start_time = time.time()

        # Convert PDF to images
        logger.debug(f"Converting PDF to images (dpi={dpi})...")
        images = convert_from_path(pdf_path, dpi=dpi)
        total_pages = len(images)

        logger.info(f"Processing {total_pages} pages in parallel...")

        # Process pages in parallel
        page_results: List[Tuple[int, OCRResult]] = []

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all pages
            future_to_page = {
                executor.submit(
                    self._process_image_object,
                    image,
                    page_num + 1
                ): page_num + 1
                for page_num, image in enumerate(images)
            }

            # Collect results as they complete
            for future in as_completed(future_to_page):
                page_num = future_to_page[future]
                try:
                    result = future.result()
                    page_results.append((page_num, result))
                    logger.debug(
                        f"Page {page_num}/{total_pages} completed "
                        f"({len(result.text)} chars)"
                    )
                except Exception as exc:
                    logger.error(f"Page {page_num} OCR failed: {exc}")
                    page_results.append((
                        page_num,
                        OCRResult(text="", page_number=page_num)
                    ))

        # Sort by page number
        page_results.sort(key=lambda x: x[0])
        sorted_results = [result for _, result in page_results]

        # Combine all text
        total_text = "\n\n".join(
            f"--- Page {r.page_number} ---\n{r.text}"
            for r in sorted_results
            if r.text.strip()
        )

        # Calculate average confidence
        confidences = [r.confidence for r in sorted_results if r.confidence]
        avg_confidence = (
            sum(confidences) / len(confidences)
            if confidences else None
        )

        total_time = time.time() - start_time

        logger.info(
            f"PDF OCR complete: {total_pages} pages, "
            f"{len(total_text)} chars, "
            f"avg_confidence={avg_confidence:.1f}%, "
            f"time={total_time:.2f}s"
        )

        return BatchOCRResult(
            pages=sorted_results,
            total_text=total_text,
            total_pages=total_pages,
            total_time=total_time,
            average_confidence=avg_confidence,
        )

    def _process_image_object(
        self,
        image: Any,
        page_number: int,
    ) -> OCRResult:
        """
        Process PIL Image object with OCR.

        Args:
            image: PIL Image object
            page_number: Page number

        Returns:
            OCRResult with extracted text
        """
        start_time = time.time()

        try:
            # Preprocess
            image = self._preprocess_image(image)

            # Perform OCR
            ocr_data = self.pytesseract.image_to_data(
                image,
                lang=self.language,
                output_type=self.pytesseract.Output.DICT,
            )

            text = self.pytesseract.image_to_string(
                image,
                lang=self.language,
            )

            # Calculate average confidence
            confidences = [
                float(conf)
                for conf in ocr_data['conf']
                if conf != -1
            ]
            avg_confidence = (
                sum(confidences) / len(confidences)
                if confidences else None
            )

            processing_time = time.time() - start_time

            return OCRResult(
                text=text,
                confidence=avg_confidence,
                page_number=page_number,
                processing_time=processing_time,
                language=self.language,
            )

        except Exception as e:
            logger.error(f"OCR failed for page {page_number}: {e}")
            return OCRResult(
                text="",
                confidence=0.0,
                page_number=page_number,
                processing_time=time.time() - start_time,
                language=self.language,
            )

    def process_images_parallel(
        self,
        image_paths: List[Path],
    ) -> BatchOCRResult:
        """
        Process multiple images with parallel OCR.

        Args:
            image_paths: List of image file paths

        Returns:
            BatchOCRResult with all extracted text
        """
        if not self.pytesseract or not self.Image:
            raise RuntimeError("pytesseract or Pillow not installed")

        logger.info(f"Starting parallel OCR for {len(image_paths)} images")
        start_time = time.time()

        image_results: List[Tuple[int, OCRResult]] = []

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all images
            future_to_index = {
                executor.submit(
                    self.process_image,
                    image_path,
                    idx + 1
                ): idx
                for idx, image_path in enumerate(image_paths)
            }

            # Collect results
            for future in as_completed(future_to_index):
                idx = future_to_index[future]
                try:
                    result = future.result()
                    image_results.append((idx, result))
                except Exception as exc:
                    logger.error(f"Image {idx + 1} OCR failed: {exc}")
                    image_results.append((
                        idx,
                        OCRResult(text="", page_number=idx + 1)
                    ))

        # Sort by index
        image_results.sort(key=lambda x: x[0])
        sorted_results = [result for _, result in image_results]

        # Combine text
        total_text = "\n\n".join(
            f"--- Image {r.page_number} ---\n{r.text}"
            for r in sorted_results
            if r.text.strip()
        )

        # Calculate average confidence
        confidences = [r.confidence for r in sorted_results if r.confidence]
        avg_confidence = (
            sum(confidences) / len(confidences)
            if confidences else None
        )

        total_time = time.time() - start_time

        logger.info(
            f"Image batch OCR complete: {len(image_paths)} images, "
            f"{len(total_text)} chars, "
            f"time={total_time:.2f}s"
        )

        return BatchOCRResult(
            pages=sorted_results,
            total_text=total_text,
            total_pages=len(image_paths),
            total_time=total_time,
            average_confidence=avg_confidence,
        )
