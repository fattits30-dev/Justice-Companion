"""
Example usage of DocumentParserService.

Demonstrates parsing various document formats and extracting text/metadata.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.services.document_parser_service import DocumentParserService, parse_document


async def main():
    """Demonstrate DocumentParserService functionality."""

    print("=" * 80)
    print("DocumentParserService Example Usage")
    print("=" * 80)
    print()

    # Create service instance
    service = DocumentParserService()

    # Example 1: Check supported formats
    print("1. Supported File Formats:")
    print(f"   Extensions: {', '.join(service.get_supported_extensions())}")
    print()

    # Example 2: Parse a text file
    print("2. Parsing Plain Text File:")
    print("   Creating sample text file...")

    sample_txt = Path("sample_document.txt")
    sample_txt.write_text(
        "This is a sample legal document.\n\n"
        "Section 1: Introduction\n"
        "This document demonstrates text parsing capabilities.\n\n"
        "Section 2: Details\n"
        "All sensitive information is stored securely with AES-256-GCM encryption.\n"
    )

    try:
        result = await service.parse_document(str(sample_txt.absolute()))
        print(f"   ✓ Filename: {result.filename}")
        print(f"   ✓ Type: {result.file_type}")
        print(f"   ✓ Word count: {result.word_count}")
        print(f"   ✓ Text preview: {result.text[:100]}...")
        print()

        # Extract summary
        summary = service.extract_summary(result.text, max_words=15)
        print(f"   ✓ Summary (15 words): {summary}")
        print()
    finally:
        sample_txt.unlink(missing_ok=True)

    # Example 3: Parse from buffer
    print("3. Parsing from Buffer:")
    buffer_content = "This is content loaded from memory, not a file."
    buffer = buffer_content.encode("utf-8")

    result = await service.parse_document_buffer(buffer, "memory_document.txt")
    print(f"   ✓ Parsed {result.word_count} words from buffer")
    print(f"   ✓ Content: {result.text}")
    print()

    # Example 4: File size validation
    print("4. File Size Validation:")

    # Valid size
    validation = service.validate_file_size(1024 * 1024)  # 1MB
    print(f"   ✓ 1MB file: {validation.valid}")

    # Invalid size (exceeds 10MB limit)
    validation = service.validate_file_size(15 * 1024 * 1024)  # 15MB
    print(f"   ✓ 15MB file: {validation.valid} - {validation.error}")
    print()

    # Example 5: Check if file is supported
    print("5. File Support Detection:")
    test_files = ["document.pdf", "report.docx", "notes.txt", "image.jpg", "data.csv"]

    for filename in test_files:
        supported = service.is_supported(filename)
        status = "✓ Supported" if supported else "✗ Not supported"
        print(f"   {status}: {filename}")

    print()

    # Example 6: Convenience function
    print("6. Using Convenience Function:")
    sample_txt2 = Path("quick_test.txt")
    sample_txt2.write_text("Quick test using the convenience function.")

    try:
        result = await parse_document(str(sample_txt2.absolute()))
        print(f"   ✓ Parsed: {result.filename} ({result.word_count} words)")
    finally:
        sample_txt2.unlink(missing_ok=True)

    print()
    print("=" * 80)
    print("Example completed successfully!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
