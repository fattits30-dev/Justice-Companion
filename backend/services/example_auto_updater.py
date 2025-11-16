"""
Example usage of AutoUpdater service.

Demonstrates:
- Checking for updates
- Downloading updates with progress tracking
- Version comparison
- Different update channels (stable, beta, alpha)
- Custom update server configuration
"""

import asyncio
import logging
from pathlib import Path

from backend.services.auto_updater import (
    AutoUpdater,
    AutoUpdaterConfig,
    UpdateChannel,
    format_file_size
)


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def example_basic_update_check():
    """Example: Basic update check."""
    print("\n" + "=" * 60)
    print("EXAMPLE 1: Basic Update Check")
    print("=" * 60)

    # Create updater with default configuration
    config = AutoUpdaterConfig(
        check_on_startup=False,
        channel=UpdateChannel.STABLE
    )

    async with AutoUpdater(
        repo="justice-companion/justice-companion",
        current_version="1.0.0",
        config=config
    ) as updater:
        # Check for updates
        result = await updater.check_for_updates()

        if result.update_available:
            print(f"✓ Update available!")
            print(f"  Current version: {result.current_version}")
            print(f"  Latest version: {result.latest_version}")

            if result.update_info:
                print(f"  Release notes:\n{result.update_info.release_notes[:200]}...")
                print(f"  Published: {result.update_info.published_at}")

                if result.update_info.size_bytes:
                    size = format_file_size(result.update_info.size_bytes)
                    print(f"  Download size: {size}")
        else:
            print(f"✓ Already up to date (version {result.current_version})")

        if result.error:
            print(f"✗ Error: {result.error}")


async def example_download_with_progress():
    """Example: Download update with progress tracking."""
    print("\n" + "=" * 60)
    print("EXAMPLE 2: Download Update with Progress")
    print("=" * 60)

    config = AutoUpdaterConfig(
        check_on_startup=False,
        channel=UpdateChannel.STABLE
    )

    async with AutoUpdater(
        repo="justice-companion/justice-companion",
        current_version="1.0.0",
        config=config
    ) as updater:
        # Check for updates
        result = await updater.check_for_updates()

        if result.update_available and result.update_info:
            print(f"Downloading update {result.latest_version}...")

            # Register progress callback
            def on_progress(percent: float):
                # Print progress bar
                bar_length = 40
                filled = int(bar_length * percent / 100)
                bar = "█" * filled + "░" * (bar_length - filled)
                print(f"\r[{bar}] {percent:.1f}%", end="", flush=True)

            updater.on_download_progress(on_progress)

            # Download update
            download_result = await updater.download_update(result.update_info)

            print()  # New line after progress bar

            if download_result.success:
                print(f"✓ Download successful!")
                print(f"  File: {download_result.file_path}")
                print(f"  Checksum verified: {download_result.checksum_verified}")
            else:
                print(f"✗ Download failed: {download_result.error}")
        else:
            print("No updates available")


async def example_version_comparison():
    """Example: Version comparison."""
    print("\n" + "=" * 60)
    print("EXAMPLE 3: Version Comparison")
    print("=" * 60)

    config = AutoUpdaterConfig(check_on_startup=False)

    async with AutoUpdater(
        repo="justice-companion/justice-companion",
        current_version="1.0.0",
        config=config
    ) as updater:
        versions = [
            ("1.0.0", "1.1.0"),
            ("2.0.0", "1.9.9"),
            ("1.0.0", "1.0.0"),
            ("1.0.0-beta.1", "1.0.0"),
            ("1.0.0", "1.0.0-beta.1"),
        ]

        for v1, v2 in versions:
            result = updater.compare_versions(v1, v2)
            if result < 0:
                symbol = "<"
            elif result > 0:
                symbol = ">"
            else:
                symbol = "=="

            print(f"{v1:15} {symbol} {v2:15}")


async def example_beta_channel():
    """Example: Beta channel updates."""
    print("\n" + "=" * 60)
    print("EXAMPLE 4: Beta Channel Updates")
    print("=" * 60)

    # Configure for beta channel
    config = AutoUpdaterConfig(
        check_on_startup=False,
        channel=UpdateChannel.BETA
    )

    async with AutoUpdater(
        repo="justice-companion/justice-companion",
        current_version="1.0.0",
        config=config
    ) as updater:
        print(f"Update channel: {updater.config.channel.value}")

        result = await updater.check_for_updates()

        if result.update_available:
            print(f"✓ Update available: {result.latest_version}")

            if result.update_info:
                if result.update_info.is_prerelease:
                    print("  ⚠ This is a pre-release version")
        else:
            print("No beta updates available")


