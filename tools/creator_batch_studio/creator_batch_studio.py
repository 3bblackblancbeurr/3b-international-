from __future__ import annotations

import argparse
import json
import queue
import re
import threading
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Iterable

from PIL import Image, ImageOps, UnidentifiedImageError

APP_NAME = "Creator Batch Studio"
APP_VERSION = "1.0.0"
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}

PRESETS = {
    "original": {"label": "Original", "size": None, "exact": False},
    "instagram_square": {"label": "Instagram 1080×1080", "size": (1080, 1080), "exact": True},
    "tiktok_story": {"label": "TikTok / Reels 1080×1920", "size": (1080, 1920), "exact": True},
    "youtube_thumbnail": {"label": "YouTube 1280×720", "size": (1280, 720), "exact": True},
    "web_large": {"label": "Web max 1600 px", "size": (1600, 1600), "exact": False},
}

@dataclass(frozen=True)
class BatchOptions:
    output_format: str = "webp"
    quality: int = 88
    prefix: str = "3B"
    presets: tuple[str, ...] = ("original",)
    background: str = "#ffffff"

def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()

def safe_stem(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_-]+", "-", value.strip())
    return cleaned.strip("-_") or "image"

def normalize_format(value: str) -> str:
    fmt = value.strip().lower().replace("jpeg", "jpg")
    if fmt not in {"jpg", "png", "webp"}:
        raise ValueError("Format de sortie non pris en charge.")
    return fmt

def collect_images(inputs: Iterable[Path]) -> list[Path]:
    found: list[Path] = []
    seen: set[str] = set()
    for raw in inputs:
        path = Path(raw).expanduser()
        candidates = path.rglob("*") if path.is_dir() else [path]
        for candidate in candidates:
            if not candidate.is_file() or candidate.suffix.lower() not in SUPPORTED_EXTENSIONS:
                continue
            key = str(candidate.resolve()).lower()
            if key not in seen:
                seen.add(key)
                found.append(candidate)
    return sorted(found, key=lambda item: str(item).lower())

def _hex_rgb(value: str) -> tuple[int, int, int]:
    raw = value.strip().lstrip("#")
    if len(raw) != 6 or not re.fullmatch(r"[0-9a-fA-F]{6}", raw):
        return 255, 255, 255
    return tuple(int(raw[i:i+2], 16) for i in (0, 2, 4))

