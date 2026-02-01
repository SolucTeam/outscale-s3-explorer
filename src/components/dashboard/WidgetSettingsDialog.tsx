import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDashboardPreferences, WidgetConfig } from '@/stores/dashboardPreferencesStore';
import { GripVertical, RotateCcw, Eye, EyeOff } from 'lucide-react';

interface WidgetSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WidgetSettingsDialog: React.FC<WidgetSettingsDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { widgets, setWidgetVisibility, reorderWidgets, resetToDefaults } = useDashboardPreferences();
  const [localWidgets, setLocalWidgets] = React.useState<WidgetConfig[]>([]);
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (open) {
      setLocalWidgets([...widgets].sort((a, b) => a.order - b.order));
    }
  }, [open, widgets]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newWidgets = [...localWidgets];
    const draggedWidget = newWidgets[draggedIndex];
    newWidgets.splice(draggedIndex, 1);
    newWidgets.splice(index, 0, draggedWidget);
    setLocalWidgets(newWidgets);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleVisibilityChange = (id: string, visible: boolean) => {
    setLocalWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible } : w))
    );
  };

  const handleSave = () => {
    // Apply visibility changes
    localWidgets.forEach((w) => {
      const original = widgets.find((ow) => ow.id === w.id);
      if (original && original.visible !== w.visible) {
        setWidgetVisibility(w.id, w.visible);
      }
    });
    // Apply order changes
    reorderWidgets(localWidgets);
    onOpenChange(false);
  };

  const handleReset = () => {
    resetToDefaults();
    onOpenChange(false);
  };

  const visibleCount = localWidgets.filter((w) => w.visible).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GripVertical className="w-5 h-5 text-muted-foreground" />
            Personnaliser les widgets
          </DialogTitle>
          <DialogDescription>
            Réorganisez et masquez les widgets du tableau de bord selon vos préférences.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-2">
            {localWidgets.map((widget, index) => (
              <div
                key={widget.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-3 rounded-lg border bg-card cursor-grab active:cursor-grabbing animate-fade-in ${
                  draggedIndex === index
                    ? 'opacity-50 scale-95 border-primary shadow-lg'
                    : 'hover:border-primary/50 hover:shadow-sm hover:scale-[1.02]'
                } ${!widget.visible ? 'opacity-60 bg-muted/30' : ''}`}
                style={{ 
                  animationDelay: `${index * 50}ms`,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 group-hover:scale-110" />
                
                <div className="flex-1 flex items-center gap-2">
                  <div className={`transition-all duration-300 ${widget.visible ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                    {widget.visible ? (
                      <Eye className="w-4 h-4 animate-scale-in" />
                    ) : (
                      <EyeOff className="w-4 h-4 animate-scale-in" />
                    )}
                  </div>
                  <Label htmlFor={`widget-${widget.id}`} className="cursor-pointer font-medium transition-colors duration-200">
                    {widget.label}
                  </Label>
                </div>

                <Switch
                  id={`widget-${widget.id}`}
                  checked={widget.visible}
                  onCheckedChange={(checked) => handleVisibilityChange(widget.id, checked)}
                />
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm text-muted-foreground text-center">
            {visibleCount} widget{visibleCount > 1 ? 's' : ''} visible{visibleCount > 1 ? 's' : ''} sur {localWidgets.length}
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser
          </Button>
          <div className="flex gap-2 flex-1 sm:justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              Enregistrer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
