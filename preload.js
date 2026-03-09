/**
 * preload.js — Turvallinen silta renderöijän ja pääprosessin välillä.
 * contextIsolation: true  →  kaikki node/electron-asiat täytyy paljastaa tässä.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sanastopeli', {
  /** Listaa kaikki saatavilla olevat sanapakettit */
  getPackages: ()             => ipcRenderer.invoke('get-packages'),

  /** Lataa sanapaketin sanojen taulukon tiedostopolun perusteella */
  loadPackage: (filePath)     => ipcRenderer.invoke('load-package', filePath),

  /** Avaa käyttäjän sanapakettikansio Explorerissa */
  openPackagesFolder: ()      => ipcRenderer.invoke('open-packages-folder'),

  /** Kopioi esimerkkipaketti käyttäjän kansioon */
  copyExamplePackage: ()      => ipcRenderer.invoke('copy-example-package'),

  /** Tuo JSON-tiedostoja tiedostovalitsimella */
  importPackage: ()           => ipcRenderer.invoke('import-package'),

  /** Lataa kaikki tallennettu edistymisdata */
  loadProgress: ()            => ipcRenderer.invoke('load-progress'),

  /** Tallentaa edistymisdatan (voi kutsua osittaisella objektilla, yhdistetään) */
  saveProgress: (data)        => ipcRenderer.invoke('save-progress', data),
});
