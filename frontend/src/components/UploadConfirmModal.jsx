import { formatFileSize } from "../utils/fileValidation";

/**
 * Modal de confirmación previo a la subida.
 *
 * Muestra al alumno qué ficheros se van a aceptar y cuáles se van a
 * descartar (con el motivo), antes de gastar tiempo y datos subiendo
 * la carpeta entera. Usa las clases nativas de Bootstrap 5 para el modal,
 * sin depender de react-bootstrap (evita cargar JS de Bootstrap aparte).
 */
export default function UploadConfirmModal({
  show,
  entries, // {accepted, rejected, totalSize}
  alias,
  uploading,
  onConfirm,
  onCancel,
}) {
  if (!show) return null;

  const { accepted, rejected, totalSize } = entries;

  return (
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal fade show" style={{ display: "block" }} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content upload-modal">
            <div className="modal-header">
              <h5 className="modal-title">Confirmar subida de {alias}</h5>
              <button
                type="button"
                className="btn-close"
                onClick={onCancel}
                disabled={uploading}
                aria-label="Cerrar"
              />
            </div>

            <div className="modal-body">
              <div className="upload-modal__summary">
                <span>
                  <strong>{accepted.length}</strong> ficheros se subirán
                </span>
                <span className="text-muted">·</span>
                <span className="text-muted">{formatFileSize(totalSize)} en total</span>
                {rejected.length > 0 && (
                  <>
                    <span className="text-muted">·</span>
                    <span className="text-warning-emphasis">
                      {rejected.length} no se subirán
                    </span>
                  </>
                )}
              </div>

              {accepted.length > 0 && (
                <div className="upload-modal__section">
                  <h6 className="upload-modal__section-title text-success-emphasis">
                    ✓ Se subirán
                  </h6>
                  <ul className="upload-modal__file-list">
                    {accepted.map((entry) => (
                      <li key={entry.path}>
                        <code>{entry.path}</code>
                        <span className="text-muted small ms-2">
                          {formatFileSize(entry.file.size)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {rejected.length > 0 && (
                <div className="upload-modal__section">
                  <h6 className="upload-modal__section-title text-warning-emphasis">
                    ⚠ No se subirán
                  </h6>
                  <ul className="upload-modal__file-list upload-modal__file-list--rejected">
                    {rejected.map((entry) => (
                      <li key={entry.path}>
                        <code>{entry.path}</code>
                        <span className="text-muted small ms-2">— {entry.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {accepted.length === 0 && (
                <div className="alert alert-warning mb-0">
                  Ningún fichero de esta carpeta se puede subir. Revisa que sea la carpeta
                  correcta y que contenga ficheros de código.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onCancel}
                disabled={uploading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onConfirm}
                disabled={uploading || accepted.length === 0}
              >
                {uploading ? "Subiendo..." : `Confirmar y subir (${accepted.length})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
