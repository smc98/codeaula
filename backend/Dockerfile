FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DB_PATH=/data/db.sqlite3 \
    MEDIA_ROOT=/data/media

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# /data es el volumen donde viven la BD y los ficheros subidos.
# Se crea aquí para que el usuario no-root tenga permisos desde el arranque.
RUN mkdir -p /data/media && chmod -R 777 /data

EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate && daphne -b 0.0.0.0 -p 8000 codeaula.asgi:application"]
