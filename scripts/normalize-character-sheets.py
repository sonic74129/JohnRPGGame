import argparse
import json
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parent.parent
TRANSPARENT = (0, 0, 0, 0)


@dataclass(frozen=True)
class IdentitySheet:
    source: Path
    output: Path
    manifest: Path
    source_columns: int
    rows: tuple[str, ...]
    selected_columns: tuple[int, ...]
    facings: tuple[str, ...] = ("front", "back", "left", "right")


DISCIPLES = IdentitySheet(
    source=ROOT
    / "production/art-source/character/character__disciples/v2/run-001-selected.png",
    output=ROOT
    / "public/assets/art/character/character__disciples/v2/run-001/character__disciples.png",
    manifest=ROOT
    / "production/art-pipeline/manifests/character/character__disciples/v2/run-001.manifest.json",
    source_columns=5,
    rows=("thomas", "older-disciple", "younger-disciple"),
    selected_columns=(0, 1, 2, 3),
)

WITNESSES = IdentitySheet(
    source=ROOT
    / "production/art-source/character/character__witnesses/v2/run-001-selected.png",
    output=ROOT
    / "public/assets/art/character/character__witnesses/v2/run-001/character__witnesses.png",
    manifest=ROOT
    / "production/art-pipeline/manifests/character/character__witnesses/v2/run-001.manifest.json",
    source_columns=4,
    rows=("mourner-man", "mourner-woman", "guide", "older-witness"),
    selected_columns=(0, 1, 2, 3),
)

ACTION_SOURCE = (
    ROOT
    / "production/art-source/special-pose/pose__disciples-witnesses/v3/run-001-selected.png"
)
ACTION_OUTPUT = (
    ROOT
    / "public/assets/art/special-pose/pose__disciples-witnesses/v3/run-001/pose__disciples-witnesses.png"
)
ACTION_MANIFEST = (
    ROOT
    / "production/art-pipeline/manifests/special-pose/pose__disciples-witnesses/v3/run-001.manifest.json"
)
ACTION_NAMES = (
    "mourner-care",
    "older-witness-rising",
    "mourner-kneeling-grief",
    "thomas-listening",
    "younger-disciple-following",
    "older-disciple-praying",
    "guide-calling",
    "stone-moving",
    "restrained-group-reaction",
)
ACTION_CROP_BOXES = (
    ((70, 4, 380, 238), (65, 4, 370, 238), (65, 4, 335, 238)),
    ((105, 4, 345, 250), (90, 4, 315, 250), (65, 4, 345, 250)),
    ((95, 4, 365, 270), (25, 4, 438, 270), (4, 4, 425, 270)),
)
ACTION_X_BOUNDS = (0, 452, 894, 1360)
ACTION_Y_BOUNDS = (0, 241, 494, 768)


def remove_connected_background(
    image: Image.Image, threshold: int = 90
) -> Image.Image:
    result = image.convert("RGBA")
    corners = (
        (0, 0),
        (result.width - 1, 0),
        (0, result.height - 1),
        (result.width - 1, result.height - 1),
    )
    for corner in corners:
        ImageDraw.floodfill(result, corner, TRANSPARENT, thresh=threshold)
    return result


def projection_runs(values: list[int], minimum: int = 3) -> list[tuple[int, int]]:
    runs: list[tuple[int, int]] = []
    start: int | None = None
    for index, value in enumerate([*values, 0]):
        if value >= minimum and start is None:
            start = index
        elif value < minimum and start is not None:
            runs.append((start, index))
            start = None
    return runs


def alpha_runs(
    image: Image.Image,
) -> tuple[list[tuple[int, int]], list[tuple[int, int]]]:
    alpha = image.getchannel("A")
    x_projection = [
        sum(alpha.getpixel((x, y)) >= 32 for y in range(image.height))
        for x in range(image.width)
    ]
    y_projection = [
        sum(alpha.getpixel((x, y)) >= 32 for x in range(image.width))
        for y in range(image.height)
    ]
    return projection_runs(x_projection), projection_runs(y_projection)


