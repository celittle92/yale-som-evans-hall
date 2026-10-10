"""One PydanticAI agent per professor, each with catalog-lookup tools.

The model is called at runtime through Portkey. Nothing a professor says about a course is
written here — it comes from the database, either baked into the system prompt by
professors.build_system_prompt or fetched live by the two tools below.
"""

from __future__ import annotations

import os
from collections import OrderedDict

os.environ.setdefault("PYDANTIC_AI_NO_BANNER", "1")

from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIResponsesModel, OpenAIResponsesModelSettings
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.usage import UsageLimits

from app_config import build_portkey_client, load_settings
from courses import course_brief, search_courses
from professors import PROFESSORS, build_system_prompt

# The Responses API, not chat completions: gpt-6-luna refuses function tools on
# /v1/chat/completions unless reasoning is switched off, and these agents need both.
# max_tokens is the output budget and reasoning tokens come out of it, so leave headroom.
MODEL_SETTINGS = OpenAIResponsesModelSettings(timeout=90, max_tokens=2500)
USAGE_LIMITS = UsageLimits(request_limit=6, tool_calls_limit=4, total_tokens_limit=40_000)

# Chat is throwaway: keep the last few turns per (session, professor) and cap how many
# conversations live in memory at once.
MAX_TURNS_KEPT = 8
MAX_SESSIONS = 200
MAX_INPUT_CHARS = 1500

_agents: dict[str, Agent] = {}
_history: OrderedDict[tuple[str, str], list] = OrderedDict()
_model_name: str | None = None


def model_name() -> str:
    """The model these agents call, for /api/health. Never returns a key."""
    global _model_name
    if _model_name is None:
        _model_name = load_settings().model_name
    return _model_name


def _build_agent(prof_id: str) -> Agent:
    settings = load_settings()
    model = OpenAIResponsesModel(
        settings.model_name,
        provider=OpenAIProvider(openai_client=build_portkey_client(settings)),
    )
    agent = Agent(
        model,
        output_type=str,
        instructions=build_system_prompt(prof_id),
        model_settings=MODEL_SETTINGS,
    )

    @agent.tool_plain
    def search_catalog(keyword: str) -> list[dict]:
        """Search the Yale SOM course catalog by keyword.

        Use this for any question about courses other than your own: what is offered on a
        topic, which electives cover something, who teaches what.

        Args:
            keyword: a word or phrase to look for in course numbers, titles and descriptions.
        """
        return search_courses(keyword, limit=8)

    @agent.tool_plain
    def course_info(course_number: str) -> str:
        """Look up one course by its number, e.g. "MGT 409".

        Returns the title, category, units, instructor, description, and every section with its
        meeting time and room.

        Args:
            course_number: the course number, such as "MGT 409" or "MGT 541".
        """
        return course_brief(course_number)

    return agent


def get_agent(prof_id: str) -> Agent:
    if prof_id not in PROFESSORS:
        raise KeyError(f"Unknown professor: {prof_id}")
    if prof_id not in _agents:
        _agents[prof_id] = _build_agent(prof_id)
    return _agents[prof_id]


async def ask(prof_id: str, message: str, session_id: str) -> str:
    """Run one turn of conversation with a professor and return their reply."""
    text = (message or "").strip()
    if not text:
        raise ValueError("Message is empty.")
    if len(text) > MAX_INPUT_CHARS:
        text = text[:MAX_INPUT_CHARS]

    agent = get_agent(prof_id)
    key = (session_id, prof_id)
    history = _history.get(key, [])

    result = await agent.run(text, message_history=history, usage_limits=USAGE_LIMITS)

    _history[key] = result.all_messages()[-MAX_TURNS_KEPT * 2 :]
    _history.move_to_end(key)
    while len(_history) > MAX_SESSIONS:
        _history.popitem(last=False)

    return result.output


def reset(prof_id: str, session_id: str) -> None:
    _history.pop((session_id, prof_id), None)
