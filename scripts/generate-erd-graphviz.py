from __future__ import annotations

import html
import importlib.util
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BASE_SCRIPT = ROOT / "scripts" / "generate-erd.py"
OUTPUT_DIR = ROOT / "docs" / "diagrams"
DOT_PATH = OUTPUT_DIR / "erd-full.dot"
SVG_PATH = OUTPUT_DIR / "erd-full.svg"
PNG_PATH = OUTPUT_DIR / "erd-full.png"
PDF_PATH = OUTPUT_DIR / "erd-full.pdf"
DOT_EXE = Path(r"C:\Program Files\Graphviz\bin\dot.exe")
DOMAIN_DIR = OUTPUT_DIR / "erd-domains"


def load_base():
    spec = importlib.util.spec_from_file_location("erd_base", BASE_SCRIPT)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def q(value: str) -> str:
    return html.escape(str(value), quote=True)


def table_label(name: str, fields: list[dict]) -> str:
    rows = [
        '<TABLE BORDER="3" CELLBORDER="0" CELLSPACING="0" CELLPADDING="6" BGCOLOR="white">',
        f'<TR><TD COLSPAN="3" BGCOLOR="#E5E5E5"><FONT POINT-SIZE="16"><B>{q(name)}</B></FONT></TD></TR>',
        '<HR/>',
    ]
    for index, field in enumerate(fields):
        badges = []
        if field["pk"]:
            badges.append("PK")
        if field["fk"]:
            badges.append("FK")
        if field["uk"]:
            badges.append("UK")
        badge = "/".join(badges) or "&#160;"
        name_text = field["name"] + ("?" if field["nullable"] else "")
        bgcolor = '#F7F7F7' if index % 2 else '#FFFFFF'
        rows.append(
            f'<TR><TD WIDTH="52" ALIGN="LEFT" BGCOLOR="{bgcolor}"><B>{badge}</B></TD>'
            f'<TD PORT="f_{q(field["name"])}" WIDTH="170" ALIGN="LEFT" BGCOLOR="{bgcolor}">'
            f'<FONT POINT-SIZE="13"><B>{q(name_text)}</B></FONT></TD>'
            f'<TD WIDTH="92" ALIGN="RIGHT" BGCOLOR="{bgcolor}"><FONT POINT-SIZE="11">{q(field["type"])}</FONT></TD></TR>'
        )
    rows.append('</TABLE>')
    return ''.join(rows)


def render(dot_source: str, stem: Path) -> None:
    dot_path = stem.with_suffix(".dot")
    dot_path.write_text(dot_source, encoding="utf-8")
    for output_format in ("svg", "png", "pdf"):
        subprocess.run(
            [str(DOT_EXE), "-Kdot", f"-T{output_format}", "-Gdpi=96", str(dot_path), "-o", str(stem.with_suffix('.' + output_format))],
            check=True,
        )


def detail_dot(title: str, primary_names: list[str], models: dict, relations: list[dict]) -> str:
    primary = set(primary_names)
    selected_relations = [r for r in relations if r["child"] in primary or r["parent"] in primary]
    related = {r["child"] for r in selected_relations} | {r["parent"] for r in selected_relations}
    external = sorted(related - primary)
    lines = [
        'digraph ERD {',
        f'graph [charset="UTF-8", bgcolor="white", pad="0.3", nodesep="0.55", ranksep="0.85", splines=ortho, overlap=false, outputorder=edgesfirst, label="{q(title)}", labelloc=t, fontsize=26, fontname="Arial Bold"];',
        'node [fontname="Arial", color="black"];',
        'edge [fontname="Arial Bold", fontsize=18, color="black", penwidth=2.1, arrowsize=0.8];',
        'subgraph cluster_main { label="BẢNG THUỘC PHÂN HỆ"; fontsize=17; fontname="Arial Bold"; color="#666666"; style="dashed"; margin=24;',
    ]
    for name in primary_names:
        lines.append(f'"{name}" [shape=plain, label=<{table_label(name, models[name])}>];')
    lines.append('}')
    if external:
        lines.append('subgraph cluster_external { label="BẢNG LIÊN QUAN"; fontsize=17; fontname="Arial Bold"; color="#999999"; style="dashed"; margin=24;')
        for name in external:
            lines.append(f'"{name}" [shape=plain, label=<{table_label(name, models[name])}>];')
        lines.append('}')
    for edge_index, relation in enumerate(selected_relations, start=1):
        child, parent = relation["child"], relation["parent"]
        relation_node = f"rel_{edge_index:03d}"
        parent_field = next((f["name"] for f in models[parent] if f["pk"]), models[parent][0]["name"])
        child_field = relation["fields"][0]
        child_cardinality = "0..N" if relation["optional"] else "N"
        lines.append(f'"{relation_node}" [shape=diamond, fixedsize=true, width=0.78, height=0.56, label="có", fontsize=12, style="filled", fillcolor="white", penwidth=1.8];')
        lines.append(f'"{parent}":f_{parent_field}:e -> "{relation_node}":w [dir=none, xlabel="1"];')
        lines.append(f'"{relation_node}":e -> "{child}":f_{child_field}:w [xlabel="{child_cardinality}"];')
    lines.append('}')
    return '\n'.join(lines)


