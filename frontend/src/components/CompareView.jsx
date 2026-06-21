import { useCallback, useState } from "react";
import { fetchWorkspaceDetail, fetchWorkspaceFile } from "../api/codeaula";
import { useResizableDimension } from "../hooks/useResizablePanel";
import CodeViewer from "./CodeViewer";
import FileTree from "./FileTree";

/**
 * Una columna de comparación: selector de alumno, árbol de ficheros y visor.
 * Cada columna es completamente independiente: el profesor elige libremente
 * qué alumno y qué fichero mostrar en cada una.
 */
function CompareColumn({ workspaces, columnIndex, onRemove, canRemove, theme, layoutMode }) {
  const [selectedAlias, setSelectedAlias] = useState("");
  const [tree, setTree] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loadingTree, setLoadingTree] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);

  // Alto del árbol de ficheros, ajustable verticalmente e independiente
  // por columna (persistido entre sesiones). Por defecto 160px.
  const { size: treeHeight, startDragging: startDraggingTreeHeight } = useResizableDimension(
    `compare_tree_height_${columnIndex}`,
    160,
    { min: 60, max: 500 },
    "vertical"
  );

  // Igual que en el dashboard principal, el árbol se puede colapsar a una
  // barra delgada para liberar espacio vertical al visor de código.
  const treeCollapsedKey = `codeaula_compare_tree_collapsed_${columnIndex}`;
  const [treeCollapsed, setTreeCollapsed] = useState(
    () => localStorage.getItem(treeCollapsedKey) === "true"
  );

  function toggleTreeCollapsed() {
    setTreeCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(treeCollapsedKey, String(next));
      return next;
    });
  }

  // Proporción de ancho de la columna (flex-grow), ajustable arrastrando el
  // tirador derecho. A diferencia de un ancho fijo en píxeles, esto reparte
  // siempre el 100% del espacio disponible entre todas las columnas; el
  // resize solo cambia la proporción relativa, no deja huecos vacíos ni
  // desborda la pantalla. Se guarda como número (no px) en localStorage.
  const { size: colGrow, startDragging: startDraggingWidth } = useResizableDimension(
    `compare_col_grow_${columnIndex}`,
    100,
    { min: 40, max: 400 },
    "horizontal"
  );

  const loadTree = useCallback(async (alias) => {
    if (!alias) return;
    setLoadingTree(true);
    setSelectedFile(null);
    setTree(null);
    try {
      const data = await fetchWorkspaceDetail(alias);
      setTree(data.tree);
    } finally {
      setLoadingTree(false);
    }
  }, []);

  function handleAliasChange(e) {
    const alias = e.target.value;
    setSelectedAlias(alias);
    loadTree(alias);
  }

  async function handleSelectFile(node) {
    setLoadingFile(true);
    try {
      const data = await fetchWorkspaceFile(selectedAlias, node.path);
      setSelectedFile(data);
    } finally {
      setLoadingFile(false);
    }
  }

  // En modo "columnas" el ancho se reparte proporcionalmente entre todas
  // las columnas según su flex-grow (siempre llenando el 100% del ancho
  // disponible); en modo "filas" cada tarjeta ocupa el ancho completo,
  // así que no se aplica ningún estilo de ancho.
  const widthStyle =
    layoutMode === "columns" ? { flexGrow: colGrow, flexBasis: 0, minWidth: 220 } : undefined;

  return (
    <div className="compare-col" style={widthStyle}>
      <div className="compare-col__header">
        <select
          className="form-select form-select-sm compare-col__selector"
          value={selectedAlias}
          onChange={handleAliasChange}
        >
          <option value="">— Selecciona alumno —</option>
          {workspaces.map((ws) => (
            <option key={ws.alias} value={ws.alias}>
              {ws.alias}
            </option>
          ))}
        </select>
        {canRemove && (
          <button
            type="button"
            className="compare-col__remove"
            title="Eliminar columna"
            onClick={onRemove}
          >
            ✕
          </button>
        )}
      </div>

      <div className="compare-col__body">
        {/* Panel del árbol de ficheros: colapsable y con alto ajustable */}
        {treeCollapsed ? (
          <button
            type="button"
            className="compare-col__tree-collapsed"
            onClick={toggleTreeCollapsed}
            title="Mostrar árbol de ficheros"
          >
            <span aria-hidden="true">▾</span> Mostrar árbol
          </button>
        ) : (
          <div className="compare-col__tree" style={{ height: `${treeHeight}px` }}>
            <div className="compare-col__tree-scroll">
              {loadingTree && <p className="text-muted px-2 py-2 small">Cargando...</p>}
              {!loadingTree && tree && (
                <FileTree
                  tree={tree}
                  selectedPath={selectedFile?.relative_path}
                  onSelectFile={handleSelectFile}
                />
              )}
              {!loadingTree && !tree && selectedAlias && (
                <p className="text-muted px-2 py-2 small">Sin ficheros.</p>
              )}
              {!selectedAlias && (
                <p className="text-muted px-2 py-2 small">Selecciona un alumno arriba.</p>
              )}
            </div>
            <button
              type="button"
              className="compare-col__tree-collapse-btn"
              onClick={toggleTreeCollapsed}
              title="Ocultar árbol de ficheros"
            >
              ▴
            </button>
            <div
              className="compare-col__tree-handle"
              onMouseDown={startDraggingTreeHeight}
              role="separator"
              aria-orientation="horizontal"
              aria-label="Ajustar alto del árbol de ficheros"
              title="Arrastra para ajustar el alto del árbol"
            />
          </div>
        )}

        {/* Panel del visor de código */}
        <div className="compare-col__viewer">
          {loadingFile && <p className="text-muted p-2 small">Abriendo...</p>}
          {!loadingFile && selectedFile && (
            <CodeViewer
              content={selectedFile.content}
              language={selectedFile.language}
              kind={selectedFile.kind}
              mediaUrl={selectedFile.media_url}
              filename={selectedFile.relative_path}
              theme={theme}
            />
          )}
          {!loadingFile && !selectedFile && (
            <div className="compare-col__empty">
              {selectedAlias ? "Selecciona un fichero del árbol." : ""}
            </div>
          )}
        </div>
      </div>

      {/* Tirador de ancho de la columna: solo tiene sentido en modo columnas */}
      {layoutMode === "columns" && (
        <div
          className="compare-col__width-handle"
          onMouseDown={startDraggingWidth}
          role="separator"
          aria-orientation="vertical"
          aria-label="Ajustar ancho de la columna"
          title="Arrastra para ajustar el ancho de la columna"
        />
      )}
    </div>
  );
}

