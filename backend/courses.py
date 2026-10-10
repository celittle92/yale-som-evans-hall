"""Read-only access to the Yale SOM course catalog in data/yale_som.db.

Rules this module enforces for every caller:
  * the database is opened read-only (file:...?mode=ro), so an agent can never write to it
  * PhD rows are skipped
  * faculty_1_email is never selected, let alone returned
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "yale_som.db"

# Explicit allowlist. faculty_1_email is deliberately absent and must stay absent.
FIELDS = (
    "course_number",
    "course_title",
    "course_category",
    "course_session",
    "course_description",
    "faculty_1",
    "faculty_bio",
    "daytimes",
    "room",
    "section",
    "units",
)
_COLS = ", ".join(FIELDS)
_NOT_PHD = "COALESCE(course_category, '') <> 'PhD'"


def _connect() -> sqlite3.Connection:
    if not DB_PATH.exists():
        raise RuntimeError(f"Course database not found at {DB_PATH}")
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def _rows(sql: str, params: tuple = ()) -> list[dict]:
    with _connect() as conn:
        return [dict(r) for r in conn.execute(sql, params).fetchall()]


def course_sections(number: str) -> list[dict]:
    """Every section of one course, e.g. "MGT 409" -> three rows."""
    return _rows(
        f"SELECT {_COLS} FROM courses "
        f"WHERE UPPER(TRIM(course_number)) = UPPER(TRIM(?)) AND {_NOT_PHD} "
        "ORDER BY section",
        (number,),
    )


def search_courses(keyword: str, limit: int = 8) -> list[dict]:
    """Keyword search over number, title and description.

    Descriptions are cut to 400 characters and faculty bios are dropped, so a search result
    stays small enough to hand to a model without eating the context window.
    """
    like = f"%{keyword.strip()}%"
    rows = _rows(
        f"SELECT {_COLS} FROM courses "
        f"WHERE {_NOT_PHD} AND (course_number LIKE ? OR course_title LIKE ? OR course_description LIKE ?) "
        "GROUP BY course_number, course_title "
        "ORDER BY CASE WHEN course_title LIKE ? THEN 0 ELSE 1 END, course_number "
        "LIMIT ?",
        (like, like, like, like, max(1, min(limit, 25))),
    )
    for r in rows:
        r.pop("faculty_bio", None)
        desc = r.get("course_description") or ""
        if len(desc) > 400:
            r["course_description"] = desc[:400].rstrip() + "..."
    return rows


def course_brief(number: str) -> str:
    """Plain text about one course, for dropping straight into an agent's instructions."""
    rows = course_sections(number)
    if not rows:
        return f"No course found with number {number}."
    head = rows[0]
    lines = [
        f"{head['course_number']} - {head['course_title']}",
        f"Category: {head['course_category'] or 'not stated'}",
        f"Session: {head['course_session'] or 'not stated'}",
        f"Units: {head['units'] or 'not stated'}",
        f"Taught by: {head['faculty_1'] or 'not stated'}",
    ]
    for r in rows:
        lines.append(
            f"  Section {r['section']}: {r['daytimes'] or 'time not stated'} in {r['room'] or 'room not stated'}"
        )
    if head.get("course_description"):
        lines.append(f"Description: {head['course_description']}")
    if head.get("faculty_bio"):
        lines.append(f"Instructor bio: {head['faculty_bio']}")
    return "\n".join(lines)
