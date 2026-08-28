'use strict'
// Preload de la página REMOTA. Angosto a propósito: lo único que cruza el
// puente es imprimir un recibo y abrir el selector de impresora. Nada de fs,
// nada de ipcRenderer crudo, nada de node.
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('elVuelto', {
  isDesktop: true,
  version: '0.1.0',
  // Devuelve { ok: boolean, motivo?: string }. El front puede ignorarlo:
  // los errores ya se le muestran al cajero desde el proceso principal.
  printReceipt: (html) => ipcRenderer.invoke('elvuelto:print', String(html ?? '')),
  openPrinterSetup: () => ipcRenderer.invoke('elvuelto:open-setup'),
})