/**
 * Vista de comparación libre: el profesor gestiona cuántas columnas quiere
 * (mínimo 2, máximo 4) y elige independientemente el alumno y fichero de cada una.
 *
 * El modo de disposición (filas o columnas) es una preferencia visual: en
 * "columnas" (por defecto) los paneles se reparten en horizontal, ideal en
 * pantallas anchas; en "filas" se apilan en vertical, mejor para comparar
 * ficheros largos donde importa más alto que ancho.
 */
export default function CompareView({ workspaces, theme }) {
  // Cada columna es simplemente un ID único; el estado vive dentro de cada CompareColumn.
  const [columns, setColumns] = useState([1, 2]);
  const [layoutMode, setLayoutMode] = useState("columns"); // "columns" | "rows"
  const nextId = () => Math.max(...columns) + 1;

  function addColumn() {
    if (columns.length < 4) setColumns((prev) => [...prev, nextId()]);
  }

  function removeColumn(id) {
    setColumns((prev) => prev.filter((c) => c !== id));
  }

  return (
    <div className="compare-view">
      <div className="compare-view__toolbar">
        <span className="text-muted small">
          Elige alumno y fichero en cada columna de forma independiente.
        </span>
        <div className="d-flex align-items-center gap-2">
          <div className="layout-toggle" role="group" aria-label="Disposición de la comparación">
            <button
              type="button"
              className={`layout-toggle__option ${layoutMode === "columns" ? "layout-toggle__option--active" : ""}`}
              onClick={() => setLayoutMode("columns")}
              title="Vista en columnas"
            >
              <span aria-hidden="true">▥</span> Columnas
            </button>
            <button
              type="button"
              className={`layout-toggle__option ${layoutMode === "rows" ? "layout-toggle__option--active" : ""}`}
              onClick={() => setLayoutMode("rows")}
              title="Vista en filas"
            >
              <span aria-hidden="true">☰</span> Filas
            </button>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={addColumn}
            disabled={columns.length >= 4}
            title={columns.length >= 4 ? "Máximo 4 columnas" : "Añadir columna"}
          >
            + Columna
          </button>
        </div>
      </div>

      <div className={`compare-view__grid compare-view__grid--${layoutMode}`}>
        {columns.map((id) => (
          <CompareColumn
            key={id}
            workspaces={workspaces}
            columnIndex={id}
            canRemove={columns.length > 2}
            onRemove={() => removeColumn(id)}
            theme={theme}
            layoutMode={layoutMode}
          />
        ))}
      </div>
    </div>
  );
}
