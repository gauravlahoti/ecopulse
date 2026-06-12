# Cloud Run image for the EcoPulse ADK coordinator (a single service: the root
# coordinator + in-process ingest / conversation / coach sub-agents + the
# deterministic forecast tool). Serves the native ADK API (/run_sse, sessions,
# /list-apps) that the Next.js adk-client.ts proxies to.
#
# GEMINI_API_KEY is injected at runtime from Secret Manager (never baked in).
# Deployed via `agents-cli deploy` (see agents-cli-manifest.yaml).
FROM python:3.11-slim
WORKDIR /app

RUN adduser --disabled-password --gecos "" myuser && chown -R myuser:myuser /app
USER myuser
ENV PATH="/home/myuser/.local/bin:$PATH"
# Gemini Developer API (AI Studio key), not Vertex.
ENV GOOGLE_GENAI_USE_VERTEXAI=FALSE

RUN pip install --no-cache-dir google-adk==1.0.0

COPY --chown=myuser:myuser requirements.txt /app/agents/ecopulse_agents/requirements.txt
RUN pip install --no-cache-dir -r /app/agents/ecopulse_agents/requirements.txt

COPY --chown=myuser:myuser . /app/agents/ecopulse_agents/

EXPOSE 8080
# adk web serves the ADK API server (+ dev UI), discovering each subfolder of
# /app/agents as an app (here: ecopulse_agents). Cloud Run injects $PORT (8080).
CMD ["sh", "-c", "adk web --port=${PORT:-8080} --host=0.0.0.0 /app/agents"]
