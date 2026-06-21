"""
Configuración WSGI para Codeaula.

No se usa directamente (el proyecto se sirve vía ASGI/Daphne para soportar
WebSockets), pero se mantiene por compatibilidad con herramientas de Django.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "codeaula.settings")

application = get_wsgi_application()
