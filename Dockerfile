FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend /app

# Render provides $PORT. Default to 10000 locally.
CMD [ "sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}" ]
