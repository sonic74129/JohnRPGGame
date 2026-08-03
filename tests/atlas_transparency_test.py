import importlib.util
import unittest
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location(
    "atlas_background",
    ROOT / "scripts" / "art" / "remove-connected-background.py",
)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
REVIEW_SPEC = importlib.util.spec_from_file_location(
    "atlas_review",
    ROOT / "scripts" / "review-clue-atlas.py",
)
REVIEW_MODULE = importlib.util.module_from_spec(REVIEW_SPEC)
REVIEW_SPEC.loader.exec_module(REVIEW_MODULE)


class AtlasTransparencyTests(unittest.TestCase):
    def test_clears_connected_background_without_cropping_foreground(self):
        image = Image.new("RGB", (120, 60), (235, 229, 214))
        draw = ImageDraw.Draw(image)
        draw.rectangle((12, 18, 28, 42), fill=(155, 72, 38))
        draw.rectangle((52, 16, 68, 44), fill=(90, 105, 120))
        draw.rectangle((92, 20, 108, 40), fill=(176, 93, 46))

        result = MODULE.remove_connected_background(image)

        self.assertEqual(result.size, image.size)
        self.assertEqual(result.getpixel((0, 0))[3], 0)
        self.assertEqual(result.getpixel((20, 30))[3], 255)
        self.assertEqual(result.getpixel((60, 30))[3], 255)
        self.assertEqual(result.getpixel((100, 30))[3], 255)

    def test_three_cell_audit_accepts_separated_foreground(self):
        image = Image.new("RGBA", (300, 120), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        draw.rectangle((24, 24, 76, 96), fill=(155, 72, 38, 255))
        draw.rectangle((124, 24, 176, 96), fill=(90, 105, 120, 255))
        draw.rectangle((224, 24, 270, 90), fill=(176, 93, 46, 255))

        with self.subTest("candidate"):
            from tempfile import TemporaryDirectory

            with TemporaryDirectory() as directory:
                path = Path(directory) / "atlas.png"
                image.save(path)
                result = REVIEW_MODULE.analyze_candidate(path, (300, 120))

        self.assertTrue(result["passes"])
        self.assertTrue(all(cell["passes"] for cell in result["cells"]))


if __name__ == "__main__":
    unittest.main()
