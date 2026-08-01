import io
import json
import os
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from PIL import Image, ImageDraw


MANIFEST_SCHEMA_VERSION = "1.0.0"
DEFAULT_REVIEW_MAX_EDGE = 1600
DEFAULT_REVIEW_MAX_BYTES = 900 * 1024


@dataclass(frozen=True)
class FamilyProfile:
    family: str
    default_mode: str
    allowed_modes: tuple[str, ...]
    default_resampling: str
    purpose: str


FAMILY_PROFILES = {
    "master": FamilyProfile(
        "master",
        "review",
        ("review",),
        "lanczos",
        "Reference masters are reviewed but never copied to runtime assets.",
    ),
    "environment": FamilyProfile(
        "environment",
        "runtime",
        ("runtime", "review"),
        "lanczos",
        "Environment sources use high-quality non-pixel resampling.",
    ),
    "character": FamilyProfile(
        "character",
        "runtime",
        ("runtime", "review"),
        "lanczos",
        "Character sources use high-quality resampling unless pixel art is explicit.",
    ),
    "special-pose": FamilyProfile(
        "special-pose",
        "runtime",
        ("runtime", "review"),
        "lanczos",
        "Map pose sources preserve smooth painted edges.",
    ),
    "portrait": FamilyProfile(
        "portrait",
        "runtime",
        ("runtime", "review"),
        "lanczos",
        "Portraits are optimized as single runtime images.",
    ),
}

RESAMPLING_FILTERS = {
    "lanczos": Image.Resampling.LANCZOS,
    "nearest": Image.Resampling.NEAREST,
}


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def family_profile(family: str) -> FamilyProfile:
    try:
        return FAMILY_PROFILES[family]
    except KeyError as error:
        raise ValueError(f"Unknown art family: {family}.") from error


def resampling_filter(mode: str) -> Image.Resampling:
    try:
        return RESAMPLING_FILTERS[mode]
    except KeyError as error:
        raise ValueError("Resampling must be 'lanczos' or 'nearest'.") from error


def describe_profile(family: str, resampling: Optional[str] = None) -> dict:
    profile = family_profile(family)
    selected_resampling = resampling or profile.default_resampling
    resampling_filter(selected_resampling)
    description = asdict(profile)
    description["selectedResampling"] = selected_resampling
    return description


def parse_size(value: Optional[str]) -> Optional[tuple[int, int]]:
    if value is None:
        return None
    parts = value.lower().split("x", maxsplit=1)
    if len(parts) != 2 or not all(part.isdigit() for part in parts):
        raise ValueError("Size must use WIDTHxHEIGHT.")
    size = (int(parts[0]), int(parts[1]))
    if min(size) <= 0:
        raise ValueError("Size dimensions must be positive.")
    return size


def resolve_repository_path(repo_root: Path, repository_path: str) -> Path:
    if Path(repository_path).is_absolute():
        raise ValueError("Manifest paths must be repository-relative.")
    root = repo_root.resolve()
    resolved = (root / repository_path).resolve()
    try:
        resolved.relative_to(root)
    except ValueError as error:
        raise ValueError(
            f"Manifest path escapes the repository: {repository_path}."
        ) from error
    return resolved


def load_manifest(repo_root: Path, manifest_path: Path) -> tuple[Path, dict]:
    absolute_manifest = (
        manifest_path
        if manifest_path.is_absolute()
        else resolve_repository_path(repo_root, str(manifest_path))
    ).resolve()
    try:
        absolute_manifest.relative_to(repo_root.resolve())
    except ValueError as error:
        raise ValueError("Manifest must be inside the repository root.") from error
    manifest = json.loads(absolute_manifest.read_text(encoding="utf-8"))
    if manifest.get("schemaVersion") != MANIFEST_SCHEMA_VERSION:
        raise ValueError("Unsupported art manifest schema.")
    if not isinstance(manifest.get("paths"), dict):
        raise ValueError("Manifest paths are missing.")
    return absolute_manifest, manifest


def ensure_output_available(output_path: Path) -> None:
    if output_path.exists():
        raise FileExistsError(
            f"Refusing to overwrite existing processed output: {output_path}"
        )


