from django.contrib import admin

from .models import Workspace, WorkspaceFile


class WorkspaceFileInline(admin.TabularInline):
    model = WorkspaceFile
    extra = 0
    readonly_fields = ("relative_path", "size_bytes", "updated_at")
    fields = ("relative_path", "size_bytes", "updated_at")
    can_delete = False
    show_change_link = True


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ("alias", "updated_at", "file_count")
    search_fields = ("alias",)
    inlines = [WorkspaceFileInline]

    def file_count(self, obj):
        return obj.files.count()

    file_count.short_description = "Nº de ficheros"


@admin.register(WorkspaceFile)
class WorkspaceFileAdmin(admin.ModelAdmin):
    list_display = ("workspace", "relative_path", "size_bytes", "updated_at")
    search_fields = ("relative_path", "workspace__alias")
    list_filter = ("workspace",)
    readonly_fields = ("content",)
