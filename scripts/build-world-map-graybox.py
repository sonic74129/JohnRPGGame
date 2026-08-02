import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
CONTRACT_PATH = ROOT / "art" / "world-map-layout.json"
OUTPUT_DIRECTORY = ROOT / "production" / "design-contracts"
BOARD_TEMPLATE = "world-map-graybox-{profile}.png"
COMPARISON_NAME = "world-map-graybox-comparison.jpg"

COLORS = {
    "ground": (194, 174, 124),
    "safe": (224, 207, 159),
    "road": (218, 193, 139),
    "secondary": (207, 181, 126),
    "house": (166, 136, 91),
    "roof": (143, 102, 68),
    "wall": (197, 177, 132),
    "olive": (101, 118, 67),
    "rock": (143, 137, 118),
    "clearing": (231, 211, 158),
    "ink": (42, 37, 31),
    "accent": (111, 55, 48),
}

SPRITES = (
    {
        "name": "Martha",
        "height": 84,
        "path": "public/assets/art/characters/core/character__martha/v3/run-001/character__martha.png",
        "frame": (0, 0, 96, 192),
    },
    {
        "name": "Messenger",
        "height": 90,
        "path": "public/assets/art/characters/core/character__messenger/v3/run-001/character__messenger.png",
        "frame": (0, 0, 160, 208),
    },
    {
        "name": "Jesus",
        "height": 96,
        "path": "public/assets/art/characters/core/character__jesus/v3/run-001/character__jesus.png",
        "frame": (0, 0, 96, 200),
    },
)

SPRITE_GROUPS = {
    "HOUSE DOOR": (520, 1140),
    "VILLAGE WELL": (1040, 920),
    "JESUS CAMP": (2260, 1325),
    "TOMB ROAD": (1770, 600),
    "TOMB ENTRANCE": (2220, 485),
}


def load_contract() -> dict:
    return json.loads(CONTRACT_PATH.read_text(encoding="utf-8"))


def bounds_box(bounds: dict) -> tuple[int, int, int, int]:
    return (bounds["xMin"], bounds["yMin"], bounds["xMax"], bounds["yMax"])


def load_sprite(spec: dict) -> Image.Image:
    with Image.open(ROOT / spec["path"]) as sheet:
        frame = sheet.convert("RGBA").crop(spec["frame"])
    alpha_box = frame.getchannel("A").getbbox()
    if alpha_box is None:
        raise ValueError(f"No visible sprite pixels in {spec['path']}.")
    sprite = frame.crop(alpha_box)
    width = round(sprite.width * spec["height"] / sprite.height)
    return sprite.convert("RGBa").resize(
        (width, spec["height"]), Image.Resampling.LANCZOS
    ).convert("RGBA")


def draw_region(draw: ImageDraw.ImageDraw, region: dict, label: str) -> None:
    box = bounds_box(region["bounds"])
    draw.rounded_rectangle(box, radius=28, outline=COLORS["accent"], width=6)
    draw.text((box[0] + 12, box[1] + 10), label, fill=COLORS["ink"])


def draw_path(
    draw: ImageDraw.ImageDraw,
    points: list[tuple[int, int]],
    width: int,
    color: tuple[int, int, int],
) -> None:
    draw.line(points, fill=color, width=width, joint="curve")
    draw.line(points, fill=COLORS["ink"], width=3, joint="curve")


