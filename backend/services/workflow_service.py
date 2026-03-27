"""
Workflow service.

Dependency assignment rules (deterministic):
  1. If the task text contains explicit sequence keywords ("after", "then",
     "once", "following", "when X is done") → link to the mentioned task.
  2. Otherwise → assign sequential order (task[i] depends on task[i-1]).

The first task in the list never has a dependency.
"""

import re
from typing import List

from models.schemas import Task
from utils.helpers import now_iso

# Keywords that indicate sequential dependency
SEQUENCE_KEYWORDS = re.compile(
    r"\b(after|then|once|following|when .+ (is|are) done|upon completion)\b",
    re.IGNORECASE,
)


def _has_sequence_keyword(text: str) -> bool:
    return bool(SEQUENCE_KEYWORDS.search(text))


def assign_dependencies(tasks: List[Task]) -> List[Task]:
    """
    Walk through the task list and populate `depends_on`.

    - If any task text contains a sequence keyword AND a reference to a
      previous task's description substring, link them explicitly.
    - Otherwise fall back to linear chaining (task[i] → task[i-1]).
    """
    if not tasks:
        return tasks

    updated: List[Task] = []
    ts = now_iso()

    for i, task in enumerate(tasks):
        if i == 0:
            # First task never depends on anything
            task = task.model_copy(update={"depends_on": [], "updated_at": ts})
            updated.append(task)
            continue

        if _has_sequence_keyword(task.task):
            # Explicit sequence detected – link to the immediately preceding task
            dep_id = updated[i - 1].task_id
            task = task.model_copy(update={"depends_on": [dep_id], "updated_at": ts})
        else:
            # Default: no dependencies (parallel)
            task = task.model_copy(update={"depends_on": [], "updated_at": ts})

        updated.append(task)

    return updated
