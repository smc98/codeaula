"""
Utilidades para procesar las subidas de ficheros de los alumnos.

Construye el árbol de ficheros a partir de las rutas relativas y decide
qué ficheros se aceptan. Los ficheros se dividen en dos categorías:
- Texto: se decodifican y almacenan como string en la BD.
- Binario/multimedia: se guardan como fichero en MEDIA_ROOT y se sirven
  por URL, para que el frontend pueda mostrarlos directamente (<img>, <video>).

Toda la configuración de extensiones/lenguajes vive en file_types.py.
Para añadir o modificar extensiones soportadas, edita ese fichero, no este.
"""

import os

from .file_types import (
    ALLOWED_EXTENSIONS,
    FILE_KIND_BY_EXTENSION,
    IGNORED_DIR_FRAGMENTS,
    IGNORED_FILENAMES,
    LANGUAGE_BY_EXTENSION,
    MEDIA_EXTENSIONS,
    MIME_BY_EXTENSION,
)


def get_file_kind(relative_path: str) -> str:
    """Devuelve 'text', 'image', 'video', 'audio', 'font' o 'pdf'."""
    _, ext = os.path.splitext(relative_path)
    return FILE_KIND_BY_EXTENSION.get(ext.lower(), "text")


def is_binary_extension(relative_path: str) -> bool:
    _, ext = os.path.splitext(relative_path)
    return ext.lower() in MEDIA_EXTENSIONS


def get_language_for_path(relative_path: str) -> str:
    """Devuelve el identificador de lenguaje para resaltado según la extensión."""
    _, ext = os.path.splitext(relative_path)
    return LANGUAGE_BY_EXTENSION.get(ext.lower(), "plaintext")


def get_mime_for_path(relative_path: str) -> str:
    _, ext = os.path.splitext(relative_path)
    return MIME_BY_EXTENSION.get(ext.lower(), "application/octet-stream")


def is_allowed_file(relative_path: str) -> bool:
    """
    Determina si un fichero debe aceptarse.

    Se ignoran ficheros de sistema y carpetas pesadas que no aportan al ejercicio.
    """
    name = os.path.basename(relative_path)
    lowered = relative_path.lower()

    if any(part in lowered for part in IGNORED_DIR_FRAGMENTS):
        return False

    if name.lower() in IGNORED_FILENAMES:
        return False

    _, ext = os.path.splitext(name)
    if ext.lower() not in ALLOWED_EXTENSIONS and ext != "":
        return False

    return True


def decode_file_content(raw_bytes: bytes) -> str | None:
    """
    Intenta decodificar el contenido como texto UTF-8 o latin-1.
    Devuelve None si el fichero es binario (no decodificable como texto).
    """
    try:
        return raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            return raw_bytes.decode("latin-1")
        except UnicodeDecodeError:
            return None


def build_file_tree(relative_paths: list[str]) -> dict:
    """
    Construye un árbol jerárquico a partir de una lista de rutas relativas.

    Cada nodo de fichero incluye 'kind' (text/image/video/audio/pdf/font)
    para que el frontend sepa qué visor usar.
    """
    root: dict = {"name": "raiz", "type": "folder", "children": {}}

    for path in sorted(relative_paths):
        parts = [p for p in path.split("/") if p]
        node = root
        for i, part in enumerate(parts):
            is_last = i == len(parts) - 1
            if is_last:
                node["children"][part] = {
                    "name": part,
                    "type": "file",
                    "path": path,
                    "language": get_language_for_path(path),
                    "kind": get_file_kind(path),
                }
            else:
                if part not in node["children"]:
                    node["children"][part] = {
                        "name": part,
                        "type": "folder",
                        "children": {},
                    }
                node = node["children"][part]

    def to_list(node: dict) -> dict:
        if node["type"] == "file":
            return node
        children = [to_list(child) for child in node["children"].values()]
        # Carpetas primero, luego ficheros, ambos alfabéticamente.
        children.sort(key=lambda c: (c["type"] != "folder", c["name"].lower()))
        return {"name": node["name"], "type": "folder", "children": children}

    return to_list(root)
