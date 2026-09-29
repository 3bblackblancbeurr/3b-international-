import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

MODULE_PATH = Path(__file__).resolve().parents[1] / "creator_batch_studio.py"
SPEC = importlib.util.spec_from_file_location("creator_batch_studio", MODULE_PATH)
cbs = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = cbs
SPEC.loader.exec_module(cbs)

class CreatorBatchStudioTests(unittest.TestCase):
    def test_safe_stem_and_format(self):
        self.assertEqual(cbs.safe_stem(" Mon visuel 3B ! "), "Mon-visuel-3B")
        self.assertEqual(cbs.normalize_format("jpeg"), "jpg")
        with self.assertRaises(ValueError):
            cbs.normalize_format("gif")

    def test_render_exact_and_web_presets(self):
        image = Image.new("RGB", (400, 200), "red")
        square = cbs.render_preset(image, "instagram_square")
        self.assertEqual(square.size, (1080, 1080))
        web = cbs.render_preset(image, "web_large")
        self.assertEqual(web.size, (400, 200))

    def test_batch_creates_multiple_exports_and_report(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            source = base / "source"
            output = base / "output"
            source.mkdir()
            Image.new("RGB", (400, 200), "blue").save(source / "alpha.jpg")
            Image.new("RGBA", (120, 300), (255, 0, 0, 128)).save(source / "beta.png")
            options = cbs.BatchOptions(
                output_format="webp",
                quality=82,
                prefix="TEST",
                presets=("instagram_square", "youtube_thumbnail"),
            )
            report = cbs.process_batch([source], output, options)
            self.assertEqual(report["input_files"], 2)
            self.assertEqual(report["created_outputs"], 4)
            self.assertEqual(report["failed_files"], 0)
            for item in report["outputs"]:
                self.assertTrue(Path(item["output"]).exists())
            saved = json.loads((output / "creator_batch_report.json").read_text(encoding="utf-8"))
            self.assertEqual(saved["created_outputs"], 4)

    def test_corrupt_image_is_reported_without_aborting_batch(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            source = base / "source"
            output = base / "output"
            source.mkdir()
            Image.new("RGB", (64, 64), "green").save(source / "valid.jpg")
            (source / "broken.jpg").write_bytes(b"not-an-image")
            report = cbs.process_batch(
                [source],
                output,
                cbs.BatchOptions(output_format="png", prefix="QA", presets=("original",)),
            )
            self.assertEqual(report["input_files"], 2)
            self.assertEqual(report["created_outputs"], 1)
            self.assertEqual(report["failed_files"], 1)
            self.assertEqual(len(report["errors"]), 1)

    def test_existing_output_is_never_overwritten(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            source = base / "source"
            output = base / "output"
            source.mkdir()
            Image.new("RGB", (80, 80), "purple").save(source / "same.jpg")
            options = cbs.BatchOptions(output_format="webp", prefix="SAFE", presets=("original",))
            first = cbs.process_batch([source], output, options)
            second = cbs.process_batch([source], output, options)
            first_path = Path(first["outputs"][0]["output"])
            second_path = Path(second["outputs"][0]["output"])
            self.assertTrue(first_path.exists())
            self.assertTrue(second_path.exists())
            self.assertNotEqual(first_path, second_path)

if __name__ == "__main__":
    unittest.main()
