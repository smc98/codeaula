import { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { php } from "@codemirror/lang-php";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { xml } from "@codemirror/lang-xml";
import { sql } from "@codemirror/lang-sql";
import { yaml } from "@codemirror/lang-yaml";

function getExtensionForLanguage(language) {
  switch (language) {
    case "php":       return [php()];
    case "html":      return [html()];
    case "css":
    case "scss":
    case "sass":      return [css()];
    case "javascript":
    case "jsx":
    case "typescript":
    case "tsx":       return [javascript({ jsx: true, typescript: true })];
    case "python":    return [python()];
    case "java":      return [java()];
    case "json":      return [json()];
    case "markdown":  return [markdown()];
    case "xml":       return [xml()];
    case "sql":       return [sql()];
    case "yaml":      return [yaml()];
    default:          return [];
  }
}

/** Visor de texto con resaltado de sintaxis (CodeMirror). */
function TextViewer({ content, language, theme }) {
  return (
    <CodeMirror
      value={content ?? ""}
      height="100%"
      style={{ flex: 1, minHeight: 0, overflow: "auto" }}
      theme={theme === "light" ? "light" : "dark"}
      editable={false}
      extensions={getExtensionForLanguage(language)}
      basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: false }}
    />
  );
}

/**
 * Botón para copiar el contenido del fichero al portapapeles, con
 * confirmación visual breve. Usa la Clipboard API; si no está disponible
 * (contexto no seguro, navegador antiguo) cae a un método de selección
 * manual con un textarea oculto.
 */
function CopyButton({ content }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content ?? "");
      } else {
        // Fallback para contextos no seguros (IP local sin HTTPS en el aula).
        const textarea = document.createElement("textarea");
        textarea.value = content ?? "";
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Si falla la copia, simplemente no mostramos confirmación.
    }
  }

  return (
    <button
      type="button"
      className={`copy-button ${copied ? "copy-button--copied" : ""}`}
      onClick={handleCopy}
      title="Copiar código al portapapeles"
    >
      {copied ? "✓ Copiado" : "📋 Copiar"}
    </button>
  );
}

/** Visor de imagen. */
function ImageViewer({ url, filename }) {
  return (
    <div className="media-viewer">
      <img src={url} alt={filename} className="media-viewer__img" />
    </div>
  );
}

/** Visor de vídeo. */
function VideoViewer({ url }) {
  return (
    <div className="media-viewer">
      <video controls className="media-viewer__video">
        <source src={url} />
        Tu navegador no soporta la reproducción de este vídeo.
      </video>
    </div>
  );
}

/** Visor de audio. */
function AudioViewer({ url, filename }) {
  return (
    <div className="media-viewer media-viewer--audio">
      <span className="media-viewer__audio-icon" aria-hidden="true">🎵</span>
      <p className="mb-2">{filename}</p>
      <audio controls src={url}>
        Tu navegador no soporta la reproducción de audio.
      </audio>
    </div>
  );
}

/** Para fuentes y otros binarios: solo mostramos un enlace de descarga. */
function BinaryViewer({ url, filename }) {
  return (
    <div className="media-viewer media-viewer--binary">
      <span aria-hidden="true" style={{ fontSize: "2rem" }}>📎</span>
      <p className="mb-2">{filename}</p>
      <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-secondary">
        Abrir / descargar
      </a>
    </div>
  );
}

/**
 * Componente principal: elige el visor correcto según el tipo de fichero
 * devuelto por la API (kind: text | image | video | audio | font | pdf).
 */
export default function CodeViewer({ content, language, filename, kind, mediaUrl, theme }) {
  const isTextFile = !kind || kind === "text";

  return (
    <div className="code-viewer">
      {filename && (
        <div className="code-viewer__header">
          <code>{filename}</code>
          {isTextFile && content != null && <CopyButton content={content} />}
        </div>
      )}

      {isTextFile && (
        <TextViewer content={content} language={language} theme={theme} />
      )}

      {kind === "image" && mediaUrl && (
        <ImageViewer url={mediaUrl} filename={filename} />
      )}

      {kind === "video" && mediaUrl && (
        <VideoViewer url={mediaUrl} />
      )}

      {kind === "audio" && mediaUrl && (
        <AudioViewer url={mediaUrl} filename={filename} />
      )}

      {(kind === "font" || kind === "pdf") && mediaUrl && (
        <BinaryViewer url={mediaUrl} filename={filename} />
      )}
    </div>
  );
}