def main():
    base = load_base()
    models, relations = base.parse_schema(base.SCHEMA_PATH.read_text(encoding="utf-8"))
    domain_of = {}
    for index, (_, _, names) in enumerate(base.DOMAINS):
        for name in names:
            domain_of[name] = index

    lines = [
        'digraph ERD {',
        'graph [charset="UTF-8", bgcolor="white", pad="0.35", nodesep="0.42", ranksep="0.72",',
        '       splines=ortho, overlap=false, newrank=true, compound=true, outputorder=edgesfirst,',
        '       label="ERD TỔNG THỂ – HỆ THỐNG QUẢN TRỊ PHÒNG KHÁM DA LIỄU & BỆNH ÁN ĐIỆN TỬ",',
        '       labelloc=t, labeljust=c, fontsize=28, fontname="Arial Bold"];',
        'node [fontname="Arial", color="black", fontcolor="black"];',
        'edge [fontname="Arial Bold", fontsize=14, color="black", penwidth=1.8, arrowsize=0.75];',
    ]

    for domain_index, (title, _, names) in enumerate(base.DOMAINS):
        lines.append(f'subgraph cluster_{domain_index} {{')
        lines.append(f'label="{q(title)}"; fontsize=18; fontname="Arial Bold"; color="#777777"; penwidth=1.5; style="dashed"; margin=24;')
        for name in names:
            lines.append(f'"{name}" [shape=plain, label=<{table_label(name, models[name])}>];')
        lines.append('}')

    for edge_index, relation in enumerate(relations, start=1):
        child, parent = relation["child"], relation["parent"]
        relation_node = f"rel_{edge_index:03d}"
        field_label = ", ".join(relation["fields"])
        lines.append(
            f'"{relation_node}" [shape=diamond, fixedsize=true, width=0.72, height=0.52, '
            f'label="có", fontsize=11, margin=0.02, style="filled", fillcolor="white", penwidth=1.6];'
        )
        parent_field = next((field["name"] for field in models[parent] if field["pk"]), models[parent][0]["name"])
        child_field = relation["fields"][0]
        child_cardinality = "0..N" if relation["optional"] else "N"
        lines.append(
            f'"{parent}":f_{parent_field}:e -> "{relation_node}":w '
            f'[dir=none, xlabel="1"];'
        )
        lines.append(
            f'"{relation_node}":e -> "{child}":f_{child_field}:w '
            f'[xlabel="{child_cardinality}", tooltip="{q(parent)} → {q(child)}.{q(field_label)}"];'
        )

    lines.append('}')
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    DOT_PATH.write_text('\n'.join(lines), encoding="utf-8")
    if not DOT_EXE.exists():
        raise FileNotFoundError(f"Graphviz not found: {DOT_EXE}")
    for output_format, output_path in (("svg", SVG_PATH), ("png", PNG_PATH), ("pdf", PDF_PATH)):
        subprocess.run(
            [str(DOT_EXE), "-Kdot", f"-T{output_format}", "-Gdpi=96", str(DOT_PATH), "-o", str(output_path)],
            check=True,
        )
    DOMAIN_DIR.mkdir(parents=True, exist_ok=True)
    for domain_number, (title, _, names) in enumerate(base.DOMAINS, start=1):
        safe_stem = f"domain-{domain_number:02d}"
        render(detail_dot(f"ERD CHI TIẾT – {title}", names, models, relations), DOMAIN_DIR / safe_stem)
    print(f"Generated {SVG_PATH}")
    print(f"Generated {PNG_PATH}")
    print(f"Generated {PDF_PATH}")
    print(f"Models={len(models)} Relations={len(relations)}")


if __name__ == "__main__":
    main()
