from django.urls import path

from . import views

urlpatterns = [
    path("file-types/", views.file_types, name="file-types"),
    path("workspaces/", views.list_workspaces, name="workspace-list"),
    path("workspaces/compare/", views.compare_files, name="workspace-compare"),
    path("workspaces/<str:alias>/", views.workspace_detail, name="workspace-detail"),
    path("workspaces/<str:alias>/file/", views.workspace_file, name="workspace-file"),
    path("workspaces/<str:alias>/upload/", views.upload_workspace, name="workspace-upload"),
    path("workspaces/<str:alias>/download/", views.download_workspace, name="workspace-download"),
]
