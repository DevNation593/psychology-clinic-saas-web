'use client';

import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  notificationsPanelOpen: boolean;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleNotificationsPanel: () => void;
  setNotificationsPanelOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  notificationsPanelOpen: false,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  
  toggleNotificationsPanel: () => set((state) => ({ 
    notificationsPanelOpen: !state.notificationsPanelOpen 
  })),
  
  setNotificationsPanelOpen: (open) => set({ notificationsPanelOpen: open }),
}));
