import io
import sys

from PIL import Image, ImageDraw


MINIMUM_TRANSPARENT_FRACTION = 0.2


def remove_connected_background(image: Image.Image, threshold: int = 58) -> Image.Image:
    result = image.convert("RGBA")
    alpha = result.getchannel("A")
    transparent = sum(1 for value in alpha.getdata() if value < 16)
    if transparent / (result.width * result.height) >= MINIMUM_TRANSPARENT_FRACTION:
        return result

    fill = (0, 0, 0, 0)
    corners = (
        (0, 0),
        (result.width - 1, 0),
        (0, result.height - 1),
        (result.width - 1, result.height - 1),
    )
    for corner in corners:
        ImageDraw.floodfill(result, corner, fill, thresh=threshold)

    alpha = result.getchannel("A")
    transparent = sum(1 for value in alpha.getdata() if value < 16)
    transparent_fraction = transparent / (result.width * result.height)
    if alpha.getbbox() is None:
        raise ValueError("Background removal cleared the entire atlas.")
    if transparent_fraction < MINIMUM_TRANSPARENT_FRACTION:
        raise ValueError(
            "Connected background removal did not produce sufficient transparent area."
        )
    return result


def main() -> None:
    source = Image.open(io.BytesIO(sys.stdin.buffer.read()))
    result = remove_connected_background(source)
    output = io.BytesIO()
    result.save(output, format="PNG", optimize=True)
    sys.stdout.buffer.write(output.getvalue())


if __name__ == "__main__":
    main()
