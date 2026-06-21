/**
 * Cliente de la API de Codeaula.
 *
 * Usamos rutas RELATIVAS (/api/..., /ws/...) en vez de una URL absoluta
 * fija como "http://localhost:8000". Esto es importante: el profesor
 * accede desde localhost, pero cada alumno accede desde la IP local del
 * profesor en la red del aula (p.ej. http://192.168.1.50:5173). Si la URL
 * base estuviera fijada a "localhost", el navegador de cada alumno
 * intentaría conectar a SU PROPIO localhost, no al del profesor, y la app
 * no funcionaría para nadie excepto para quien la ejecuta.
 *
 * Con rutas relativas, cada petición va al mismo host:puerto desde el que
 * se cargó la página (sea localhost o una IP), y el proxy de Vite
 * (ver vite.config.js) la reenvía internamente al contenedor del backend.
 * Esto funciona automáticamente sin configurar IPs en ningún sitio.
 */

const API_BASE = import.meta.env.VITE_API_URL || "";

async function handleResponse(response) {
  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const data = await response.json();
      if (data.error) message = data.error;
    } catch {
      // respuesta sin cuerpo JSON, mantenemos el mensaje genérico
    }
    throw new Error(message);
  }
  return response.json();
}

export async function fetchWorkspaces() {
  const res = await fetch(`${API_BASE}/api/workspaces/`);
  return handleResponse(res);
}

/**
 * Devuelve la configuración de extensiones soportadas (fuente única en
 * backend/workspaces_app/file_types.py). El frontend la usa para
 * previsualizar en el modal de confirmación qué se va a aceptar, sin
 * mantener una copia manual que pueda desincronizarse.
 */
export async function fetchFileTypes() {
  const res = await fetch(`${API_BASE}/api/file-types/`);
  return handleResponse(res);
}

export async function fetchWorkspaceDetail(alias) {
  const res = await fetch(`${API_BASE}/api/workspaces/${encodeURIComponent(alias)}/`);
  return handleResponse(res);
}

export async function fetchWorkspaceFile(alias, path) {
  const params = new URLSearchParams({ path });
  const res = await fetch(
    `${API_BASE}/api/workspaces/${encodeURIComponent(alias)}/file/?${params.toString()}`
  );
  return handleResponse(res);
}

/**
 * Sube (o sustituye) la carpeta completa de ejercicios de un alumno.
 *
 * @param {string} alias - Alias del alumno.
 * @param {Array<{file: File, path: string}>} entries - Ficheros con su ruta relativa.
 */
export async function uploadWorkspace(alias, entries) {
  const formData = new FormData();
  for (const { file, path } of entries) {
    formData.append("files", file);
    formData.append("paths", path);
  }

  const res = await fetch(`${API_BASE}/api/workspaces/${encodeURIComponent(alias)}/upload/`, {
    method: "POST",
    body: formData,
  });
  return handleResponse(res);
}

export async function compareFiles(path, aliases) {
  const res = await fetch(`${API_BASE}/api/workspaces/compare/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, aliases }),
  });
  return handleResponse(res);
}

/**
 * Descarga el ZIP del workspace de un alumno directamente en el navegador.
 * No devuelve datos: dispara la descarga del fichero.
 */
export function downloadWorkspaceUrl(alias) {
  return `${API_BASE}/api/workspaces/${encodeURIComponent(alias)}/download/`;
}

export function getWebSocketUrl() {
  if (import.meta.env.VITE_WS_URL) {
    return `${import.meta.env.VITE_WS_URL}/ws/classroom/`;
  }
  // Construimos la URL del WebSocket a partir del host actual (el que el
  // navegador usó para cargar la página), igual que con las peticiones
  // HTTP relativas. ws:// para HTTP normal, wss:// si la página se sirve
  // por HTTPS (necesario porque los navegadores no permiten mezclar
  // wss/https con ws/http "mixed content").
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/classroom/`;
}
