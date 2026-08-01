import argparse
import json
from pathlib import Path
from statistics import fmean

from PIL import Image, ImageChops, ImageStat


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_LAYOUT = ROOT / "art" / "world-map-layout.json"


def repository_path(root: Path, value: str) -> Path:
    path = (root / value).resolve()
    path.relative_to(root.resolve())
    return path


def region_center(region: dict) -> tuple[float, float]:
    if "center" in region:
        return region["center"]["x"], region["center"]["y"]
    bounds = region["bounds"]
    return (
        (bounds["xMin"] + bounds["xMax"]) / 2,
        (bounds["yMin"] + bounds["yMax"]) / 2,
    )


def topology_checks(layout: dict) -> dict:
    regions = layout["regions"]
    house = region_center(regions["marthaCompound"])
    village = region_center(regions["village"])
    meeting = region_center(regions["meetingArea"])
    camp = region_center(regions["jesusCamp"])
    garden = region_center(regions["tombGarden"])
    route = regions["tombRoute"]["points"]
    garden_bounds = regions["tombGarden"]["bounds"]
    checks = {
        "houseLeftAndBelowVillage": house[0] < village[0] and house[1] > village[1],
        "meetingRightOfVillage": meeting[0] > village[0],
        "campRightAndBelowMeeting": camp[0] > meeting[0] and camp[1] > meeting[1],
        "gardenRightAndAboveVillage": garden[0] > village[0] and garden[1] < village[1],
        "uplandRouteMovesEast": all(
            first["x"] < second["x"] for first, second in zip(route, route[1:])
        ),
        "uplandRouteMovesNorth": all(
            first["y"] > second["y"] for first, second in zip(route, route[1:])
        ),
        "routeEndsAtGardenEdge": (
            garden_bounds["xMin"] <= route[-1]["x"] <= garden_bounds["xMax"]
            and garden_bounds["yMin"] <= route[-1]["y"] <= garden_bounds["yMax"]
        ),
    }
    return {"checks": checks, "passes": all(checks.values())}


def blank_fraction(image: Image.Image) -> float:
    rgba = image.convert("RGBA")
    pixels = rgba.getdata()
    blank = sum(
        1
        for red, green, blue, alpha in pixels
        if alpha < 250 or (red > 248 and green > 248 and blue > 248)
    )
    return blank / (rgba.width * rgba.height)


def border_image(image: Image.Image, width: int) -> Image.Image:
    strips = (
        image.crop((0, 0, image.width, width)),
        image.crop((0, image.height - width, image.width, image.height)),
        image.crop((0, width, width, image.height - width)),
        image.crop((image.width - width, width, image.width, image.height - width)),
    )
    result = Image.new("RGBA", (sum(strip.width for strip in strips), width))
    cursor = 0
    for strip in strips:
        normalized = strip.convert("RGBA").resize(
            (strip.width, width), Image.Resampling.BILINEAR
        )
        result.paste(normalized, (cursor, 0))
        cursor += normalized.width
    return result


def regional_activity(image: Image.Image, layout: dict) -> dict:
    results = {}
    for name, region in layout["regions"].items():
        bounds = region.get("bounds")
        if bounds is None:
            continue
        crop = image.crop(
            (bounds["xMin"], bounds["yMin"], bounds["xMax"], bounds["yMax"])
        ).convert("L")
        deviation = ImageStat.Stat(crop).stddev[0]
        results[name] = {
            "lumaStdDev": round(deviation, 3),
            "blankFraction": round(blank_fraction(crop), 6),
            "passes": deviation >= 4 and blank_fraction(crop) <= 0.01,
        }
    return results


def seam_ratios(image: Image.Image) -> dict:
    sample = image.convert("RGB").resize((340, 192), Image.Resampling.LANCZOS)
    horizontal = ImageChops.difference(
        sample.crop((0, 1, sample.width, sample.height)),
        sample.crop((0, 0, sample.width, sample.height - 1)),
    ).convert("L")
    vertical = ImageChops.difference(
        sample.crop((1, 0, sample.width, sample.height)),
        sample.crop((0, 0, sample.width - 1, sample.height)),
    ).convert("L")
    global_difference = max(
        1.0,
        fmean(
            [
                ImageStat.Stat(horizontal).mean[0],
                ImageStat.Stat(vertical).mean[0],
            ]
        ),
    )
    ratios = {}
    for fraction in (0.25, 0.5, 0.75):
        x = min(vertical.width - 1, round(vertical.width * fraction))
        y = min(horizontal.height - 1, round(horizontal.height * fraction))
        ratios[f"vertical{round(fraction * 100)}"] = round(
            ImageStat.Stat(vertical.crop((x, 0, x + 1, vertical.height))).mean[0]
            / global_difference,
            3,
        )
        ratios[f"horizontal{round(fraction * 100)}"] = round(
            ImageStat.Stat(horizontal.crop((0, y, horizontal.width, y + 1))).mean[0]
            / global_difference,
            3,
        )
    return ratios


def analyze_candidate(path: Path, layout: dict) -> dict:
    expected_size = (layout["canvas"]["width"], layout["canvas"]["height"])
    with Image.open(path) as source:
        image = source.convert("RGBA")
    blank = blank_fraction(image)
    border_blank = blank_fraction(border_image(image, layout["canvas"]["safeBorder"]))
    seams = seam_ratios(image)
    regions = regional_activity(image, layout)
    checks = {
        "dimensions": image.size == expected_size,
        "filledCanvas": blank <= 0.01,
        "filledSafeBorder": border_blank <= 0.01,
        "continuousPlate": max(seams.values()) <= 4,
        "regionalActivity": all(result["passes"] for result in regions.values()),
    }
    return {
        "path": str(path),
        "width": image.width,
        "height": image.height,
        "fileBytes": path.stat().st_size,
        "blankFraction": round(blank, 6),
        "safeBorderBlankFraction": round(border_blank, 6),
        "seamRatios": seams,
        "regions": regions,
        "checks": checks,
        "passes": all(checks.values()),
    }


def build_report(root: Path, manifest_path: Path, layout_path: Path) -> dict:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    layout = json.loads(layout_path.read_text(encoding="utf-8"))
    candidates = [
        analyze_candidate(repository_path(root, candidate["outputPath"]), layout)
        for candidate in manifest["candidates"]
    ]
    topology = topology_checks(layout)
    return {
        "schemaVersion": "1.0.0",
        "assetId": manifest["asset"]["id"],
        "promptVersion": manifest["asset"]["promptVersion"],
        "layoutContract": str(layout_path),
        "topology": topology,
        "candidates": candidates,
        "passes": topology["passes"] and all(item["passes"] for item in candidates),
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Audit continuous world-map candidates against the locked layout."
    )
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--layout", type=Path, default=DEFAULT_LAYOUT)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--repo-root", type=Path, default=ROOT)
    args = parser.parse_args()
    root = args.repo_root.resolve()
    manifest_path = (
        args.manifest
        if args.manifest.is_absolute()
        else repository_path(root, str(args.manifest))
    )
    layout_path = (
        args.layout
        if args.layout.is_absolute()
        else repository_path(root, str(args.layout))
    )
    output_path = (
        args.output
        if args.output.is_absolute()
        else repository_path(root, str(args.output))
    )
    report = build_report(root, manifest_path, layout_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    if not report["passes"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
