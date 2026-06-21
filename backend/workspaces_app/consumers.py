"""
Consumer de WebSocket de Codeaula.

Todos los clientes (profesor y alumnos) se conectan a un único canal "classroom".
Cuando un alumno sube/actualiza su carpeta, el backend emite un evento
"workspace.updated" con su alias, y el frontend del profesor refresca esa
entrada sin recargar la página.

No se transmite contenido de ficheros por WebSocket (por simplicidad y para
evitar mensajes grandes); solo se usa como señal para volver a pedir los
datos por HTTP.
"""

import json

from channels.generic.websocket import AsyncWebsocketConsumer


class ClassroomConsumer(AsyncWebsocketConsumer):
    GROUP_NAME = "classroom"

    async def connect(self):
        await self.channel_layer.group_add(self.GROUP_NAME, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.GROUP_NAME, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        # No esperamos mensajes entrantes relevantes del cliente; se ignoran.
        pass

    async def broadcast_message(self, event):
        """Reenvía al cliente WebSocket el payload generado por las vistas."""
        await self.send(text_data=json.dumps(event["payload"]))
