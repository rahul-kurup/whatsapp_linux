import { CustomWAapi } from './common';
import { PRELOAD } from './events';

declare global {
  interface Window {
     [PRELOAD.WA_OBJECT]: CustomWAapi;
  }
}

export { };
