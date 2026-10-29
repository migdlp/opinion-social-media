#!/usr/bin/env python3
"""Valida un plan generado por la skill project-planner.

Uso:
    python validate_plan.py <carpeta-del-plan> [--strict]

Comprueba:
  - Frontmatter de tareas (id, title, status, depends_on, requirements).
  - Secciones obligatorias en cada tarea (español o inglés) y que no estén vacías.
  - IDs únicos, nombre de archivo coherente con el id, epic existente.
  - Dependencias existentes y sin ciclos.
  - Trazabilidad: requisitos referenciados existen y todos los requisitos tienen tarea.
  - Palabras vagas fuera de bloques de código.
Imprime el orden de ejecución por niveles (tabla Markdown lista para el README).
Sale con código 1 si hay errores (o avisos con --strict).
Sin dependencias externas.
"""
import re
import sys
from pathlib import Path

REQUIRED_SECTIONS = {
    "objetivo": ["objetivo", "objective", "goal"],
    "contexto": ["contexto", "context"],
    "archivos": ["archivos", "files"],
    "pasos": ["pasos", "steps", "implementation steps"],
    "criterios": ["criterios de aceptación", "criterios de aceptacion", "acceptance criteria"],
    "verificacion": ["verificación", "verificacion", "verification", "how to verify"],
    "fuera": ["fuera de alcance", "out of scope"],
}
VAGUE = [
    r"\betc\b\.?", r"\bTBD\b", r"\bTODO\b", r"\bpor definir\b", r"según convenga",
    r"si procede", r"lo que sea necesario", r"lo necesario", r"\bas needed\b",
    r"\band so on\b", r"\bwhatever\b", r"\bsomehow\b", r"de alguna forma",
    r"\.\.\.", "…",
]
REQ_ID = re.compile(r"\b(RNF|RF|NFR|FR)-\d{1,3}\b")
REQ_DEF = re.compile(r"^\s*(?:[-*|#]+\s*)*\**\s*((?:RNF|RF|NFR|FR)-\d{1,3})\b", re.M)
VALID_STATUS = {"todo", "in_progress", "blocked", "done"}


def parse_frontmatter(text):
    if not text.startswith("---"):
        return {}, text
    end = text.find("\n---", 3)
    if end == -1:
        return {}, text
    fm, body = text[3:end], text[end + 4:]
    data = {}
    for line in fm.splitlines():
        line = line.split(" #")[0].rstrip()
        if ":" not in line or not line.strip():
            continue
        k, v = line.split(":", 1)
        v = v.strip()
        if v.startswith("[") and v.endswith("]"):
            v = [x.strip().strip("'\"") for x in v[1:-1].split(",") if x.strip()]
        else:
            v = v.strip("'\"")
        data[k.strip()] = v
    return data, body


def strip_code(text):
    text = re.sub(r"```.*?```", "", text, flags=re.S)
    return re.sub(r"`[^`\n]*`", "", text)


def sections(body):
    """Devuelve {titulo_normalizado: contenido} para encabezados ## ."""
    out = {}
    parts = re.split(r"^##\s+(.+?)\s*$", body, flags=re.M)
    for i in range(1, len(parts), 2):
        out[parts[i].strip().lower()] = parts[i + 1] if i + 1 < len(parts) else ""
    return out


