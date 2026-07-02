#!/bin/bash
# Reemplaza clases slate fijas por variables CSS de tema en todas las vistas
set -e

FILES=(
  "/home/z/my-project/src/views/dashboard.tsx"
  "/home/z/my-project/src/views/overview.tsx"
  "/home/z/my-project/src/views/task-list.tsx"
  "/home/z/my-project/src/views/calendar-view.tsx"
  "/home/z/my-project/src/views/certificados.tsx"
  "/home/z/my-project/src/views/finanzas.tsx"
  "/home/z/my-project/src/views/chat.tsx"
  "/home/z/my-project/src/views/kanban.tsx"
  "/home/z/my-project/src/views/members.tsx"
  "/home/z/my-project/src/views/settings.tsx"
  "/home/z/my-project/src/components/app/add-obra-dialog.tsx"
  "/home/z/my-project/src/components/app/add-task-dialog.tsx"
  "/home/z/my-project/src/components/app/task-edit-modal.tsx"
)

for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then echo "SKIP: $f"; continue; fi
  # Text colors
  sed -i 's/text-slate-900/text-foreground/g' "$f"
  sed -i 's/text-slate-700/text-foreground/g' "$f"
  sed -i 's/text-slate-800/text-foreground/g' "$f"
  sed -i 's/text-slate-600/text-muted-foreground/g' "$f"
  sed -i 's/text-slate-500/text-muted-foreground/g' "$f"
  sed -i 's/text-slate-400/text-muted-foreground\/70/g' "$f"
  sed -i 's/text-slate-300/text-muted-foreground\/50/g' "$f"
  # Background colors
  sed -i 's/bg-slate-50\b/bg-muted\/30/g' "$f"
  sed -i 's/bg-slate-50\//bg-muted\//g' "$f"
  sed -i 's/bg-slate-100\b/bg-muted/g' "$f"
  sed -i 's/bg-slate-100\//bg-muted\//g' "$f"
  sed -i 's/bg-white\b/bg-card/g' "$f"
  sed -i 's/bg-white\//bg-card\//g' "$f"
  # Borders
  sed -i 's/border-slate-200\b/border-border/g' "$f"
  sed -i 's/border-slate-200\//border-border\//g' "$f"
  sed -i 's/border-slate-100\b/border-border\/50/g' "$f"
  sed -i 's/border-slate-100\//border-border\/50\//g' "$f"
  sed -i 's/border-slate-300\b/border-border/g' "$f"
  sed -i 's/border-slate-300\//border-border\//g' "$f"
  # Hover states
  sed -i 's/hover:bg-slate-50\b/hover:bg-muted\/50/g' "$f"
  sed -i 's/hover:bg-slate-50\//hover:bg-muted\/50\//g' "$f"
  sed -i 's/hover:bg-slate-100\b/hover:bg-muted/g' "$f"
  sed -i 's/hover:bg-slate-100\//hover:bg-muted\//g' "$f"
  # Orange specifics
  sed -i 's/bg-orange-50\b/bg-primary\/10/g' "$f"
  sed -i 's/bg-orange-50\//bg-primary\/10\//g' "$f"
  sed -i 's/text-orange-700\b/text-primary/g' "$f"
  sed -i 's/text-orange-700\//text-primary\//g' "$f"
  sed -i 's/text-orange-600\b/text-primary/g' "$f"
  sed -i 's/text-orange-600\//text-primary\//g' "$f"
  sed -i 's/border-orange-500\b/border-primary/g' "$f"
  sed -i 's/border-orange-500\//border-primary\//g' "$f"
  sed -i 's/bg-orange-500\b/bg-primary/g' "$f"
  sed -i 's/bg-orange-500\//bg-primary\//g' "$f"
  # Red destructive
  sed -i 's/text-red-600\b/text-destructive/g' "$f"
  sed -i 's/text-red-600\//text-destructive\//g' "$f"
  sed -i 's/hover:bg-red-50\b/hover:bg-destructive\/10/g' "$f"
  sed -i 's/hover:bg-red-50\//hover:bg-destructive\/10\//g' "$f"
  sed -i 's/bg-red-50\b/bg-destructive\/10/g' "$f"
  sed -i 's/bg-red-50\//bg-destructive\/10\//g' "$f"
  sed -i 's/text-red-700\b/text-destructive/g' "$f"
  sed -i 's/border-red-200\b/border-destructive\/30/g' "$f"
  sed -i 's/border-red-200\//border-destructive\/30\//g' "$f"
  sed -i 's/border-red-300\b/border-destructive\/40/g' "$f"
  sed -i 's/border-red-300\//border-destructive\/40\//g' "$f"
  sed -i 's/hover:bg-red-100\b/hover:bg-destructive\/20/g' "$f"
  sed -i 's/hover:bg-red-600\b/hover:bg-destructive/g' "$f"
  sed -i 's/bg-red-600\b/bg-destructive/g' "$f"
  sed -i 's/bg-red-600\//bg-destructive\//g' "$f"
  echo "OK: $f"
done

echo "Done."
