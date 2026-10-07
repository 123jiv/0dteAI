import { Platform } from 'react-native';
import { AppConfig } from '../config/app';
import type { Drop } from './notifications';

export interface PerksFeed {
  drops: Drop[];
  earlyAccessUrl?: string;
  note?: string;
}

/**
 * Optional JSON on unsetld.com that lists upcoming drops (see
 * Web/app-feed.example.json). Lets the founder announce drops without an app
 * update. Missing or unreachable feed = no drops, nothing breaks.
 */
export async function fetchPerksFeed(): Promise<PerksFeed | null> {
  // The browser preview makes no outside requests.
  if (Platform.OS === 'web') return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(AppConfig.perksFeedUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = (await res.json()) as PerksFeed;
    return Array.isArray(json.drops) ? json : null;
  } catch {
    return null;
  }
}
