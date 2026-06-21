"""
Configuración centralizada de tipos de fichero de Codeaula.

ÚNICO SITIO que hay que tocar para añadir o modificar extensiones soportadas.
No es necesario editar settings.py ni ningún otro fichero.

Cómo añadir una extensión nueva
--------------------------------

CASO A — Es una variante de un lenguaje que YA existe (el caso típico:
".inc" se comporta como PHP, ".jsx" como JavaScript, etc.):
    Añade la extensión a la lista correspondiente en LANGUAGE_GROUPS.
    Una sola línea. Ejemplo:

        "php": [".php", ".inc"],   # <- añadido ".inc" aquí

CASO B — Es un lenguaje nuevo que no existe todavía:
    Añade una nueva entrada a LANGUAGE_GROUPS con el identificador de
    lenguaje que usa CodeMirror en el frontend (ver
    frontend/src/components/CodeViewer.jsx -> getExtensionForLanguage).
    Si CodeMirror no tiene un paquete para ese lenguaje, usa "plaintext":
    seguirá aceptándose y mostrándose sin resaltado de sintaxis.

CASO C — Es un fichero multimedia (imagen, audio, vídeo, fuente, pdf):
    Añade la extensión a MEDIA_GROUPS, en la categoría que corresponda.
"""

# Agrupación de extensiones por lenguaje. La clave es el identificador de
# lenguaje (debe coincidir con el case del switch en CodeViewer.jsx del
# frontend); el valor es la lista de extensiones que se tratan como ese
# lenguaje. Añadir una extensión a un lenguaje existente es una sola línea.
LANGUAGE_GROUPS = {
    "php": [".php", ".inc"],
    "html": [".html", ".htm"],
    "css": [".css", ".scss", ".sass"],
    "javascript": [".js"],
    "jsx": [".jsx"],
    "typescript": [".ts"],
    "tsx": [".tsx"],
    "python": [".py"],
    "java": [".java"],
    "sql": [".sql"],
    "json": [".json"],
    "markdown": [".md"],
    "xml": [".xml", ".htaccess"],
    "yaml": [".yml", ".yaml"],
    "shell": [".sh", ".bat"],
    "twig": [".twig"],
    "vue": [".vue"],
    "ruby": [".rb"],
    "go": [".go"],
    "c": [".c", ".h"],
    "cpp": [".cpp"],
    "csharp": [".cs"],
    # plaintext: ficheros de texto sin resaltado de sintaxis específico.
    "plaintext": [".txt", ".env", ".gitignore"],
}

# Agrupación de extensiones multimedia por tipo. Estos ficheros no se
# decodifican como texto: se guardan en disco y se sirven por URL.
MEDIA_GROUPS = {
    "image": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".ico"],
    "video": [".mp4", ".webm"],
    "audio": [".mp3", ".wav", ".ogg"],
    "font": [".woff", ".woff2", ".ttf", ".eot"],
    "pdf": [".pdf"],
}

# MIME type por extensión, para servir binarios con la cabecera correcta.
MIME_BY_EXTENSION = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".ogg": "audio/ogg",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".eot": "application/vnd.ms-fontobject",
    ".pdf": "application/pdf",
}

# Carpetas y ficheros que se ignoran siempre, independientemente de su extensión.
IGNORED_DIR_FRAGMENTS = ("node_modules/", "vendor/", ".git/", "__pycache__/", ".idea/", ".vscode/")
IGNORED_FILENAMES = (".ds_store", "thumbs.db", ".env.local")


# --- A partir de aquí, derivado automáticamente. No es necesario editar. ---

def _build_language_by_extension() -> dict[str, str]:
    mapping = {}
    for language, extensions in LANGUAGE_GROUPS.items():
        for ext in extensions:
            mapping[ext] = language
    return mapping


def _build_kind_by_extension() -> dict[str, str]:
    mapping = {}
    for kind, extensions in MEDIA_GROUPS.items():
        for ext in extensions:
            mapping[ext] = kind
    return mapping


# Extensión -> lenguaje (para CodeMirror).
LANGUAGE_BY_EXTENSION: dict[str, str] = _build_language_by_extension()

# Extensión -> tipo de fichero multimedia (image/video/audio/font/pdf).
FILE_KIND_BY_EXTENSION: dict[str, str] = _build_kind_by_extension()

# Conjunto de todas las extensiones de texto (cualquiera con un lenguaje asignado).
TEXT_EXTENSIONS: set[str] = set(LANGUAGE_BY_EXTENSION.keys())

# Conjunto de todas las extensiones multimedia/binarias.
MEDIA_EXTENSIONS: set[str] = set(FILE_KIND_BY_EXTENSION.keys())

# Todas las extensiones aceptadas en una subida (unión de ambas).
ALLOWED_EXTENSIONS: set[str] = TEXT_EXTENSIONS | MEDIA_EXTENSIONS
