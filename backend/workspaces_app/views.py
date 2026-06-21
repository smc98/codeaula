"""
Vistas de la API de Codeaula.

Endpoints:
- GET  /api/file-types/                    -> config de extensiones soportadas (fuente única)
- GET  /api/workspaces/                    -> lista de alumnos
- GET  /api/workspaces/<alias>/            -> árbol de ficheros
- GET  /api/workspaces/<alias>/file/       -> contenido/URL de un fichero
- POST /api/workspaces/<alias>/upload/     -> subir/actualizar carpeta completa
- POST /api/workspaces/compare/            -> comparar el mismo fichero entre alumnos
"""

import io
import json
import os
import re
import zipfile

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.core.files.base import ContentFile
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .file_types import ALLOWED_EXTENSIONS, IGNORED_DIR_FRAGMENTS, IGNORED_FILENAMES, MEDIA_EXTENSIONS
from .models import Workspace, WorkspaceFile
from .serializers import (
    serialize_file_content,
    serialize_workspace_detail,
    serialize_workspace_summary,
)
from .utils import decode_file_content, is_allowed_file, is_binary_extension

# Alias: letras, números, espacios, guiones y guion bajo. Entre 1 y 60 caracteres.
ALIAS_PATTERN = re.compile(r"^[\w\sáéíóúÁÉÍÓÚñÑ\-]{1,60}$")


def _validate_alias(alias: str) -> str | None:
    if not alias or not alias.strip():
        return "El alias no puede estar vacío."
    if not ALIAS_PATTERN.match(alias):
        return "El alias contiene caracteres no permitidos."
    return None


def _notify_workspace_update(alias: str) -> None:
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    async_to_sync(channel_layer.group_send)(
        "classroom",
        {
            "type": "broadcast_message",
            "payload": {"event": "workspace.updated", "alias": alias},
        },
    )


def _media_path_for(alias: str, relative_path: str) -> str:
    """Ruta dentro de MEDIA_ROOT donde se guarda un fichero binario."""
    # Sanitizamos el alias para usarlo como nombre de directorio.
    safe_alias = re.sub(r"[^\w\-]", "_", alias)
    return os.path.join(safe_alias, relative_path)


@require_http_methods(["GET"])
def file_types(request):
    """
    Expone la configuración de extensiones soportadas para que el frontend
    no mantenga una copia manual desincronizada de la whitelist del backend.

    El modal de confirmación de subida (UploadConfirmModal) usa este
    endpoint para saber, ANTES de subir, qué ficheros se van a aceptar.
    Esta es la única fuente de verdad: editar
    backend/workspaces_app/file_types.py basta para que ambos lados
    (validación real del backend y previsualización del frontend) queden
    sincronizados automáticamente, sin tocar nada en React.
    """
    return JsonResponse(
        {
            "allowed_extensions": sorted(ALLOWED_EXTENSIONS),
            "media_extensions": sorted(MEDIA_EXTENSIONS),
            "ignored_dir_fragments": list(IGNORED_DIR_FRAGMENTS),
            "ignored_filenames": list(IGNORED_FILENAMES),
        }
    )


@require_http_methods(["GET"])
def list_workspaces(request):
    workspaces = Workspace.objects.all()
    return JsonResponse({"workspaces": [serialize_workspace_summary(ws) for ws in workspaces]})


@require_http_methods(["GET"])
def workspace_detail(request, alias: str):
    error = _validate_alias(alias)
    if error:
        return JsonResponse({"error": error}, status=400)
    try:
        workspace = Workspace.objects.get(alias=alias)
    except Workspace.DoesNotExist:
        return JsonResponse({"error": "Workspace no encontrado."}, status=404)
    return JsonResponse(serialize_workspace_detail(workspace))


@require_http_methods(["GET"])
def workspace_file(request, alias: str):
    """
    Devuelve metadatos + contenido de un fichero.
    Para ficheros de texto: devuelve el contenido en JSON.
    Para ficheros binarios: devuelve la URL de media para que el frontend la use directamente.
    """
    relative_path = request.GET.get("path", "")
    if not relative_path:
        return JsonResponse({"error": "Falta el parámetro 'path'."}, status=400)
    try:
        workspace = Workspace.objects.get(alias=alias)
    except Workspace.DoesNotExist:
        return JsonResponse({"error": "Workspace no encontrado."}, status=404)
    try:
        file = workspace.files.get(relative_path=relative_path)
    except WorkspaceFile.DoesNotExist:
        return JsonResponse({"error": "Fichero no encontrado."}, status=404)
    return JsonResponse(serialize_file_content(file, request))


