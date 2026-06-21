import { useResizablePanel } from "../hooks/useResizablePanel";

/**
 * Panel lateral redimensionable y colapsable.
 *
 * Envuelve cualquier contenido (lista de alumnos, árbol de ficheros) y le
 * añade: un tirador de arrastre en el borde derecho para ajustar el ancho,
 * y un botón para colapsarlo a una pestaña delgada cuando no se necesita,
 * liberando espacio horizontal para el visor de código.
 *
 * @param {string} storageKey - Identifica el panel para persistir su estado.
 * @param {string} label - Texto mostrado en la pestaña cuando está colapsado.
 * @param {number} defaultWidth - Ancho inicial en píxeles.
 * @param {{min:number,max:number}} bounds - Límites de redimensionado.
 */
export default function ResizablePanel({
  storageKey,
  label,
  defaultWidth = 240,
  bounds = { min: 160, max: 480 },
  children,
}) {
  const { width, collapsed, startDragging, toggleCollapsed } = useResizablePanel(
    storageKey,
    defaultWidth,
    bounds
  );

  if (collapsed) {
    return (
      <button
        type="button"
        className="resizable-panel__collapsed-tab"
        onClick={toggleCollapsed}
        title={`Mostrar ${label}`}
      >
        <span aria-hidden="true">»</span>
        <span className="resizable-panel__collapsed-label">{label}</span>
      </button>
    );
  }

  return (
    <div className="resizable-panel" style={{ width: `${width}px` }}>
      <div className="resizable-panel__content">{children}</div>
      <button
        type="button"
        className="resizable-panel__collapse-btn"
        onClick={toggleCollapsed}
        title={`Ocultar ${label}`}
      >
        «
      </button>
      <div
        className="resizable-panel__handle"
        onMouseDown={startDragging}
        role="separator"
        aria-orientation="vertical"
        aria-label={`Ajustar ancho de ${label}`}
      />
    </div>
  );
}
