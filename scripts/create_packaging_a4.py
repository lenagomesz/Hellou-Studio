from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "pdf"
TMP_DIR = ROOT / "tmp" / "pdfs"
OUT_DIR.mkdir(parents=True, exist_ok=True)
TMP_DIR.mkdir(parents=True, exist_ok=True)

PDF_PATH = OUT_DIR / "hellou-studio-caixinha-a4.pdf"
LOGO_SOURCE = ROOT / "public" / "logo.png"
LOGO_TRANSPARENT = TMP_DIR / "hellou-logo-transparente.png"
PREVIEW_SOURCE = Path(r"C:\Users\helen\.codex\generated_images\01a08c49-2a26-7433-bb24-1e3f690e7844\exec-7d169ba4-4eff-43db-82fd-33d09a9ea589.png")


def prepare_logo() -> None:
    image = Image.open(LOGO_SOURCE).convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            # The source logo is supplied on an almost-white square canvas.
            # Remove that canvas completely so the wordmark can be sized by its
            # real colored bounds instead of by the original 2000 px artwork.
            spread = max(r, g, b) - min(r, g, b)
            if min(r, g, b) > 232 and spread < 22:
                alpha = 0
            else:
                alpha = 255
            pixels[x, y] = (r, g, b, alpha)
    bbox = image.getbbox()
    if bbox:
        image = image.crop(bbox)
    image.save(LOGO_TRANSPARENT)


def prepare_preview_panels() -> list[Path]:
    """Extract the approved flat artwork so the print file is visually identical."""
    preview = Image.open(PREVIEW_SOURCE).convert("RGB")
    # Interior bounds of the four visible body panels plus the glue tab in the
    # approved 1024 x 1536 preview. A small inset excludes its illustrative
    # guide strokes; the PDF adds dimensionally exact guides afterward.
    crop_boxes = [
        (82, 543, 208, 917),
        (213, 543, 390, 917),
        (395, 543, 514, 917),
        (519, 543, 661, 917),
        (666, 545, 698, 915),
    ]
    paths: list[Path] = []
    target_widths_mm = [30, 55, 30, 55, 10]
    vertical_centering = [0.5, 0.5, 0.5, 0.72, 0.5]
    for index, box in enumerate(crop_boxes):
        crop = preview.crop(box)
        # Fit by uniform scaling and center-cropping. This preserves the exact
        # proportions of the logo and lettering instead of stretching them to
        # compensate for perspective in the presentation mockup.
        target_size = (target_widths_mm[index] * 16, 90 * 16)
        crop = ImageOps.fit(
            crop,
            target_size,
            method=Image.Resampling.LANCZOS,
            centering=(0.5, vertical_centering[index]),
        )
        if index == 1:
            # Remove the perspective-rendered logo from the sampled artwork by
            # extending a nearby clean paper strip across the same quiet area.
            # Feathering prevents any visible rectangular repair boundary.
            x1, y1, x2, y2 = 0, 255, target_size[0], 1090
            clean_strip = Image.new("RGB", (x2 - x1, y2 - y1), (250, 247, 246))
            patch_layer = crop.copy()
            patch_layer.paste(clean_strip, (x1, y1))
            mask = Image.new("L", target_size, 0)
            ImageDraw.Draw(mask).rectangle((x1, y1 + 24, x2, y2 - 24), fill=255)
            mask = mask.filter(ImageFilter.GaussianBlur(20))
            crop = Image.composite(patch_layer, crop, mask)
        path = TMP_DIR / f"preview-panel-{index + 1}.png"
        crop.save(path, quality=95)
        paths.append(path)
    return paths


def mmv(value: float) -> float:
    return value * mm


def draw_wave(c: canvas.Canvas, x: float, y: float, w: float, h: float, offset: float = 0) -> None:
    c.saveState()
    clip = c.beginPath()
    clip.rect(mmv(x), mmv(y), mmv(w), mmv(h))
    c.clipPath(clip, stroke=0, fill=0)

    bands = [
        ("#EC4899", 0.34, 0.00),
        ("#FB7185", 0.25, 3.2),
        ("#F97316", 0.22, 6.4),
    ]
    for color, alpha, delta in bands:
        c.setFillColor(Color(*HexColor(color).rgb(), alpha=alpha))
        p = c.beginPath()
        base = y + 7 + offset + delta
        p.moveTo(mmv(x - 4), mmv(base))
        p.curveTo(mmv(x + w * 0.20), mmv(base + 13), mmv(x + w * 0.45), mmv(base - 9), mmv(x + w * 0.66), mmv(base + 3))
        p.curveTo(mmv(x + w * 0.82), mmv(base + 12), mmv(x + w + 5), mmv(base - 1), mmv(x + w + 5), mmv(base + 9))
        p.lineTo(mmv(x + w + 5), mmv(y - 4))
        p.lineTo(mmv(x - 4), mmv(y - 4))
        p.close()
        c.drawPath(p, fill=1, stroke=0)

        # Thin glossy ridge, echoing the translucent glass-like waves in the preview.
        c.setStrokeColor(Color(1, 1, 1, alpha=0.72))
        c.setLineWidth(mmv(0.65))
        ridge = c.beginPath()
        ridge.moveTo(mmv(x - 3), mmv(base + 1.6))
        ridge.curveTo(mmv(x + w * 0.20), mmv(base + 14.6), mmv(x + w * 0.45), mmv(base - 7.4), mmv(x + w * 0.66), mmv(base + 4.6))
        ridge.curveTo(mmv(x + w * 0.82), mmv(base + 13.6), mmv(x + w + 4), mmv(base + 0.6), mmv(x + w + 4), mmv(base + 10.6))
        c.drawPath(ridge, fill=0, stroke=1)
    c.restoreState()


