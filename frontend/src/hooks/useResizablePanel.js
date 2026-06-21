import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Gestiona el ancho y estado colapsado de un panel lateral redimensionable.
 *
 * El ancho se ajusta arrastrando un "handle" en el borde del panel, y se
 * puede colapsar a una pestaña delgada con un botón, liberando espacio
 * horizontal para el visor de código (el contenido principal).
 *
 * Ambos valores persisten en localStorage por panel (storageKey), para que
 * el profesor no tenga que reajustar el layout cada vez que abre Codeaula.
 *
 * @param {string} storageKey - Clave única para persistir este panel.
 * @param {number} defaultWidth - Ancho inicial en píxeles.
 * @param {{min: number, max: number}} bounds - Límites de redimensionado.
 */
export function useResizablePanel(storageKey, defaultWidth, bounds = { min: 160, max: 480 }) {
  const storageWidthKey = `codeaula_panel_width_${storageKey}`;
  const storageCollapsedKey = `codeaula_panel_collapsed_${storageKey}`;

  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem(storageWidthKey);
    const parsed = saved ? parseInt(saved, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : defaultWidth;
  });

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(storageCollapsedKey) === "true";
  });

  const isDragging = useRef(false);

  useEffect(() => {
    localStorage.setItem(storageWidthKey, String(width));
  }, [width, storageWidthKey]);

  useEffect(() => {
    localStorage.setItem(storageCollapsedKey, String(collapsed));
  }, [collapsed, storageCollapsedKey]);

  const startDragging = useCallback(
    (e) => {
      e.preventDefault();
      isDragging.current = true;
      const startX = e.clientX;
      const startWidth = width;

      function handleMouseMove(moveEvent) {
        if (!isDragging.current) return;
        const delta = moveEvent.clientX - startX;
        const next = Math.min(bounds.max, Math.max(bounds.min, startWidth + delta));
        setWidth(next);
      }

      function handleMouseUp() {
        isDragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.classList.remove("is-resizing-panel");
      }

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.classList.add("is-resizing-panel");
    },
    [width, bounds.min, bounds.max]
  );

  function toggleCollapsed() {
    setCollapsed((prev) => !prev);
  }

  return { width, collapsed, startDragging, toggleCollapsed };
}

/**
 * Versión genérica de un único eje redimensionable (ancho O alto), sin
 * estado de colapsado. Pensada para casos donde varios elementos hermanos
 * necesitan cada uno su propia dimensión ajustable de forma independiente
 * (p.ej. el ancho de cada columna del comparador, o el alto del árbol de
 * ficheros dentro de cada columna).
 *
 * @param {string} storageKey - Clave única para persistir este valor.
 * @param {number} defaultSize - Tamaño inicial en píxeles.
 * @param {{min: number, max: number}} bounds - Límites de redimensionado.
 * @param {"horizontal"|"vertical"} axis - Eje de arrastre: horizontal ajusta
 *   ancho (arrastre en X), vertical ajusta alto (arrastre en Y).
 */
export function useResizableDimension(storageKey, defaultSize, bounds, axis = "horizontal") {
  const storageSizeKey = `codeaula_dim_${storageKey}`;

  const [size, setSize] = useState(() => {
    const saved = localStorage.getItem(storageSizeKey);
    const parsed = saved ? parseInt(saved, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : defaultSize;
  });

  const isDragging = useRef(false);

  useEffect(() => {
    localStorage.setItem(storageSizeKey, String(size));
  }, [size, storageSizeKey]);

  const startDragging = useCallback(
    (e) => {
      e.preventDefault();
      isDragging.current = true;
      const startPos = axis === "horizontal" ? e.clientX : e.clientY;
      const startSize = size;
      const bodyClass = axis === "horizontal" ? "is-resizing-panel" : "is-resizing-panel-v";

      function handleMouseMove(moveEvent) {
        if (!isDragging.current) return;
        const currentPos = axis === "horizontal" ? moveEvent.clientX : moveEvent.clientY;
        const delta = currentPos - startPos;
        const next = Math.min(bounds.max, Math.max(bounds.min, startSize + delta));
        setSize(next);
      }

      function handleMouseUp() {
        isDragging.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.classList.remove(bodyClass);
      }

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.classList.add(bodyClass);
    },
    [size, bounds.min, bounds.max, axis]
  );

  return { size, startDragging };
}
