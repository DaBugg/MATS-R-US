#!/usr/bin/env python3
"""
Build a deterministic Supabase SQL seed file from
/Users/dw/Downloads/plumbing_inventory.xlsx.

Produces: supabase/sql/09_pbau_seed.sql

The output is idempotent — safe to re-run. It:
  1. Activates floors that appear in the spreadsheet (Floor 3..18 + Deck).
  2. Adds new locations: 'Deck' (top floor), 'Floor 12 ★' (other), and 'PBAU' (other).
  3. Adds suppliers: Charlotte, Sioux Chief, Hold-Rite.
  4. Adds master materials derived from each (Size, Material, Part) tuple.
  5. Adds inventory rows for every non-empty spreadsheet row.

Re-run: python3 scripts/build_pbau_seed.py
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
SOURCE_XLSX = Path("/Users/dw/Downloads/plumbing_inventory.xlsx")
OUT_SQL = Path(__file__).resolve().parent.parent / "supabase" / "sql" / "09_pbau_seed.sql"


def read_sheet(zf: zipfile.ZipFile, member: str) -> list[list[str]]:
    """Return the sheet's rows as lists of strings (inline strings only)."""
    with zf.open(member) as fp:
        tree = ET.parse(fp)
    rows: list[list[str]] = []
    for row in tree.getroot().iter(f"{{{NS['s']}}}row"):
        cells = []
        for c in row.findall(f"{{{NS['s']}}}c"):
            t = c.get("t", "n")
            if t == "inlineStr":
                tnode = c.find(f"{{{NS['s']}}}is/{{{NS['s']}}}t")
                cells.append((tnode.text or "").strip() if tnode is not None else "")
            else:
                v = c.find(f"{{{NS['s']}}}v")
                cells.append((v.text or "").strip() if v is not None else "")
        rows.append(cells)
    return rows


def sql_quote(value: str | None) -> str:
    """SQL string literal — null for None/empty, doubled single quotes."""
    if value is None or value == "":
        return "null"
    return "'" + str(value).replace("'", "''") + "'"


def make_material_name(size: str, material: str, part: str) -> str | None:
    """Compose a canonical master-material name from (Size, Material, Part).

    Examples:
        ('4 in.', 'PVC', '45s')                 -> '4 in. PVC 45s'
        ('1/2 in.', 'Metal', 'Stub out elbows') -> '1/2 in. Metal Stub out elbows'
        ('',       'Other', 'Yellow sleeve')    -> 'Yellow sleeve'
        ('3 in. x 10 ft.', 'PVC', 'Pipe')       -> '3 in. x 10 ft. PVC Pipe'
        ('3 in.', 'PVC', 'PVC pipe')            -> '3 in. PVC pipe'   (no double-PVC)
    """
    part = (part or "").strip()
    if not part:
        return None
    size = (size or "").strip()
    material = (material or "").strip()
    parts: list[str] = []
    if size:
        parts.append(size)
    # Skip "Other" (catchall) and skip the material prefix when the part already
    # starts with it (e.g. material=PVC, part="PVC pipe").
    if material and material.lower() != "other":
        if not re.match(rf"\b{re.escape(material)}\b", part, flags=re.IGNORECASE):
            parts.append(material)
    parts.append(part)
    return " ".join(parts)


