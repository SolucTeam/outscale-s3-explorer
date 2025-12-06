import { create } from 'zustand';

export interface ActiveOperation {
  id: string;
  type: string;
  name: string;
  startedAt: Date;
  abortController: AbortController;
  progress?: number;
}

interface ActiveOperationsStore {
  operations: Map<string, ActiveOperation>;
  
  // Actions
  startOperation: (id: string, type: string, name: string) => AbortController;
  updateProgress: (id: string, progress: number) => void;
  completeOperation: (id: string) => void;
  cancelOperation: (id: string) => void;
  getOperation: (id: string) => ActiveOperation | undefined;
  getAllOperations: () => ActiveOperation[];
  isOperationActive: (id: string) => boolean;
}

export const useActiveOperationsStore = create<ActiveOperationsStore>((set, get) => ({
  operations: new Map(),
  
  startOperation: (id, type, name) => {
    const abortController = new AbortController();
    const operation: ActiveOperation = {
      id,
      type,
      name,
      startedAt: new Date(),
      abortController,
      progress: 0
    };
    
    set(state => {
      const newOperations = new Map(state.operations);
      newOperations.set(id, operation);
      return { operations: newOperations };
    });
    
    console.log(`🚀 Operation started: ${type} - ${name} (${id})`);
    return abortController;
  },
  
  updateProgress: (id, progress) => {
    set(state => {
      const operation = state.operations.get(id);
      if (!operation) return state;
      
      const newOperations = new Map(state.operations);
      newOperations.set(id, { ...operation, progress });
      return { operations: newOperations };
    });
  },
  
  completeOperation: (id) => {
    const operation = get().operations.get(id);
    if (operation) {
      console.log(`✅ Operation completed: ${operation.type} - ${operation.name} (${id})`);
    }
    
    set(state => {
      const newOperations = new Map(state.operations);
      newOperations.delete(id);
      return { operations: newOperations };
    });
  },
  
  cancelOperation: (id) => {
    const operation = get().operations.get(id);
    if (operation) {
      console.log(`❌ Operation cancelled: ${operation.type} - ${operation.name} (${id})`);
      operation.abortController.abort();
    }
    
    set(state => {
      const newOperations = new Map(state.operations);
      newOperations.delete(id);
      return { operations: newOperations };
    });
  },
  
  getOperation: (id) => {
    return get().operations.get(id);
  },
  
  getAllOperations: () => {
    return Array.from(get().operations.values());
  },
  
  isOperationActive: (id) => {
    return get().operations.has(id);
  }
}));
