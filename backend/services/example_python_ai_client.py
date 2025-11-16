#!/usr/bin/env python3
"""
Example usage of Python AI Client Service.

Demonstrates:
- Service initialization
- Health checks
- Document text analysis
- Image OCR analysis
- Error handling
- Multi-provider configuration

Author: Justice Companion Team
License: MIT
"""

import asyncio
from pathlib import Path
from typing import Optional

from backend.services.python_ai_client import (
    PythonAIClientService,
    create_python_ai_client_service,
    DocumentAnalysisRequest,
    ImageAnalysisRequest,
    DocumentAnalysisResponse
)
from backend.services.unified_ai_service import (
    AIProviderConfig,
    AIProviderType,
    ParsedDocument,
    UserProfile
)
from fastapi import HTTPException


# ============================================================================
# EXAMPLE 1: Basic Service Initialization
# ============================================================================

async def example_basic_initialization():
    """Example: Initialize service with OpenAI."""
    print("\n" + "="*60)
    print("EXAMPLE 1: Basic Service Initialization")
    print("="*60 + "\n")

    # Method 1: Using factory function (recommended)
    service = create_python_ai_client_service(
        provider="openai",
        api_key="sk-your-api-key-here",
        model="gpt-4-turbo",
        timeout=120,
        max_retries=3
    )

    # Method 2: Using constructor directly
    config = AIProviderConfig(
        provider=AIProviderType.OPENAI,
        api_key="sk-your-api-key-here",
        model="gpt-4-turbo",
        temperature=0.7,
        max_tokens=4096
    )

    service = PythonAIClientService(
        ai_config=config,
        timeout=120,
        max_retries=3,
        retry_delay=1000
    )

    print(f"✓ Service initialized with {config.provider.value}/{config.model}")

    return service


# ============================================================================
# EXAMPLE 2: Health Checks
# ============================================================================

async def example_health_checks(service: PythonAIClientService):
    """Example: Check service health and availability."""
    print("\n" + "="*60)
    print("EXAMPLE 2: Health Checks")
    print("="*60 + "\n")

    # Check availability
    is_available = await service.is_available()
    print(f"Service available: {is_available}")

    # Get detailed health status
    health = await service.get_health()
    print(f"\nHealth Status:")
    print(f"  Status: {health.status}")
    print(f"  Service: {health.service}")
    print(f"  Version: {health.version}")
    print(f"  AI Provider: {health.ai_provider}")
    print(f"  Model Ready: {health.model_ready}")
    print(f"  Timestamp: {health.timestamp}")

    # Get service information
    info = await service.get_info()
    print(f"\nService Info:")
    print(f"  API Version: {info.api_version}")
    print(f"  Model Provider: {info.model_provider}")
    print(f"  Available Agents: {', '.join(info.available_agents)}")


# ============================================================================
# EXAMPLE 3: Document Text Analysis
# ============================================================================

async def example_document_analysis(service: PythonAIClientService):
    """Example: Analyze document text and extract case data."""
    print("\n" + "="*60)
    print("EXAMPLE 3: Document Text Analysis")
    print("="*60 + "\n")

    # Create parsed document (would come from document parser in real usage)
    document = ParsedDocument(
        filename="employment_contract.pdf",
        text="""
        EMPLOYMENT CONTRACT

        This Employment Contract is entered into on January 15, 2024,
        between ABC Corporation Ltd ("Employer") and John Smith ("Employee").

        Position: Senior Software Engineer
        Salary: £65,000 per annum
        Start Date: February 1, 2024
        Location: London Office, UK

        TERMS AND CONDITIONS:

        1. Notice Period: Either party may terminate this employment with
           30 days written notice.

        2. Probation Period: The first 3 months shall be a probationary period.

        3. Working Hours: Standard working hours are 9:00 AM to 5:30 PM,
           Monday to Friday.

        The Employee acknowledges receipt of the Employee Handbook and
        agrees to comply with all company policies.

        Signed: _______________     Date: _______________
                (Employer)

        Signed: _______________     Date: _______________
                (Employee)
        """,
        word_count=145,
        file_type="pdf"
    )

    # Create user profile
    user_profile = UserProfile(
        name="John Smith",
        email="john.smith@example.com"
    )

    # Create analysis request
    request = DocumentAnalysisRequest(
        document=document,
        user_profile=user_profile,
        session_id="example-session-uuid-12345",
        user_question="What are the key terms of this employment contract?"
    )

    try:
        # Analyze document
        print("Analyzing document...")
        result = await service.analyze_document(request)

        # Display conversational analysis
        print(f"\n{'─'*60}")
        print("CONVERSATIONAL ANALYSIS")
        print('─'*60)
        print(result.analysis)

        # Display structured case data
        print(f"\n{'─'*60}")
        print("EXTRACTED CASE DATA")
        print('─'*60)
        case_data = result.suggested_case_data
        print(f"Title: {case_data.title}")
        print(f"Case Type: {case_data.case_type}")
        print(f"Description: {case_data.description}")
        print(f"Claimant: {case_data.claimant_name}")
        print(f"Opposing Party: {case_data.opposing_party or 'N/A'}")
        print(f"Case Number: {case_data.case_number or 'N/A'}")
        print(f"Court Name: {case_data.court_name or 'N/A'}")

        # Display confidence scores
        print(f"\n{'─'*60}")
        print("CONFIDENCE SCORES")
        print('─'*60)
        confidence = case_data.confidence
        print(f"Title: {confidence.title:.2%}")
        print(f"Case Type: {confidence.case_type:.2%}")
        print(f"Description: {confidence.description:.2%}")
        print(f"Opposing Party: {confidence.opposing_party:.2%}")
        print(f"Case Number: {confidence.case_number:.2%}")

        # Display metadata
        print(f"\n{'─'*60}")
        print("METADATA")
        print('─'*60)
        if result.metadata:
            print(f"Provider: {result.metadata.get('provider')}")
            print(f"Model: {result.metadata.get('model')}")
            print(f"Timestamp: {result.metadata.get('timestamp')}")

    except HTTPException as e:
        print(f"❌ Error: {e.detail} (status: {e.status_code})")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")


