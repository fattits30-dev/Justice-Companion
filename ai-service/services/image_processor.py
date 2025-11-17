"""
Image Processing Service

Handles OCR text extraction from images of legal documents.
Supports: JPG, PNG, BMP, TIFF, PDF (scanned), HEIC (via Pillow plugin)

Requires: Tesseract OCR engine installed on system
- Windows: https://github.com/UB-Mannheim/tesseract/wiki
- macOS: brew install tesseract
- Linux: apt-get install tesseract-ocr

Author: Justice Companion Team
License: MIT
"""

import os
import tempfile
from typing import Optional, Tuple
from pathlib import Path
from PIL import Image
import pytesseract


class ImageProcessorService:
    """
    Service for processing images and extracting text via OCR.

    Handles image preprocessing, format conversion, and Tesseract OCR integration.
    """

    def __init__(self, tesseract_path: Optional[str] = None):
        """
        Initialize image processor.

        Args:
            tesseract_path: Optional path to Tesseract executable (for Windows)
        """
        self.tesseract_path = tesseract_path

        # Configure Tesseract path for Windows if provided
        if tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
        elif os.name == "nt":
            # Common Windows installation paths
            common_paths = [
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            ]
            for path in common_paths:
                if os.path.exists(path):
                    pytesseract.pytesseract.tesseract_cmd = path
                    self.tesseract_path = path
                    break

    def is_tesseract_available(self) -> bool:
        """
        Check if Tesseract OCR is available.

        Returns:
            True if Tesseract is installed and accessible
        """
        try:
            pytesseract.get_tesseract_version()
            return True
        except Exception:
            return False

    def extract_text_from_image(
        self, image_path: str, preprocess: bool = True, lang: str = "eng"
    ) -> Tuple[str, dict]:
        """
        Extract text from image using OCR.

        Args:
            image_path: Path to image file
            preprocess: Apply preprocessing (grayscale, contrast enhancement)
            lang: Tesseract language code (default: "eng" for English)

        Returns:
            Tuple of (extracted_text, metadata)

        Raises:
            FileNotFoundError: If image file doesn't exist
            RuntimeError: If Tesseract is not installed or OCR fails
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image file not found: {image_path}")

        if not self.is_tesseract_available():
            raise RuntimeError(
                "Tesseract OCR is not installed. "
                "Please install Tesseract:\n"
                "  Windows: https://github.com/UB-Mannheim/tesseract/wiki\n"
                "  macOS: brew install tesseract\n"
                "  Linux: apt-get install tesseract-ocr"
            )

        try:
            # Load image
            image = Image.open(image_path)

            # Preprocess if requested
            if preprocess:
                image = self._preprocess_image(image)

            # Extract text
            text = pytesseract.image_to_string(image, lang=lang)

            # Get OCR metadata (confidence, etc.)
            try:
                ocr_data = pytesseract.image_to_data(
                    image, lang=lang, output_type=pytesseract.Output.DICT
                )
                # Calculate average confidence
                confidences = [int(conf) for conf in ocr_data["conf"] if conf != "-1"]
                avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            except Exception:
                avg_confidence = 0

            metadata = {
                "image_size": image.size,
                "image_mode": image.mode,
                "image_format": image.format,
                "ocr_confidence": avg_confidence,
                "text_length": len(text),
                "tesseract_version": pytesseract.get_tesseract_version(),
            }

            return text.strip(), metadata

        except Exception as e:
            raise RuntimeError(f"OCR failed: {e}")

    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        Preprocess image for better OCR results.

        Applies:
        - Grayscale conversion
        - Contrast enhancement
        - Noise reduction (optional)

        Args:
            image: PIL Image object

        Returns:
            Preprocessed PIL Image
        """
        from PIL import ImageEnhance

        # Convert to grayscale
        if image.mode != "L":
            image = image.convert("L")

        # Enhance contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)

        # Optional: reduce noise (can slow down processing)
        # image = image.filter(ImageFilter.MedianFilter(size=3))

        return image

    def convert_heic_to_jpg(self, heic_path: str) -> str:
        """
        Convert HEIC image to JPG format.

        HEIC is Apple's image format (iPhone photos).
        Requires pillow-heif plugin: pip install pillow-heif

        Args:
            heic_path: Path to HEIC file

        Returns:
            Path to converted JPG file (in temp directory)

        Raises:
            RuntimeError: If conversion fails or pillow-heif not installed
        """
        try:
            # Try to import pillow-heif
            try:
                from pillow_heif import register_heif_opener

                register_heif_opener()
            except ImportError:
                raise RuntimeError(
                    "pillow-heif is required for HEIC support. "
                    "Install with: pip install pillow-heif"
                )

            # Open HEIC and convert to JPG
            image = Image.open(heic_path)

            # Save as JPG in temp directory
            temp_dir = tempfile.gettempdir()
            jpg_filename = Path(heic_path).stem + ".jpg"
            jpg_path = os.path.join(temp_dir, jpg_filename)

            image.convert("RGB").save(jpg_path, "JPEG", quality=95)

            return jpg_path

        except Exception as e:
            raise RuntimeError(f"HEIC to JPG conversion failed: {e}")

    def extract_text_from_pdf(
        self, pdf_path: str, first_page: int = 1, last_page: Optional[int] = None
    ) -> Tuple[str, dict]:
        """
        Extract text from scanned PDF using OCR.

        Converts PDF pages to images, then applies OCR.

        Args:
            pdf_path: Path to PDF file
            first_page: First page to process (1-indexed)
            last_page: Last page to process (None = all pages)

        Returns:
            Tuple of (extracted_text, metadata)

        Raises:
            RuntimeError: If pdf2image or poppler is not installed
        """
        try:
            from pdf2image import convert_from_path
        except ImportError:
            raise RuntimeError(
                "pdf2image is required for PDF OCR. "
                "Install with: pip install pdf2image\n"
                "Also requires poppler: "
                "https://github.com/oschwartz10612/poppler-windows/releases/"
            )

        if not self.is_tesseract_available():
            raise RuntimeError(
                "Tesseract OCR is not installed. "
                "Please install Tesseract (see extract_text_from_image docstring)"
            )

        try:
            # Convert PDF to images
            images = convert_from_path(
                pdf_path,
                first_page=first_page,
                last_page=last_page,
                dpi=300,  # High DPI for better OCR
            )

            # Extract text from each page
            all_text = []
            total_confidence = 0

            for i, image in enumerate(images, start=first_page):
                # Preprocess image
                processed_image = self._preprocess_image(image)

                # Extract text
                page_text = pytesseract.image_to_string(processed_image, lang="eng")
                all_text.append(f"--- Page {i} ---\n{page_text}")

                # Get confidence
                try:
                    ocr_data = pytesseract.image_to_data(
                        processed_image, output_type=pytesseract.Output.DICT
                    )
                    confidences = [int(conf) for conf in ocr_data["conf"] if conf != "-1"]
                    if confidences:
                        total_confidence += sum(confidences) / len(confidences)
                except Exception:
                    pass

            combined_text = "\n\n".join(all_text)
            avg_confidence = total_confidence / len(images) if images else 0

            metadata = {
                "num_pages": len(images),
                "ocr_confidence": avg_confidence,
                "text_length": len(combined_text),
                "tesseract_version": pytesseract.get_tesseract_version(),
            }

            return combined_text.strip(), metadata

        except Exception as e:
            raise RuntimeError(f"PDF OCR failed: {e}")


# Convenience function for direct usage
def extract_text_from_image(image_path: str) -> str:
    """
    Convenience function to extract text from image.

    Args:
        image_path: Path to image file

    Returns:
        Extracted text

    Raises:
        RuntimeError: If OCR fails or Tesseract not installed
    """
    processor = ImageProcessorService()
    text, _ = processor.extract_text_from_image(image_path)
    return text