def build_processing_plan(
    repo_root: Path,
    manifest_path: Path,
    family: str,
    asset_id: Optional[str],
    mode: Optional[str],
    resampling: Optional[str],
    size: Optional[tuple[int, int]],
    review_max_edge: int = DEFAULT_REVIEW_MAX_EDGE,
    review_max_bytes: int = DEFAULT_REVIEW_MAX_BYTES,
) -> tuple[Path, dict, dict]:
    profile = family_profile(family)
    selected_mode = mode or profile.default_mode
    if selected_mode not in profile.allowed_modes:
        raise ValueError(
            f"Mode {selected_mode} is not supported for family {family}."
        )
    selected_resampling = resampling or profile.default_resampling
    resampling_filter(selected_resampling)
    absolute_manifest, manifest = load_manifest(repo_root, manifest_path)
    manifest_asset = manifest.get("asset", {})
    if manifest_asset.get("family") != family:
        raise ValueError(
            f"Manifest family {manifest_asset.get('family')} does not match {family}."
        )
    if asset_id is not None and manifest_asset.get("id") != asset_id:
        raise ValueError(
            f"Manifest asset {manifest_asset.get('id')} does not match {asset_id}."
        )

    if selected_mode == "runtime":
        selection = manifest.get("selection")
        if manifest.get("run", {}).get("status") != "approved" or not selection:
            raise ValueError("Runtime processing requires an approved candidate.")
        source_path = resolve_repository_path(
            repo_root, selection["selectedSourcePath"]
        )
        if not source_path.is_file():
            raise FileNotFoundError(f"Selected source is missing: {source_path}")
        runtime_directory = resolve_repository_path(
            repo_root, manifest["paths"]["runtimeDirectory"]
        )
        filename = f"{manifest_asset['id'].replace('.', '__')}.png"
        output_path = runtime_directory / filename
        ensure_output_available(output_path)
        plan = {
            "family": family,
            "assetId": manifest_asset["id"],
            "mode": selected_mode,
            "resampling": selected_resampling,
            "size": list(size) if size is not None else None,
            "sourcePaths": [str(source_path)],
            "outputPaths": [str(output_path)],
        }
        return absolute_manifest, manifest, plan

    candidates = manifest.get("candidates")
    if not isinstance(candidates, list) or len(candidates) not in (2, 3):
        raise ValueError("Review processing requires two or three candidates.")
    incomplete = [
        candidate["index"]
        for candidate in candidates
        if candidate.get("status") not in ("generated", "selected", "rejected")
    ]
    if incomplete:
        raise ValueError(
            f"Review processing requires complete candidates; incomplete: {incomplete}."
        )
    source_paths = [
        resolve_repository_path(repo_root, candidate["outputPath"])
        for candidate in candidates
    ]
    missing = [str(source) for source in source_paths if not source.is_file()]
    if missing:
        raise FileNotFoundError(f"Candidate sources are missing: {', '.join(missing)}")
    output_path = resolve_repository_path(
        repo_root, manifest["paths"]["reviewContactSheet"]
    )
    ensure_output_available(output_path)
    plan = {
        "family": family,
        "assetId": manifest_asset["id"],
        "mode": selected_mode,
        "resampling": selected_resampling,
        "size": None,
        "sourcePaths": [str(source) for source in source_paths],
        "outputPaths": [str(output_path)],
        "review": {
            "maxEdge": review_max_edge,
            "maxBytes": review_max_bytes,
        },
    }
    return absolute_manifest, manifest, plan


def resize_image(
    image: Image.Image,
    size: tuple[int, int],
    resampling: str = "lanczos",
) -> Image.Image:
    selected_filter = resampling_filter(resampling)
    if image.size == size:
        return image.copy()
    if image.mode == "RGBA" and resampling == "lanczos":
        return image.convert("RGBa").resize(size, selected_filter).convert("RGBA")
    return image.resize(size, selected_filter)


def process_runtime_image(plan: dict) -> None:
    source_path = Path(plan["sourcePaths"][0])
    output_path = Path(plan["outputPaths"][0])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    ensure_output_available(output_path)
    with Image.open(source_path) as source:
        image = source.convert("RGBA")
        if plan["size"] is not None:
            image = resize_image(
                image,
                tuple(plan["size"]),
                plan["resampling"],
            )
        with output_path.open("xb") as output:
            image.save(output, format="PNG", optimize=True)


