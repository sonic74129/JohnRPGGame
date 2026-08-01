import argparse
import json
import os
from pathlib import Path
from typing import Optional

from PIL import Image, ImageDraw

from art.processors import (
    FAMILY_PROFILES,
    build_processing_plan,
    describe_profile,
    execute_processing,
    parse_size,
)


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "production" / "art-source"
OUTPUT = ROOT / "public" / "assets" / "art"
PROPS = OUTPUT / "props"
WORLD = OUTPUT / "world"

PROP_SOURCES = (
    "props-house-source.png",
    "props-village-road-source.png",
    "props-tomb-source.png",
)
WORLD_SOURCES = (
    "tileset-bethany-ground-source.png",
    "objects-bethany-world-source.png",
)
WORLD_TILE_NAMES = (
    "earth-a",
    "earth-b",
    "earth-grass",
    "earth-rocky",
    "dirt-road-vertical",
    "dirt-road-horizontal",
    "dirt-road-corner-ne",
    "dirt-road-t-s",
    "dirt-road-cross",
    "stone-road-vertical",
    "stone-road-horizontal",
    "stone-road-corner-ne",
    "stone-road-t-s",
    "stone-road-cross",
    "road-transition-vertical",
    "road-transition-horizontal",
)
WORLD_OBJECT_NAMES = (
    "martha-house-base",
    "martha-house-roof",
    "village-house-a",
    "village-house-b",
    "tomb-entrance",
    "village-well",
    "market-canopy",
    "market-table",
    "world-wall",
    "world-wall-corner",
    "world-wall-end",
    "world-cliff-edge",
    "door-threshold",
    "world-road-marker",
    "world-rock-ledge",
    "world-olive-tree",
)


def crop_cell(image: Image.Image, columns: int, rows: int, column: int, row: int) -> Image.Image:
    left = round(column * image.width / columns)
    right = round((column + 1) * image.width / columns)
    top = round(row * image.height / rows)
    bottom = round((row + 1) * image.height / rows)
    return image.crop((left, top, right, bottom)).convert("RGBA")


def remove_connected_background(image: Image.Image, threshold: int = 90) -> Image.Image:
    result = image.copy()
    draw = ImageDraw.Draw(result)
    transparent = (0, 0, 0, 0)
    corners = (
        (0, 0),
        (result.width - 1, 0),
        (0, result.height - 1),
        (result.width - 1, result.height - 1),
    )
    for corner in corners:
        ImageDraw.floodfill(result, corner, transparent, thresh=threshold)
    return result


