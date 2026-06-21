import { useState } from "react";

const FILE_ICONS = {
  php: "🐘",
  html: "🌐",
  css: "🎨",
  javascript: "📜",
  jsx: "📜",
  typescript: "📜",
  tsx: "📜",
  python: "🐍",
  java: "☕",
  sql: "🗄️",
  json: "🧩",
  markdown: "📝",
  default: "📄",
};

function FileIcon({ language }) {
  return <span aria-hidden="true">{FILE_ICONS[language] || FILE_ICONS.default}</span>;
}

/**
 * Nodo del árbol (carpeta o fichero). Las carpetas se expanden/colapsan,
 * los ficheros invocan onSelectFile al hacer clic.
 */
function TreeNode({ node, depth, selectedPath, onSelectFile }) {
  const [expanded, setExpanded] = useState(true);

  if (node.type === "file") {
    const isSelected = node.path === selectedPath;
    return (
      <button
        type="button"
        className={`tree-item tree-item--file ${isSelected ? "tree-item--selected" : ""}`}
        style={{ paddingLeft: `${depth * 1.1 + 0.5}rem` }}
        onClick={() => onSelectFile(node)}
      >
        <FileIcon language={node.language} /> <span className="ms-1">{node.name}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="tree-item tree-item--folder"
        style={{ paddingLeft: `${depth * 1.1 + 0.5}rem` }}
        onClick={() => setExpanded((v) => !v)}
      >
        <span aria-hidden="true">{expanded ? "📂" : "📁"}</span>{" "}
        <span className="ms-1 fw-semibold">{node.name}</span>
      </button>
      {expanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path || child.name}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Árbol de ficheros completo de un workspace.
 *
 * @param {object} tree - Nodo raíz devuelto por la API (build_file_tree).
 * @param {string|null} selectedPath - Ruta del fichero seleccionado actualmente.
 * @param {(node: object) => void} onSelectFile - Callback al seleccionar un fichero.
 */
export default function FileTree({ tree, selectedPath, onSelectFile }) {
  if (!tree || tree.children.length === 0) {
    return <p className="text-muted px-3 py-2 mb-0">Este alumno no tiene ficheros subidos.</p>;
  }

  return (
    <div className="file-tree">
      {tree.children.map((child) => (
        <TreeNode
          key={child.path || child.name}
          node={child}
          depth={0}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
}
