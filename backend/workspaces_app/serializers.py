"""
Serialización de modelos a diccionarios planos para las respuestas JSON.
"""

from .models import Workspace, WorkspaceFile
from .utils import build_file_tree, get_file_kind, get_language_for_path


def serialize_workspace_summary(workspace: Workspace) -> dict:
    return {
        "id": workspace.id,
        "alias": workspace.alias,
        "updated_at": workspace.updated_at.isoformat(),
        "file_count": workspace.files.count(),
    }


def serialize_workspace_detail(workspace: Workspace) -> dict:
    relative_paths = list(workspace.files.values_list("relative_path", flat=True))
    return {
        "id": workspace.id,
        "alias": workspace.alias,
        "updated_at": workspace.updated_at.isoformat(),
        "tree": build_file_tree(relative_paths),
    }


def serialize_file_content(file: WorkspaceFile, request=None) -> dict:
    """
    Para ficheros de texto: incluye el contenido completo.
    Para ficheros binarios: incluye la URL de media para que el frontend
    pueda renderizarlos directamente (<img src=...>, <video src=...>, etc.).
    """
    base = {
        "id": file.id,
        "relative_path": file.relative_path,
        "language": get_language_for_path(file.relative_path),
        "kind": get_file_kind(file.relative_path),
        "size_bytes": file.size_bytes,
        "updated_at": file.updated_at.isoformat(),
        "is_binary": file.is_binary,
    }

    if file.is_binary and file.media_file:
        # Construimos la URL absoluta si tenemos request, relativa si no.
        if request is not None:
            base["media_url"] = request.build_absolute_uri(file.media_file.url)
        else:
            base["media_url"] = file.media_file.url
        base["content"] = None
    else:
        base["content"] = file.content
        base["media_url"] = None

    return base