async def example_status_monitoring():
    """Example: Monitor updater status."""
    print("\n" + "=" * 60)
    print("EXAMPLE 5: Status Monitoring")
    print("=" * 60)

    config = AutoUpdaterConfig(check_on_startup=False)

    async with AutoUpdater(
        repo="justice-companion/justice-companion",
        current_version="1.0.0",
        config=config
    ) as updater:
        # Get initial status
        status = updater.get_status()
        print("Initial status:")
        print(f"  Current version: {status.current_version}")
        print(f"  Checking: {status.checking}")
        print(f"  Update available: {status.update_available}")

        # Check for updates
        print("\nChecking for updates...")
        result = await updater.check_for_updates()

        # Get updated status
        status = updater.get_status()
        print("\nStatus after check:")
        print(f"  Current version: {status.current_version}")
        print(f"  Latest version: {status.latest_version}")
        print(f"  Update available: {status.update_available}")
        print(f"  Checking: {status.checking}")

        if status.error:
            print(f"  Error: {status.error}")


async def example_custom_update_server():
    """Example: Custom update server."""
    print("\n" + "=" * 60)
    print("EXAMPLE 6: Custom Update Server")
    print("=" * 60)

    # Configure custom update server
    config = AutoUpdaterConfig(
        check_on_startup=False,
        update_server_url="https://updates.example.com/justice-companion"
    )

    async with AutoUpdater(
        repo="justice-companion/justice-companion",
        current_version="1.0.0",
        config=config
    ) as updater:
        print(f"Update source: {updater.get_update_source()}")

        # In production, this would check the custom server
        # For this example, it will fail (server doesn't exist)
        result = await updater.check_for_updates()

        if result.error:
            print(f"Note: Custom server example - error expected")
            print(f"Error: {result.error}")


async def example_startup_check():
    """Example: Check for updates on startup."""
    print("\n" + "=" * 60)
    print("EXAMPLE 7: Startup Update Check")
    print("=" * 60)

    # Configure to check on startup
    config = AutoUpdaterConfig(
        check_on_startup=True,
        channel=UpdateChannel.STABLE
    )

    async with AutoUpdater(
        repo="justice-companion/justice-companion",
        current_version="1.0.0",
        config=config
    ) as updater:
        # Initialize will automatically check for updates
        await updater.initialize()

        # Get status
        status = updater.get_status()

        if status.update_available:
            print(f"✓ Update found during startup: {status.latest_version}")
        else:
            print("✓ Startup check completed - no updates")


async def example_file_size_formatting():
    """Example: File size formatting."""
    print("\n" + "=" * 60)
    print("EXAMPLE 8: File Size Formatting")
    print("=" * 60)

    sizes = [
        512,
        1024,
        1536,
        1048576,
        5242880,
        1073741824,
        5368709120,
    ]

    for size in sizes:
        formatted = format_file_size(size)
        print(f"{size:15,} bytes = {formatted}")


async def main():
    """Run all examples."""
    print("\n" + "=" * 60)
    print("AutoUpdater Service - Example Usage")
    print("=" * 60)

    examples = [
        ("Basic Update Check", example_basic_update_check),
        ("Download with Progress", example_download_with_progress),
        ("Version Comparison", example_version_comparison),
        ("Beta Channel", example_beta_channel),
        ("Status Monitoring", example_status_monitoring),
        ("Custom Update Server", example_custom_update_server),
        ("Startup Check", example_startup_check),
        ("File Size Formatting", example_file_size_formatting),
    ]

    for i, (name, example_func) in enumerate(examples, 1):
        try:
            await example_func()
        except Exception as e:
            print(f"\n✗ Example {i} failed: {e}")
            logger.exception(f"Error in example: {name}")

        # Pause between examples
        if i < len(examples):
            await asyncio.sleep(1)

    print("\n" + "=" * 60)
    print("All examples completed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
