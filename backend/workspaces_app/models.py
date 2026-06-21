"""
Modelos de datos de Codeaula.

Un Workspace representa la entrega de un alumno (su carpeta de ejercicios).
Los ficheros de texto almacenan su contenido en la BD; los binarios (imágenes,
vídeos, fuentes) se guardan en MEDIA_ROOT y se referencian por URL.
"""

from django.db import models


class Workspace(models.Model):
    """Carpeta de ejercicios de un alumno, identificada por su alias."""

    alias = models.CharField(
        max_length=60,
        unique=True,
        help_text="Nombre o alias que identifica al alumno en clase.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["alias"]

    def __str__(self) -> str:
        return self.alias


class WorkspaceFile(models.Model):
    """Un fichero individual dentro del workspace de un alumno."""

    workspace = models.ForeignKey(
        Workspace, related_name="files", on_delete=models.CASCADE
    )
    # Ruta relativa dentro del workspace, p.ej. "ejercicio3/index.php"
    relative_path = models.CharField(max_length=500)

    # Ficheros de texto: contenido almacenado en la BD.
    content = models.TextField(blank=True, default="")

    # Ficheros binarios: referencia al fichero en MEDIA_ROOT.
    is_binary = models.BooleanField(default=False)
    media_file = models.FileField(upload_to="", blank=True, null=True)

    size_bytes = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("workspace", "relative_path")
        ordering = ["relative_path"]

    def __str__(self) -> str:
        return f"{self.workspace.alias}:{self.relative_path}"
