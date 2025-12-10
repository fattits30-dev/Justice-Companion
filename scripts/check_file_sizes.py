#!/usr/bin/env python3
"""Fail fast when Python modules exceed the configured line budget."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Iterable, List, Set

DEFAULT_EXCLUDES = {
    "backend/venv",
    "__pycache__",
    ".mypy_cache",
    ".pytest_cache",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ensure Python files stay below the configured line limit",
    )
    parser.add_argument(
        "--path",
        type=Path,
        default=Path("."),
        help="Root directory to scan (default: current directory)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=600,
        help="Maximum allowed lines per file (default: 600)",
    )
    parser.add_argument(
        "--extensions",
        nargs="+",
        default=[".py"],
        help="File extensions to include (default: .py)",
    )
    parser.add_argument(
        "--exclude",
        nargs="*",
        default=[],
        help="Paths (substring match) to skip during the scan",
    )
    parser.add_argument(
        "--baseline",
        type=Path,
        default=None,
        help="Optional file listing relative paths allowed to exceed the limit",
    )
    return parser.parse_args()


def should_skip(path: Path, patterns: Iterable[str]) -> bool:
    posix = path.as_posix()
    return any(token and token in posix for token in patterns)


def count_lines(path: Path) -> int:
    with path.open("r", encoding="utf-8") as handle:
        return sum(1 for _ in handle)


def load_baseline(baseline_path: Path | None, root: Path) -> Set[str]:
    allowed: Set[str] = set()
    if not baseline_path:
        return allowed
    if not baseline_path.exists():
        print(
            f"[file-size-check] Baseline file not found: {baseline_path}",
            file=sys.stderr,
        )
        return allowed

    for raw_line in baseline_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        allowed.add(line.replace("\\", "/"))
    return allowed


def collect_large_files(
    root: Path,
    limit: int,
    extensions: Iterable[str],
    exclude_patterns: Iterable[str],
    baseline_paths: Set[str],
) -> List[tuple[Path, int]]:
    results: List[tuple[Path, int]] = []
    for file_path in root.rglob("*"):
        if not file_path.is_file():
            continue
        if file_path.suffix not in extensions:
            continue
        if should_skip(file_path, exclude_patterns):
            continue
        line_count = count_lines(file_path)
        if line_count > limit:
            rel_path = file_path.relative_to(root).as_posix()
            if rel_path in baseline_paths:
                continue
            results.append((file_path, line_count))
    return results


def main() -> int:
    args = parse_args()
    root = args.path.resolve()
    if not root.exists():
        print(f"[file-size-check] Path not found: {root}", file=sys.stderr)
        return 2

    exclude_patterns = set(DEFAULT_EXCLUDES)
    exclude_patterns.update(args.exclude)
    baseline_paths = load_baseline(args.baseline, root)

    offenders = collect_large_files(
        root=root,
        limit=args.limit,
        extensions=args.extensions,
        exclude_patterns=exclude_patterns,
        baseline_paths=baseline_paths,
    )

    if offenders:
        print("\n⚠️  File size check failed:\n")
        for file_path, line_count in sorted(
            offenders, key=lambda item: item[1], reverse=True
        ):
            rel_path = file_path.relative_to(root)
            print(f" - {rel_path} has {line_count} lines (limit {args.limit})")
        print(
            "\nReduce the scope of the files above or raise the threshold intentionally.\n"
        )
        return 1

    print(
        f"✅ All scanned files under {root} are within the {args.limit}-line limit.",
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
