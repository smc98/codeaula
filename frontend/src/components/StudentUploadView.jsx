import { useRef, useState } from "react";
import { uploadWorkspace } from "../api/codeaula";
import { useTheme } from "../hooks/useTheme";
import {
  entriesFromDataTransfer,
  entriesFromDirectoryPicker,
  entriesFromFileList,
  normalizeEntryPaths,
  supportsDirectoryPicker,
} from "../utils/folderReader";
import { classifyEntries } from "../utils/fileValidation";
import UploadConfirmModal from "./UploadConfirmModal";
import ThemeToggle from "./ThemeToggle";

const STORAGE_KEY = "codeaula_alias";

/**
 * Vista para que el alumno suba (o vuelva a subir) su carpeta de ejercicios.
 *
 * Pensada para alumnos con poca formación técnica:
 * - Un único campo: el alias/nombre.
 * - Dos formas de subir la carpeta: arrastrarla o pulsar un botón grande.
 * - Antes de subir, un modal muestra qué se aceptará y qué se rechazará,
 *   para que el alumno no se quede con dudas sobre si "ha funcionado".
 */
export default function StudentUploadView() {
  const { theme, toggleTheme } = useTheme();
  const [alias, setAlias] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [status, setStatus] = useState("idle"); // idle | uploading | success | error
  const [message, setMessage] = useState("");
  const [skippedFiles, setSkippedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Estado del modal de confirmación: null cuando está cerrado.
  const [pendingEntries, setPendingEntries] = useState(null); // {accepted, rejected, totalSize}
  const [rawEntriesForUpload, setRawEntriesForUpload] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);

  const aliasIsValid = alias.trim().length > 0;

  async function handleEntries(rawEntries) {
    if (!aliasIsValid) {
      setStatus("error");
      setMessage("Escribe primero tu nombre arriba, antes de subir la carpeta.");
      return;
    }

    if (rawEntries.length === 0) {
      setStatus("error");
      setMessage("No se ha detectado ningún fichero. Asegúrate de seleccionar una carpeta, no un archivo suelto.");
      return;
    }

    const entries = normalizeEntryPaths(rawEntries);

    setStatus("analyzing");
    setMessage("Comprobando los ficheros...");

    const classification = await classifyEntries(entries);

    setStatus("idle");
    setPendingEntries(classification);
    setRawEntriesForUpload(entries);
  }

  async function handleConfirmUpload() {
    if (!pendingEntries) return;

    setUploading(true);
    setMessage("Subiendo tu carpeta...");

    try {
      localStorage.setItem(STORAGE_KEY, alias.trim());
      // Solo mandamos al backend las entradas que el frontend clasificó como aceptadas.
      // El backend vuelve a validar de todas formas (es la fuente de verdad real).
      const acceptedPaths = new Set(pendingEntries.accepted.map((e) => e.path));
      const entriesToUpload = rawEntriesForUpload.filter((e) => acceptedPaths.has(e.path));

      const result = await uploadWorkspace(alias.trim(), entriesToUpload);
      setStatus("success");
      setSkippedFiles(result.skipped || []);
      setMessage(
        result.accepted_count > 0
          ? `Listo. Se han subido ${result.accepted_count} ficheros. El profesor ya puede verlos.`
          : "La carpeta se ha procesado, pero no se ha aceptado ningún fichero."
      );
    } catch (err) {
      setStatus("error");
      setMessage(`No se ha podido subir la carpeta: ${err.message}`);
    } finally {
      setUploading(false);
      setPendingEntries(null);
      setRawEntriesForUpload(null);
    }
  }

  function handleCancelUpload() {
    setPendingEntries(null);
    setRawEntriesForUpload(null);
  }

  function handleInputChange(e) {
    const entries = entriesFromFileList(e.target.files);
    handleEntries(entries);
    // Permite volver a seleccionar la misma carpeta sin recargar la página.
    e.target.value = "";
  }

  /**
   * Maneja el clic en "Seleccionar carpeta". Usa el selector nativo moderno
   * (sin el diálogo de confirmación de Chrome) cuando el navegador lo
   * soporta; si no, cae al <input webkitdirectory> tradicional.
   */
  async function handleSelectFolderClick() {
    if (supportsDirectoryPicker()) {
      try {
        const entries = await entriesFromDirectoryPicker();
        handleEntries(entries);
      } catch (err) {
        // El usuario cerró el selector sin elegir nada: no es un error a mostrar.
        if (err?.name !== "AbortError") {
          setStatus("error");
          setMessage("No se ha podido leer la carpeta seleccionada.");
        }
      }
      return;
    }
    fileInputRef.current?.click();
  }

  async function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const entries = await entriesFromDataTransfer(e.dataTransfer);
    handleEntries(entries);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  return (
    <div className="container py-5" style={{ maxWidth: "640px" }}>
      <div className="d-flex justify-content-end mb-2">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <div className="text-center mb-4">
        <h1 className="h3 fw-bold mb-1">Subir mis ejercicios</h1>
        <p className="text-muted">
          Sube tu carpeta de deberes para que el docente pueda verla en clase.
        </p>
      </div>

      <div className="mb-4">
        <label htmlFor="alias" className="form-label fw-semibold">
          Tu nombre
        </label>
        <input
          id="alias"
          type="text"
          className="form-control form-control-lg"
          placeholder="Por ejemplo: Sergio"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          maxLength={60}
        />
        <div className="form-text">
          Usa siempre el mismo nombre. Si vuelves a subir tu carpeta, se actualizará lo
          anterior.
        </div>
      </div>

      <div
        className={`upload-dropzone ${isDragOver ? "upload-dropzone--active" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="upload-dropzone__icon" aria-hidden="true">
          📁
        </div>
        <p className="mb-3 fw-semibold">Arrastra aquí tu carpeta de ejercicios</p>
        <p className="text-muted mb-3">o</p>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={handleSelectFolderClick}
        >
          Seleccionar carpeta
        </button>
        <input
          ref={fileInputRef}
          type="file"
          webkitdirectory="true"
          directory="true"
          multiple
          hidden
          onChange={handleInputChange}
        />
      </div>

      {status !== "idle" && (
        <div
          className={`alert mt-4 ${
            status === "success"
              ? "alert-success"
              : status === "error"
              ? "alert-danger"
              : "alert-info"
          }`}
          role="status"
        >
          {message}
          {skippedFiles.length > 0 && (
            <div className="mt-2">
              <strong>Algunos ficheros no se han subido</strong> (no son archivos de código
              reconocidos):
              <ul className="mb-0 mt-1">
                {skippedFiles.slice(0, 10).map((path) => (
                  <li key={path}>
                    <code>{path}</code>
                  </li>
                ))}
                {skippedFiles.length > 10 && <li>... y {skippedFiles.length - 10} más</li>}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="text-center text-muted small mt-5 mb-0">
        ¿Eres el docente?{" "}
        <a href="?vista=profesor">Ir a la vista de docente</a>
      </p>

      <UploadConfirmModal
        show={pendingEntries !== null}
        entries={pendingEntries || { accepted: [], rejected: [], totalSize: 0 }}
        alias={alias.trim()}
        uploading={uploading}
        onConfirm={handleConfirmUpload}
        onCancel={handleCancelUpload}
      />
    </div>
  );
}
