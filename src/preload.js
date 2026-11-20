const { contextBridge, ipcRenderer } = require('electron');

const call = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);
const EVENTS = ['progress', 'changed'];

contextBridge.exposeInMainWorld('api', {
  listGames: call('games:list'),
  getRelease: call('games:release'),
  install: call('games:install'),
  play: call('games:play'),
  uninstall: call('games:uninstall'),
  openFolder: call('games:openFolder'),
  openRepo: call('games:openRepo'),
  addGame: call('games:add'),
  removeGame: call('games:remove'),
  getSettings: call('settings:get'),
  setSettings: call('settings:set'),
  openDataDir: call('settings:openDataDir'),
  openExternal: call('open-external'),
  on: (channel, fn) => {
    if (EVENTS.includes(channel)) ipcRenderer.on(channel, (_e, data) => fn(data));
  },
});
