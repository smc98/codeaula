import { useCallback, useEffect, useState } from "react";
import { fetchWorkspaceDetail, fetchWorkspaceFile, fetchWorkspaces, downloadWorkspaceUrl } from "../api/codeaula";
import { useClassroomSocket } from "../hooks/useClassroomSocket";
import { useTheme } from "../hooks/useTheme";
import FileTree from "./FileTree";
import CodeViewer from "./CodeViewer";
import CompareView from "./CompareView";
import ThemeToggle from "./ThemeToggle";
import ResizablePanel from "./ResizablePanel";

/**
 * Vista principal del profesor:
 * - Columna izquierda: lista de alumnos con indicador de actualización reciente.
 * - Columna central: árbol de ficheros del alumno seleccionado.
 * - Columna derecha: visor de código del fichero seleccionado.
 * - Pestaña adicional: comparador entre alumnos.
 */
export default function TeacherDashboard() {
  const { theme, toggleTheme } = useTheme();
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedAlias, setSelectedAlias] = useState(null);
  const [tree, setTree] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null); // {path, language, content}
  const [recentlyUpdated, setRecentlyUpdated] = useState({}); // alias -> timestamp
  const [activeTab, setActiveTab] = useState("inspect"); // inspect | compare
  const [loadingTree, setLoadingTree] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadWorkspaces = useCallback(async () => {
    try {
      const data = await fetchWorkspaces();
      setWorkspaces(data.workspaces);
    } catch (err) {
      setErrorMsg(`No se ha podido cargar la lista de alumnos: ${err.message}`);
    }
  }, []);

  const loadTree = useCallback(async (alias) => {
    setLoadingTree(true);
    setSelectedFile(null);
    try {
      const data = await fetchWorkspaceDetail(alias);
      setTree(data.tree);
    } catch (err) {
      setErrorMsg(`No se ha podido cargar la carpeta de ${alias}: ${err.message}`);
      setTree(null);
    } finally {
      setLoadingTree(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaces();
    const interval = setInterval(loadWorkspaces, 15000); // refresco periódico de respaldo
    return () => clearInterval(interval);
  }, [loadWorkspaces]);

  // WebSocket: cuando un alumno sube/actualiza su carpeta, refrescamos su entrada.
  useClassroomSocket(
    useCallback(
      (event) => {
        if (event.event === "workspace.updated") {
          setRecentlyUpdated((prev) => ({ ...prev, [event.alias]: Date.now() }));
          loadWorkspaces();
          if (event.alias === selectedAlias) {
            loadTree(event.alias);
          }
        }
      },
      [loadWorkspaces, loadTree, selectedAlias]
    )
  );

  function handleSelectStudent(alias) {
    setSelectedAlias(alias);
    setErrorMsg("");
    loadTree(alias);
  }

  async function handleSelectFile(node) {
    setLoadingFile(true);
    setErrorMsg("");
    try {
      const data = await fetchWorkspaceFile(selectedAlias, node.path);
      setSelectedFile(data);
    } catch (err) {
      setErrorMsg(`No se ha podido abrir el fichero: ${err.message}`);
    } finally {
      setLoadingFile(false);
    }
  }

  const selectedWorkspace = workspaces.find((ws) => ws.alias === selectedAlias);

  return (
    <div className="teacher-dashboard">
      <header className="teacher-dashboard__header">
        <h1 className="h4 mb-0">Codeaula — Vista del docente</h1>
        <div className="d-flex align-items-center gap-3">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <a href="?" className="small">
            Ir a la vista de alumno
          </a>
        </div>
      </header>

      {errorMsg && (
        <div className="alert alert-danger m-3 mb-0" role="alert">
          {errorMsg}
        </div>
      )}

      <ul className="nav nav-tabs px-3 pt-2">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "inspect" ? "active" : ""}`}
            onClick={() => setActiveTab("inspect")}
          >
            Revisar por alumno
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "compare" ? "active" : ""}`}
            onClick={() => setActiveTab("compare")}
          >
            Comparar código
          </button>
        </li>
      </ul>

      {activeTab === "inspect" ? (
        <div className="teacher-dashboard__body">
          <ResizablePanel storageKey="students" label="Alumnos" defaultWidth={220} bounds={{ min: 150, max: 400 }}>
            <aside className="teacher-dashboard__sidebar">
              <h2 className="h6 text-uppercase text-muted px-3 pt-3">
                Alumnos ({workspaces.length})
              </h2>
              {workspaces.length === 0 && (
                <p className="text-muted px-3">Todavía no hay entregas.</p>
              )}
              <ul className="list-unstyled mb-0">
                {workspaces.map((ws) => {
                  const isRecent =
                    recentlyUpdated[ws.alias] && Date.now() - recentlyUpdated[ws.alias] < 10000;
                  return (
                    <li key={ws.alias}>
                      <div className={`student-item ${ws.alias === selectedAlias ? "student-item--active" : ""}`}>
                        <button
                          type="button"
                          className="student-item__name"
                          onClick={() => handleSelectStudent(ws.alias)}
                        >
                          {ws.alias}
                        </button>
                        <span className="d-flex align-items-center gap-2">
                          <span className="text-muted small">{ws.file_count} ficheros</span>
                          {isRecent && <span className="badge bg-success">nuevo</span>}
                          <a
                            href={downloadWorkspaceUrl(ws.alias)}
                            download
                            title={`Descargar ${ws.alias}.zip`}
                            className="student-item__download"
                            onClick={(e) => e.stopPropagation()}
                          >
                            ⬇
                          </a>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </ResizablePanel>

          <ResizablePanel storageKey="filetree" label="Ficheros" defaultWidth={260} bounds={{ min: 180, max: 480 }}>
            <section className="teacher-dashboard__tree">
              <h2 className="h6 text-uppercase text-muted px-3 pt-3">
                {selectedAlias ? `Ficheros de ${selectedAlias}` : "Selecciona un alumno"}
              </h2>
              {loadingTree && <p className="px-3 text-muted">Cargando...</p>}
              {!loadingTree && selectedAlias && (
                <FileTree
                  tree={tree}
                  selectedPath={selectedFile?.relative_path}
                  onSelectFile={handleSelectFile}
                />
              )}
            </section>
          </ResizablePanel>

          <section className="teacher-dashboard__viewer">
            {loadingFile && <p className="text-muted p-3">Abriendo fichero...</p>}
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
              <div className="d-flex h-100 align-items-center justify-content-center text-muted">
                {selectedAlias
                  ? "Selecciona un fichero del árbol para verlo aquí."
                  : "Selecciona un alumno y un fichero para empezar."}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="p-3 compare-view-wrapper">
          <CompareView workspaces={workspaces} theme={theme} />
        </div>
      )}

      {selectedWorkspace && (
        <footer className="teacher-dashboard__footer text-muted small px-3 py-2">
          Última actualización de {selectedWorkspace.alias}:{" "}
          {new Date(selectedWorkspace.updated_at).toLocaleTimeString()}
        </footer>
      )}
    </div>
  );
}
