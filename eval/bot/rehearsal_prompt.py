"""Verify the real Hermes prompt before spending a model call on a rehearsal."""
from hashlib import sha256
import json
from pathlib import Path
import re


def configured_skill_sources(repo: Path) -> dict[str, str]:
    """Read the startup script's actual autoload list and each current skill body.

    Do not execute shell or infer the list from the setup snippet. Fail before a
    provider call if startup changes to a form this rehearsal cannot reproduce.
    """
    assignments = re.findall(r"^set_key skills\.auto_load '([^'\n]+)'$",
                             (repo / "hermes/configure.sh").read_text(), re.MULTILINE)
    if len(assignments) != 1:
        raise ValueError("Expected one literal skills.auto_load assignment in hermes/configure.sh")
    names = json.loads(assignments[0])
    if (not isinstance(names, list) or not names
            or any(not isinstance(name, str) or not re.fullmatch(r"[a-z0-9-]+", name) for name in names)
            or len(set(names)) != len(names)):
        raise ValueError("Configured skills.auto_load must contain unique skill names")
    files = list((repo / "hermes/skills").rglob("SKILL.md"))
    sources = {}
    for name in names:
        matches = [path for path in files if path.parent.name == name]
        if len(matches) != 1:
            raise ValueError(f"Expected one current SKILL.md for configured skill {name}")
        sources[name] = matches[0].read_text()
    return sources


def verify_skill_prompt(system_prompt: str, expected_skills: dict[str, str], loaded_skills: list[str]) -> dict:
    """Require complete current skill bodies, not just discovery descriptions."""
    evidence = {}
    for name, source in expected_skills.items():
        parts = source.split("---", 2)
        body = parts[2].strip() if len(parts) == 3 and not parts[0].strip() else source.strip()
        assert body, f"The expected {name} skill body is empty."
        assert name in loaded_skills, f"Hermes did not auto-load {name}."
        assert body in system_prompt, f"The built prompt omitted the current full {name} skill body."
        evidence[name] = {
            "loaded": True,
            "source_sha256": sha256(source.encode()).hexdigest(),
            "body_sha256": sha256(body.encode()).hexdigest(),
        }
    return {"loaded_skills": list(loaded_skills), "skills": evidence,
            "prompt_sha256": sha256(system_prompt.encode()).hexdigest()}
