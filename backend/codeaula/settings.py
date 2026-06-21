"""
Configuración de Django para Codeaula.

Aplicación pensada para ejecutarse en una red local (aula) mediante Docker Compose.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "clave-de-desarrollo-cambiar-en-produccion")

DEBUG = os.environ.get("DJANGO_DEBUG", "true").lower() == "true"

# En el aula se accede por IP local, así que aceptamos cualquier host.
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "channels",
    "corsheaders",
    "workspaces_app",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "codeaula.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "codeaula.wsgi.application"
ASGI_APPLICATION = "codeaula.asgi.application"

# Channels: usamos capa en memoria para no depender de Redis en el aula.
# Si en el futuro se despliega con varios workers, cambiar a channels_redis.
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        # /data vive fuera del código fuente para evitar conflictos con
        # el bind-mount de desarrollo (./backend:/app) en Docker Compose.
        "NAME": Path(os.environ.get("DB_PATH", BASE_DIR / "db.sqlite3")),
    }
}

AUTH_PASSWORD_VALIDATORS = []

LANGUAGE_CODE = "es-es"

TIME_ZONE = "Europe/Madrid"

USE_I18N = True

USE_TZ = True

STATIC_URL = "static/"

MEDIA_URL = "/media/"
MEDIA_ROOT = Path(os.environ.get("MEDIA_ROOT", BASE_DIR / "media"))

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS abierto: la app vive en la red local del aula, sin exposición externa.
CORS_ALLOW_ALL_ORIGINS = True
CSRF_TRUSTED_ORIGINS = ["http://*", "https://*"]

# Tamaño máximo por fichero subido (10 MB) y por petición completa (50 MB).
DATA_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

# Las extensiones de fichero permitidas NO se configuran aquí.
# Para añadir o modificar extensiones soportadas, edita:
#   backend/workspaces_app/file_types.py
# (settings.py históricamente tenía su propia lista duplicada, lo que
# causaba que editarla aquí no tuviera ningún efecto; se eliminó para
# evitar esa confusión).

# Tamaño máximo total por workspace (50 MB) para evitar abusos.
MAX_WORKSPACE_SIZE_BYTES = 50 * 1024 * 1024