def draw_house(
    draw: ImageDraw.ImageDraw,
    center: tuple[int, int],
    width: int,
    visible_height: int,
    door_height: int,
) -> None:
    x, baseline = center
    left = x - width // 2
    top = baseline - visible_height
    right = x + width // 2
    draw.rectangle((left, top + 36, right, baseline), fill=COLORS["house"], outline=COLORS["ink"], width=4)
    draw.polygon(
        ((left - 18, top + 50), (x, top), (right + 18, top + 50)),
        fill=COLORS["roof"],
        outline=COLORS["ink"],
    )
    door_width = round(door_height * 0.58)
    draw.rectangle(
        (x - door_width // 2, baseline - door_height, x + door_width // 2, baseline),
        fill=(72, 59, 46),
        outline=COLORS["ink"],
        width=3,
    )


def draw_olive(draw: ImageDraw.ImageDraw, center: tuple[int, int], diameter: int) -> None:
    x, y = center
    draw.rectangle((x - 10, y, x + 10, y + 82), fill=(94, 69, 45))
    draw.ellipse(
        (x - diameter // 2, y - diameter // 2, x + diameter // 2, y + diameter // 2),
        fill=COLORS["olive"],
        outline=COLORS["ink"],
        width=3,
    )


def paste_sprite_group(board: Image.Image, anchor: tuple[int, int], sprites: list[Image.Image]) -> None:
    x, baseline = anchor
    spacing = 18
    total_width = sum(sprite.width for sprite in sprites) + spacing * (len(sprites) - 1)
    cursor = x - total_width // 2
    draw = ImageDraw.Draw(board)
    for spec, sprite in zip(SPRITES, sprites):
        board.alpha_composite(sprite, (cursor, baseline - sprite.height))
        draw.text(
            (cursor + sprite.width // 2 - 16, baseline + 4),
            f"{spec['height']}px",
            fill=COLORS["ink"],
        )
        cursor += sprite.width + spacing


def build_board(contract: dict, profile_name: str, sprites: list[Image.Image]) -> Image.Image:
    canvas = contract["canvas"]
    regions = contract["regions"]
    profile = contract["profiles"][profile_name]
    board = Image.new("RGBA", (canvas["width"], canvas["height"]), COLORS["ground"] + (255,))
    draw = ImageDraw.Draw(board)

    safe = canvas["safeBorder"]
    draw.rectangle(
        (safe, safe, canvas["width"] - safe, canvas["height"] - safe),
        fill=COLORS["safe"],
        outline=COLORS["ink"],
        width=4,
    )
    draw.text((112, 108), f"GRAYBOX {profile_name} - {profile['description']}", fill=COLORS["ink"])
    draw.text(
        (112, 132),
        f"90px person : {profile['smallHouseVisibleHeight']}px small house = {profile['smallHouseToPersonRatio']}:1",
        fill=COLORS["ink"],
    )

    draw_region(draw, regions["marthaCompound"], "MARTHA COMPOUND")
    draw_region(draw, regions["village"], "BETHANY VILLAGE")
    draw_region(draw, regions["meetingArea"], "MEETING CLEARING >=420x280")
    draw_region(draw, regions["jesusCamp"], "CAMP CLEARING >=520x300")
    draw_region(draw, regions["tombGarden"], "TOMB CLEARING >=560x360")

    draw_path(
        draw,
        [(520, 1220), (1040, 1040), (1640, 1050), (2260, 1260)],
        profile["mainRoadWidth"],
        COLORS["road"],
    )
    route = [(point["x"], point["y"]) for point in regions["tombRoute"]["points"]]
    route.append((2220, 430))
    draw_path(draw, route, profile["secondaryRoadWidth"], COLORS["secondary"])
    draw_path(draw, [(380, 700), (800, 520), (1240, 420)], 80, COLORS["secondary"])

    for terrace_y in (240, 360, 480):
        draw.line((160, terrace_y, 1280, terrace_y - 80), fill=COLORS["rock"], width=34)
    for center in ((270, 280), (540, 400), (860, 300), (1160, 460)):
        draw_olive(draw, center, profile["oliveCanopyDiameter"])

    draw_house(
        draw,
        (520, 1110),
        profile["marthaHouseWidth"],
        profile["marthaHouseVisibleHeight"],
        profile["doorClearHeight"],
    )
    draw_house(
        draw,
        (850, 800),
        310,
        profile["smallHouseVisibleHeight"],
        profile["doorClearHeight"],
    )
    draw_house(
        draw,
        (1260, 850),
        285,
        profile["smallHouseVisibleHeight"],
        profile["doorClearHeight"],
    )

    well = profile["wellDiameter"]
    draw.ellipse(
        (1040 - well // 2, 900 - well // 2, 1040 + well // 2, 900 + well // 2),
        fill=COLORS["wall"],
        outline=COLORS["ink"],
        width=profile["lowWallHeight"] // 8,
    )
    draw.text((980, 830), f"WELL {well}px", fill=COLORS["ink"])

    for center in ((2060, 1200), (2450, 1170), (2520, 1380)):
        draw_olive(draw, center, profile["oliveCanopyDiameter"])
    draw.rectangle((2070, 1190, 2450, 1380), outline=COLORS["ink"], width=3)

    tomb_width = profile["tombOpeningWidth"]
    tomb_height = profile["tombOpeningVisibleHeight"]
    tomb_box = (
        2220 - tomb_width // 2,
        360 - tomb_height // 2,
        2220 + tomb_width // 2,
        360 + tomb_height // 2,
    )
    draw.ellipse(tomb_box, fill=COLORS["rock"], outline=COLORS["ink"], width=5)
    inset = 42
    draw.ellipse(
        (tomb_box[0] + inset, tomb_box[1] + inset, tomb_box[2] - inset, tomb_box[3] - 18),
        fill=(65, 61, 54),
    )
    draw.rectangle((2160, 490, 2280, 610), outline=COLORS["accent"], width=5)
    draw.text((2160, 614), "STONE 120x120", fill=COLORS["ink"])

    for label, anchor in SPRITE_GROUPS.items():
        paste_sprite_group(board, anchor, sprites)
        draw.text((anchor[0] - 64, anchor[1] - 126), label, fill=COLORS["accent"])

    draw.text(
        (112, 1460),
        "Actual approved runtime frames: Martha 84px / Messenger 90px / Jesus 96px",
        fill=COLORS["ink"],
    )
    return board


def save_comparison(boards: list[tuple[str, Image.Image]]) -> None:
    thumbnails = []
    for profile, board in boards:
        thumbnail = board.convert("RGB")
        thumbnail.thumbnail((510, 288), Image.Resampling.LANCZOS)
        thumbnails.append((profile, thumbnail))
    comparison = Image.new("RGB", (1600, 340), (34, 31, 29))
    draw = ImageDraw.Draw(comparison)
    cursor = 20
    for profile, thumbnail in thumbnails:
        draw.text((cursor, 12), f"PROFILE {profile}", fill=(245, 238, 222))
        comparison.paste(thumbnail, (cursor, 36))
        cursor += 525
    comparison.save(
        OUTPUT_DIRECTORY / COMPARISON_NAME,
        format="JPEG",
        quality=82,
        optimize=True,
        progressive=True,
    )


def main() -> None:
    contract = load_contract()
    sprites = [load_sprite(spec) for spec in SPRITES]
    OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)
    boards = []
    for profile in ("A", "B", "C"):
        board = build_board(contract, profile, sprites)
        board_path = OUTPUT_DIRECTORY / BOARD_TEMPLATE.format(profile=profile.lower())
        board.convert("RGB").save(board_path, format="PNG", optimize=True)
        boards.append((profile, board))
    save_comparison(boards)


if __name__ == "__main__":
    main()
