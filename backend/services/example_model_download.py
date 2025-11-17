"""
Example usage of ModelDownloadService.

This script demonstrates how to:
1. Initialize the service
2. List available models
3. Download a model with progress tracking
4. Verify downloaded model integrity
5. Manage downloaded models

Run this script:
    python backend/services/example_model_download.py
"""

import asyncio
from pathlib import Path
from backend.services.model_download_service import (
    ModelDownloadService,
    DownloadProgress,
    DownloadStatus,
)


def format_bytes(bytes_value: int) -> str:
    """Format bytes as human-readable string."""
    for unit in ["B", "KB", "MB", "GB"]:
        if bytes_value < 1024.0:
            return f"{bytes_value:.2f} {unit}"
        bytes_value /= 1024.0
    return f"{bytes_value:.2f} TB"


def format_speed(bytes_per_sec: float) -> str:
    """Format download speed as human-readable string."""
    return format_bytes(int(bytes_per_sec)) + "/s"


async def progress_callback(progress: DownloadProgress):
    """
    Callback function for download progress updates.

    Args:
        progress: DownloadProgress object with current download state
    """
    if progress.status == DownloadStatus.DOWNLOADING:
        print(
            f"  Progress: {progress.percentage:.1f}% | "
            f"Downloaded: {format_bytes(progress.downloaded_bytes)} / "
            f"{format_bytes(progress.total_bytes)} | "
            f"Speed: {format_speed(progress.speed)}"
        )
    elif progress.status == DownloadStatus.COMPLETE:
        print(f"  ✓ Download complete!")
    elif progress.status == DownloadStatus.ERROR:
        print(f"  ✗ Download failed: {progress.error}")


async def main():
    """Main demonstration function."""
    print("=" * 70)
    print("ModelDownloadService - Usage Example")
    print("=" * 70)
    print()

    # Initialize service
    models_dir = Path.home() / ".justice-companion" / "models"
    print(f"1. Initializing service...")
    print(f"   Models directory: {models_dir}")
    print()

    service = ModelDownloadService(
        models_dir=str(models_dir), audit_logger=None  # Optional: pass AuditLogger instance
    )

    # List available models
    print("2. Available models in catalog:")
    print()
    available_models = service.get_available_models()

    for model in available_models:
        recommended = "⭐ RECOMMENDED" if model["recommended"] else ""
        print(f"   • {model['name']} {recommended}")
        print(f"     ID: {model['id']}")
        print(f"     Size: {format_bytes(model['size'])}")
        print(f"     Description: {model['description']}")
        print()

    # Check downloaded models
    print("3. Already downloaded models:")
    print()
    downloaded = service.get_downloaded_models()

    if downloaded:
        for model in downloaded:
            model_path = service.get_model_path(model["id"])
            print(f"   ✓ {model['name']}")
            print(f"     Path: {model_path}")
            print()
    else:
        print("   (none)")
        print()

    # Download recommended model
    recommended_model = next((m for m in available_models if m["recommended"]), None)

    if recommended_model:
        model_id = recommended_model["id"]
        model_name = recommended_model["name"]

        print(f"4. Checking if {model_name} needs to be downloaded...")
        print()

        if service.is_model_downloaded(model_id):
            print(f"   ℹ Model already downloaded: {model_id}")
            print()
        else:
            print(f"   Downloading {model_name}...")
            print(f"   Size: {format_bytes(recommended_model['size'])}")
            print()

            # Download with progress tracking
            success = await service.download_model(
                model_id=model_id, progress_callback=progress_callback, user_id="demo-user"
            )

            print()
            if success:
                print(f"   ✓ Download successful!")
                model_path = service.get_model_path(model_id)
                print(f"   Model path: {model_path}")
            else:
                print(f"   ✗ Download failed!")
            print()

    # Verify model integrity
    if downloaded or (recommended_model and service.is_model_downloaded(recommended_model["id"])):
        model_to_verify = downloaded[0]["id"] if downloaded else recommended_model["id"]

        print(f"5. Verifying model integrity: {model_to_verify}")
        print()

        verification = await service.verify_model(model_to_verify)

        if verification["valid"]:
            print(f"   ✓ Model verified successfully!")
            print(f"     File size: {format_bytes(verification['actual_size'])}")
            if "checksum_match" in verification:
                print(f"     Checksum: {verification['calculated_hash'][:16]}...")
        else:
            print(f"   ✗ Verification failed!")
            if "error" in verification:
                print(f"     Error: {verification['error']}")
            elif not verification.get("size_match"):
                print(
                    f"     Size mismatch: expected {format_bytes(verification['expected_size'])}, "
                    f"got {format_bytes(verification['actual_size'])}"
                )
            elif not verification.get("checksum_match"):
                print(f"     Checksum mismatch!")
        print()

    # Demonstrate deletion (optional, commented out)
    print("6. Model management operations:")
    print()
    print("   To delete a model, use:")
    print(f"   >>> await service.delete_model('{model_id}')")
    print()
    print("   To list all downloaded models:")
    print(f"   >>> service.get_downloaded_models()")
    print()

    # Summary
    print("=" * 70)
    print("Summary")
    print("=" * 70)
    print()
    print(f"Models directory: {service.get_models_dir()}")
    print(f"Available models: {len(available_models)}")
    print(f"Downloaded models: {len(service.get_downloaded_models())}")
    print()


async def download_specific_model(model_id: str):
    """
    Download a specific model by ID.

    Args:
        model_id: Model identifier (e.g., "qwen3-8b-q4")

    Example:
        asyncio.run(download_specific_model("qwen3-8b-q4"))
    """
    models_dir = Path.home() / ".justice-companion" / "models"
    service = ModelDownloadService(models_dir=str(models_dir))

    print(f"Downloading model: {model_id}")
    print()

    success = await service.download_model(model_id=model_id, progress_callback=progress_callback)

    if success:
        model_path = service.get_model_path(model_id)
        print(f"\n✓ Model downloaded to: {model_path}")
    else:
        print(f"\n✗ Download failed!")


async def verify_all_models():
    """
    Verify integrity of all downloaded models.

    Example:
        asyncio.run(verify_all_models())
    """
    models_dir = Path.home() / ".justice-companion" / "models"
    service = ModelDownloadService(models_dir=str(models_dir))

    downloaded = service.get_downloaded_models()

    if not downloaded:
        print("No models downloaded.")
        return

    print(f"Verifying {len(downloaded)} model(s)...")
    print()

    for model in downloaded:
        model_id = model["id"]
        print(f"Checking {model['name']}...")

        verification = await service.verify_model(model_id)

        if verification["valid"]:
            print(f"  ✓ Valid")
        else:
            print(f"  ✗ Invalid: {verification.get('error', 'Unknown error')}")
        print()


if __name__ == "__main__":
    # Run main demonstration
    asyncio.run(main())

    # Uncomment to download specific model:
    # asyncio.run(download_specific_model("qwen3-8b-q4"))

    # Uncomment to verify all downloaded models:
    # asyncio.run(verify_all_models())
