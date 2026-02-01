import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Settings, RotateCcw, GripVertical } from 'lucide-react';
import { useDashboardSettings, WidgetSettings } from '@/hooks/useDashboardSettings';

export const DashboardSettingsDialog = () => {
  const { widgets, setWidgetVisibility, reorderWidgets, resetToDefault } = useDashboardSettings();

  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const newWidgets = [...sortedWidgets];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newWidgets.length) return;
    
    // Swap orders
    const temp = newWidgets[index].order;
    newWidgets[index] = { ...newWidgets[index], order: newWidgets[newIndex].order };
    newWidgets[newIndex] = { ...newWidgets[newIndex], order: temp };
    
    reorderWidgets(newWidgets);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          Personnaliser
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Personnaliser le Dashboard
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Choisissez les widgets à afficher et leur ordre d'apparition.
          </p>
          
          <div className="space-y-2">
            {sortedWidgets.map((widget, index) => (
              <div
                key={widget.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                
                <Checkbox
                  id={widget.id}
                  checked={widget.visible}
                  onCheckedChange={(checked) =>
                    setWidgetVisibility(widget.id, checked as boolean)
                  }
                />
                
                <Label
                  htmlFor={widget.id}
                  className="flex-1 cursor-pointer font-medium"
                >
                  {widget.name}
                </Label>
                
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveWidget(index, 'up')}
                    disabled={index === 0}
                    className="h-7 w-7 p-0"
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveWidget(index, 'down')}
                    disabled={index === sortedWidgets.length - 1}
                    className="h-7 w-7 p-0"
                  >
                    ↓
                  </Button>
                </div>
              </div>
            ))}
          </div>
          
          <Button
            variant="outline"
            onClick={resetToDefault}
            className="w-full gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Réinitialiser par défaut
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