def alpha_crop(image: Image.Image) -> Image.Image:
    alpha_box = image.getchannel("A").getbbox()
    if alpha_box is None:
        raise ValueError("No foreground remained after background removal.")
    return image.crop(alpha_box)


def pack_frames(
    frames: list[Image.Image], columns: int, rows: int
) -> tuple[Image.Image, tuple[int, int]]:
    if len(frames) != columns * rows:
        raise ValueError("Frame count does not match the requested output grid.")
    cell_width = max(frame.width for frame in frames) + 16
    cell_height = max(frame.height for frame in frames) + 16
    sheet = Image.new(
        "RGBA", (cell_width * columns, cell_height * rows), TRANSPARENT
    )
    for index, frame in enumerate(frames):
        column = index % columns
        row = index // columns
        x = column * cell_width + (cell_width - frame.width) // 2
        y = row * cell_height + cell_height - frame.height - 8
        sheet.alpha_composite(frame, (x, y))
    return sheet, (cell_width, cell_height)


def identity_frames(config: IdentitySheet) -> list[Image.Image]:
    cleaned = remove_connected_background(Image.open(config.source))
    x_runs, y_runs = alpha_runs(cleaned)
    if len(x_runs) != config.source_columns or len(y_runs) != len(config.rows):
        raise ValueError(
            f"{config.source.name} grid detection found "
            f"{len(x_runs)}x{len(y_runs)}, expected "
            f"{config.source_columns}x{len(config.rows)}."
        )

    frames: list[Image.Image] = []
    for y_start, y_end in y_runs:
        for source_column in config.selected_columns:
            x_start, x_end = x_runs[source_column]
            padded = cleaned.crop(
                (
                    max(0, x_start - 8),
                    max(0, y_start - 8),
                    min(cleaned.width, x_end + 8),
                    min(cleaned.height, y_end + 8),
                )
            )
            frames.append(alpha_crop(padded))
    return frames