@require_http_methods(["GET"])
def download_workspace(request, alias: str):
    """
    Genera y devuelve un ZIP con todos los ficheros del workspace de un alumno.

    - Ficheros de texto: se escriben directamente desde el contenido en BD.
    - Ficheros binarios: se leen desde MEDIA_ROOT.

    El ZIP se construye en memoria (no toca el disco) y se devuelve como
    descarga directa, para que el navegador del profesor lo guarde con
    un nombre significativo: <alias>.zip
    """
    error = _validate_alias(alias)
    if error:
        return JsonResponse({"error": error}, status=400)

    try:
        workspace = Workspace.objects.prefetch_related("files").get(alias=alias)
    except Workspace.DoesNotExist:
        return JsonResponse({"error": "Workspace no encontrado."}, status=404)

    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for wfile in workspace.files.all():
            arcname = os.path.join(alias, wfile.relative_path)
            if wfile.is_binary and wfile.media_file:
                try:
                    wfile.media_file.open("rb")
                    zf.writestr(arcname, wfile.media_file.read())
                    wfile.media_file.close()
                except Exception:
                    # Si el fichero físico no existe, lo omitimos silenciosamente.
                    pass
            else:
                zf.writestr(arcname, wfile.content.encode("utf-8"))

    buffer.seek(0)

    safe_alias = re.sub(r"[^\w\-]", "_", alias)
    response = HttpResponse(buffer.read(), content_type="application/zip")
    response["Content-Disposition"] = f'attachment; filename="{safe_alias}.zip"'
    return response


@csrf_exempt
@require_http_methods(["POST"])
def upload_workspace(request, alias: str):
    """
    Recibe la carpeta completa de ejercicios de un alumno y sustituye su workspace.

    Los ficheros de texto se almacenan en la BD.
    Los ficheros binarios (imágenes, vídeos...) se guardan en MEDIA_ROOT.
    """
    error = _validate_alias(alias)
    if error:
        return JsonResponse({"error": error}, status=400)

    files = request.FILES.getlist("files")
    paths = request.POST.getlist("paths")

    if not files:
        return JsonResponse({"error": "No se ha recibido ningún fichero."}, status=400)
    if len(files) != len(paths):
        return JsonResponse({"error": "El número de ficheros y de rutas no coincide."}, status=400)

    total_size = sum(f.size for f in files)
    if total_size > settings.MAX_WORKSPACE_SIZE_BYTES:
        max_mb = settings.MAX_WORKSPACE_SIZE_BYTES // (1024 * 1024)
        return JsonResponse(
            {"error": f"La carpeta supera el tamaño máximo permitido ({max_mb} MB)."},
            status=400,
        )

    accepted = []
    skipped = []

    with transaction.atomic():
        workspace, _ = Workspace.objects.get_or_create(alias=alias)

        # Eliminamos ficheros binarios del disco antes de borrar los registros.
        for old_file in workspace.files.filter(is_binary=True):
            if old_file.media_file:
                old_file.media_file.delete(save=False)

        workspace.files.all().delete()

        for uploaded_file, relative_path in zip(files, paths):
            relative_path = relative_path.strip().lstrip("/")

            if not is_allowed_file(relative_path):
                skipped.append(relative_path)
                continue

            raw_bytes = uploaded_file.read()

            if is_binary_extension(relative_path):
                # Fichero multimedia: guardamos en disco.
                storage_path = _media_path_for(alias, relative_path)
                wf = WorkspaceFile(
                    workspace=workspace,
                    relative_path=relative_path,
                    is_binary=True,
                    size_bytes=len(raw_bytes),
                )
                wf.media_file.save(storage_path, ContentFile(raw_bytes), save=False)
                wf.save()
            else:
                # Fichero de texto: guardamos contenido en la BD.
                content = decode_file_content(raw_bytes)
                if content is None:
                    skipped.append(relative_path)
                    continue
                WorkspaceFile.objects.create(
                    workspace=workspace,
                    relative_path=relative_path,
                    content=content,
                    is_binary=False,
                    size_bytes=len(raw_bytes),
                )

            accepted.append(relative_path)

        workspace.save()

    _notify_workspace_update(alias)

    return JsonResponse({"alias": alias, "accepted_count": len(accepted), "skipped": skipped})


@csrf_exempt
@require_http_methods(["POST"])
def compare_files(request):
    """Devuelve el mismo fichero de varios alumnos para comparación lado a lado."""
    try:
        body = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"error": "Cuerpo de la petición inválido."}, status=400)

    relative_path = body.get("path", "")
    aliases = body.get("aliases", [])

    if not relative_path or not aliases:
        return JsonResponse({"error": "Se requieren 'path' y 'aliases'."}, status=400)

    results = []
    for alias in aliases:
        entry = {"alias": alias, "content": None, "language": None, "found": False, "is_binary": False}
        try:
            workspace = Workspace.objects.get(alias=alias)
            file = workspace.files.get(relative_path=relative_path)
            serialized = serialize_file_content(file, request)
            entry.update({"found": True, **serialized})
        except (Workspace.DoesNotExist, WorkspaceFile.DoesNotExist):
            pass
        results.append(entry)

    return JsonResponse({"path": relative_path, "results": results})