def render_preset(image: Image.Image, preset_name: str, background: str = "#ffffff") -> Image.Image:
    preset = PRESETS[preset_name]
    image = ImageOps.exif_transpose(image)
    if preset["size"] is None:
        return image.copy()
    width, height = preset["size"]
    if not preset["exact"]:
        result = image.copy()
        result.thumbnail((width, height), Image.Resampling.LANCZOS)
        return result
    base = image.convert("RGBA")
    fitted = ImageOps.contain(base, (width, height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (width, height), (*_hex_rgb(background), 255))
    x = (width - fitted.width) // 2
    y = (height - fitted.height) // 2
    canvas.alpha_composite(fitted, (x, y))
    return canvas

def _unique_path(path: Path) -> Path:
    if not path.exists():
        return path
    for index in range(2, 10000):
        candidate = path.with_name(f"{path.stem}_{index}{path.suffix}")
        if not candidate.exists():
            return candidate
    raise RuntimeError("Impossible de créer un nom de fichier unique.")

def save_image(image: Image.Image, destination: Path, output_format: str, quality: int) -> None:
    fmt = normalize_format(output_format)
    destination.parent.mkdir(parents=True, exist_ok=True)
    quality = max(35, min(int(quality), 100))
    if fmt == "jpg":
        image.convert("RGB").save(destination, "JPEG", quality=quality, optimize=True, progressive=True)
    elif fmt == "png":
        image.save(destination, "PNG", optimize=True)
    else:
        image.save(destination, "WEBP", quality=quality, method=6)

def process_batch(
    inputs: Iterable[Path],
    output_dir: Path,
    options: BatchOptions,
    progress: Callable[[int, int, str], None] | None = None,
) -> dict:
    files = collect_images(inputs)
    if not files:
        raise ValueError("Aucune image compatible trouvée.")
    presets = tuple(dict.fromkeys(options.presets))
    unknown = [name for name in presets if name not in PRESETS]
    if unknown:
        raise ValueError(f"Preset inconnu : {unknown[0]}")
    fmt = normalize_format(options.output_format)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    total = len(files) * len(presets)
    done = 0
    outputs: list[dict] = []
    errors: list[dict] = []
    for file_index, source in enumerate(files, start=1):
        try:
            with Image.open(source) as opened:
                opened.load()
                for preset_name in presets:
                    result = render_preset(opened, preset_name, options.background)
                    folder = output_dir / preset_name
                    base = safe_stem(source.stem)
                    prefix = safe_stem(options.prefix) if options.prefix.strip() else ""
                    name_parts = [part for part in (prefix, f"{file_index:04d}", base) if part]
                    destination = _unique_path(folder / ("_".join(name_parts) + f".{fmt}"))
                    save_image(result, destination, fmt, options.quality)
                    outputs.append({
                        "source": str(source),
                        "preset": preset_name,
                        "output": str(destination),
                        "width": result.width,
                        "height": result.height,
                        "format": fmt,
                    })
                    done += 1
                    if progress:
                        progress(done, total, destination.name)
        except (OSError, UnidentifiedImageError, ValueError) as exc:
            errors.append({"source": str(source), "error": str(exc)})
            done += len(presets)
            if progress:
                progress(min(done, total), total, f"Erreur: {source.name}")
    report = {
        "app": APP_NAME,
        "version": APP_VERSION,
        "created_at": _utc_now(),
        "input_files": len(files),
        "requested_outputs": total,
        "created_outputs": len(outputs),
        "failed_files": len(errors),
        "options": asdict(options),
        "outputs": outputs,
        "errors": errors,
    }
    (output_dir / "creator_batch_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return report

def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=f"{APP_NAME} {APP_VERSION}")
    parser.add_argument("--input", action="append", default=[], help="Fichier ou dossier source. Répétable.")
    parser.add_argument("--output", help="Dossier de sortie.")
    parser.add_argument("--format", default="webp", choices=("jpg", "png", "webp"))
    parser.add_argument("--quality", type=int, default=88)
    parser.add_argument("--prefix", default="3B")
    parser.add_argument("--preset", action="append", choices=tuple(PRESETS), default=[])
    return parser.parse_args()

def run_cli(args: argparse.Namespace) -> int:
    if not args.input or not args.output:
        raise ValueError("--input et --output sont requis en mode ligne de commande.")
    options = BatchOptions(
        output_format=args.format,
        quality=args.quality,
        prefix=args.prefix,
        presets=tuple(args.preset or ["original"]),
    )
    report = process_batch([Path(item) for item in args.input], Path(args.output), options)
    print(json.dumps({
        "created_outputs": report["created_outputs"],
        "failed_files": report["failed_files"],
        "report": str(Path(args.output) / "creator_batch_report.json"),
    }, ensure_ascii=False))
    return 0

def run_gui() -> None:
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk

    root = tk.Tk()
    root.title(f"{APP_NAME} {APP_VERSION}")
    root.geometry("860x720")
    root.minsize(760, 640)

    selected: list[Path] = []
    output_var = tk.StringVar()
    format_var = tk.StringVar(value="webp")
    quality_var = tk.IntVar(value=88)
    prefix_var = tk.StringVar(value="3B")
    preset_vars = {
        name: tk.BooleanVar(value=name in {"original", "instagram_square", "tiktok_story"})
        for name in PRESETS
    }
    status_var = tk.StringVar(value="Prêt.")
    work_queue: queue.Queue = queue.Queue()

    frame = ttk.Frame(root, padding=18)
    frame.pack(fill="both", expand=True)
    ttk.Label(frame, text=APP_NAME, font=("Segoe UI", 20, "bold")).pack(anchor="w")
    ttk.Label(frame, text="Traitement d’images en lot · local · sans envoi Internet").pack(anchor="w", pady=(0, 14))

    source_box = ttk.LabelFrame(frame, text="1. Sources", padding=10)
    source_box.pack(fill="x")
    source_label = ttk.Label(source_box, text="Aucune image sélectionnée.")
    source_label.pack(side="left", fill="x", expand=True)

    def refresh_source_label() -> None:
        count = len(collect_images(selected)) if selected else 0
        source_label.config(text=f"{count} image(s) détectée(s)" if count else "Aucune image sélectionnée.")

    def add_files() -> None:
        paths = filedialog.askopenfilenames(title="Choisir des images")
        selected.extend(Path(p) for p in paths)
        refresh_source_label()

    def add_folder() -> None:
        path = filedialog.askdirectory(title="Choisir un dossier d’images")
        if path:
            selected.append(Path(path))
            refresh_source_label()

    ttk.Button(source_box, text="Images…", command=add_files).pack(side="right", padx=(8, 0))
    ttk.Button(source_box, text="Dossier…", command=add_folder).pack(side="right", padx=(8, 0))

    output_box = ttk.LabelFrame(frame, text="2. Sortie", padding=10)
    output_box.pack(fill="x", pady=10)
    ttk.Entry(output_box, textvariable=output_var).pack(side="left", fill="x", expand=True)

    def choose_output() -> None:
        path = filedialog.askdirectory(title="Choisir le dossier de sortie")
        if path:
            output_var.set(path)

    ttk.Button(output_box, text="Parcourir…", command=choose_output).pack(side="right", padx=(8, 0))

    settings = ttk.LabelFrame(frame, text="3. Réglages", padding=10)
    settings.pack(fill="x")
    row = ttk.Frame(settings)
    row.pack(fill="x")
    ttk.Label(row, text="Format").grid(row=0, column=0, sticky="w")
    ttk.Combobox(row, textvariable=format_var, values=("webp", "jpg", "png"), width=10, state="readonly").grid(row=1, column=0, sticky="w", padx=(0, 18))
    ttk.Label(row, text="Qualité").grid(row=0, column=1, sticky="w")
    ttk.Scale(row, from_=35, to=100, variable=quality_var, orient="horizontal", length=220).grid(row=1, column=1, sticky="w", padx=(0, 18))
    ttk.Label(row, text="Préfixe").grid(row=0, column=2, sticky="w")
    ttk.Entry(row, textvariable=prefix_var, width=18).grid(row=1, column=2, sticky="w")

    presets_box = ttk.Frame(settings)
    presets_box.pack(fill="x", pady=(12, 0))
    for index, (name, info) in enumerate(PRESETS.items()):
        ttk.Checkbutton(presets_box, text=info["label"], variable=preset_vars[name]).grid(
            row=index // 2, column=index % 2, sticky="w", padx=(0, 24), pady=3
        )

    progress_bar = ttk.Progressbar(frame, mode="determinate")
    progress_bar.pack(fill="x", pady=(14, 4))
    ttk.Label(frame, textvariable=status_var).pack(anchor="w")
    log = tk.Text(frame, height=11, wrap="word", state="disabled")
    log.pack(fill="both", expand=True, pady=(8, 10))

    def append_log(text: str) -> None:
        log.config(state="normal")
        log.insert("end", text + "\n")
        log.see("end")
        log.config(state="disabled")

    start_button = ttk.Button(frame, text="Créer les exports")
    start_button.pack(anchor="e")

    def pump_queue() -> None:
        try:
            while True:
                kind, payload = work_queue.get_nowait()
                if kind == "progress":
                    done, total, name = payload
                    progress_bar["maximum"] = max(1, total)
                    progress_bar["value"] = done
                    status_var.set(f"{done}/{total} · {name}")
                elif kind == "done":
                    report = payload
                    start_button.config(state="normal")
                    status_var.set(f"Terminé · {report['created_outputs']} fichier(s) créé(s)")
                    append_log(f"Terminé. {report['created_outputs']} export(s), {report['failed_files']} erreur(s).")
                    messagebox.showinfo(
                        APP_NAME,
                        f"{report['created_outputs']} export(s) créé(s).\nRapport enregistré dans le dossier de sortie.",
                    )
                elif kind == "error":
                    start_button.config(state="normal")
                    status_var.set("Erreur.")
                    append_log(str(payload))
                    messagebox.showerror(APP_NAME, str(payload))
        except queue.Empty:
            pass
        root.after(120, pump_queue)

    def start() -> None:
        presets = tuple(name for name, flag in preset_vars.items() if flag.get())
        if not selected:
            messagebox.showwarning(APP_NAME, "Choisis au moins une image ou un dossier.")
            return
        if not output_var.get().strip():
            messagebox.showwarning(APP_NAME, "Choisis un dossier de sortie.")
            return
        if not presets:
            messagebox.showwarning(APP_NAME, "Choisis au moins un format de taille.")
            return
        start_button.config(state="disabled")
        progress_bar["value"] = 0
        append_log("Traitement démarré…")
        options = BatchOptions(
            output_format=format_var.get(),
            quality=int(quality_var.get()),
            prefix=prefix_var.get(),
            presets=presets,
        )

        def worker() -> None:
            try:
                report = process_batch(
                    selected,
                    Path(output_var.get()),
                    options,
                    progress=lambda done, total, name: work_queue.put(("progress", (done, total, name))),
                )
                work_queue.put(("done", report))
            except Exception as exc:
                work_queue.put(("error", str(exc)))

        threading.Thread(target=worker, daemon=True).start()

    start_button.config(command=start)
    root.after(120, pump_queue)
    root.mainloop()

def main() -> int:
    args = _parse_args()
    if args.input or args.output:
        return run_cli(args)
    run_gui()
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
