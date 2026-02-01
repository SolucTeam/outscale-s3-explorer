import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WidgetSettings {
  id: string;
  name: string;
  visible: boolean;
  order: number;
}

interface DashboardSettingsState {
  widgets: WidgetSettings[];
  setWidgetVisibility: (id: string, visible: boolean) => void;
  reorderWidgets: (widgets: WidgetSettings[]) => void;
  resetToDefault: () => void;
}

const defaultWidgets: WidgetSettings[] = [
  { id: 'stats', name: 'Statistiques Globales', visible: true, order: 0 },
  { id: 'storage', name: 'Utilisation du Stockage', visible: true, order: 1 },
  { id: 'security', name: 'Analyse de Sécurité', visible: true, order: 2 },
  { id: 'permissions', name: 'Permissions & ACL', visible: true, order: 3 },
];

export const useDashboardSettings = create<DashboardSettingsState>()(
  persist(
    (set) => ({
      widgets: defaultWidgets,
      
      setWidgetVisibility: (id, visible) =>
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, visible } : w
          ),
        })),
      
      reorderWidgets: (widgets) => set({ widgets }),
      
      resetToDefault: () => set({ widgets: defaultWidgets }),
    }),
    {
      name: 'dashboard-settings',
    }
  )
);
