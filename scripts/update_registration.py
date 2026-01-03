#!/usr/bin/env python3
"""Legacy script for the old React frontend (deprecated)."""
import sys


def main() -> int:
    print(
        "This script targeted the legacy React RegistrationScreen.tsx.\n"
        "The frontend is now Flutter; update screens in lib/ instead."
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
