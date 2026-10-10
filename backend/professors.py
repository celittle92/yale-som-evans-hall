"""Who teaches where, and how each one's system prompt gets built.

The persona comes from prompts/<id>.md; the course facts come from the database at runtime.
Nothing about a course is hard-coded here beyond its number.
"""

from dataclasses import dataclass
from pathlib import Path

from courses import course_brief

PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"
BASE_PROMPT_PATH = PROMPTS_DIR / "professor_base.md"


@dataclass(frozen=True)
class Professor:
    id: str
    name: str
    room: str | None
    course_number: str | None


# Keep in sync with ROOM_PROFESSOR in src/Faculty.jsx.
PROFESSORS: dict[str, Professor] = {
    "zaman": Professor("zaman", "Tauhid Zaman", "2400", "MGT 409"),
    "mcgonagall": Professor("mcgonagall", "Minerva McGonagall", "2410", "MGT 404"),
    "trelawney": Professor("trelawney", "Sybill Trelawney", "2420", "MGT 403"),
    "slughorn": Professor("slughorn", "Horace Slughorn", "2430", "MGT 887"),
    "snape": Professor("snape", "Severus Snape", "2200", "MGT 402"),
    "lockhart": Professor("lockhart", "Gilderoy Lockhart", "2210", "MGT 538"),
    "moody": Professor("moody", "Alastor Moody", "2220", "MGT 800"),
    "flitwick": Professor("flitwick", "Filius Flitwick", "2230", "MGT 541"),
    "hagrid": Professor("hagrid", "Rubeus Hagrid", None, None),
}

NO_COURSE = (
    "You do not teach a course of your own this term. When a student asks about classes, use "
    "your tools to look them up in the catalog."
)


def persona_path(prof_id: str) -> Path:
    return PROMPTS_DIR / f"{prof_id}.md"


def build_system_prompt(prof_id: str) -> str:
    """Base prompt + this professor's persona file + their course, read from the database."""
    prof = PROFESSORS.get(prof_id)
    if prof is None:
        raise KeyError(f"Unknown professor: {prof_id}")

    base = BASE_PROMPT_PATH.read_text(encoding="utf-8")
    persona = persona_path(prof_id).read_text(encoding="utf-8").strip()
    brief = course_brief(prof.course_number) if prof.course_number else NO_COURSE

    return base.replace("{course_brief}", brief).replace("{persona}", persona)