def keep_significant_components(mask: Image.Image, minimum_area: int = 120) -> Image.Image:
    if mask.mode != "L":
        raise ValueError("Component mask must use L mode.")
    width, height = mask.size
    pixels = mask.tobytes()
    visited = bytearray(width * height)
    kept = Image.new("L", mask.size, 0)
    kept_pixels = kept.load()

    for start, value in enumerate(pixels):
        if value < 32 or visited[start]:
            continue
        pending = [start]
        visited[start] = 1
        component: list[int] = []
        while pending:
            current = pending.pop()
            component.append(current)
            x = current % width
            y = current // width
            neighbors: Iterable[int] = (
                current - 1 if x > 0 else -1,
                current + 1 if x + 1 < width else -1,
                current - width if y > 0 else -1,
                current + width if y + 1 < height else -1,
            )
            for neighbor in neighbors:
                if (
                    neighbor >= 0
                    and not visited[neighbor]
                    and pixels[neighbor] >= 32
                ):
                    visited[neighbor] = 1
                    pending.append(neighbor)
        if len(component) < minimum_area:
            continue
        for current in component:
            kept_pixels[current % width, current // width] = 255
    return kept


def fill_mask_holes(mask: Image.Image) -> Image.Image:
    inverse = ImageOps.invert(mask)
    exterior = inverse.copy()
    for corner in (
        (0, 0),
        (mask.width - 1, 0),
        (0, mask.height - 1),
        (mask.width - 1, mask.height - 1),
    ):
        ImageDraw.floodfill(exterior, corner, 0)
    return ImageChops.lighter(mask, exterior)


def action_foreground(frame: Image.Image) -> Image.Image:
    rgb = frame.convert("RGB")
    mask = Image.new("L", frame.size, 0)
    output = mask.load()
    pixels = rgb.load()
    for y in range(frame.height):
        for x in range(frame.width):
            red, green, blue = pixels[x, y]
            is_background = (
                red >= 185
                and green >= 145
                and blue >= 85
                and red > green > blue
                and red - blue <= 125
            )
            output[x, y] = 0 if is_background else 255
    mask = mask.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    mask = mask.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    mask = keep_significant_components(mask)
    mask = fill_mask_holes(mask).filter(ImageFilter.GaussianBlur(0.65))
    result = frame.convert("RGBA")
    result.putalpha(mask)
    return alpha_crop(result)


def action_frames() -> list[Image.Image]:
    source = Image.open(ACTION_SOURCE).convert("RGBA")
    frames: list[Image.Image] = []
    for row, boxes in enumerate(ACTION_CROP_BOXES):
        for column, (left, top, right, bottom) in enumerate(boxes):
            cell = source.crop(
                (
                    ACTION_X_BOUNDS[column] + left,
                    ACTION_Y_BOUNDS[row] + top,
                    ACTION_X_BOUNDS[column] + right,
                    ACTION_Y_BOUNDS[row] + bottom,
                )
            )
            frames.append(action_foreground(cell))
    return frames


def update_manifest(
    path: Path,
    runtime_mapping: dict[str, object],
    sheet_size: tuple[int, int],
    cell_size: tuple[int, int],
    component_count: int,
    note: str,
) -> None:
    manifest = json.loads(path.read_text(encoding="utf-8"))
    manifest["runtimeMapping"] = runtime_mapping
    manifest["normalization"] = {
        "componentCount": component_count,
        "sheetSize": list(sheet_size),
        "cellSize": list(cell_size),
        "perFrameScaling": False,
        "mirroredFrames": [],
        "backgroundRemoval": (
            "Deterministic background-to-alpha cleanup from the approved source."
        ),
        "alignment": note,
    }
    path.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def normalize_identity(config: IdentitySheet) -> dict[str, object]:
    frames = identity_frames(config)
    sheet, cell_size = pack_frames(frames, len(config.facings), len(config.rows))
    config.output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(config.output, optimize=True)
    ignored_columns = [
        index
        for index in range(config.source_columns)
        if index not in config.selected_columns
    ]
    mapping: dict[str, object] = {
        "columns": list(config.facings),
        "rows": list(config.rows),
    }
    if ignored_columns:
        mapping["ignoredSourceColumns"] = ignored_columns
    update_manifest(
        config.manifest,
        mapping,
        sheet.size,
        cell_size,
        len(frames),
        "Approved figures retain source scale, are centered horizontally, and share a bottom baseline with eight transparent pixels.",
    )
    return {
        "asset": config.output.name,
        "sheetSize": list(sheet.size),
        "cellSize": list(cell_size),
        "frames": len(frames),
    }


def normalize_actions() -> dict[str, object]:
    frames = action_frames()
    sheet, cell_size = pack_frames(frames, 3, 3)
    ACTION_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(ACTION_OUTPUT, optimize=True)
    update_manifest(
        ACTION_MANIFEST,
        {"columns": 3, "rows": 3, "frames": list(ACTION_NAMES)},
        sheet.size,
        cell_size,
        len(frames),
        "Each approved row-major action is cropped independently, centered without scaling, and bottom-aligned with eight transparent pixels.",
    )
    return {
        "asset": ACTION_OUTPUT.name,
        "sheetSize": list(sheet.size),
        "cellSize": list(cell_size),
        "frames": len(frames),
    }


def corner_alphas(path: Path) -> list[int]:
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    return [
        alpha.getpixel((0, 0)),
        alpha.getpixel((image.width - 1, 0)),
        alpha.getpixel((0, image.height - 1)),
        alpha.getpixel((image.width - 1, image.height - 1)),
    ]


def check_outputs() -> list[dict[str, object]]:
    outputs = (DISCIPLES.output, WITNESSES.output, ACTION_OUTPUT)
    result: list[dict[str, object]] = []
    for output in outputs:
        image = Image.open(output).convert("RGBA")
        result.append(
            {
                "asset": output.name,
                "sheetSize": list(image.size),
                "cornerAlphas": corner_alphas(output),
                "transparentPixels": image.getchannel("A").histogram()[0],
            }
        )
    return result


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Normalize approved supporting character sheets."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Inspect normalized outputs without modifying files.",
    )
    args = parser.parse_args()
    result = (
        check_outputs()
        if args.check
        else [
            normalize_identity(DISCIPLES),
            normalize_identity(WITNESSES),
            normalize_actions(),
        ]
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
