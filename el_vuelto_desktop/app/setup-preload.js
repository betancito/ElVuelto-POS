'use strict'
// Preload de la pantalla LOCAL de configuración (setup.html). Estas APIs no
// se le exponen nunca a la página remota.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('elVueltoSetup', {
  getConfig: () => ipcRenderer.invoke('elvuelto:get-config'),
  getPrinters: () => ipcRenderer.invoke('elvuelto:printers'),
  save: (patch) => ipcRenderer.invoke('elvuelto:save-config', patch),
  testPrint: (patch) => ipcRenderer.invoke('elvuelto:test-print', patch),
  close: () => ipcRenderer.invoke('elvuelto:close-setup'),
})
