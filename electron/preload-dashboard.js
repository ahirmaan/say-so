const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dashboard', {
  getOverviewStats: () => ipcRenderer.invoke('dashboard:get-overview-stats'),

  listFolders: () => ipcRenderer.invoke('dashboard:list-folders'),
  createFolder: (name, icon, description) =>
    ipcRenderer.invoke('dashboard:create-folder', { name, icon, description }),
  renameFolder: (id, name) => ipcRenderer.invoke('dashboard:rename-folder', { id, name }),
  deleteFolder: (id) => ipcRenderer.invoke('dashboard:delete-folder', { id }),
  setFolderIcon: (id, icon) => ipcRenderer.invoke('dashboard:set-folder-icon', { id, icon }),
  setFolderDescription: (id, description) =>
    ipcRenderer.invoke('dashboard:set-folder-description', { id, description }),

  listFacts: (opts) => ipcRenderer.invoke('dashboard:list-facts', opts),
  getFact: (id) => ipcRenderer.invoke('dashboard:get-fact', { id }),
  updateFactContent: (id, content) =>
    ipcRenderer.invoke('dashboard:update-fact-content', { id, content }),
  setFactFavorite: (id, favorite) =>
    ipcRenderer.invoke('dashboard:set-fact-favorite', { id, favorite }),
  moveFact: (id, folderId) => ipcRenderer.invoke('dashboard:move-fact', { id, folderId }),
  deleteFact: (id) => ipcRenderer.invoke('dashboard:delete-fact', { id }),

  bulkMove: (ids, folderId) => ipcRenderer.invoke('dashboard:bulk-move', { ids, folderId }),
  bulkFavorite: (ids, favorite) => ipcRenderer.invoke('dashboard:bulk-favorite', { ids, favorite }),
  bulkDelete: (ids) => ipcRenderer.invoke('dashboard:bulk-delete', { ids }),

  listActivity: (limit) => ipcRenderer.invoke('dashboard:list-activity', { limit }),

  getAppInfo: () => ipcRenderer.invoke('dashboard:get-app-info'),
  exportData: () => ipcRenderer.invoke('dashboard:export-data'),
});
