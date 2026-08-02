import argparse
import json
from pathlib import Path
from typing import Optional

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent


def repository_path(root: Path, value: str) -> Path:
    path = (root / value).resolve()
    path.relative_to(root.resolve())
    return path


def transparent_fraction(alpha: Image.Image) -> float:
    return sum(1 for value in alpha.getdata() if value < 16) / (
        alpha.width * alpha.height
    )


def foreground_bounds(alpha: Image.Image) -> Optional[list[int]]:
    bounds = alpha.getbbox()
    return list(bounds) if bounds is not None else None


def analyze_candidate(path: Path, expected_size: tuple[int, int]) -> dict:
    with Image.open(path) as source:
        image = source.convert("RGBA")
    alpha = image.getchannel("A")
    width, height = image.size
    cell_edges = [round(index * width / 3) for index in range(4)]
    cells = []
    for index in range(3):
        left, right = cell_edges[index], cell_edges[index + 1]
        cell_alpha = alpha.crop((left, 0, right, height))
        bounds = cell_alpha.getbbox()
        foreground_fraction = 1 - transparent_fraction(cell_alpha)
        inset = 16
        cells.append(
            {
                "index": index + 1,
                "foregroundFraction": round(foreground_fraction, 6),
                "foregroundBounds": foreground_bounds(cell_alpha),
                "passes": (
                    bounds is not None
                    and 0.01 <= foreground_fraction <= 0.7
                    and bounds[1] >= inset
                    and bounds[3] <= height - inset
                ),
            }
        )

    gutter_width = 24
    gutters = []
    for edge in cell_edges[1:-1]:
        gutter = alpha.crop(
            (edge - gutter_width // 2, 0, edge + gutter_width // 2, height)
        )
        fraction = transparent_fraction(gutter)
        gutters.append(
            {
                "x": edge,
                "transparentFraction": round(fraction, 6),
                "passes": fraction >= 0.8,
            }
        )

    corner_size = 24
    corners = (
        alpha.crop((0, 0, corner_size, corner_size)),
        alpha.crop((width - corner_size, 0, width, corner_size)),
        alpha.crop((0, height - corner_size, corner_size, height)),
        alpha.crop(
            (width - corner_size, height - corner_size, width, height)
        ),
    )
    corner_transparency = [transparent_fraction(corner) for corner in corners]
    checks = {
        "dimensions": image.size == expected_size,
        "transparentCanvas": transparent_fraction(alpha) >= 0.2,
        "transparentCorners": all(value == 1 for value in corner_transparency),
        "transparentGutters": all(gutter["passes"] for gutter in gutters),
        "threeOccupiedCells": all(cell["passes"] for cell in cells),
    }
    return {
        "path": str(path),
        "width": width,
        "height": height,
        "fileBytes": path.stat().st_size,
        "transparentFraction": round(transparent_fraction(alpha), 6),
        "cornerTransparentFractions": [
            round(value, 6) for value in corner_transparency
        ],
        "gutters": gutters,
        "cells": cells,
        "checks": checks,
        "passes": all(checks.values()),
    }


def build_report(root: Path, manifest_path: Path) -> dict:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    expected_size = (manifest["asset"]["width"], manifest["asset"]["height"])
    candidates = [
        analyze_candidate(
            repository_path(root, candidate["outputPath"]), expected_size
        )
        for candidate in manifest["candidates"]
    ]
    return {
        "schemaVersion": "1.0.0",
        "assetId": manifest["asset"]["id"],
        "promptVersion": manifest["asset"]["promptVersion"],
        "candidates": candidates,
        "passes": all(candidate["passes"] for candidate in candidates),
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Audit transparent three-cell clue atlas candidates."
    )
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--repo-root", type=Path, default=ROOT)
    args = parser.parse_args()
    root = args.repo_root.resolve()
    manifest_path = (
        args.manifest
        if args.manifest.is_absolute()
        else repository_path(root, str(args.manifest))
    )
    output_path = (
        args.output
        if args.output.is_absolute()
        else repository_path(root, str(args.output))
    )
    report = build_report(root, manifest_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    if not report["passes"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