def _encode_contact_sheet(
    sheet: Image.Image,
    max_bytes: int,
) -> bytes:
    candidate = sheet
    while True:
        for quality in range(88, 39, -8):
            buffer = io.BytesIO()
            candidate.save(
                buffer,
                format="JPEG",
                quality=quality,
                optimize=True,
                progressive=True,
            )
            if buffer.tell() <= max_bytes:
                return buffer.getvalue()
        next_size = (
            max(1, round(candidate.width * 0.85)),
            max(1, round(candidate.height * 0.85)),
        )
        if next_size == candidate.size or min(next_size) < 320:
            raise ValueError(
                f"Contact sheet cannot be compressed below {max_bytes} bytes."
            )
        candidate = candidate.resize(next_size, Image.Resampling.LANCZOS)


def create_contact_sheet(plan: dict) -> None:
    sources = [Path(value) for value in plan["sourcePaths"]]
    output_path = Path(plan["outputPaths"][0])
    max_edge = plan["review"]["maxEdge"]
    padding = 16
    label_height = 28
    cell_width = max(1, (max_edge - padding * (len(sources) + 1)) // len(sources))
    thumbnails = []
    for source in sources:
        with Image.open(source) as image:
            rgba = image.convert("RGBA")
            thumbnail = Image.new("RGB", rgba.size, (232, 224, 207))
            thumbnail.paste(rgba, mask=rgba.getchannel("A"))
            thumbnail.thumbnail(
                (cell_width, max_edge - label_height - padding * 2),
                Image.Resampling.LANCZOS,
            )
            thumbnails.append((source.name, thumbnail.copy()))

    sheet_width = padding + sum(
        thumbnail.width + padding for _, thumbnail in thumbnails
    )
    sheet_height = (
        padding
        + label_height
        + max(thumbnail.height for _, thumbnail in thumbnails)
        + padding
    )
    sheet = Image.new("RGB", (sheet_width, sheet_height), (34, 31, 29))
    draw = ImageDraw.Draw(sheet)
    cursor_x = padding
    for label, thumbnail in thumbnails:
        draw.text((cursor_x, padding), label, fill=(245, 238, 222))
        sheet.paste(thumbnail, (cursor_x, padding + label_height))
        cursor_x += thumbnail.width + padding
    if max(sheet.size) > max_edge:
        scale = max_edge / max(sheet.size)
        sheet = sheet.resize(
            (round(sheet.width * scale), round(sheet.height * scale)),
            Image.Resampling.LANCZOS,
        )

    encoded = _encode_contact_sheet(sheet, plan["review"]["maxBytes"])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    ensure_output_available(output_path)
    with output_path.open("xb") as output:
        output.write(encoded)


def _write_manifest(manifest_path: Path, manifest: dict) -> None:
    temporary = manifest_path.with_name(
        f"{manifest_path.name}.{os.getpid()}.tmp"
    )
    temporary.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    os.replace(temporary, manifest_path)


def execute_processing(
    manifest_path: Path,
    manifest: dict,
    plan: dict,
) -> dict:
    started_at = utc_timestamp()
    try:
        if plan["mode"] == "runtime":
            process_runtime_image(plan)
        elif plan["mode"] == "review":
            create_contact_sheet(plan)
        else:
            raise ValueError(f"Unsupported processing mode: {plan['mode']}.")
    except (OSError, ValueError, KeyError) as error:
        manifest["processing"] = {
            "status": "failed",
            "mode": plan["mode"],
            "resampling": plan["resampling"],
            "sourcePaths": plan["sourcePaths"],
            "outputPaths": plan["outputPaths"],
            "startedAt": started_at,
            "completedAt": None,
            "failureReason": str(error),
        }
        _write_manifest(manifest_path, manifest)
        raise

    manifest["processing"] = {
        "status": "completed",
        "mode": plan["mode"],
        "resampling": plan["resampling"],
        "sourcePaths": plan["sourcePaths"],
        "outputPaths": plan["outputPaths"],
        "startedAt": started_at,
        "completedAt": utc_timestamp(),
        "failureReason": None,
    }
    _write_manifest(manifest_path, manifest)
    return manifest
