"""
URLs principales de Codeaula.

Toda la API vive bajo /api/. El frontend de React se sirve por separado
(servidor de desarrollo de Vite o build estático con Nginx).
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("workspaces_app.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
