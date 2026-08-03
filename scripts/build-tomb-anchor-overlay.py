import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CONTRACT = ROOT / "art" / "tomb-anchors.json"


def repository_path(root: Path, value: str) -> Path:
    path = (root / value).resolve()
    path.relative_to(root.resolve())
    return path


def scaled_point(point: dict, scale: float) -> tuple[int, int]:
    return round(point["x"] * scale), round(point["y"] * scale)


def scaled_bounds(bounds: dict, scale: float) -> tuple[int, int, int, int]:
    return (
        round(bounds["xMin"] * scale),
        round(bounds["yMin"] * scale),
        round(bounds["xMax"] * scale),
        round(bounds["yMax"] * scale),
    )


def marker(
    draw: ImageDraw.ImageDraw,
    point: dict,
    scale: float,
    color: tuple[int, int, int, int],
    label: str,
) -> None:
    x, y = scaled_point(point, scale)
    radius = 7
    draw.ellipse(
        (x - radius, y - radius, x + radius, y + radius),
        fill=color,
        outline=(255, 255, 255, 255),
        width=2,
    )
    draw.text(
        (x + 10, y - 8),
        label,
        fill=(255, 255, 255, 255),
        stroke_width=2,
        stroke_fill=(0, 0, 0, 255),
    )


def build_overlay(contract_path: Path, output_path: Path, scale: float) -> None:
    contract = json.loads(contract_path.read_text(encoding="utf-8"))
    source_path = repository_path(ROOT, contract["source"]["candidatePath"])
    with Image.open(source_path) as source:
        image = source.convert("RGBA")

    width = round(image.width * scale)
    height = round(image.height * scale)
    if max(width, height) > 1600:
        raise ValueError("Overlay longest edge must not exceed 1600 pixels")

    overlay = image.resize((width, height), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(overlay, "RGBA")

    draw.rectangle(
        scaled_bounds(contract["source"]["gardenBounds"], scale),
        outline=(80, 220, 120, 255),
        width=3,
    )
    draw.rectangle(
        scaled_bounds(contract["tombMouth"]["visualBounds"], scale),
        outline=(255, 180, 40, 255),
        fill=(255, 180, 40, 45),
        width=3,
    )
    draw.rectangle(
        scaled_bounds(contract["stone"]["initialBounds"], scale),
        outline=(255, 60, 60, 255),
        fill=(255, 60, 60, 70),
        width=3,
    )
    draw.rectangle(
        scaled_bounds(contract["stone"]["rolledTarget"]["bounds"], scale),
        outline=(50, 220, 255, 255),
        fill=(50, 220, 255, 60),
        width=3,
    )

    lazarus_path = [
        scaled_point(point, scale) for point in contract["lazarus"]["path"]
    ]
    draw.line(lazarus_path, fill=(255, 230, 60, 255), width=4)

    marker(
        draw,
        contract["tombApproach"],
        scale,
        (60, 140, 255, 255),
        "tombApproach",
    )
    marker(
        draw,
        contract["tombMouth"]["center"],
        scale,
        (255, 150, 20, 255),
        "tombMouth",
    )
    marker(
        draw,
        contract["tombGathering"]["center"],
        scale,
        (210, 80, 255, 255),
        "tombGathering",
    )
    marker(
        draw,
        contract["stone"]["rolledTarget"]["center"],
        scale,
        (40, 220, 255, 255),
        "stoneRolled",
    )
    marker(
        draw,
        contract["lazarus"]["hiddenStart"],
        scale,
        (255, 230, 60, 255),
        "Lazarus hidden",
    )
    marker(
        draw,
        contract["lazarus"]["emergenceTarget"],
        scale,
        (255, 230, 60, 255),
        "Lazarus emerged",
    )
    marker(
        draw,
        contract["cameraFocus"],
        scale,
        (80, 255, 160, 255),
        "cameraFocus",
    )

    for slot, point in contract["tombGathering"]["groupPositions"].items():
        marker(draw, point, scale, (255, 80, 200, 255), slot)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    overlay.save(output_path)
    print(f"{output_path} ({width}x{height})")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build a scaled debug overlay for the tomb anchor contract."
    )
    parser.add_argument("--contract", type=Path, default=DEFAULT_CONTRACT)
    parser.add_argument("--output", type=Path)
    parser.add_argument("--scale", type=float, default=0.5)
    args = parser.parse_args()

    contract_path = args.contract.resolve()
    contract = json.loads(contract_path.read_text(encoding="utf-8"))
    output_path = (
        args.output.resolve()
        if args.output is not None
        else repository_path(ROOT, contract["source"]["debugOverlayPath"])
    )
    build_overlay(contract_path, output_path, args.scale)


if __name__ == "__main__":
    main()
