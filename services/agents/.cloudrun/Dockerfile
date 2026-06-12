# Cloud Run image for the EcoPulse ADK agents.
# Mirrors `adk deploy cloud_run` output; built manually because ADK's gcloud
# subprocess call fails on Windows. The Google AI Studio key is injected at
# runtime from Secret Manager as GOOGLE_API_KEY (never baked into the image).
FROM python:3.11-slim
WORKDIR /app

RUN adduser --disabled-password --gecos "" myuser && chown -R myuser:myuser /app
USER myuser
ENV PATH="/home/myuser/.local/bin:$PATH"
# Use the Gemini Developer API (AI Studio key), not Vertex.
ENV GOOGLE_GENAI_USE_VERTEXAI=FALSE

RUN pip install --no-cache-dir google-adk==1.0.0

COPY --chown=myuser:myuser agents/ecopulse_agents/ /app/agents/ecopulse_agents/
RUN pip install --no-cache-dir -r /app/agents/ecopulse_agents/requirements.txt

EXPOSE 8080
# `adk web` serves the ADK API server (/run_sse, sessions, /list-apps) + dev UI,
# discovering each subfolder of /app/agents as an app (here: ecopulse_agents).
CMD ["sh", "-c", "adk web --port=8080 --host=0.0.0.0 /app/agents"]
