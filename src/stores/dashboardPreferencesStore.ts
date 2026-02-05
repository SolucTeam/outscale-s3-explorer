import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WidgetConfig {
  id: string;
  label: string;
  visible: boolean;
  order: number;
}

interface DashboardPreferencesState {
  widgets: WidgetConfig[];
  setWidgetVisibility: (id: string, visible: boolean) => void;
  reorderWidgets: (widgets: WidgetConfig[]) => void;
  resetToDefaults: () => void;
  getVisibleWidgets: () => WidgetConfig[];
}

const defaultWidgets: WidgetConfig[] = [
  { id: 'stats', label: 'Statistiques Globales', visible: true, order: 0 },
  { id: 'storage', label: 'Utilisation du Stockage', visible: true, order: 1 },
  { id: 'security', label: 'Analyse de Sécurité', visible: true, order: 2 },
  { id: 'permissions', label: 'Permissions & ACL', visible: true, order: 3 },
  { id: 'consumption', label: 'Consommation Ressources', visible: true, order: 4 },
  { id: 'carbon', label: 'Empreinte Carbone', visible: true, order: 5 },
];

export const useDashboardPreferences = create<DashboardPreferencesState>()(
  persist(
    (set, get) => ({
      widgets: [...defaultWidgets],
      
      setWidgetVisibility: (id: string, visible: boolean) => {
        set((state) => ({
          widgets: state.widgets.map((w) =>
            w.id === id ? { ...w, visible } : w
          ),
        }));
      },
      
      reorderWidgets: (widgets: WidgetConfig[]) => {
        set({ widgets: widgets.map((w, index) => ({ ...w, order: index })) });
      },
      
      resetToDefaults: () => {
        set({ widgets: [...defaultWidgets] });
      },
      
      getVisibleWidgets: () => {
        return get()
          .widgets
          .filter((w) => w.visible)
          .sort((a, b) => a.order - b.order);
      },
    }),
    {
      name: 'dashboard-preferences',
    }
  )
);
