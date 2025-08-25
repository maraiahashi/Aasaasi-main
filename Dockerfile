FROM python:3.11.9-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend /app
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","${PORT:-10000}"]
