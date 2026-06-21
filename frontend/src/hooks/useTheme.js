import { useEffect, useState } from "react";

const STORAGE_KEY = "codeaula_theme";

/**
 * Hook de tema claro/oscuro.
 *
 * Por defecto se usa el tema oscuro (mejor para uso prolongado en pantalla),
 * pero el profesor puede cambiar a claro para mejorar el contraste al
 * proyectar en condiciones de luz ambiente o proyectores de baja calidad.
 *
 * La preferencia se guarda en localStorage y se aplica como atributo
 * data-theme en <html>, de forma que todas las variables CSS cambian
 * automáticamente sin tocar cada componente.
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return { theme, toggleTheme };
}
