"""Validate one container home's identity and synchronize its runtime configuration.

Only environment values supplied to this container are copied. All data is private
to its persisted home; nothing is read from the developer's native Hermes home.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit

REQUIRED = (
    "TELEGRAM_BOT_TOKEN", "TELEGRAM_ALLOWED_USERS", "NVIDIA_API_KEY",
    "EXA_API_KEY", "CASEFILE_URL", "CASEFILE_SECRET",
)
OPTIONAL = (
    "TELEGRAM_HOME_CHANNEL", "TELEGRAM_ALLOW_ALL_USERS", "TELEGRAM_GROUP_ALLOWED_USERS",
    "TELEGRAM_GUEST_MODE", "KAVERI_GATE_URL", "KAVERI_GATE_MODEL",
)
MARKER = ".kaveri-container.json"
LOCK = ".kaveri-runtime.lock"
# Upstream useradd -m seeds these shell files in the volume image.
SEED_FILES = {".bashrc", ".bash_logout", ".profile"}


def validate(env):
    missing = [key for key in REQUIRED if not env.get(key, "").strip()]
    if missing:
        raise ValueError("Missing runtime settings: " + ", ".join(missing))
    if not re.fullmatch(r"[1-9]\d*:[A-Za-z0-9_-]+", env["TELEGRAM_BOT_TOKEN"]):
        raise ValueError("TELEGRAM_BOT_TOKEN must be a BotFather token")
    if not re.fullmatch(r"\s*[1-9]\d*(\s*,\s*[1-9]\d*)*\s*", env["TELEGRAM_ALLOWED_USERS"]):
        raise ValueError("TELEGRAM_ALLOWED_USERS must contain positive numeric user IDs")
    group = env.get("KAVERI_TELEGRAM_CHAT_ID", "")
    if group and not re.fullmatch(r"-[1-9]\d*", group):
        raise ValueError("KAVERI_TELEGRAM_CHAT_ID must be a negative numeric group ID")
    endpoint = urlsplit(env["CASEFILE_URL"])
    if endpoint.scheme not in {"http", "https"} or not endpoint.hostname or endpoint.path != "/api/mcp":
        raise ValueError("CASEFILE_URL must be a full http(s) Engine URL ending in /api/mcp")
    for key in REQUIRED + OPTIONAL:
        if any(c in env.get(key, "") for c in "\r\n\x00"):
            raise ValueError(f"{key} must be a single line")


def identity(env):
    return {"schema": 1, "token_sha256": hashlib.sha256(env["TELEGRAM_BOT_TOKEN"].encode()).hexdigest()}


def preflight(home, env):
    validate(env)
    marker = home / MARKER
    if marker.exists():
        if json.loads(marker.read_text()) != identity(env):
            raise ValueError("This home belongs to a different bot token. Use a fresh volume; token rotation/state transfer requires explicit reconciliation.")
    else:
        existing = [p.name for p in home.iterdir() if p.name not in SEED_FILES | {LOCK}]
        if existing:
            raise ValueError("Refusing to adopt an existing unmarked Hermes home. Start with a fresh named volume; copied memories/jobs need a deliberate migration.")
        # Reserve the identity before upstream bootstrap creates state, so retries remain safe.
        marker.write_text(json.dumps(identity(env)) + "\n")
        marker.chmod(0o600)
    if any((home / "profiles").glob("*/SOUL.md")):
        raise ValueError("This container supports one default profile. Named profiles require a separate runtime.")
    if any(home.glob(".hermes-update-paused-gateways.*.json*")):
        raise ValueError("Pending upstream gateway-update recovery found. Reconcile it before container checks or startup.")


def configure(home, env):
    from dotenv import set_key, unset_key

    path = home / ".env"
    path.touch(mode=0o600, exist_ok=True)
    path.chmod(0o600)
    # Hermes' private secret scope and dotenv loader read this file; runtime env
    # must replace older values here on every container recreation.
    for key in REQUIRED:
        value = env[key]
        if key == "TELEGRAM_ALLOWED_USERS":
            value = re.sub(r"\s", "", value)
        set_key(path, key, value, quote_mode="never" if key == "TELEGRAM_ALLOWED_USERS" else "always")
    for key in OPTIONAL:
        if env.get(key):
            set_key(path, key, env[key], quote_mode="always")
        elif key != "TELEGRAM_HOME_CHANNEL":
            # Removing demo-wide access from Compose also removes stale permissions.
            unset_key(path, key)


def verify(home):
    import importlib.util
    # Use the parser shipped by the pinned runtime (ruamel adapter, not PyYAML).
    import hermes_yaml as yaml

    config = yaml.safe_load((home / "config.yaml").read_text())
    assert config["model"]["provider"] == os.environ.get("KAVERI_PROVIDER", "nvidia")
    assert "/opt/kaveri/hermes/skills" in config["skills"]["external_dirs"]
    assert config["mcp_servers"]["casefile"]["url"] == "${CASEFILE_URL}"
    plugin = home / "plugins" / "kaveri-gate"
    assert (plugin / "plugin.yaml").is_file()
    assert json.loads((plugin / "wake_patterns.json").read_text())
    spec = importlib.util.spec_from_file_location("kaveri_container_gate", plugin / "__init__.py", submodule_search_locations=[str(plugin)])
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    assert callable(module.register)


if __name__ == "__main__":
    try:
        task = sys.argv[1]
        root = Path(os.environ["HERMES_HOME"])
        if task == "preflight":
            preflight(root, os.environ)
        elif task == "configure":
            configure(root, os.environ)
        elif task == "verify":
            verify(root)
        else:
            raise ValueError("Unknown container state operation")
    except (ValueError, AssertionError, OSError, KeyError) as exc:
        print(f"Kaveri container: {exc}", file=sys.stderr)
        sys.exit(1)