# ============================================================================
# EXAMPLE 4: Image OCR Analysis
# ============================================================================

async def example_image_ocr_analysis(service: PythonAIClientService):
    """Example: Analyze scanned image with OCR."""
    print("\n" + "="*60)
    print("EXAMPLE 4: Image OCR Analysis")
    print("="*60 + "\n")

    # NOTE: This requires a real image file and Tesseract OCR installed
    image_path = "/path/to/scanned_contract.jpg"

    # Check if test image exists (skip if not)
    if not Path(image_path).exists():
        print(f"⚠ Skipping: Test image not found at {image_path}")
        print("To run this example:")
        print("1. Install Tesseract OCR")
        print("2. Create a test image with text")
        print("3. Update image_path variable")
        return

    # Create image analysis request
    request = ImageAnalysisRequest(
        image_path=image_path,
        user_name="Alice Johnson",
        session_id="example-session-uuid-67890",
        user_email="alice@example.com",
        user_question="What does this document contain?"
    )

    try:
        # Analyze image
        print(f"Analyzing image: {Path(image_path).name}")
        print("Running OCR preprocessing...")
        result = await service.analyze_image(request)

        # Display OCR metadata
        print(f"\n{'─'*60}")
        print("OCR RESULTS")
        print('─'*60)
        ocr_metadata = result.metadata.get("ocr", {})
        print(f"Confidence: {ocr_metadata.get('confidence', 0):.2%}")
        print(f"Words Extracted: {ocr_metadata.get('word_count', 0)}")
        print(f"Language: {ocr_metadata.get('language', 'unknown')}")
        print(f"Preprocessing Steps: {', '.join(ocr_metadata.get('preprocessing', []))}")

        # Display conversational analysis
        print(f"\n{'─'*60}")
        print("ANALYSIS")
        print('─'*60)
        print(result.analysis)

        # Display extracted case data
        print(f"\n{'─'*60}")
        print("EXTRACTED CASE DATA")
        print('─'*60)
        case_data = result.suggested_case_data
        print(f"Title: {case_data.title}")
        print(f"Case Type: {case_data.case_type}")
        print(f"Claimant: {case_data.claimant_name}")
        print(f"Opposing Party: {case_data.opposing_party or 'N/A'}")

    except HTTPException as e:
        if e.status_code == 503 and "Tesseract" in e.detail:
            print("❌ Tesseract OCR not installed")
            print("\nInstallation instructions:")
            print("  Ubuntu/Debian: sudo apt-get install tesseract-ocr")
            print("  macOS: brew install tesseract")
            print("  Windows: Download from GitHub (see README)")
        else:
            print(f"❌ Error: {e.detail} (status: {e.status_code})")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")


# ============================================================================
# EXAMPLE 5: Error Handling
# ============================================================================

async def example_error_handling(service: PythonAIClientService):
    """Example: Handle various error scenarios."""
    print("\n" + "="*60)
    print("EXAMPLE 5: Error Handling")
    print("="*60 + "\n")

    # Scenario 1: Invalid file path
    print("Scenario 1: Invalid file path")
    try:
        request = ImageAnalysisRequest(
            image_path="/nonexistent/file.jpg",
            user_name="Test User",
            session_id="test-session"
        )
        print("❌ Should have raised ValueError")
    except ValueError as e:
        print(f"✓ Caught expected error: {e}")

    # Scenario 2: Empty document text
    print("\nScenario 2: Empty document text")
    try:
        request = DocumentAnalysisRequest(
            document=ParsedDocument(
                filename="empty.txt",
                text="",
                word_count=0,
                file_type="txt"
            ),
            user_profile=UserProfile(name="Test User"),
            session_id="test-session"
        )

        result = await service.analyze_document(request)
        print(f"✓ Handled empty document: {result.suggested_case_data.title}")

    except HTTPException as e:
        print(f"✓ Caught HTTPException: {e.detail}")

    # Scenario 3: Service unavailable (with retries)
    print("\nScenario 3: Service with retries")
    print(f"Max retries configured: {service.max_retries}")
    print(f"Retry delay: {service.retry_delay_ms}ms")
    print("Note: Retries happen automatically for 5xx errors and 429 rate limits")


