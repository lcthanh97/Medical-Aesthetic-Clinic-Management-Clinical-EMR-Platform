from __future__ import annotations

import html
import re
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_PATH = ROOT / "prisma" / "schema.prisma"
OUTPUT_DIR = ROOT / "docs" / "diagrams"
SVG_PATH = OUTPUT_DIR / "erd-full.svg"
PNG_PATH = OUTPUT_DIR / "erd-full.png"
PDF_PATH = OUTPUT_DIR / "erd-full.pdf"

DOMAINS = [
    ("TÀI KHOẢN & PHÂN QUYỀN", "#FFFFFF", ["Account", "RefreshToken", "Role", "Permission", "AccountRole", "RolePermission", "AuditLog"]),
    ("CƠ SỞ & NHÂN SỰ", "#FFFFFF", ["ClinicFacility", "Department", "Room", "Employee", "WorkSchedule"]),
    ("BỆNH NHÂN & TIẾP NHẬN", "#FFFFFF", ["Patient", "Allergy", "MedicalHistory", "Appointment", "Visit", "MedicalRecord"]),
    ("CẬN LÂM SÀNG", "#FFFFFF", ["ClinicalOrder", "ServiceCatalog", "LabResult", "ImagingResult"]),
    ("MẪU PHÁC ĐỒ", "#FFFFFF", ["TreatmentProtocolTemplate", "ProtocolStageTemplate", "ProtocolStepTemplate", "ProtocolStepMaterial", "ProcedureCatalog"]),
    ("ĐIỀU TRỊ", "#FFFFFF", ["TreatmentPlan", "TreatmentStage", "TreatmentStep", "TreatmentSession", "TreatmentImage", "InteractionAlert"]),
    ("THUỐC & HOẠT CHẤT", "#FFFFFF", ["Medicine", "ActiveIngredient", "MedicineIngredient", "IngredientInteraction", "Prescription", "PrescriptionItem"]),
    ("KHO & THIẾT BỊ", "#FFFFFF", ["Supply", "TreatmentConsumption", "InventoryTransaction", "Equipment", "EquipmentUsage", "EquipmentMaintenance"]),
    ("ĐỒNG Ý, THANH TOÁN & THÔNG BÁO", "#FFFFFF", ["ConsentTemplate", "SignedConsent", "ConsentAudit", "Invoice", "InvoiceItem", "Payment", "PaymentAllocation", "Notification", "NotificationDelivery"]),
]

SCALARS = {"String", "Int", "Float", "Decimal", "Boolean", "DateTime", "Json", "Bytes", "BigInt"}
TYPE_LABELS = {"String": "text", "Int": "int", "Float": "float", "Decimal": "decimal", "Boolean": "bool", "DateTime": "timestamp", "Json": "jsonb", "Bytes": "bytes", "BigInt": "bigint"}


def parse_schema(text: str):
    models = {}
    relations = []
    for match in re.finditer(r"model\s+(\w+)\s*\{(.*?)\n\}", text, re.S):
        name, body = match.group(1), match.group(2)
        lines = [line.strip() for line in body.splitlines() if line.strip()]
        composite_pk = set()
        composite_uk = set()
        for line in lines:
            pk_match = re.match(r"@@id\(\[([^]]+)\]\)", line)
            uk_match = re.match(r"@@unique\(\[([^]]+)\]\)", line)
            if pk_match:
                composite_pk.update(x.strip() for x in pk_match.group(1).split(","))
            if uk_match:
                composite_uk.update(x.strip() for x in uk_match.group(1).split(","))

        fields = []
        fk_names = set()
        relation_lines = []
        for line in lines:
            if line.startswith("@@") or line.startswith("//"):
                continue
            field_match = re.match(r"(\w+)\s+([\w]+)(\[\]|\?)?\s*(.*)", line)
            if not field_match:
                continue
            field_name, base_type, modifier, attrs = field_match.groups()
            rel_match = re.search(r"@relation\([^)]*fields:\s*\[([^]]+)\]", attrs)
            if rel_match:
                local_fields = [x.strip() for x in rel_match.group(1).split(",")]
                fk_names.update(local_fields)
                relation_lines.append((base_type, local_fields, modifier == "?"))
            if base_type in SCALARS:
                fields.append({
                    "name": field_name,
                    "type": TYPE_LABELS.get(base_type, base_type.lower()) + ("[]" if modifier == "[]" else ""),
                    "nullable": modifier == "?",
                    "pk": "@id" in attrs or field_name in composite_pk,
                    "uk": "@unique" in attrs or field_name in composite_uk,
                    "fk": False,
                })
        for field in fields:
            field["fk"] = field["name"] in fk_names
        models[name] = fields
        for target, local_fields, optional in relation_lines:
            relations.append({"child": name, "parent": target, "fields": local_fields, "optional": optional})
    return models, relations