def fill_panel(c: canvas.Canvas, x: float, y: float, w: float, h: float, offset: float = 0) -> None:
    c.setFillColor(HexColor("#FFFAF7"))
    c.rect(mmv(x), mmv(y), mmv(w), mmv(h), fill=1, stroke=0)
    draw_wave(c, x, y, w, h, offset)
    draw_wave(c, x, y + h - 28, w, 28, offset=-4)


def draw_bubble(c: canvas.Canvas, x: float, y: float, radius: float, color: str = "#FB7185") -> None:
    c.saveState()
    c.setFillColor(Color(*HexColor(color).rgb(), alpha=0.20))
    c.circle(mmv(x), mmv(y), mmv(radius * 1.25), fill=1, stroke=0)
    c.setFillColor(Color(*HexColor(color).rgb(), alpha=0.66))
    c.circle(mmv(x), mmv(y), mmv(radius), fill=1, stroke=0)
    c.setFillColor(Color(1, 1, 1, alpha=0.72))
    c.circle(mmv(x - radius * 0.30), mmv(y + radius * 0.34), mmv(radius * 0.24), fill=1, stroke=0)
    c.restoreState()


def draw_sparkle(c: canvas.Canvas, x: float, y: float, radius: float = 2.8) -> None:
    c.saveState()
    c.setFillColor(HexColor("#F97316"))
    p = c.beginPath()
    p.moveTo(mmv(x), mmv(y + radius))
    p.curveTo(mmv(x + radius * 0.28), mmv(y + radius * 0.28), mmv(x + radius * 0.28), mmv(y + radius * 0.28), mmv(x + radius), mmv(y))
    p.curveTo(mmv(x + radius * 0.28), mmv(y - radius * 0.28), mmv(x + radius * 0.28), mmv(y - radius * 0.28), mmv(x), mmv(y - radius))
    p.curveTo(mmv(x - radius * 0.28), mmv(y - radius * 0.28), mmv(x - radius * 0.28), mmv(y - radius * 0.28), mmv(x - radius), mmv(y))
    p.curveTo(mmv(x - radius * 0.28), mmv(y + radius * 0.28), mmv(x - radius * 0.28), mmv(y + radius * 0.28), mmv(x), mmv(y + radius))
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    c.restoreState()


def cut_poly(c: canvas.Canvas, points: list[tuple[float, float]]) -> None:
    p = c.beginPath()
    p.moveTo(mmv(points[0][0]), mmv(points[0][1]))
    for x, y in points[1:]:
        p.lineTo(mmv(x), mmv(y))
    c.drawPath(p, fill=0, stroke=1)


def fold_line(c: canvas.Canvas, x1: float, y1: float, x2: float, y2: float) -> None:
    c.saveState()
    c.setStrokeColor(HexColor("#F97316"))
    c.setLineWidth(0.55)
    c.setDash(mmv(2.2), mmv(1.4))
    c.line(mmv(x1), mmv(y1), mmv(x2), mmv(y2))
    c.restoreState()