# ============================================================================
# EXAMPLE 6: Multi-Provider Configuration
# ============================================================================

async def example_multi_provider():
    """Example: Configure different AI providers."""
    print("\n" + "="*60)
    print("EXAMPLE 6: Multi-Provider Configuration")
    print("="*60 + "\n")

    # OpenAI (GPT-4)
    print("Provider 1: OpenAI GPT-4")
    openai_service = create_python_ai_client_service(
        provider="openai",
        api_key="sk-your-openai-key",
        model="gpt-4-turbo",
        temperature=0.7
    )
    info = await openai_service.get_info()
    print(f"  Model Provider: {info.model_provider}")
    print(f"  Available Agents: {len(info.available_agents)}")

    # Anthropic (Claude)
    print("\nProvider 2: Anthropic Claude")
    anthropic_service = create_python_ai_client_service(
        provider="anthropic",
        api_key="sk-ant-your-anthropic-key",
        model="claude-3-5-sonnet-20241022",
        temperature=0.7
    )
    info = await anthropic_service.get_info()
    print(f"  Model Provider: {info.model_provider}")

    # HuggingFace (Llama - Privacy-first, ~£9/month)
    print("\nProvider 3: HuggingFace Llama (Privacy-first)")
    huggingface_service = create_python_ai_client_service(
        provider="huggingface",
        api_key="hf_your-huggingface-key",
        model="meta-llama/Meta-Llama-3.1-70B-Instruct",
        temperature=0.3
    )
    info = await huggingface_service.get_info()
    print(f"  Model Provider: {info.model_provider}")
    print(f"  Cost: ~£9/month (privacy-first option)")


# ============================================================================
# EXAMPLE 7: FastAPI Integration
# ============================================================================

async def example_fastapi_integration():
    """Example: Use service in FastAPI endpoint."""
    print("\n" + "="*60)
    print("EXAMPLE 7: FastAPI Integration")
    print("="*60 + "\n")

    print("FastAPI endpoint example:")
    print("""
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from backend.services.python_ai_client import (
    PythonAIClientService,
    DocumentAnalysisRequest,
    ImageAnalysisRequest
)

app = FastAPI()

# Initialize service (typically in startup event)
ai_service: Optional[PythonAIClientService] = None

@app.on_event("startup")
async def startup():
    global ai_service
    ai_service = create_python_ai_client_service(
        provider="openai",
        api_key=os.getenv("OPENAI_API_KEY"),
        model="gpt-4-turbo"
    )

@app.get("/health")
async def health_check():
    if not ai_service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    health = await ai_service.get_health()
    return health

@app.post("/api/v1/analyze-document")
async def analyze_document(request: DocumentAnalysisRequest):
    if not ai_service:
        raise HTTPException(status_code=503, detail="Service not initialized")
    result = await ai_service.analyze_document(request)
    return result

@app.post("/api/v1/analyze-image")
async def analyze_image(
    file: UploadFile = File(...),
    user_name: str = Form(...),
    session_id: str = Form(...),
    user_email: Optional[str] = Form(None),
    user_question: Optional[str] = Form(None)
):
    if not ai_service:
        raise HTTPException(status_code=503, detail="Service not initialized")

    # Save uploaded file temporarily
    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(await file.read())

    # Analyze image
    request = ImageAnalysisRequest(
        image_path=temp_path,
        user_name=user_name,
        session_id=session_id,
        user_email=user_email,
        user_question=user_question
    )

    result = await ai_service.analyze_image(request)

    # Clean up temp file
    os.remove(temp_path)

    return result
    """)


# ============================================================================
# MAIN FUNCTION
# ============================================================================

async def main():
    """Run all examples."""
    print("╔" + "="*58 + "╗")
    print("║" + " "*10 + "Python AI Client Service Examples" + " "*14 + "║")
    print("╚" + "="*58 + "╝")

    try:
        # Example 1: Initialize service
        service = await example_basic_initialization()

        # Example 2: Health checks
        await example_health_checks(service)

        # Example 3: Document analysis
        await example_document_analysis(service)

        # Example 4: Image OCR (requires Tesseract)
        await example_image_ocr_analysis(service)

        # Example 5: Error handling
        await example_error_handling(service)

        # Example 6: Multi-provider
        await example_multi_provider()

        # Example 7: FastAPI integration
        await example_fastapi_integration()

        print("\n" + "="*60)
        print("✓ All examples completed successfully!")
        print("="*60 + "\n")

    except Exception as e:
        print(f"\n❌ Example failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Run async examples
    asyncio.run(main())