def remove_magenta_key(image: Image.Image) -> Image.Image:
    result = image.copy()
    pixels = result.load()
    for y in range(result.height):
        for x in range(result.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha <= 0:
                continue
            magenta_excess = min(red, blue) - green
            if magenta_excess <= 20:
                continue

            strength = min(1.0, magenta_excess / 170)
            cleaned_alpha = round(alpha * (1 - strength))
            if cleaned_alpha < 20:
                pixels[x, y] = transparent_color()
                continue

            pixels[x, y] = (
                max(0, red - round(magenta_excess * 0.85)),
                green,
                max(0, blue - round(magenta_excess * 0.85)),
                cleaned_alpha,
            )
    return result


def transparent_color() -> tuple[int, int, int, int]:
    return (0, 0, 0, 0)


def process_prop_sheet(
    filename: str,
    columns: int,
    rows: int,
    names: tuple[str, ...],
) -> None:
    image = Image.open(SOURCE / filename)
    if len(names) != columns * rows:
        raise ValueError(f"{filename} names do not match its grid.")

    PROPS.mkdir(parents=True, exist_ok=True)
    for index, name in enumerate(names):
        cell = crop_cell(image, columns, rows, index % columns, index // columns)
        cleaned = remove_magenta_key(remove_connected_background(cell))
        alpha_box = cleaned.getchannel("A").getbbox()
        if alpha_box is None:
            raise ValueError(f"No foreground found for {filename}:{name}.")
        cleaned.crop(alpha_box).save(PROPS / f"{name}.png", optimize=True)


def process_world_ground() -> None:
    image = Image.open(SOURCE / WORLD_SOURCES[0]).convert("RGB")
    tile_size = 32
    columns = 4
    rows = 4
    sheet = Image.new("RGB", (columns * tile_size, rows * tile_size))
    tile_directory = WORLD / "tiles"
    tile_directory.mkdir(parents=True, exist_ok=True)

    for index, name in enumerate(WORLD_TILE_NAMES):
        tile = crop_cell(image, columns, rows, index % columns, index // columns)
        inset = max(4, round(min(tile.width, tile.height) * 0.04))
        tile = tile.crop(
            (inset, inset, tile.width - inset, tile.height - inset),
        ).convert("RGB").resize(
            (tile_size, tile_size),
            Image.Resampling.LANCZOS,
        )
        tile.save(tile_directory / f"{name}.png", optimize=True)
        sheet.paste(tile, ((index % columns) * tile_size, (index // columns) * tile_size))

    WORLD.mkdir(parents=True, exist_ok=True)
    sheet.save(WORLD / "tileset-bethany-ground.png", optimize=True)
    manifest = {
        "tileWidth": tile_size,
        "tileHeight": tile_size,
        "columns": columns,
        "rows": rows,
        "tiles": [
            {"id": index, "name": name}
            for index, name in enumerate(WORLD_TILE_NAMES)
        ],
    }
    (WORLD / "tileset-bethany-ground.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )


def process_world_objects() -> None:
    image = Image.open(SOURCE / WORLD_SOURCES[1])
    object_directory = WORLD / "objects"
    object_directory.mkdir(parents=True, exist_ok=True)
    manifest = []

    for index, name in enumerate(WORLD_OBJECT_NAMES):
        cell = crop_cell(image, 4, 4, index % 4, index // 4)
        cleaned = remove_magenta_key(remove_connected_background(cell))
        alpha_box = cleaned.getchannel("A").getbbox()
        if alpha_box is None:
            raise ValueError(f"No foreground found for world object {name}.")
        output = cleaned.crop(alpha_box)
        output.save(object_directory / f"{name}.png", optimize=True)
        manifest.append(
            {
                "name": name,
                "file": f"objects/{name}.png",
                "width": output.width,
                "height": output.height,
            }
        )

    (WORLD / "objects-bethany-world.json").write_text(
        json.dumps({"objects": manifest}, indent=2) + "\n",
        encoding="utf-8",
    )


def run_legacy(
    category: Optional[str],
    resampling: str = "lanczos",
) -> None:
    if category not in (None, "prop", "world"):
        raise ValueError("ART_CATEGORY must be 'prop' or 'world'.")

    prop_sources_available = all((SOURCE / name).exists() for name in PROP_SOURCES)
    if category == "prop" and not prop_sources_available:
        missing = [name for name in PROP_SOURCES if not (SOURCE / name).exists()]
        raise FileNotFoundError(f"Missing prop source atlases: {', '.join(missing)}")

    if category == "prop" or (category is None and prop_sources_available):
        process_prop_sheet(
            "props-house-source.png",
            4,
            3,
            (
                "house-bed",
                "house-lamp",
                "house-water-bowl",
                "house-table",
                "house-stool-a",
                "house-stool-b",
                "house-linen",
                "house-storage-jar",
                "house-basket",
                "house-door",
                "house-shelf",
                "messenger-satchel",
            ),
        )
        process_prop_sheet(
            "props-village-road-source.png",
            4,
            3,
            (
                "village-jar-a",
                "village-jar-b",
                "village-wall",
                "village-wall-corner",
                "olive-tree",
                "olive-sapling",
                "dry-shrub",
                "grass-clump",
                "stone-pile",
                "wood-fence",
                "road-basket",
                "road-marker",
            ),
        )
        process_prop_sheet(
            "props-tomb-source.png",
            4,
            2,
            (
                "tomb-stone",
                "tomb-stone-rolled",
                "tomb-cave-lip",
                "burial-cloth-folded",
                "burial-cloth-strips",
                "tomb-dust",
                "tomb-rubble",
                "tomb-plant",
            ),
        )
        print(f"Processed props into {PROPS}")
    elif category is None:
        print("Skipped props because their source atlases have not been generated yet.")

    world_sources_available = all((SOURCE / name).exists() for name in WORLD_SOURCES)
    if category == "world" and not world_sources_available:
        missing = [name for name in WORLD_SOURCES if not (SOURCE / name).exists()]
        raise FileNotFoundError(f"Missing world source atlases: {', '.join(missing)}")

    if category == "world" or (category is None and world_sources_available):
        process_world_ground()
        process_world_objects()
        print(f"Processed world art into {WORLD}")
    elif category is None:
        print("Skipped world art because its source atlases have not been generated yet.")


def run_legacy_family(family: str, resampling: str) -> None:
    if family == "environment":
        run_legacy("prop", resampling)
        run_legacy("world", resampling)
        return
    raise ValueError(
        f"Legacy processing is unavailable for family {family}; use a manifest."
    )


def argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Process one recoverable MAI asset family at a time."
    )
    parser.add_argument("--family", choices=tuple(FAMILY_PROFILES))
    parser.add_argument("--asset")
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--mode", choices=("runtime", "review", "legacy"))
    parser.add_argument("--resampling", choices=("lanczos", "nearest"))
    parser.add_argument("--size", help="Optional runtime output size as WIDTHxHEIGHT.")
    parser.add_argument("--plan", action="store_true")
    parser.add_argument("--describe", action="store_true")
    parser.add_argument("--repo-root", type=Path, default=ROOT)
    return parser


def main() -> None:
    parser = argument_parser()
    args = parser.parse_args()
    if len(os.sys.argv) == 1:
        run_legacy(os.environ.get("ART_CATEGORY"))
        return
    if args.family is None:
        parser.error("--family is required.")
    if args.describe:
        if args.manifest is not None or args.mode is not None:
            parser.error("--describe cannot be combined with --manifest or --mode.")
        print(json.dumps(describe_profile(args.family, args.resampling), indent=2))
        return
    if args.mode == "legacy":
        if args.manifest is not None or args.plan:
            parser.error("Legacy mode does not use --manifest or --plan.")
        profile = describe_profile(args.family, args.resampling)
        run_legacy_family(args.family, profile["selectedResampling"])
        return
    if args.manifest is None:
        parser.error("--manifest is required for runtime or review processing.")

    manifest_path, manifest, plan = build_processing_plan(
        repo_root=args.repo_root,
        manifest_path=args.manifest,
        family=args.family,
        asset_id=args.asset,
        mode=args.mode,
        resampling=args.resampling,
        size=parse_size(args.size),
    )
    if args.plan:
        print(json.dumps(plan, indent=2))
        return
    execute_processing(manifest_path, manifest, plan)
    print(json.dumps({"status": "completed", **plan}, indent=2))


if __name__ == "__main__":
    main()