def pack_domain(model_names, models, box_x, box_y, box_w, box_h):
    padding = 46
    title_h = 62
    gap_x = 34
    gap_y = 30
    columns = 3 if len(model_names) >= 6 else 2
    table_w = int((box_w - padding * 2 - gap_x * (columns - 1)) / columns)
    column_heights = [box_y + title_h + padding for _ in range(columns)]
    positions = {}
    for model_name in sorted(model_names, key=lambda item: len(models[item]), reverse=True):
        field_count = len(models[model_name])
        table_h = 52 + field_count * 27 + 14
        column = min(range(columns), key=lambda idx: column_heights[idx])
        x = box_x + padding + column * (table_w + gap_x)
        y = column_heights[column]
        positions[model_name] = (x, y, table_w, table_h)
        column_heights[column] += table_h + gap_y
    return positions


def svg_text(x, y, text, size=18, weight="normal", color="#000000", anchor="start"):
    return f'<text x="{x}" y="{y}" font-family="Arial, sans-serif" font-size="{size}" font-weight="{weight}" fill="{color}" text-anchor="{anchor}">{html.escape(str(text))}</text>'


def main():
    models, relations = parse_schema(SCHEMA_PATH.read_text(encoding="utf-8"))
    expected = {model for _, _, names in DOMAINS for model in names}
    if set(models) != expected:
        missing = sorted(set(models) - expected)
        stale = sorted(expected - set(models))
        raise RuntimeError(f"Domain map mismatch. Missing={missing}; stale={stale}")

    canvas_w, canvas_h = 7800, 6000
    margin_x, margin_y = 90, 180
    gap_x, gap_y = 70, 80
    domain_w = int((canvas_w - margin_x * 2 - gap_x * 2) / 3)
    domain_h = int((canvas_h - margin_y - 100 - gap_y * 2) / 3)
    positions = {}
    domain_boxes = []
    domain_color = {}
    for index, (title, color, names) in enumerate(DOMAINS):
        row, col = divmod(index, 3)
        x = margin_x + col * (domain_w + gap_x)
        y = margin_y + row * (domain_h + gap_y)
        domain_boxes.append((title, color, x, y, domain_w, domain_h))
        positions.update(pack_domain(names, models, x, y, domain_w, domain_h))
        for model in names:
            domain_color[model] = color

    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{canvas_w}" height="{canvas_h}" viewBox="0 0 {canvas_w} {canvas_h}">']
    svg.append('<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#000000"/></marker></defs>')
    svg.append('<rect width="100%" height="100%" fill="#FFFFFF"/>')
    svg.append(f'<rect x="1600" y="24" width="4600" height="78" rx="8" fill="#FFFFFF" stroke="#000000" stroke-width="3"/>')
    svg.append(svg_text(canvas_w / 2, 75, "ERD TỔNG THỂ – HỆ THỐNG QUẢN TRỊ PHÒNG KHÁM DA LIỄU & BỆNH ÁN ĐIỆN TỬ", 38, "700", "#000000", "middle"))
    svg.append(svg_text(canvas_w / 2, 130, f"Nguồn: prisma/schema.prisma · {len(models)} bảng · {len(relations)} quan hệ khóa ngoại", 20, "normal", "#000000", "middle"))

    for title, color, x, y, w, h in domain_boxes:
        svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#FFFFFF" stroke="#000000" stroke-width="2" stroke-dasharray="12 8"/>')
        svg.append(svg_text(x + 30, y + 40, title, 24, "700", "#000000"))

    # Draw relationships beneath the tables. Cross-domain links are slightly darker.
    for relation in relations:
        child, parent = relation["child"], relation["parent"]
        if child not in positions or parent not in positions:
            continue
        cx, cy, cw, ch = positions[child]
        px, py, pw, ph = positions[parent]
        child_center = (cx + cw / 2, cy + ch / 2)
        parent_center = (px + pw / 2, py + ph / 2)
        if parent_center[0] <= child_center[0]:
            start = (px + pw, py + ph / 2)
            finish = (cx, cy + ch / 2)
        else:
            start = (px, py + ph / 2)
            finish = (cx + cw, cy + ch / 2)
        mid_x = (start[0] + finish[0]) / 2
        color = "#000000"
        dash = ' stroke-dasharray="8 6"' if relation["optional"] else ""
        svg.append(f'<path d="M {start[0]} {start[1]} H {mid_x} V {finish[1]} H {finish[0]}" fill="none" stroke="{color}" stroke-width="2.2"{dash} marker-end="url(#arrow)"/>')
        diamond_y = (start[1] + finish[1]) / 2
        svg.append(f'<polygon points="{mid_x},{diamond_y - 15} {mid_x + 22},{diamond_y} {mid_x},{diamond_y + 15} {mid_x - 22},{diamond_y}" fill="#FFFFFF" stroke="#000000" stroke-width="2"/>')
        svg.append(svg_text(mid_x, diamond_y - 23, ", ".join(relation["fields"]), 12, "normal", "#000000", "middle"))
        svg.append(svg_text(start[0] + (10 if start[0] < finish[0] else -10), start[1] - 8, "1", 16, "700", color, "start" if start[0] < finish[0] else "end"))
        svg.append(svg_text(finish[0] + (-10 if start[0] < finish[0] else 10), finish[1] - 8, "0..N" if relation["optional"] else "N", 16, "700", color, "end" if start[0] < finish[0] else "start"))

    for model_name, (x, y, w, h) in positions.items():
        color = domain_color[model_name]
        svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#FFFFFF" stroke="#000000" stroke-width="2.4"/>')
        svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="46" fill="#FFFFFF" stroke="#000000" stroke-width="2.4"/>')
        svg.append(f'<line x1="{x + 68}" y1="{y + 46}" x2="{x + 68}" y2="{y + h}" stroke="#000000" stroke-width="1.4"/>')
        svg.append(svg_text(x + w / 2, y + 31, model_name, 20, "700", "#000000", "middle"))
        for index, field in enumerate(models[model_name]):
            row_y = y + 52 + index * 27
            if index % 2:
                svg.append(f'<rect x="{x + 1}" y="{row_y - 18}" width="{w - 2}" height="27" fill="#F8FAFC"/>')
            badges = []
            if field["pk"]: badges.append("PK")
            if field["fk"]: badges.append("FK")
            if field["uk"]: badges.append("UK")
            badge_text = "/".join(badges)
            if badge_text:
                badge_color = "#000000"
                svg.append(svg_text(x + 12, row_y, badge_text, 13, "700", badge_color))
            svg.append(svg_text(x + 75, row_y, field["name"] + ("?" if field["nullable"] else ""), 15, "600" if badges else "normal", "#000000"))
            svg.append(svg_text(x + w - 12, row_y, field["type"], 13, "normal", "#000000", "end"))

    legend_y = canvas_h - 42
    svg.append(svg_text(110, legend_y, "Chú giải:", 18, "700", "#000000"))
    svg.append(svg_text(225, legend_y, "PK = khóa chính", 17, "normal", "#000000"))
    svg.append(svg_text(420, legend_y, "FK = khóa ngoại", 17, "normal", "#000000"))
    svg.append(svg_text(610, legend_y, "UK = duy nhất", 17, "normal", "#000000"))
    svg.append(svg_text(790, legend_y, "Nét liền = bắt buộc", 17, "normal", "#000000"))
    svg.append(svg_text(1040, legend_y, "Nét đứt = quan hệ tùy chọn", 17, "normal", "#000000"))
    svg.append('</svg>')

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    SVG_PATH.write_text("".join(svg), encoding="utf-8")

    # Render a high-resolution PNG using the same geometry.
    scale = 0.5
    image = Image.new("RGB", (int(canvas_w * scale), int(canvas_h * scale)), "#FFFFFF")
    draw = ImageDraw.Draw(image)
    regular_path = "C:/Windows/Fonts/arial.ttf"
    bold_path = "C:/Windows/Fonts/arialbd.ttf"
    fonts = {size: ImageFont.truetype(regular_path, max(8, int(size * scale))) for size in [13, 15, 16, 17, 18, 20, 24, 38]}
    bold_fonts = {size: ImageFont.truetype(bold_path, max(8, int(size * scale))) for size in [13, 15, 16, 17, 18, 20, 24, 38]}
    def box(coords, fill, outline=None, width=1, radius=0):
        coords = tuple(int(v * scale) for v in coords)
        draw.rounded_rectangle(coords, radius=int(radius * scale), fill=fill, outline=outline, width=max(1, int(width * scale)))
    def txt(x, y, value, size, fill, bold=False, anchor="la"):
        draw.text((int(x * scale), int(y * scale)), str(value), font=(bold_fonts if bold else fonts)[size], fill=fill, anchor=anchor)
    box((1600, 24, 6200, 102), "#FFFFFF", "#000000", 3, 8)
    txt(canvas_w / 2, 62, "ERD TỔNG THỂ – HỆ THỐNG QUẢN TRỊ PHÒNG KHÁM DA LIỄU & BỆNH ÁN ĐIỆN TỬ", 38, "#000000", True, "ma")
    txt(canvas_w / 2, 120, f"Nguồn: prisma/schema.prisma · {len(models)} bảng · {len(relations)} quan hệ khóa ngoại", 20, "#000000", False, "ma")
    for title, color, x, y, w, h in domain_boxes:
        box((x, y, x + w, y + h), "#FFFFFF", "#000000", 2, 0)
        txt(x + 30, y + 22, title, 24, "#000000", True)
    for relation in relations:
        child, parent = relation["child"], relation["parent"]
        if child not in positions or parent not in positions: continue
        cx, cy, cw, ch = positions[child]; px, py, pw, ph = positions[parent]
        if px + pw / 2 <= cx + cw / 2: start, finish = (px + pw, py + ph / 2), (cx, cy + ch / 2)
        else: start, finish = (px, py + ph / 2), (cx + cw, cy + ch / 2)
        mid_x = (start[0] + finish[0]) / 2
        color = "#000000"
        pts = [(int(start[0]*scale), int(start[1]*scale)), (int(mid_x*scale), int(start[1]*scale)), (int(mid_x*scale), int(finish[1]*scale)), (int(finish[0]*scale), int(finish[1]*scale))]
        draw.line(pts, fill=color, width=1)
        diamond_y = (start[1] + finish[1]) / 2
        diamond = [(int(mid_x*scale), int((diamond_y-15)*scale)), (int((mid_x+22)*scale), int(diamond_y*scale)), (int(mid_x*scale), int((diamond_y+15)*scale)), (int((mid_x-22)*scale), int(diamond_y*scale))]
        draw.polygon(diamond, fill="#FFFFFF", outline="#000000")
        txt(start[0] + (10 if start[0] < finish[0] else -10), start[1] - 18, "1", 16, color, True, "la" if start[0] < finish[0] else "ra")
        txt(finish[0] + (-10 if start[0] < finish[0] else 10), finish[1] - 18, "0..N" if relation["optional"] else "N", 16, color, True, "ra" if start[0] < finish[0] else "la")
    for model_name, (x, y, w, h) in positions.items():
        box((x, y, x + w, y + h), "#FFFFFF", "#000000", 2, 0)
        box((x, y, x + w, y + 46), "#FFFFFF", "#000000", 2, 0)
        draw.line([(int((x+68)*scale), int((y+46)*scale)), (int((x+68)*scale), int((y+h)*scale))], fill="#000000", width=1)
        txt(x + w / 2, y + 23, model_name, 20, "#000000", True, "mm")
        for index, field in enumerate(models[model_name]):
            row_y = y + 52 + index * 27
            badges = []
            if field["pk"]: badges.append("PK")
            if field["fk"]: badges.append("FK")
            if field["uk"]: badges.append("UK")
            badge_text = "/".join(badges)
            if badge_text: txt(x + 12, row_y - 7, badge_text, 13, "#000000", True)
            txt(x + 75, row_y - 7, field["name"] + ("?" if field["nullable"] else ""), 15, "#000000", bool(badges))
            txt(x + w - 12, row_y - 7, field["type"], 13, "#000000", False, "ra")
    image.save(PNG_PATH, optimize=True)
    image.save(PDF_PATH, "PDF", resolution=300.0)
    print(f"Generated {SVG_PATH}")
    print(f"Generated {PNG_PATH}")
    print(f"Generated {PDF_PATH}")
    print(f"Models={len(models)} Relations={len(relations)}")


if __name__ == "__main__":
    main()
