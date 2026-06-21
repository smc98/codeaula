import StudentUploadView from "./components/StudentUploadView";
import TeacherDashboard from "./components/TeacherDashboard";

/**
 * Enrutado mínimo basado en query string, sin librerías de routing:
 * - ?vista=profesor -> panel del profesor
 * - cualquier otra cosa (o nada) -> formulario de subida del alumno
 *
 * Se eligió este enfoque para mantener el proyecto simple de desplegar
 * (un único build estático) y fácil de mantener por una sola persona.
 */
export default function App() {
  const params = new URLSearchParams(window.location.search);
  const isTeacherView = params.get("vista") === "profesor";

  return isTeacherView ? <TeacherDashboard /> : <StudentUploadView />;
}