def create_pdf() -> None:
    prepare_logo()
    preview_panels = prepare_preview_panels()
    c = canvas.Canvas(str(PDF_PATH), pagesize=A4)
    page_w, page_h = A4
    c.setTitle("Hellou Studio - Caixinha A4 para montar")
    c.setAuthor("Hellou Studio")
    c.setSubject("Gabarito de embalagem 55 x 30 x 90 mm")

    c.setFillColor(HexColor("#FFFFFF"))
    c.rect(0, 0, page_w, page_h, fill=1, stroke=0)

    # Finished dimensions: 55 mm front, 30 mm depth, 90 mm height.
    x0 = 15.0
    body_y = 103.5
    body_h = 90.0
    widths = [30.0, 55.0, 30.0, 55.0, 10.0]
    xs = [x0]
    for width in widths:
        xs.append(xs[-1] + width)

    # Printed panels: use the approved preview artwork itself, fitted to the
    # exact 30 / 55 / 30 / 55 mm panel sequence.
    for index, width in enumerate(widths):
        if index == 4:
            # The glue tab is hidden after assembly; keep it clean and printable.
            c.setFillColor(HexColor("#FFFAF7"))
            c.rect(mmv(xs[index]), mmv(body_y), mmv(width), mmv(body_h), fill=1, stroke=0)
        else:
            c.drawImage(
                ImageReader(str(preview_panels[index])),
                mmv(xs[index]),
                mmv(body_y),
                width=mmv(width),
                height=mmv(body_h),
                preserveAspectRatio=False,
                mask="auto",
            )

    # Flap fills use the store's primary pink on both closures.
    top_shapes = [
        [(15, 193.5), (45, 193.5), (41.5, 211.5), (18.5, 211.5)],
        [(45, 193.5), (100, 193.5), (97, 205.5), (48, 205.5)],
        [(100, 193.5), (130, 193.5), (126.5, 211.5), (103.5, 211.5)],
        [(130, 193.5), (185, 193.5), (181, 218.5), (134, 218.5)],
    ]
    bottom_shapes = [
        [(15, 103.5), (45, 103.5), (41.5, 85.5), (18.5, 85.5)],
        [(45, 103.5), (100, 103.5), (96, 78.5), (49, 78.5)],
        [(100, 103.5), (130, 103.5), (126.5, 85.5), (103.5, 85.5)],
        [(130, 103.5), (185, 103.5), (182, 91.5), (133, 91.5)],
    ]
    for shape in top_shapes:
        c.setFillColor(HexColor("#FF4090"))
        p = c.beginPath()
        p.moveTo(mmv(shape[0][0]), mmv(shape[0][1]))
        for px, py in shape[1:]:
            p.lineTo(mmv(px), mmv(py))
        p.close()
        c.drawPath(p, fill=1, stroke=0)

    for shape in bottom_shapes:
        c.setFillColor(HexColor("#FF4090"))
        p = c.beginPath()
        p.moveTo(mmv(shape[0][0]), mmv(shape[0][1]))
        for px, py in shape[1:]:
            p.lineTo(mmv(px), mmv(py))
        p.close()
        c.drawPath(p, fill=1, stroke=0)

    # Official logo is also used above the dieline.
    logo = ImageReader(str(LOGO_TRANSPARENT))
    front_x, front_w = xs[1], widths[1]
    # Place the official artwork without distortion, at the same visual center.
    logo_w, logo_h = 37.0, 20.1
    c.drawImage(
        logo,
        mmv(front_x + (front_w - logo_w) / 2),
        mmv(body_y + (body_h - logo_h) / 2),
        width=mmv(logo_w),
        height=mmv(logo_h),
        preserveAspectRatio=True,
        mask="auto",
        anchor="c",
    )

    # Cut outline.
    c.saveState()
    c.setStrokeColor(HexColor("#9D174D"))
    c.setLineWidth(1.0)
    c.setDash()
    cut_poly(c, [(15, 103.5), (15, 193.5)])
    for shape in top_shapes + bottom_shapes:
        # Draw only the three outer edges; the base is a fold.
        cut_poly(c, shape[1:] + [shape[0]])
    cut_poly(c, [(185, 193.5), (195, 188.5), (195, 108.5), (185, 103.5)])
    cut_poly(c, [(15, 193.5), (18.5, 211.5), (41.5, 211.5), (45, 193.5)])
    cut_poly(c, [(15, 103.5), (18.5, 85.5), (41.5, 85.5), (45, 103.5)])
    c.restoreState()

    # Fold guides.
    for x in xs[1:-1]:
        fold_line(c, x, body_y, x, body_y + body_h)
    fold_line(c, 185, 108.5, 185, 188.5)
    for left, right in zip(xs[:4], xs[1:5]):
        fold_line(c, left, body_y, right, body_y)
        fold_line(c, left, body_y + body_h, right, body_y + body_h)

    # Legend and 20 mm calibration square.
    legend_y = 51.0
    c.setStrokeColor(HexColor("#9D174D"))
    c.setLineWidth(1.0)
    c.setDash()
    c.line(mmv(15), mmv(legend_y), mmv(31), mmv(legend_y))
    c.setFillColor(HexColor("#211D25"))
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(mmv(34), mmv(legend_y - 1.2), "CORTE")

    c.setStrokeColor(HexColor("#F97316"))
    c.setLineWidth(0.55)
    c.setDash(mmv(2.2), mmv(1.4))
    c.line(mmv(63), mmv(legend_y), mmv(79), mmv(legend_y))
    c.setFillColor(HexColor("#211D25"))
    c.drawString(mmv(82), mmv(legend_y - 1.2), "DOBRA")

    c.setStrokeColor(HexColor("#211D25"))
    c.setLineWidth(0.65)
    c.setDash()
    c.rect(mmv(165), mmv(43), mmv(20), mmv(20), fill=0, stroke=1)
    c.setFillColor(HexColor("#211D25"))
    c.setFont("Helvetica", 6.8)
    c.drawCentredString(mmv(175), mmv(39.2), "controle: 20 mm")

    c.setFont("Helvetica", 7.2)
    c.drawString(mmv(15), mmv(31), "Caixa montada: 55 x 30 x 90 mm. Imprima em A4, tamanho real (100%), sem ajustar.")
    c.drawString(mmv(15), mmv(26.5), "Papel 180 a 240 g/m2. Corte a linha rosa, vinque a laranja e cole a aba por dentro.")

    c.showPage()
    c.save()


if __name__ == "__main__":
    create_pdf()
    print(PDF_PATH)
