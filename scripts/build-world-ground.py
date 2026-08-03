#!/usr/bin/env python3

from pathlib import Path
import random

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/assets/art/world/bethany-world-ground.png"
WIDTH = 2304
HEIGHT = 1536
SEED = 1111

ROUTES = (
    (120, ((480, 1100), (700, 1030), (880, 910), (1100, 820))),
    (120, ((2100, 1330), (1830, 1260), (1420, 1080), (1100, 820))),
    (112, ((1100, 820), (1320, 650), (1600, 500), (1990, 390))),
    (104, ((180, 360), (480, 470), (760, 620), (1100, 820))),
)


def build_ground(rng: random.Random) -> Image.Image:
    ground = Image.new("RGBA", (WIDTH, HEIGHT), (183, 151, 91, 255))
    draw = ImageDraw.Draw(ground)
    earth_colors = (
        (176, 142, 83, 255),
        (189, 158, 99, 255),
        (196, 166, 107, 255),
        (166, 132, 76, 255),
    )
    for y in range(0, HEIGHT, 4):
        for x in range(0, WIDTH, 4):
            if rng.random() < 0.34:
                draw.rectangle((x, y, x + 3, y + 3), fill=rng.choice(earth_colors))

    for _ in range(95):
        center_x = rng.randrange(24, WIDTH - 24)
        center_y = rng.randrange(24, HEIGHT - 24)
        radius = rng.randrange(18, 56)
        for _ in range(rng.randrange(18, 42)):
            x = center_x + rng.randrange(-radius, radius + 1)
            y = center_y + rng.randrange(-radius, radius + 1)
            color = rng.choice(
                ((104, 111, 62, 255), (121, 122, 65, 255), (139, 126, 71, 255))
            )
            draw.rectangle((x, y, x + 2, y + 2), fill=color)

    for _ in range(1800):
        x = rng.randrange(0, WIDTH)
        y = rng.randrange(0, HEIGHT)
        color = rng.choice(((128, 104, 67, 255), (220, 193, 133, 255)))
        draw.rectangle((x, y, x + 1, y + 1), fill=color)
    return ground


def jittered_route(
    points: tuple[tuple[int, int], ...], rng: random.Random
) -> list[tuple[int, int]]:
    result: list[tuple[int, int]] = [points[0]]
    for start, end in zip(points, points[1:]):
        dx = end[0] - start[0]
        dy = end[1] - start[1]
        distance = max(abs(dx), abs(dy))
        steps = max(1, distance // 28)
        for step in range(1, steps + 1):
            ratio = step / steps
            x = round(start[0] + dx * ratio)
            y = round(start[1] + dy * ratio)
            if step != steps:
                x += rng.randint(-4, 4)
                y += rng.randint(-4, 4)
            result.append((x, y))
    return result


def road_texture(rng: random.Random) -> Image.Image:
    texture = Image.new("RGBA", (WIDTH, HEIGHT), (188, 164, 116, 255))
    draw = ImageDraw.Draw(texture)
    colors = (
        (178, 150, 103, 255),
        (203, 181, 135, 255),
        (153, 126, 86, 255),
        (215, 193, 147, 255),
    )
    for y in range(0, HEIGHT, 4):
        for x in range(0, WIDTH, 4):
            if rng.random() < 0.23:
                size = 2 if rng.random() < 0.85 else 4
                draw.rectangle((x, y, x + size - 1, y + size - 1), fill=rng.choice(colors))
    return texture


def add_roads(ground: Image.Image, rng: random.Random) -> None:
    border_mask = Image.new("L", (WIDTH, HEIGHT), 0)
    road_mask = Image.new("L", (WIDTH, HEIGHT), 0)
    border_draw = ImageDraw.Draw(border_mask)
    road_draw = ImageDraw.Draw(road_mask)
    for width, points in ROUTES:
        route = jittered_route(points, rng)
        border_draw.line(route, fill=255, width=width + 16, joint="curve")
        road_draw.line(route, fill=255, width=width, joint="curve")
        for x, y in points:
            border_radius = width // 2 + 8
            road_radius = width // 2
            border_draw.ellipse(
                (
                    x - border_radius,
                    y - border_radius,
                    x + border_radius,
                    y + border_radius,
                ),
                fill=255,
            )
            road_draw.ellipse(
                (x - road_radius, y - road_radius, x + road_radius, y + road_radius),
                fill=255,
            )

    border = Image.new("RGBA", (WIDTH, HEIGHT), (119, 95, 63, 255))
    ground.alpha_composite(Image.composite(border, Image.new("RGBA", ground.size), border_mask))
    texture = road_texture(rng)
    ground.alpha_composite(
        Image.composite(texture, Image.new("RGBA", ground.size), road_mask)
    )


def main() -> None:
    rng = random.Random(SEED)
    ground = build_ground(rng)
    add_roads(ground, rng)
    ground.save(OUTPUT, optimize=True)
    print(OUTPUT)


if __name__ == "__main__":
    main()
