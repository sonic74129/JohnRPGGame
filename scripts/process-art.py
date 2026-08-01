import json
import os
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "production" / "art-source"
OUTPUT = ROOT / "public" / "assets" / "art"
SPRITES = OUTPUT / "sprites"
PROPS = OUTPUT / "props"
WORLD = OUTPUT / "world"

DIRECTIONS = ("front", "back", "left", "right")
STEPS = ("idle", "step-left", "step-right")
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


def remove_lazarus_chroma_key(image: Image.Image) -> Image.Image:
    result = image.copy()
    pixels = result.load()
    for y in range(result.height):
        for x in range(result.width):
            red, green, blue, alpha = pixels[x, y]
            if (
                alpha > 0
                and red > green * 1.45
                and blue > green * 1.08
            ):
                pixels[x, y] = transparent_color()
    return result


def keep_largest_alpha_component(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    visited: set[tuple[int, int]] = set()
    components: list[list[tuple[int, int]]] = []
    for y in range(image.height):
        for x in range(image.width):
            if (x, y) in visited or alpha.getpixel((x, y)) < 20:
                continue
            component: list[tuple[int, int]] = []
            pending = [(x, y)]
            visited.add((x, y))
            while pending:
                current_x, current_y = pending.pop()
                component.append((current_x, current_y))
                for neighbor in (
                    (current_x + 1, current_y),
                    (current_x - 1, current_y),
                    (current_x, current_y + 1),
                    (current_x, current_y - 1),
                ):
                    neighbor_x, neighbor_y = neighbor
                    if (
                        0 <= neighbor_x < image.width
                        and 0 <= neighbor_y < image.height
                        and neighbor not in visited
                        and alpha.getpixel(neighbor) >= 20
                    ):
                        visited.add(neighbor)
                        pending.append(neighbor)
            components.append(component)

    if not components:
        raise ValueError("No foreground component remained after chroma cleanup.")
    foreground = max(components, key=len)
    result = Image.new("RGBA", image.size, transparent_color())
    source_pixels = image.load()
    result_pixels = result.load()
    for x, y in foreground:
        result_pixels[x, y] = source_pixels[x, y]
    return result


def remove_sick_bed_frame(image: Image.Image) -> Image.Image:
    result = image.copy()
    pixels = result.load()
    cutoff_y = round(result.height * 0.55)
    cutoff_x = round(result.width * 0.57)
    for y in range(cutoff_y, result.height):
        for x in range(cutoff_x):
            pixels[x, y] = transparent_color()
    return result


def normalize_sprite(image: Image.Image, size: tuple[int, int] = (160, 208)) -> Image.Image:
    cleaned = remove_connected_background(image)
    alpha_box = cleaned.getchannel("A").getbbox()
    if alpha_box is None:
        raise ValueError("No foreground remained after background removal.")

    trimmed = cleaned.crop(alpha_box)
    available_width = size[0] - 12
    available_height = size[1] - 8
    scale = min(
        available_width / trimmed.width,
        available_height / trimmed.height,
    )
    resized = trimmed.resize(
        (
            max(1, round(trimmed.width * scale)),
            max(1, round(trimmed.height * scale)),
        ),
        Image.Resampling.NEAREST,
    )
    canvas = Image.new("RGBA", size, transparent_color())
    canvas.alpha_composite(
        resized,
        ((size[0] - resized.width) // 2, size[1] - resized.height),
    )
    return canvas


def transparent_color() -> tuple[int, int, int, int]:
    return (0, 0, 0, 0)


def save_sprite(image: Image.Image, character: str, frame: str) -> None:
    directory = SPRITES / character
    directory.mkdir(parents=True, exist_ok=True)
    image.save(directory / f"{frame}.png", optimize=True)


def foreground_pixels(image: Image.Image) -> int:
    return sum(1 for alpha in image.getchannel("A").getdata() if alpha > 0)


def process_directional_sheet(
    filename: str,
    character_columns: Iterable[tuple[str, int]],
    columns: int,
) -> None:
    image = Image.open(SOURCE / filename)
    for character, start_column in character_columns:
        for row, direction in enumerate(DIRECTIONS):
            frames = {
                motion: normalize_sprite(
                    crop_cell(image, columns, 4, start_column + step, row)
                )
                for step, motion in enumerate(STEPS)
            }
            idle_pixels = foreground_pixels(frames["idle"])
            for motion in STEPS:
                frame = frames[motion]
                if (
                    motion != "idle"
                    and foreground_pixels(frame) < idle_pixels * 0.4
                ):
                    fallback = "step-right" if motion == "step-left" else "idle"
                    frame = frames[fallback]
                save_sprite(frame, character, f"{direction}-{motion}")


def process_reference_sheet(
    filename: str,
    characters: tuple[str, ...],
) -> None:
    image = Image.open(SOURCE / filename)
    source_directions = ("front", "back", "left")
    for column, character in enumerate(characters):
        for row, direction in enumerate(source_directions):
            frame = normalize_sprite(
                crop_cell(image, len(characters), 3, column, row)
            )
            save_sprite(frame, character, f"{direction}-idle")
            if direction == "left":
                save_sprite(
                    frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT),
                    character,
                    "right-idle",
                )


def process_lazarus() -> None:
    image = Image.open(SOURCE / "sprite-lazarus-source.png")
    frames = ("sick", "wrapped-idle", "wrapped-step", "restored")
    for column, name in enumerate(frames):
        cleaned = keep_largest_alpha_component(
            remove_lazarus_chroma_key(
                remove_connected_background(
                    crop_cell(image, 4, 1, column, 0)
                )
            )
        )
        if name == "sick":
            cleaned = remove_sick_bed_frame(cleaned)
            alpha_box = cleaned.getchannel("A").getbbox()
            if alpha_box is None:
                raise ValueError("No sick Lazarus foreground remained.")
            frame = cleaned.crop(alpha_box)
        else:
            frame = normalize_sprite(cleaned, (224, 208))
        save_sprite(frame, "lazarus", name)


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


def main() -> None:
    category = os.environ.get("ART_CATEGORY")
    if category not in (None, "sprite", "prop", "world"):
        raise ValueError("ART_CATEGORY must be 'sprite', 'prop', or 'world'.")

    if category in (None, "sprite"):
        process_directional_sheet(
            "sprite-messenger-source.png",
            (("messenger", 0),),
            3,
        )
        process_directional_sheet(
            "sprite-sisters-source.png",
            (("martha", 0), ("mary", 4)),
            7,
        )
        process_directional_sheet(
            "sprite-jesus-source.png",
            (("jesus", 0),),
            3,
        )
        process_reference_sheet(
            "sprite-disciples-source.png",
            ("thomas", "disciple-older", "disciple-younger"),
        )
        process_reference_sheet(
            "sprite-witnesses-source.png",
            ("mourner-man", "mourner-woman", "guide", "witness-older"),
        )
        process_lazarus()
        print(f"Processed sprites into {SPRITES}")

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


if __name__ == "__main__":
    main()
