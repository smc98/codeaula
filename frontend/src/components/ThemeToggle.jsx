/**
 * Botón de alternancia entre tema claro y oscuro.
 * Icono y texto cambian según el tema activo para que la acción sea obvia.
 */
export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      title={isDark ? "Cambiar a tema claro (mejor para proyector)" : "Cambiar a tema oscuro"}
    >
      <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
      <span className="theme-toggle__label">{isDark ? "Tema claro" : "Tema oscuro"}</span>
    </button>
  );
}
