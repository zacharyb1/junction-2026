"""Verify the real Hermes prompt before spending a model call on a rehearsal."""
from hashlib import sha256


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
