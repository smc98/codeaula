/**
 * Utilidades para leer carpetas completas desde el navegador.
 *
 * Soporta tres vías de entrada, todas convertidas al mismo formato de salida:
 * [{ file: File, path: "subcarpeta/fichero.ext" }, ...]
 *
 * 1. File System Access API (window.showDirectoryPicker) -> vía preferida en
 *    Chrome/Edge. No dispara el diálogo "¿Quieres subir N archivos a este
 *    sitio?" porque el usuario ya interactúa con un selector nativo del SO;
 *    esa es la confirmación. Solo disponible en contextos seguros (HTTPS o
 *    localhost) y en navegadores basados en Chromium.
 * 2. <input type="file" webkitdirectory> -> fallback para navegadores sin
 *    soporte de la API anterior (Firefox, Safari). Chrome SÍ muestra el
 *    diálogo de confirmación con esta vía; es una medida de seguridad del
 *    propio navegador y no se puede desactivar desde la web.
 * 3. Drag & drop de una carpeta -> recorre recursivamente las
 *    DataTransferItem mediante la API de entradas del sistema de ficheros
 *    (webkitGetAsEntry), que es asíncrona. No dispara ningún diálogo.
 */

/**
 * Indica si el navegador soporta la File System Access API en este contexto.
 *
 * Importante: showDirectoryPicker() solo funciona en contextos seguros
 * (HTTPS o localhost). En el aula, el alumno accede por IP local
 * (http://192.168.x.x:5173), que el navegador NO considera seguro, así que
 * ahí se usará automáticamente el fallback con <input webkitdirectory>
 * (que sí muestra el diálogo de confirmación de Chrome, pero funciona).
 */
export function supportsDirectoryPicker() {
  return (
    typeof window !== "undefined" &&
    "showDirectoryPicker" in window &&
    window.isSecureContext
  );
}

/**
 * Abre el selector de carpetas nativo del sistema operativo (sin el diálogo
 * de confirmación de Chrome) y devuelve los ficheros en el formato común.
 * Lanza un error con name "AbortError" si el usuario cancela el selector;
 * el llamador debe ignorarlo silenciosamente.
 */
export async function entriesFromDirectoryPicker() {
  const dirHandle = await window.showDirectoryPicker();
  const results = [];

  async function readDirectory(handle, prefix) {
    for await (const [name, entryHandle] of handle.entries()) {
      if (entryHandle.kind === "file") {
        const file = await entryHandle.getFile();
        results.push({ file, path: prefix + name });
      } else if (entryHandle.kind === "directory") {
        await readDirectory(entryHandle, `${prefix}${name}/`);
      }
    }
  }

  await readDirectory(dirHandle, `${dirHandle.name}/`);
  return results;
}

/**
 * Convierte la FileList de un <input webkitdirectory> al formato común.
 */
export function entriesFromFileList(fileList) {
  return Array.from(fileList).map((file) => ({
    file,
    // webkitRelativePath incluye el nombre de la carpeta raíz, p.ej. "ejercicios/index.php"
    path: file.webkitRelativePath || file.name,
  }));
}

/**
 * Recorre recursivamente un DataTransferItemList (evento de drop) y devuelve
 * todos los ficheros con su ruta relativa dentro de la carpeta arrastrada.
 */
export async function entriesFromDataTransfer(dataTransfer) {
  const items = dataTransfer.items;
  const results = [];

  const topLevelEntries = [];
  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry?.();
    if (entry) topLevelEntries.push(entry);
  }

  // Si no hay soporte para entries (navegadores antiguos), caemos a FileList plano.
  if (topLevelEntries.length === 0) {
    return entriesFromFileList(dataTransfer.files);
  }

  async function readEntry(entry, prefix) {
    if (entry.isFile) {
      const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
      results.push({ file, path: prefix + entry.name });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const childEntries = await readAllEntries(reader);
      for (const child of childEntries) {
        await readEntry(child, `${prefix}${entry.name}/`);
      }
    }
  }

  // readEntries solo devuelve un lote por llamada; hay que llamarlo hasta que esté vacío.
  async function readAllEntries(reader) {
    const all = [];
    let batch;
    do {
      batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
      all.push(...batch);
    } while (batch.length > 0);
    return all;
  }

  for (const entry of topLevelEntries) {
    await readEntry(entry, "");
  }

  return results;
}

/**
 * Si todas las rutas comparten un primer segmento común (la carpeta raíz
 * arrastrada/seleccionada), lo eliminamos para que el árbol del profesor
 * empiece directamente en los ejercicios, no en "MisDeberes/ejercicio1/...".
 *
 * Esto es opcional: se mantiene si solo hay un nivel o si los nombres no
 * comparten raíz (por ejemplo, el usuario seleccionó varios ficheros sueltos).
 */
export function normalizeEntryPaths(entries) {
  if (entries.length === 0) return entries;

  const firstSegments = entries.map((e) => e.path.split("/")[0]);
  const allShareRoot = firstSegments.every((seg) => seg === firstSegments[0]);
  const hasNesting = entries.some((e) => e.path.includes("/"));

  if (allShareRoot && hasNesting) {
    return entries.map((e) => ({
      ...e,
      path: e.path.split("/").slice(1).join("/"),
    }));
  }

  return entries;
}