def as_list(v):
    if v in (None, "", []):
        return []
    return v if isinstance(v, list) else [v]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    strict = "--strict" in sys.argv
    if not args:
        print(__doc__)
        sys.exit(2)
    root = Path(args[0])
    errors, warnings = [], []

    task_files = sorted((root / "tasks").glob("*.md")) if (root / "tasks").exists() else []
    if not task_files:
        # plan de tamaño "tarea": archivos de tarea en la raíz
        task_files = [p for p in sorted(root.glob("*.md")) if parse_frontmatter(p.read_text(encoding="utf-8"))[0].get("id")]
    epic_files = sorted((root / "epics").glob("*.md")) if (root / "epics").exists() else []
    if not task_files:
        print(f"ERROR: no se encontraron tareas en {root}/tasks ni en {root}")
        sys.exit(1)

    epics = {}
    for p in epic_files:
        fm, _ = parse_frontmatter(p.read_text(encoding="utf-8"))
        eid = fm.get("id") or p.stem.split("-")[0]
        epics[eid] = p

    tasks = {}
    for p in task_files:
        text = p.read_text(encoding="utf-8")
        fm, body = parse_frontmatter(text)
        name = p.name
        tid = fm.get("id")
        if not tid:
            errors.append(f"{name}: falta 'id' en el frontmatter")
            continue
        if tid in tasks:
            errors.append(f"{name}: id duplicado {tid} (también en {tasks[tid]['file'].name})")
            continue
        if not p.stem.startswith(tid):
            warnings.append(f"{name}: el nombre de archivo no empieza por su id {tid}")
        for key in ("title", "status"):
            if not fm.get(key):
                errors.append(f"{tid}: falta '{key}' en el frontmatter")
        if fm.get("status") and fm["status"] not in VALID_STATUS:
            errors.append(f"{tid}: status '{fm['status']}' no válido ({', '.join(sorted(VALID_STATUS))})")
        if "depends_on" not in fm:
            warnings.append(f"{tid}: falta 'depends_on' (usa [] si no tiene)")
        if not as_list(fm.get("requirements")):
            warnings.append(f"{tid}: no referencia ningún requisito (requirements: [...])")
        if str(fm.get("size", "")).upper() == "L":
            warnings.append(f"{tid}: tamaño L; divídela si es posible")
        epic = fm.get("epic")
        if epics and epic and epic not in epics:
            errors.append(f"{tid}: epic '{epic}' no existe en epics/")

        secs = sections(body)
        for key, aliases in REQUIRED_SECTIONS.items():
            found = next((t for t in secs if any(t.startswith(a) for a in aliases)), None)
            if not found:
                errors.append(f"{tid}: falta la sección '## {aliases[0].capitalize()}'")
            elif not strip_code(secs[found]).strip() and key not in ("verificacion",):
                errors.append(f"{tid}: la sección '{found}' está vacía")
            elif key == "verificacion" and not secs[found].strip():
                errors.append(f"{tid}: la sección '{found}' está vacía")
            elif key == "criterios" and not re.search(r"^\s*[-*]\s", secs[found], re.M):
                warnings.append(f"{tid}: criterios de aceptación sin lista de ítems comprobables")

        plain = strip_code(body)
        hits = sorted({m.group(0) for pat in VAGUE for m in re.finditer(pat, plain, re.I)})
        if hits:
            warnings.append(f"{tid}: lenguaje vago o placeholders: {', '.join(hits)}")

        tasks[tid] = {
            "file": p,
            "deps": as_list(fm.get("depends_on")),
            "reqs": as_list(fm.get("requirements")),
            "title": fm.get("title", ""),
        }

    # Dependencias
    for tid, t in tasks.items():
        for d in t["deps"]:
            if d not in tasks:
                errors.append(f"{tid}: depende de '{d}', que no existe")

    # Ciclos + niveles (Kahn)
    indeg = {t: 0 for t in tasks}
    children = {t: [] for t in tasks}
    for tid, t in tasks.items():
        for d in t["deps"]:
            if d in tasks:
                indeg[tid] += 1
                children[d].append(tid)
    levels, frontier, seen = [], sorted(t for t, n in indeg.items() if n == 0), 0
    while frontier:
        levels.append(frontier)
        seen += len(frontier)
        nxt = []
        for t in frontier:
            for c in children[t]:
                indeg[c] -= 1
                if indeg[c] == 0:
                    nxt.append(c)
        frontier = sorted(nxt)
    if seen < len(tasks):
        cyc = sorted(t for t, n in indeg.items() if n > 0)
        errors.append(f"Ciclo de dependencias entre: {', '.join(cyc)}")

    # Trazabilidad
    req_file = next((p for p in root.glob("01-*.md")), None)
    defined = set()
    if req_file:
        defined = set(REQ_DEF.findall(req_file.read_text(encoding="utf-8")))
    referenced = {r for t in tasks.values() for r in t["reqs"]}
    if defined:
        for tid, t in tasks.items():
            for r in t["reqs"]:
                if r not in defined:
                    errors.append(f"{tid}: referencia el requisito {r}, que no está definido en {req_file.name}")
        uncovered = sorted(defined - referenced, key=lambda x: (x.split('-')[0], int(x.split('-')[1])))
        if uncovered:
            warnings.append(f"Requisitos sin ninguna tarea que los cubra: {', '.join(uncovered)}")
    elif referenced and req_file is None:
        warnings.append("Las tareas citan requisitos pero no hay archivo 01-requirements.md")

    # Informe
    print(f"Plan: {root}  ·  {len(tasks)} tareas  ·  {len(epics)} epics  ·  {len(defined)} requisitos\n")
    for e in errors:
        print(f"ERROR  {e}")
    for w in warnings:
        print(f"AVISO  {w}")
    if not errors and not warnings:
        print("Sin errores ni avisos.")
    if seen == len(tasks):
        print("\n## Orden de ejecución\n")
        print("| Nivel | Tareas |\n|---|---|")
        for i, lvl in enumerate(levels, 1):
            print(f"| {i} | {', '.join(lvl)} |")
    print(f"\nResumen: {len(errors)} errores, {len(warnings)} avisos")
    sys.exit(1 if errors or (strict and warnings) else 0)


if __name__ == "__main__":
    main()
