/**
 * Validación de ficheros en el cliente, ANTES de subirlos.
 *
 * La whitelist de extensiones ya NO se duplica aquí: se obtiene en tiempo
 * de ejecución desde GET /api/file-types/, que lee directamente de
 * backend/workspaces_app/file_types.py (fuente única de verdad).
 *
 * Esto significa que añadir una extensión (o asimilarla a un lenguaje
 * existente, como ".inc" -> "php") solo requiere editar ese fichero
 * Python; el modal de confirmación del frontend queda sincronizado
 * automáticamente, sin tocar nada en React.
 */

import { fetchFileTypes } from "../api/codeaula";

let cachedConfig = null;
let pendingFetch = null;

/**
 * Obtiene la configuración de tipos de fichero, cacheada en memoria durante
 * la sesión (no cambia mientras la app está abierta). Si la petición falla
 * (backend caído, red del aula con problemas), se usa un fallback mínimo
 * para que el modal siga funcionando aunque sin la lista exacta.
 */
async function getFileTypesConfig() {
  if (cachedConfig) return cachedConfig;
  if (pendingFetch) return pendingFetch;

  pendingFetch = fetchFileTypes()
    .then((data) => {
      cachedConfig = {
        allowedExtensions: new Set(data.allowed_extensions),
        ignoredDirFragments: data.ignored_dir_fragments,
        ignoredFilenames: new Set(data.ignored_filenames),
      };
      return cachedConfig;
    })
    .catch(() => {
      // Fallback: si no se puede consultar el backend, no bloqueamos la
      // subida. La validación real y definitiva la hace el backend de
      // todas formas; esto solo afecta a la previsualización del modal.
      cachedConfig = {
        allowedExtensions: null, // null = "aceptar todo en la previsualización"
        ignoredDirFragments: ["node_modules/", "vendor/", ".git/"],
        ignoredFilenames: new Set([".ds_store", "thumbs.db"]),
      };
      return cachedConfig;
    });

  return pendingFetch;
}

function getExtension(path) {
  const name = path.split("/").pop() || "";
  const dotIndex = name.lastIndexOf(".");
  return dotIndex === -1 ? "" : name.slice(dotIndex).toLowerCase();
}

function classifyEntry(entry, config) {
  const lowerPath = entry.path.toLowerCase();
  const name = entry.path.split("/").pop() || "";

  if (config.ignoredDirFragments.some((fragment) => lowerPath.includes(fragment))) {
    return { ...entry, accepted: false, reason: "carpeta de dependencias/sistema (se ignora siempre)" };
  }

  if (config.ignoredFilenames.has(name.toLowerCase())) {
    return { ...entry, accepted: false, reason: "fichero de sistema (se ignora siempre)" };
  }

  const ext = getExtension(entry.path);

  if (ext === "") {
    // Sin extensión: el backend lo deja pasar (p.ej. "Dockerfile").
    return { ...entry, accepted: true, reason: null };
  }

  // allowedExtensions === null solo ocurre si no se pudo consultar el
  // backend; en ese caso no rechazamos nada en la previsualización.
  if (config.allowedExtensions !== null && !config.allowedExtensions.has(ext)) {
    return { ...entry, accepted: false, reason: `extensión "${ext}" no soportada` };
  }

  return { ...entry, accepted: true, reason: null };
}

/**
 * Clasifica todas las entradas de una carpeta y devuelve un resumen
 * para mostrar en el modal de confirmación antes de subir.
 */
export async function classifyEntries(entries) {
  const config = await getFileTypesConfig();
  const classified = entries.map((entry) => classifyEntry(entry, config));
  const accepted = classified.filter((e) => e.accepted);
  const rejected = classified.filter((e) => !e.accepted);
  const totalSize = entries.reduce((sum, e) => sum + (e.file.size || 0), 0);

  return { accepted, rejected, totalSize };
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
