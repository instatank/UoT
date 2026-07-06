import type { Lineage } from './types';

// Muted, lineage-stable hues — read as starlight on a dark field, not category chips.
export const lineageColor: Record<Lineage, string> = {
  Stoicism: '#8fa3bf',
  Buddhism: '#c9a84c',
  'Hindu/Gītā': '#c97f45',
  Christianity: '#a48bbf',
  Sufism: '#5aa189',
  Taoism: '#6fa8a4',
  'Neuroscience/Psychology': '#6b96c9',
};

// Rejected parallels keep a trace of their lineage hue but read as ember/ash.
export const rejectedColor = '#b0654a';
