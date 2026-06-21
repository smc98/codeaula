"""
Configuración ASGI para Codeaula.

Combina las peticiones HTTP normales de Django con el enrutado de WebSockets
de Channels, necesario para la sincronización en tiempo real.
"""

import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "codeaula.settings")

django_asgi_app = get_asgi_application()

# Importamos después de inicializar Django para evitar problemas de carga de apps.
from workspaces_app import routing  # noqa: E402

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": URLRouter(routing.websocket_urlpatterns),
    }
)