def main() -> None:
    if not SOURCE_XLSX.exists():
        raise SystemExit(f"Source spreadsheet not found: {SOURCE_XLSX}")

    with zipfile.ZipFile(SOURCE_XLSX) as zf:
        rows = read_sheet(zf, "xl/worksheets/sheet1.xml")

    header, *data_rows = rows
    expected = ["Floor", "Manufacturer", "Material", "Part", "Size", "Quantity", "Notes"]
    if header[: len(expected)] != expected:
        raise SystemExit(f"Unexpected header: {header!r}")

    # Walk rows and gather distinct values.
    floors_in_data: set[str] = set()        # every Floor ## referenced (even empty)
    other_locations_in_data: set[str] = set()  # Deck, Floor 12 ★, etc.
    suppliers_in_data: set[str] = set()
    materials_in_data: dict[str, dict] = {}  # name -> {default_unit, supplier_name}
    inventory_rows: list[dict] = []

    for raw in data_rows:
        # Pad/normalize the row to exactly 7 columns.
        cells = (raw + [""] * 7)[:7]
        floor, mfr, material, part, size, qty, notes = cells

        if not floor:
            continue

        location_name = floor.strip()
        # Track every location that appears, even if the row carries only a
        # "Nothing" note — we still want the floor to render as an active
        # (empty) row in the building map.
        if re.fullmatch(r"Floor \d+", location_name):
            floors_in_data.add(location_name)
        else:
            other_locations_in_data.add(location_name)

        if not part:
            continue

        supplier_name = mfr.strip() if mfr else None

        material_name = make_material_name(size, material, part)
        if material_name is None:
            continue

        if supplier_name:
            suppliers_in_data.add(supplier_name)

        # Track the material once. First occurrence wins for default supplier.
        if material_name not in materials_in_data:
            materials_in_data[material_name] = {
                "default_unit": "pcs",
                "supplier_name": supplier_name,
            }

        # Quantity may be empty in the source. Insert as 0 (the schema default)
        # and prefix the notes so the user knows it's a placeholder.
        try:
            quantity = float(qty) if qty else 0.0
        except ValueError:
            quantity = 0.0
        note = (notes or "").strip()
        if not qty:
            note = ("[qty TBD] " + note).strip()

        inventory_rows.append(
            {
                "material_name": material_name,
                "location_name": location_name,
                "quantity": quantity,
                "unit": "pcs",
                "supplier_name": supplier_name,
                "notes": note or None,
            }
        )

    # Emit SQL.
    lines: list[str] = []
    out = lines.append

    out("-- =========================================================================")
    out("-- 09_pbau_seed.sql")
    out("--")
    out("-- Generated from /Users/dw/Downloads/plumbing_inventory.xlsx by")
    out("-- scripts/build_pbau_seed.py — re-run that script to regenerate.")
    out("--")
    out("-- Idempotent. Safe to re-run.")
    out("-- =========================================================================")
    out("")

    # 1. Locations
    out("-- 1. Ensure non-floor locations exist (PBAU, Deck, Floor 12 ★).")
    out("--    Idempotent — only inserts if a row with that name doesn't exist.")
    out("insert into public.locations (name, type, sort_order, is_active)")
    out("select v.name, v.type, v.sort_order, true")
    out("from (values")
    out("    ('Deck',       'floor',  22,  'roof / top working deck'),")
    out("    ('Floor 12 ★', 'other',  125, 'tech cart on floor 12'),")
    out("    ('PBAU',       'other',  200, 'project base / staging area')")
    out(") as v(name, type, sort_order, note)")
    out("where not exists (")
    out("    select 1 from public.locations l where l.name = v.name")
    out(");")
    out("")

    out("-- Activate every floor that appears in the spreadsheet (the building map")
    out("-- renders only active floors). Floors NOT in the spreadsheet are deactivated")
    out("-- so the visualization matches the dataset exactly.")
    floor_names = sorted(floors_in_data, key=lambda n: int(n.split()[1]))
    placeholder_floors = ", ".join(sql_quote(n) for n in floor_names)
    out("update public.locations")
    out("set is_active = true")
    out(f"where type = 'floor' and name in ({placeholder_floors});")
    out("")
    out("update public.locations")
    out("set is_active = false")
    out(f"where type = 'floor' and name not in ({placeholder_floors});")
    out("")

    # 2. Suppliers
    out("-- 2. Suppliers from the spreadsheet (idempotent on unique name).")
    out("insert into public.suppliers (name, is_active) values")
    sup_lines = [f"    ({sql_quote(s)}, true)" for s in sorted(suppliers_in_data)]
    out(",\n".join(sup_lines))
    out("on conflict (name) do nothing;")
    out("")

    # 3. Materials
    out("-- 3. Master materials list, derived from (Size, Material, Part). Idempotent.")
    out("with material_data(name, default_unit, supplier_name) as (values")
    mat_lines: list[str] = []
    for name in sorted(materials_in_data.keys()):
        info = materials_in_data[name]
        mat_lines.append(
            f"    ({sql_quote(name)}, {sql_quote(info['default_unit'])}, {sql_quote(info['supplier_name'])})"
        )
    out(",\n".join(mat_lines))
    out(")")
    out("insert into public.materials (name, default_unit, supplier_id)")
    out("select md.name, md.default_unit, s.id")
    out("from material_data md")
    out("left join public.suppliers s on s.name = md.supplier_name")
    out("where not exists (")
    out("    select 1 from public.materials m where m.name = md.name")
    out(");")
    out("")

    # 4. Inventory
    out("-- 4. Inventory rows from the spreadsheet (idempotent: only inserts if a")
    out("--    (material, location) pair doesn't already exist).")
    out("with inv_data(material_name, location_name, quantity, unit, supplier_name, notes) as (values")
    inv_lines: list[str] = []
    for row in inventory_rows:
        inv_lines.append(
            "    ("
            + ", ".join(
                [
                    sql_quote(row["material_name"]),
                    sql_quote(row["location_name"]),
                    f"{row['quantity']:.2f}",
                    sql_quote(row["unit"]),
                    sql_quote(row["supplier_name"]),
                    sql_quote(row["notes"]),
                ]
            )
            + ")"
        )
    out(",\n".join(inv_lines))
    out(")")
    out("insert into public.inventory_items")
    out("    (material_id, location_id, quantity, unit, supplier_id, notes)")
    out("select")
    out("    m.id,")
    out("    l.id,")
    out("    d.quantity,")
    out("    d.unit,")
    out("    s.id,")
    out("    d.notes")
    out("from inv_data d")
    out("join public.materials  m on m.name = d.material_name")
    out("join public.locations  l on l.name = d.location_name")
    out("left join public.suppliers s on s.name = d.supplier_name")
    out("where not exists (")
    out("    select 1 from public.inventory_items i")
    out("    where i.material_id = m.id and i.location_id = l.id")
    out(");")
    out("")

    out("-- =========================================================================")
    out("-- Verify (uncomment to inspect):")
    out("-- select l.name, count(i.id) as lines, coalesce(sum(i.quantity), 0) as units")
    out("-- from public.locations l")
    out("-- left join public.inventory_items i on i.location_id = l.id")
    out("-- where l.is_active")
    out("-- group by l.name, l.sort_order")
    out("-- order by l.sort_order;")
    out("-- =========================================================================")

    OUT_SQL.parent.mkdir(parents=True, exist_ok=True)
    OUT_SQL.write_text("\n".join(lines) + "\n")
    print(f"Wrote {OUT_SQL}")
    print(
        f"  - {len(floors_in_data)} active floors, "
        f"{len(other_locations_in_data)} other locations, "
        f"{len(suppliers_in_data)} suppliers, "
        f"{len(materials_in_data)} materials, "
        f"{len(inventory_rows)} inventory rows"
    )


if __name__ == "__main__":
    main()
