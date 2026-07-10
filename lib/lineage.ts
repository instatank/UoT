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

// Each lineage carries its own atmosphere — the sensibility the insight
// arrives in. `wash` tints the reading surface, `aurora` tints the light
// behind the map, and the interval/filter values re-voice the ambient bed
// (just-intonation ratios over the same 96 Hz root; only the color of the
// chord changes, never the volume or rhythm — atmosphere, not stimulation).
export interface LineageAtmosphere {
  wash: string;
  aurora: string;
  fifth: number; // second partial, as a ratio of the root
  octave: number; // third partial
  filter: number; // lowpass center, Hz
}

export const lineageAtmosphere: Record<Lineage, LineageAtmosphere> = {
  // austere slate — the plain perfect fifth, low ceiling
  Stoicism: { wash: 'rgba(143,163,191,0.13)', aurora: 'rgba(143,163,191,0.15)', fifth: 1.5, octave: 2, filter: 280 },
  // warm amber — a major sixth, soft gold dust
  Buddhism: { wash: 'rgba(201,168,76,0.11)', aurora: 'rgba(201,168,76,0.13)', fifth: 5 / 3, octave: 2, filter: 370 },
  // saffron flame — minor sixth, brighter ceiling
  'Hindu/Gītā': { wash: 'rgba(201,127,69,0.12)', aurora: 'rgba(201,127,69,0.13)', fifth: 8 / 5, octave: 2, filter: 430 },
  // violet light through high windows — open fifth, luminous
  Christianity: { wash: 'rgba(164,139,191,0.13)', aurora: 'rgba(164,139,191,0.15)', fifth: 1.5, octave: 2, filter: 520 },
  // deep teal — the suspended fourth, modal, turning
  Sufism: { wash: 'rgba(90,161,137,0.13)', aurora: 'rgba(90,161,137,0.15)', fifth: 4 / 3, octave: 2, filter: 340 },
  // jade water — fifth sunk under a low ceiling
  Taoism: { wash: 'rgba(111,168,164,0.12)', aurora: 'rgba(111,168,164,0.14)', fifth: 1.5, octave: 2, filter: 230 },
  // cold cyan — clean harmonic series, the brightest room
  'Neuroscience/Psychology': { wash: 'rgba(107,150,201,0.13)', aurora: 'rgba(107,150,201,0.16)', fifth: 1.5, octave: 3, filter: 560 },
};

// The ember room — where rejected parallels are read.
export const rejectedAtmosphere: LineageAtmosphere = {
  wash: 'rgba(176,101,74,0.11)',
  aurora: 'rgba(176,101,74,0.13)',
  fifth: 6 / 5, // minor third — the one shadowed voicing, for the dead end
  octave: 2,
  filter: 260,
};
