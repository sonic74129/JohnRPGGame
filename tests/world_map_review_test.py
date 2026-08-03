import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location(
    "world_map_review", ROOT / "scripts" / "review-world-map.py"
)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class WorldMapReviewTests(unittest.TestCase):
    def setUp(self):
        self.layout = json.loads(
            (ROOT / "art" / "world-map-layout.json").read_text(encoding="utf-8")
        )

    def test_locked_topology_passes(self):
        result = MODULE.topology_checks(self.layout)

        self.assertTrue(result["passes"])
        self.assertTrue(all(result["checks"].values()))

    def test_blank_candidate_fails_visual_checks(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "blank.png"
            Image.new("RGB", (2720, 1536), "white").save(path)

            result = MODULE.analyze_candidate(path, self.layout)

        self.assertFalse(result["passes"])
        self.assertFalse(result["checks"]["filledCanvas"])
        self.assertFalse(result["checks"]["filledSafeBorder"])


if __name__ == "__main__":
    unittest.main()
