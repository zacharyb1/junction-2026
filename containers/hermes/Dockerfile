# Official v0.23.1 manifest includes Linux amd64 and arm64. Keep the native installer pin aligned.
FROM docker.io/nousresearch/hermes-agent:v0.23.1@sha256:276d44685c65c0cb2a25f190b63c65c8906f9dc76486fb1c05ae71b5826bda08
USER root
RUN /opt/hermes/.venv/bin/python -c "import json; s=json.load(open('/opt/hermes/install-stamp.json')); assert s['commit']=='3b421578588243f920886e6fe79a6faa87ea026e', s['commit']"
WORKDIR /opt/kaveri
COPY hermes/configure.sh hermes/install.sh hermes/install-gate.sh hermes/config.snippet.yaml hermes/SOUL.md ./hermes/
COPY hermes/bin/hermes ./hermes/bin/hermes
COPY hermes/skills/ ./hermes/skills/
COPY hermes/plugins/kaveri-gate/ ./hermes/plugins/kaveri-gate/
COPY containers/hermes/state.py ./containers/hermes/state.py
COPY --chmod=0755 containers/hermes/entrypoint.sh containers/hermes/start.sh ./containers/hermes/
# Adapt the native project's paths to the upstream image without copying an installed host runtime.
RUN mkdir -p /opt/kaveri/runtime/agent/.hermes/bin && \
    ln -s /opt/hermes/bin/hermes /opt/kaveri/runtime/agent/.hermes/bin/hermes && \
    ln -s /opt/data /opt/kaveri/runtime/home && \
    chmod +x /opt/kaveri/hermes/bin/hermes
ENV KAVERI_HERMES_LOCAL=/opt/kaveri/runtime HERMES_HOME=/opt/data \
    HERMES_GATEWAY_NO_SUPERVISE=1 HERMES_GATEWAY_PROFILE_PIN=1 \
    KAVERI_GATE_URL=http://ollama:11434 KAVERI_GATE_MODEL=gemma3:1b
ENTRYPOINT ["/opt/kaveri/containers/hermes/entrypoint.sh"]
CMD ["run"]
