import { session } from 'electron';

export function clearServiceWorkers(): void {
  const ses: Electron.Session = session.defaultSession;
  ses.flushStorageData();
  ses.clearStorageData({ storages: ['serviceworkers'] });
}
