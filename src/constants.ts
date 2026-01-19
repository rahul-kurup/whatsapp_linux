import {
  APP_TITLE as PRELOAD_APP_TITLE,
  type PRELOAD as PRELOAD_CONSTANT,
} from './preload';

/**
 * should be kept in sync with src/preload.ts.
 * this is duplicated because types should NOT be imported in preload/index.ts
 */
export const PRELOAD: typeof PRELOAD_CONSTANT = {
  WA_OBJECT: 'wa_api',
  EVENT_WA_NOTIFY: 'wa:ntfy',
  EVENT_UPDATE_BADGE_COUNT: 'wa:update_badge',
} as const;

/**
 * should be kept in sync with src/preload.ts.
 * this is duplicated because types should NOT be imported in preload/index.ts
 */
export const APP_TITLE = PRELOAD_APP_TITLE;
