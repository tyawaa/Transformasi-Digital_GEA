FROM python:3.13-slim
RUN apt-get update && apt-get install -y --no-install-recommends libglib2.0-0 libgl1 && rm -rf /var/lib/apt/lists/*
RUN useradd --create-home --uid 1000 app && mkdir /app && chown app:app /app
WORKDIR /app
COPY --chown=app:app pyproject.toml ./
COPY --chown=app:app gea_photo ./gea_photo
RUN pip install --no-cache-dir torch==2.9.0 --index-url https://download.pytorch.org/whl/cpu && pip install --no-cache-dir .
COPY --chown=app:app artifacts ./artifacts
COPY --chown=app:app cache ./cache
USER app
ENV HOME=/home/app HF_HUB_OFFLINE=1
EXPOSE 7860
CMD ["gea-photo", "serve", "--artifacts", "/app/artifacts", "--cache", "/app/cache", "--host", "0.0.0.0", "--port", "7860"]
