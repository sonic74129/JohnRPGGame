import argparse
import sys

from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate and resize one generated PNG from stdin to stdout."
    )
    parser.add_argument("request_width", type=int)
    parser.add_argument("request_height", type=int)
    parser.add_argument("output_width", type=int)
    parser.add_argument("output_height", type=int)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with Image.open(sys.stdin.buffer) as source:
        if source.size != (args.request_width, args.request_height):
            raise ValueError(
                f"Generated image is {source.width}x{source.height}; "
                f"expected {args.request_width}x{args.request_height}."
            )
        image = source.convert("RGBA").resize(
            (args.output_width, args.output_height),
            Image.Resampling.LANCZOS,
        )
        image.save(sys.stdout.buffer, format="PNG", optimize=True)


if __name__ == "__main__":
    main()
