# Codeaula

Herramienta para compartir y revisar código en tiempo real dentro de una red local de aula.

## Demo

https://github.com/user-attachments/assets/ca2477d5-bfb3-4687-a6c9-209131b5f278


## Caso de uso

Codeaula nació para resolver un problema real en un aula de programación.

Durante las prácticas, los alumnos entregaban ejercicios mediante plataformas externas, pero la conexión a Internet del puesto del docente era lenta e inestable. Esto ralentizaba las correcciones y dificultaba la revisión de proyectos con múltiples archivos.

La aplicación permite que los alumnos suban sus proyectos directamente a través de la red local del aula, sin depender de Internet ni de servicios externos. El docente recibe las actualizaciones en tiempo real y puede revisar o comparar soluciones desde un único panel.
---

## Tecnologías

| Capa | Stack |
|---|---|
| Backend | Python 3.12 · Django 5 · Django Channels · Daphne · SQLite |
| Frontend | React 18 · Vite · Bootstrap 5 · CodeMirror 6 |
| Infraestructura | Docker · Docker Compose |

---

## Cómo arrancarlo en el aula

### Requisitos previos

- Docker instalado en el equipo del docente ([docker.com/get-started](https://www.docker.com/get-started/))
- Puertos 5173 (frontend) y 8000 (backend) libres, o los que configures (ver abajo)

### Pasos

```bash
# 1. Clona el repositorio
git clone <url-del-repo> codeaula
cd codeaula

# 2. (Opcional) Configura los puertos si los de por defecto no te sirven
cp .env.example .env
# Edita .env si quieres, por ejemplo, que el frontend use el puerto 80
# para que los alumnos no tengan que escribir ":5173" en la URL.

# 3. Arranca con Docker Compose
docker compose up --build

# Espera a que aparezca: Daphne HTTP interface server is ready to handle connections.
```

Una vez arrancado:

| ¿Quién? | URL a abrir |
|---|---|
| **Alumnos** | `http://<IP-del-profesor>:5173` (o el puerto que hayas configurado) |
| **Docente** | `http://localhost:5173?vista=profesor` |

> Para conocer tu IP local: en Windows `ipconfig`, en Mac/Linux `ifconfig` o `ip a`. Busca la IP del adaptador Wi-Fi o Ethernet que comparte con el aula (suele empezar por `192.168.` o `10.`, p.ej. `192.168.1.42`). Compártela con los alumnos como `http://192.168.1.42:5173` (o el puerto que hayas configurado).

### Configurar los puertos

El fichero `.env.example` en la raíz del proyecto documenta dos variables:

```bash
BACKEND_PORT=8000   # Puerto del backend (Django). Uso interno/depuración.
FRONTEND_PORT=5173  # Puerto del frontend. Es el que abren los alumnos.
```

Cópialo a `.env` y ajusta lo que necesites. Casos típicos:
- **El puerto 8000 o 5173 ya está ocupado** en el portátil del profesor por otra aplicación: cambia el valor correspondiente.
- **Quieres que los alumnos no tengan que escribir el puerto** en la URL: pon `FRONTEND_PORT=80`. Ten en cuenta que el puerto 80 puede requerir permisos de administrador o estar ocupado por otro servicio (IIS, Skype, Apache local...); si el arranque falla, prueba con `8080`.

Si no creas el fichero `.env`, se usan los valores por defecto (8000 y 5173) sin más configuración.

---

## Flujo de uso en clase

### Alumno (vista por defecto)

1. Abre la URL en el navegador.
2. Escribe su nombre (siempre el mismo).
3. Arrastra su carpeta de ejercicios a la zona de drop **o** pulsa "Seleccionar carpeta".

> **Nota sobre el diálogo "¿Quieres subir N archivos a este sitio web?"**
> Es una protección nativa de Chrome, no algo de la aplicación. Solo aparece
> al pulsar el botón "Seleccionar carpeta" cuando se accede por IP local sin
> HTTPS (como en el aula). **Arrastrar la carpeta (drag & drop) nunca lo
> muestra**, así que es la vía recomendada si molesta. Si en el futuro se
> sirve la app por HTTPS, el botón tampoco lo mostrará.
4. Ve el mensaje de confirmación. Listo.
5. Si corrige algo, vuelve a subir la carpeta (se sustituye la anterior automáticamente).

### Docente (vista `?vista=profesor`)

- **Panel izquierdo:** lista de alumnos que han subido código. Un badge verde "nuevo" indica actualizaciones recientes.
- **Panel central:** árbol de ficheros del alumno seleccionado (carpetas + ficheros con icono según lenguaje).
- **Panel derecho:** visor de código de solo lectura con resaltado de sintaxis (PHP, HTML, CSS, JS, Python, Java, SQL...).
- **Pestaña "Comparar código":** selecciona una ruta de fichero y varios alumnos para ver sus soluciones lado a lado.

---

## Estructura del proyecto

```
codeaula/
├── backend/                   # Django + Channels
│   ├── codeaula/             # Configuración del proyecto (settings, urls, asgi)
│   ├── workspaces_app/        # App principal: modelos, vistas, consumers WS, utils
│   │   ├── models.py          # Workspace y WorkspaceFile
│   │   ├── views.py           # API REST: listar, subir, ver fichero, comparar
│   │   ├── consumers.py       # WebSocket: notificaciones en tiempo real
│   │   ├── utils.py           # Árbol de ficheros, detección de lenguajes, validaciones
│   │   └── serializers.py     # Conversión de modelos a JSON
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                  # React + Vite
│   ├── src/
│   │   ├── api/               # codeaula.js: llamadas a la API REST y URL del WS
│   │   ├── hooks/             # useClassroomSocket.js: WebSocket con reconexión automática
│   │   ├── utils/             # folderReader.js: drag&drop y input webkitdirectory
│   │   ├── components/
│   │   │   ├── StudentUploadView.jsx   # Vista del alumno
│   │   │   ├── TeacherDashboard.jsx    # Vista del profesor
│   │   │   ├── FileTree.jsx            # Árbol de ficheros navegable
│   │   │   ├── CodeViewer.jsx          # Visor CodeMirror de solo lectura
│   │   │   └── CompareView.jsx         # Comparador lado a lado
│   │   ├── App.jsx            # Enrutado por query param (?vista=profesor)
│   │   ├── main.jsx           # Punto de entrada React
│   │   └── index.css          # Estilos propios (tema claro y oscuro + Bootstrap)
│   ├── index.html
│   ├── vite.config.js
│   └── Dockerfile
└── docker-compose.yml
```

---

## API REST (referencia rápida)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/workspaces/` | Lista de alumnos con número de ficheros |
| `GET` | `/api/workspaces/<alias>/` | Árbol de ficheros de un alumno |
| `GET` | `/api/workspaces/<alias>/file/?path=<ruta>` | Contenido de un fichero concreto |
| `POST` | `/api/workspaces/<alias>/upload/` | Subir/actualizar carpeta completa |
| `POST` | `/api/workspaces/compare/` | Comparar el mismo fichero entre varios alumnos |

**WebSocket:** `ws://<host>:8000/ws/classroom/`
Emite `{"event": "workspace.updated", "alias": "<nombre>"}` cada vez que un alumno sube código.

---

## Personalización

### Añadir extensiones de fichero permitidas

En `backend/codeaula/settings.py`, añade extensiones a `ALLOWED_UPLOAD_EXTENSIONS`. El mapa de extensión → lenguaje está en `backend/workspaces_app/utils.py` (`LANGUAGE_BY_EXTENSION`).

### Cambiar el límite de tamaño

`MAX_WORKSPACE_SIZE_BYTES` en `settings.py` (por defecto 50 MB por alumno).

### Modo oscuro / paleta de colores

Las variables CSS están en `frontend/src/index.css` bajo `:root`. Cambia `--css-accent` para ajustar el color de acento.

### Despliegue en producción (si se quisiera usar fuera del aula)

1. Cambia `DJANGO_SECRET_KEY` y `DJANGO_DEBUG=false` en `docker-compose.yml`.
2. Añade Nginx como reverse proxy delante de Daphne.
3. Haz `npm run build` en el frontend y sirve `/dist` con Nginx.
4. Usa PostgreSQL en lugar de SQLite si hay carga concurrente alta.

---

## Comandos útiles

```bash
# Parar y limpiar completamente (incluye volúmenes con la BD y los workspaces)
docker compose down -v

# Ver logs en tiempo real
docker compose logs -f

# Acceder al panel de administración de Django
# Primero crea un superusuario:
docker compose exec backend python manage.py createsuperuser
# Luego abre: http://localhost:8000/admin/

# Ejecutar tests (cuando los añadas con pytest o el runner de Django)
docker compose exec backend python manage.py test

# Reconstruir solo el backend tras cambios en requirements.txt
docker compose up --build backend
```

---

## Extensiones futuras

- **Ejecución de PHP en sandbox:** añadir un contenedor con `php-cli` y un endpoint que ejecute snippets de forma aislada (útil para el módulo de servidor).
- **Historial de entregas:** guardar cada subida con timestamp en lugar de sustituir, para ver la evolución del alumno.
---

## ¿Por qué no usa HTTPS?

Codeaula está diseñado para funcionar exclusivamente dentro de una red local de aula.

El uso de HTTPS en este escenario suele requerir certificados autofirmados, lo que introduce avisos de seguridad y más fricción para los alumnos que beneficios prácticos.

Si la aplicación se despliega fuera de una red local, se recomienda configurar HTTPS mediante un certificado válido y un proxy inverso (Nginx, Caddy, etc.).

## Licencia

MIT
