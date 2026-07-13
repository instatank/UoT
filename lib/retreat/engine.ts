// The Retreat engine — a hand-rolled first-person WebGL world. A mountain
// valley at golden hour: procedural terrain, an atmospheric sky, a reflective
// lake, billboard trees and grass painted onto canvas textures at load, and
// the session laid out as *places* — a trailhead arch (the complaint), a
// spring in the meadow (the mechanism), lineage sites around it (parallels;
// the rejected one a dry hollow), and a jetty into the lake (the practice).
// You walk. Light moves through the day as the session deepens; arrival is
// dusk falling and the camera rising over the water.
//
// No dependencies, no React inside — same contract as the Voyage engine: the
// host component owns session state and drives spot states through the public
// API. prefers-reduced-motion swaps every walk for an instant cut and freezes
// world time. Raw WebGL is a browser API, not a dependency — package.json is
// untouched.

import { mulberry32 } from '@/lib/rand';

export type SiteKind =
  | 'trailhead'
  | 'spring'
  | 'stoa' // Stoicism — monolith + bench
  | 'stupa' // Buddhism — stacked stones
  | 'flame' // Hindu/Gītā — flame plinth
  | 'arch' // Christianity — standing arch + light shaft
  | 'circle' // Sufism — spiral terrace
  | 'pool' // Taoism — still mirror pool
  | 'deck' // Neuroscience — clean observation deck
  | 'hollow' // the rejected parallel — dry basin, dead tree, guttering ember
  | 'jetty'; // the practice — a dock into the lake

export interface RetreatSpot {
  id: string;
  kind: SiteKind;
  title: string;
  subtitle?: string;
  color: string; // lantern + label hue (lineage color)
  // mutable state, set by the host
  active: boolean; // reachable — tap opens, capture fires
  lit: boolean; // lantern burning (surfaced by the arc)
  cue?: boolean; // the arc's next destination — its lantern breathes
  visited: boolean;
  locked?: boolean; // the jetty before a parallel has landed
  // filled by the engine at layout
  pos?: [number, number, number]; // ground center (y = terrain height)
  lantern?: [number, number, number];
  seat?: [number, number]; // where the walker settles on capture
  seatLook?: [number, number, number]; // what they settle facing
}

export interface RetreatCallbacks {
  /** walked into a spot — open its chamber */
  onCapture: (id: string) => void;
  onHint: (hint: string | null) => void;
  /** tapped something sealed (the unlit jetty) */
  onLockedTap: (id: string) => void;
  /** the arrival rise has finished */
  onRevealDone: () => void;
  /** one footfall (for the soundscape) */
  onStep: () => void;
  /** 0..1 how near the shore the listener stands — throttled */
  onLakeCloseness: (k: number) => void;
  /** nearest lit site's kind + closeness — sound neighborhoods */
  onNearSite: (kind: string | null, k: number) => void;
  /** 0..1 how near the waterfall roars */
  onFallCloseness: (k: number) => void;
}

type Mode = 'free' | 'autopilot' | 'seated' | 'reveal' | 'revealed';

const EYE = 1.62;
const WALK_SPEED = 3.4;
const AUTO_SPEED = 4.4;
const CAPTURE_R = 3.4; // walking this close to an active spot opens it
const WORLD_R = 360; // soft edge — the valley curves you back
const LAKE_C: [number, number] = [0, 170];
const SPRING_C: [number, number] = [0, 35];
const PLAY_C: [number, number] = [0, 60];
const DOCK = { x: 0, z0: 106, z1: 138, w: 1.5, h: 0.92 };
// a rocky headland on the west shore — the waterfall drops straight off it
// into the lake, visible across the water from the jetty
const FALL_MOUND: [number, number] = [-94, 174];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, u: number) => a + (b - a) * u;
const easeInOut = (u: number) => u * u * (3 - 2 * u);

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

// ---------- deterministic value noise (terrain is the same on every visit) ----------

const NOISE_SIZE = 128;
function makeNoiseGrid(seed: number): Float32Array {
  const rng = mulberry32(seed);
  const g = new Float32Array(NOISE_SIZE * NOISE_SIZE);
  for (let i = 0; i < g.length; i++) g[i] = rng();
  return g;
}
const noiseGrid = makeNoiseGrid(20260713);

function vnoise(x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const ux = xf * xf * (3 - 2 * xf);
  const uz = zf * zf * (3 - 2 * zf);
  const N = NOISE_SIZE;
  const i0 = ((xi % N) + N) % N;
  const i1 = (i0 + 1) % N;
  const j0 = ((zi % N) + N) % N;
  const j1 = (j0 + 1) % N;
  const a = noiseGrid[j0 * N + i0];
  const b = noiseGrid[j0 * N + i1];
  const c = noiseGrid[j1 * N + i0];
  const d = noiseGrid[j1 * N + i1];
  return mix(mix(a, b, ux), mix(c, d, ux), uz);
}

function fbm(x: number, z: number, oct: number): number {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    v += vnoise(x * f, z * f) * amp;
    f *= 2.03;
    amp *= 0.5;
  }
  return v;
}

// ---------- GLSL ----------

const FOG_CHUNK = `
  uniform vec3 uFogCol;
  uniform float uFogDens;
  float fogAmount(float dist) {
    return 1.0 - exp(-pow(dist * uFogDens, 1.35));
  }
`;

// value noise + fbm shared by sky and water
const NOISE_CHUNK = `
  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  float fbm4(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += vnoise(p) * a;
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }
`;

// the one sky — the sky shader renders it, the water shader reflects it
const SKY_FN = `
  uniform vec3 uSunDir;
  uniform vec3 uSunCol;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform float uTime;
  uniform float uCloudCover;
  vec3 skyColor(vec3 dir, float cloudDetail) {
    float up = max(dir.y, 0.0);
    vec3 col = mix(uHorizon, uZenith, pow(up, 0.5));
    // haze band sitting on the horizon
    col = mix(col, uHorizon * 1.04, exp(-abs(dir.y) * 9.0) * 0.6);
    float s = max(dot(dir, uSunDir), 0.0);
    // sun disc + bloom
    col += uSunCol * (pow(s, 900.0) * 6.0 + pow(s, 90.0) * 0.55 + pow(s, 6.0) * 0.14);
    if (dir.y > 0.015 && cloudDetail > 0.0) {
      vec2 uv = dir.xz / (dir.y + 0.18) * 0.9 + vec2(uTime * 0.004, uTime * 0.0016);
      float c = fbm4(uv);
      float cl = smoothstep(1.0 - uCloudCover, 1.0 - uCloudCover + 0.42, c);
      // clouds catch the sun on their underside
      vec3 cloudCol = mix(uHorizon * 0.9 + uSunCol * 0.35, uZenith * 0.6 + vec3(0.55), 0.5);
      float horizonFade = smoothstep(0.015, 0.16, dir.y);
      col = mix(col, cloudCol, cl * 0.72 * horizonFade);
    }
    if (dir.y < 0.0) {
      col = mix(col, uFogCol * 0.9, min(1.0, -dir.y * 6.0));
    }
    return col;
  }
`;

const LIGHTS_CHUNK = `
  uniform vec4 uLights[12]; // xyz world pos, w intensity
  uniform vec3 uLightCol[12];
  vec3 lanternLight(vec3 P, vec3 N) {
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 12; i++) {
      float k = uLights[i].w;
      if (k > 0.001) {
        vec3 L = uLights[i].xyz - P;
        float d = length(L);
        float wrap = max(dot(N, L / max(d, 0.01)), 0.0) * 0.7 + 0.3;
        acc += uLightCol[i] * (k * 7.0 / (1.0 + d * d * 0.35)) * wrap;
      }
    }
    return acc;
  }
`;

const TERRAIN_VS = `
  attribute vec3 aPos;
  attribute vec3 aNormal;
  uniform mat4 uVP;
  varying vec3 vWorld;
  varying vec3 vNormal;
  void main() {
    vWorld = aPos;
    vNormal = aNormal;
    gl_Position = uVP * vec4(aPos, 1.0);
  }
`;

const TERRAIN_FS = `
  precision highp float;
  varying vec3 vWorld;
  varying vec3 vNormal;
  uniform sampler2D uNoiseTex;
  uniform sampler2D uGroundTex;
  uniform vec3 uCamPos;
  uniform vec3 uSunDir;
  uniform vec3 uSunCol;
  uniform vec3 uAmb;
  ${FOG_CHUNK}
  ${LIGHTS_CHUNK}
  void main() {
    vec3 N = normalize(vNormal);
    float d1 = texture2D(uNoiseTex, vWorld.xz * 0.09).r;
    float d2 = texture2D(uNoiseTex, vWorld.xz * 0.011).r;
    float d3 = texture2D(uNoiseTex, vWorld.xz * 0.53).r;
    // meadow greens, sun-dried in patches
    vec3 grass = mix(vec3(0.16, 0.24, 0.09), vec3(0.35, 0.36, 0.15), d2);
    grass *= 0.82 + 0.36 * d1;
    grass = mix(grass, vec3(0.42, 0.38, 0.20), smoothstep(0.62, 0.85, d2) * 0.5);
    vec3 rock = mix(vec3(0.30, 0.29, 0.27), vec3(0.52, 0.50, 0.47), d1) * (0.8 + 0.3 * d3);
    float slope = 1.0 - N.y;
    float rockAmt = smoothstep(0.30, 0.52, slope) + smoothstep(40.0, 95.0, vWorld.y);
    vec3 albedo = mix(grass, rock, clamp(rockAmt, 0.0, 1.0));
    // high peaks hold old snow
    float snow = smoothstep(120.0, 200.0, vWorld.y + d2 * 60.0) * (1.0 - smoothstep(0.45, 0.7, slope));
    albedo = mix(albedo, vec3(0.88, 0.90, 0.95), snow);
    // baked masks: R = worn path, G = gravel pads
    vec2 guv = (vWorld.xz + vec2(220.0)) / 440.0;
    vec4 mask = texture2D(uGroundTex, guv);
    vec3 dirt = vec3(0.40, 0.32, 0.22) * (0.78 + 0.4 * d1);
    albedo = mix(albedo, dirt, mask.r * 0.9);
    albedo = mix(albedo, vec3(0.47, 0.45, 0.42) * (0.8 + 0.35 * d3), mask.g * 0.85);
    // wet band + a whisper of foam — only where the lake actually reaches
    // (inland dips share the same heights and must stay plain grass)
    float nearLake = 1.0 - smoothstep(96.0, 128.0, distance(vWorld.xz, vec2(0.0, 170.0)));
    float wet = smoothstep(1.5, 0.15, vWorld.y) * nearLake;
    albedo *= mix(1.0, 0.55, wet * 0.8);
    float foam = smoothstep(0.10, 0.0, abs(vWorld.y - 0.10)) * smoothstep(0.45, 0.75, d3) * nearLake;
    albedo += vec3(0.5) * foam;
    float nd = max(dot(N, uSunDir), 0.0);
    vec3 col = albedo * (uSunCol * nd * 1.25 + uAmb * (0.55 + 0.45 * N.y));
    col += albedo * lanternLight(vWorld, N);
    float dist = length(vWorld - uCamPos);
    col = mix(col, uFogCol, fogAmount(dist));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const SKY_VS = `
  attribute vec2 aPos;
  varying vec2 vNdc;
  void main() {
    vNdc = aPos;
    gl_Position = vec4(aPos, 0.9999, 1.0);
  }
`;

const SKY_FS = `
  precision highp float;
  varying vec2 vNdc;
  uniform vec3 uCamRight;
  uniform vec3 uCamUp;
  uniform vec3 uCamFwd;
  uniform float uTanHalf;
  uniform float uAspect;
  ${FOG_CHUNK}
  ${NOISE_CHUNK}
  ${SKY_FN}
  void main() {
    vec3 dir = normalize(
      uCamFwd + uCamRight * vNdc.x * uTanHalf * uAspect + uCamUp * vNdc.y * uTanHalf
    );
    gl_FragColor = vec4(skyColor(dir, 1.0), 1.0);
  }
`;

const WATER_VS = `
  attribute vec2 aPos;
  uniform mat4 uVP;
  uniform float uWaterY;
  varying vec3 vWorld;
  void main() {
    vWorld = vec3(aPos.x, uWaterY, aPos.y);
    gl_Position = uVP * vec4(vWorld, 1.0);
  }
`;

const WATER_FS = `
  precision highp float;
  varying vec3 vWorld;
  uniform sampler2D uNoiseTex;
  uniform vec3 uCamPos;
  uniform vec2 uEdgeC; // analytic shore fade
  uniform vec2 uEdgeR; // x = full alpha inside, y = zero at
  ${FOG_CHUNK}
  ${NOISE_CHUNK}
  ${SKY_FN}
  void main() {
    vec2 uv1 = vWorld.xz * 0.055 + vec2(uTime * 0.010, uTime * 0.013);
    vec2 uv2 = vWorld.xz * 0.16 - vec2(uTime * 0.017, uTime * 0.008);
    float e = 0.02;
    float h = texture2D(uNoiseTex, uv1).r + texture2D(uNoiseTex, uv2).r * 0.5;
    float hx = texture2D(uNoiseTex, uv1 + vec2(e, 0.0)).r + texture2D(uNoiseTex, uv2 + vec2(e, 0.0)).r * 0.5;
    float hz = texture2D(uNoiseTex, uv1 + vec2(0.0, e)).r + texture2D(uNoiseTex, uv2 + vec2(0.0, e)).r * 0.5;
    vec3 N = normalize(vec3((h - hx) * 2.4, 1.0, (h - hz) * 2.4));
    vec3 V = normalize(uCamPos - vWorld);
    float fres = 0.035 + 0.965 * pow(1.0 - max(dot(V, N), 0.0), 5.0);
    vec3 R = reflect(-V, N);
    R.y = abs(R.y) + 0.02;
    // cloudless reflection — the gradient + sun spark carry it at half cost
    vec3 refl = skyColor(normalize(R), 0.0);
    vec3 deep = mix(vec3(0.035, 0.075, 0.075), uZenith * 0.25, 0.45);
    vec3 col = mix(deep, refl, clamp(fres * 1.15, 0.0, 1.0));
    float spark = pow(max(dot(normalize(R), uSunDir), 0.0), 420.0);
    col += uSunCol * spark * (1.5 + 2.0 * h);
    float dist = length(vWorld - uCamPos);
    col = mix(col, uFogCol, fogAmount(dist));
    float edge = 1.0 - smoothstep(uEdgeR.x, uEdgeR.y, distance(vWorld.xz, uEdgeC));
    gl_FragColor = vec4(col, 0.96 * edge);
  }
`;

const BILL_VS = `
  attribute vec3 aCenter;
  attribute vec2 aCorner; // x -0.5..0.5, y 0..1
  attribute vec4 aMisc; // w, h, atlas column, tint
  uniform mat4 uVP;
  uniform vec3 uCamPos;
  uniform float uTime;
  uniform float uCols;
  uniform float uNearShrink; // 1 for grass: blades at your feet fold away
  varying vec2 vUv;
  varying float vTint;
  varying float vDist;
  void main() {
    vec3 toCam = uCamPos - aCenter;
    vec3 right = normalize(vec3(toCam.z, 0.0, -toCam.x));
    float near = mix(1.0, clamp((length(toCam) - 1.3) / 2.6, 0.0, 1.0), uNearShrink);
    vec3 p = aCenter + (right * aCorner.x * aMisc.x + vec3(0.0, 1.0, 0.0) * aCorner.y * aMisc.y) * near;
    // the crown sways; the root stands still
    float sw = sin(uTime * 0.7 + aCenter.x * 0.35 + aCenter.z * 0.29);
    p.xz += sw * aCorner.y * aCorner.y * aMisc.y * 0.011;
    vUv = vec2((aMisc.z + aCorner.x + 0.5) / uCols, 1.0 - aCorner.y);
    vTint = aMisc.w;
    vDist = length(p - uCamPos);
    gl_Position = uVP * vec4(p, 1.0);
  }
`;

const BILL_FS = `
  precision mediump float;
  varying vec2 vUv;
  varying float vTint;
  varying float vDist;
  uniform sampler2D uAtlas;
  uniform vec3 uSunCol;
  uniform vec3 uAmb;
  ${FOG_CHUNK}
  void main() {
    vec4 c = texture2D(uAtlas, vUv);
    if (c.a < 0.5) discard;
    vec3 base = c.rgb / max(c.a, 0.001);
    vec3 col = base * (uAmb * 0.95 + uSunCol * (0.38 + 0.28 * vTint));
    col = mix(col, uFogCol, fogAmount(vDist));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const MESH_VS = `
  attribute vec3 aPos;
  attribute vec3 aNormal;
  attribute vec3 aColor;
  uniform mat4 uVP;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec3 vColor;
  void main() {
    vWorld = aPos;
    vNormal = aNormal;
    vColor = aColor;
    gl_Position = uVP * vec4(aPos, 1.0);
  }
`;

const MESH_FS = `
  precision highp float;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec3 vColor;
  uniform vec3 uCamPos;
  uniform vec3 uSunDir;
  uniform vec3 uSunCol;
  uniform vec3 uAmb;
  ${FOG_CHUNK}
  ${LIGHTS_CHUNK}
  void main() {
    vec3 N = normalize(vNormal);
    float nd = max(dot(N, uSunDir), 0.0);
    // open-air shade is bright: hemispheric ambient with real fill for
    // vertical faces, plus a soft sky bounce opposite the sun — walls in
    // shadow read as stone, not voids
    float hemi = 0.68 + 0.32 * max(N.y, 0.0);
    vec3 fillDir = normalize(vec3(-uSunDir.x, 0.3, -uSunDir.z));
    float fill = max(dot(N, fillDir), 0.0) * 0.32;
    vec3 col = vColor * (uSunCol * (nd * 1.1 + fill) + uAmb * hemi);
    col += vColor * lanternLight(vWorld, N);
    col = mix(col, uFogCol, fogAmount(length(vWorld - uCamPos)));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const SPRITE_VS = `
  attribute vec3 aCenter;
  attribute vec2 aCorner;
  attribute vec2 aSize;
  attribute vec4 aColor; // rgb + alpha
  attribute float aTex; // glyph atlas cell, or -1 for the procedural glow
  uniform mat4 uVP;
  uniform vec3 uCamRight;
  uniform vec3 uCamUp;
  varying vec2 vUv;
  varying vec4 vColor;
  varying float vTex;
  void main() {
    vec3 p = aCenter + uCamRight * aCorner.x * aSize.x + uCamUp * aCorner.y * aSize.y;
    vUv = aCorner;
    vColor = aColor;
    vTex = aTex;
    gl_Position = uVP * vec4(p, 1.0);
  }
`;

const SPRITE_FS = `
  precision mediump float;
  varying vec2 vUv;
  varying vec4 vColor;
  varying float vTex;
  uniform sampler2D uGlyphs;
  void main() {
    if (vTex < -0.5) {
      float r = length(vUv) * 2.0;
      float core = pow(max(1.0 - r, 0.0), 2.2);
      float halo = pow(max(1.0 - r * 0.72, 0.0), 3.5) * 0.4;
      gl_FragColor = vec4(vColor.rgb * (core + halo) * vColor.a, 1.0);
    } else {
      vec4 c = texture2D(uGlyphs, vec2((vTex + vUv.x + 0.5) / 16.0, 0.5 - vUv.y));
      gl_FragColor = c * vColor.a; // premultiplied — alpha pass fades whole
    }
  }
`;

const LINE_VS = `
  attribute vec3 aPos;
  uniform mat4 uVP;
  void main() {
    gl_Position = uVP * vec4(aPos, 1.0);
  }
`;

const LINE_FS = `
  precision mediump float;
  uniform vec4 uColor;
  void main() {
    gl_FragColor = uColor;
  }
`;

// ---------- small GL helpers ----------

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(`shader: ${gl.getShaderInfoLog(sh)}\n${src.slice(0, 400)}`);
  }
  return sh;
}

interface Prog {
  p: WebGLProgram;
  u: Record<string, WebGLUniformLocation | null>;
  a: Record<string, number>;
}

function program(
  gl: WebGLRenderingContext,
  vs: string,
  fs: string,
  attrs: string[],
  unis: string[]
): Prog {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`link: ${gl.getProgramInfoLog(p)}`);
  }
  const u: Record<string, WebGLUniformLocation | null> = {};
  for (const name of unis) u[name] = gl.getUniformLocation(p, name);
  const a: Record<string, number> = {};
  for (const name of attrs) a[name] = gl.getAttribLocation(p, name);
  return { p, u, a };
}

// ---------- sun & light through the day ----------

interface DayKey {
  p: number;
  elev: number; // degrees
  az: number; // degrees, 0 = north (+z)
  sun: [number, number, number];
  zenith: [number, number, number];
  horizon: [number, number, number];
  fog: number;
  clouds: number;
}

const DAY: DayKey[] = [
  { p: 0.0, elev: 11, az: 112, sun: [1.0, 0.87, 0.68], zenith: [0.30, 0.47, 0.75], horizon: [0.82, 0.86, 0.90], fog: 0.0017, clouds: 0.42 },
  { p: 0.45, elev: 40, az: 178, sun: [1.0, 0.96, 0.86], zenith: [0.26, 0.48, 0.83], horizon: [0.74, 0.83, 0.93], fog: 0.0014, clouds: 0.38 },
  { p: 0.75, elev: 15, az: 238, sun: [1.0, 0.74, 0.47], zenith: [0.24, 0.36, 0.62], horizon: [0.92, 0.70, 0.48], fog: 0.0017, clouds: 0.46 },
  { p: 1.0, elev: 2.5, az: 262, sun: [1.0, 0.52, 0.28], zenith: [0.10, 0.15, 0.32], horizon: [0.80, 0.44, 0.30], fog: 0.0021, clouds: 0.5 },
];

function lerp3(a: [number, number, number], b: [number, number, number], u: number): [number, number, number] {
  return [mix(a[0], b[0], u), mix(a[1], b[1], u), mix(a[2], b[2], u)];
}

function dayAt(p: number): DayKey {
  const q = clamp(p, 0, 1);
  let i = 0;
  while (i < DAY.length - 2 && DAY[i + 1].p < q) i++;
  const a = DAY[i];
  const b = DAY[i + 1];
  const u = clamp((q - a.p) / (b.p - a.p), 0, 1);
  return {
    p: q,
    elev: mix(a.elev, b.elev, u),
    az: mix(a.az, b.az, u),
    sun: lerp3(a.sun, b.sun, u),
    zenith: lerp3(a.zenith, b.zenith, u),
    horizon: lerp3(a.horizon, b.horizon, u),
    fog: mix(a.fog, b.fog, u),
    clouds: mix(a.clouds, b.clouds, u),
  };
}

// ---------- procedural textures (painted once at load) ----------

/** Tiling grayscale fbm — terrain detail + water ripples. Each octave samples
 * the noise grid with a period that wraps exactly at the texture edge. */
function noiseTexture(): HTMLCanvasElement {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(S, S);
  const pnoise = (x: number, z: number, period: number): number => {
    const xi = Math.floor(x);
    const zi = Math.floor(z);
    const xf = x - xi;
    const zf = z - zi;
    const ux = xf * xf * (3 - 2 * xf);
    const uz = zf * zf * (3 - 2 * zf);
    const i0 = ((xi % period) + period) % period;
    const i1 = (i0 + 1) % period;
    const j0 = ((zi % period) + period) % period;
    const j1 = (j0 + 1) % period;
    const N = NOISE_SIZE;
    const a = noiseGrid[j0 * N + i0];
    const b = noiseGrid[j0 * N + i1];
    const d = noiseGrid[j1 * N + i0];
    const e = noiseGrid[j1 * N + i1];
    return mix(mix(a, b, ux), mix(d, e, ux), uz);
  };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let v = 0;
      let amp = 0.52;
      let period = 8;
      for (let o = 0; o < 4; o++) {
        v += pnoise((x / S) * period, (y / S) * period, period) * amp;
        period *= 2;
        amp *= 0.5;
      }
      const g = clamp(v, 0, 1) * 255;
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = g;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Trees + the dead tree, painted with 2D strokes onto an atlas.
 * Columns: 0 conifer A · 1 conifer B · 2 broadleaf · 3 dead tree. */
function treeAtlas(rng: () => number): HTMLCanvasElement {
  const COL = 256;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = COL * 4;
  c.height = H;
  const ctx = c.getContext('2d')!;

  const conifer = (ox: number, hueShift: number) => {
    const cx = ox + COL / 2;
    const baseY = H - 8;
    const top = 30;
    // trunk
    const trunkGrad = ctx.createLinearGradient(cx - 6, 0, cx + 6, 0);
    trunkGrad.addColorStop(0, '#2c2017');
    trunkGrad.addColorStop(0.5, '#4a382a');
    trunkGrad.addColorStop(1, '#241a12');
    ctx.fillStyle = trunkGrad;
    ctx.fillRect(cx - 5, baseY - 120, 10, 120);
    // foliage: hundreds of small dark strokes along a cone, lighter on the lit side
    for (let i = 0; i < 900; i++) {
      const u = Math.pow(rng(), 0.8); // 0 top → 1 bottom
      const y = top + u * (baseY - 60 - top);
      const halfW = 8 + u * (COL * 0.42);
      const x = cx + (rng() * 2 - 1) * halfW;
      const litSide = (x - cx) / halfW; // -1..1
      const l = 0.16 + 0.30 * Math.max(0, litSide * 0.7 + rng() * 0.55) + hueShift;
      const g = 0.30 + l * 0.5;
      ctx.fillStyle = `rgba(${Math.round(30 + l * 60)},${Math.round(g * 150)},${Math.round(24 + l * 40)},${0.5 + rng() * 0.5})`;
      const s = 3 + rng() * 8;
      ctx.beginPath();
      ctx.ellipse(x, y, s, s * 0.5, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const broadleaf = (ox: number) => {
    const cx = ox + COL / 2;
    const baseY = H - 8;
    // trunk with two limbs
    ctx.strokeStyle = '#3d2d1e';
    ctx.lineCap = 'round';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(cx, baseY);
    ctx.lineTo(cx - 4, baseY - 170);
    ctx.stroke();
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(cx - 4, baseY - 150);
    ctx.lineTo(cx - 52, baseY - 230);
    ctx.moveTo(cx - 4, baseY - 170);
    ctx.lineTo(cx + 48, baseY - 250);
    ctx.stroke();
    // crown: overlapping leaf clusters — kept muted, sun-side barely lighter
    for (let i = 0; i < 700; i++) {
      const a = rng() * Math.PI * 2;
      const r = Math.pow(rng(), 0.5);
      const x = cx + Math.cos(a) * r * 95;
      const y = baseY - 265 + Math.sin(a) * r * 78;
      if (y > baseY - 130) continue;
      const lit = 0.2 + 0.5 * Math.max(0, Math.cos(a) * 0.6 + (1 - r) * 0.5 + rng() * 0.4);
      ctx.fillStyle = `rgba(${Math.round(28 + lit * 42)},${Math.round(58 + lit * 54)},${Math.round(22 + lit * 24)},${0.4 + rng() * 0.5})`;
      const s = 4 + rng() * 10;
      ctx.beginPath();
      ctx.ellipse(x, y, s, s * 0.75, rng() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const deadTree = (ox: number) => {
    const cx = ox + COL / 2;
    const baseY = H - 8;
    ctx.strokeStyle = '#4a4038';
    ctx.lineCap = 'round';
    const branch = (x: number, y: number, ang: number, len: number, w: number, depth: number) => {
      if (depth <= 0 || len < 8) return;
      const x2 = x + Math.cos(ang) * len;
      const y2 = y - Math.sin(ang) * len;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const n = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < n; i++) {
        branch(x2, y2, ang + (rng() - 0.5) * 1.5, len * (0.55 + rng() * 0.25), w * 0.62, depth - 1);
      }
    };
    branch(cx, baseY, Math.PI / 2, 150, 15, 5);
  };

  conifer(0, 0);
  conifer(COL, 0.12);
  broadleaf(COL * 2);
  deadTree(COL * 3);
  return c;
}

/** Flora atlas — column 0: meadow grass; column 1: wildflowers. */
function floraTexture(rng: () => number): HTMLCanvasElement {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = S * 2;
  c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.lineCap = 'round';
  const blades = (ox: number, n: number, withFlowers: boolean) => {
    const heads: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const x0 = ox + S * 0.5 + (rng() - 0.5) * S * 0.5;
      const lean = (rng() - 0.5) * 40;
      const h = S * (0.5 + rng() * 0.48);
      const lit = 0.4 + rng() * 0.6;
      const grad = ctx.createLinearGradient(0, S, 0, S - h);
      grad.addColorStop(0, `rgba(${Math.round(19 + lit * 10)},${Math.round(38 + lit * 15)},${11},0.95)`);
      grad.addColorStop(1, `rgba(${Math.round(42 + lit * 26)},${Math.round(64 + lit * 28)},${Math.round(20 + lit * 10)},0.9)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5 + rng() * 1.8;
      ctx.beginPath();
      ctx.moveTo(x0, S);
      ctx.quadraticCurveTo(x0 + lean * 0.3, S - h * 0.6, x0 + lean, S - h);
      ctx.stroke();
      if (withFlowers && rng() < 0.55) heads.push([x0 + lean, S - h]);
    }
    // flower heads sit on top of their stems
    const petals = ['rgba(238,232,220,0.95)', 'rgba(212,178,90,0.95)', 'rgba(186,152,196,0.95)', 'rgba(224,140,130,0.9)'];
    for (const [hx, hy] of heads) {
      ctx.fillStyle = petals[Math.floor(rng() * petals.length)];
      const r = 2.2 + rng() * 2.4;
      ctx.beginPath();
      ctx.arc(hx, hy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(120,96,40,0.9)';
      ctx.beginPath();
      ctx.arc(hx, hy, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  blades(0, 30, false);
  blades(S, 22, true);
  return c;
}

/** The lineage glyph medallions — the Atlas's pulling lights, planted in the
 * world. Ten cells: stoa, stupa, flame, arch, circle, pool, deck, hollow,
 * spring, (spare). Symbolic geometry only — decision 7. */
function glyphAtlas(colors: Map<string, string>): { canvas: HTMLCanvasElement; cells: Map<string, number> } {
  const CELL = 128;
  const kinds = ['stoa', 'stupa', 'flame', 'arch', 'circle', 'pool', 'deck', 'hollow', 'spring'];
  const c = document.createElement('canvas');
  c.width = CELL * 16; // power of two — WebGL1 mipmaps insist
  c.height = CELL;
  const ctx = c.getContext('2d')!;
  const cells = new Map<string, number>();
  kinds.forEach((kind, i) => {
    cells.set(kind, i);
    const cx = i * CELL + CELL / 2;
    const cy = CELL / 2;
    const color = colors.get(kind) ?? '#cdd3dd';
    const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, CELL * 0.48);
    glow.addColorStop(0, `${color}e6`);
    glow.addColorStop(0.55, `${color}55`);
    glow.addColorStop(1, `${color}00`);
    ctx.fillStyle = glow;
    ctx.fillRect(i * CELL, 0, CELL, CELL);
    ctx.strokeStyle = 'rgba(248,246,238,0.95)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    switch (kind) {
      case 'stoa': // the citadel
        ctx.strokeRect(cx - 26, cy - 26, 52, 52);
        ctx.strokeRect(cx - 12, cy - 12, 24, 24);
        break;
      case 'stupa': { // the wheel
        ctx.arc(cx, cy, 30, 0, Math.PI * 2);
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          ctx.moveTo(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7);
          ctx.lineTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30);
        }
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        break;
      }
      case 'flame': // the flame
        ctx.moveTo(cx, cy - 32);
        ctx.quadraticCurveTo(cx + 24, cy - 2, cx + 12, cy + 22);
        ctx.quadraticCurveTo(cx + 6, cy + 32, cx, cy + 32);
        ctx.quadraticCurveTo(cx - 6, cy + 32, cx - 12, cy + 22);
        ctx.quadraticCurveTo(cx - 24, cy - 2, cx, cy - 32);
        break;
      case 'arch': // the cross
        ctx.moveTo(cx, cy - 30);
        ctx.lineTo(cx, cy + 30);
        ctx.moveTo(cx - 20, cy - 10);
        ctx.lineTo(cx + 20, cy - 10);
        break;
      case 'circle': { // the spiral
        let r = 30;
        let a0 = -Math.PI / 2;
        ctx.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
        for (let k = 1; k <= 44; k++) {
          const a = a0 + (k / 44) * Math.PI * 4.4;
          const rr = 30 - (k / 44) * 24;
          ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        }
        void a0;
        break;
      }
      case 'pool': // the watercourse
        for (const oy of [-14, 0, 14]) {
          ctx.moveTo(cx - 26, cy + oy);
          ctx.quadraticCurveTo(cx - 13, cy + oy - 9, cx, cy + oy);
          ctx.quadraticCurveTo(cx + 13, cy + oy + 9, cx + 26, cy + oy);
        }
        break;
      case 'deck': { // the neuron
        ctx.arc(cx - 6, cy + 6, 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        for (const [ex, ey] of [
          [22, -22],
          [26, 4],
          [10, 26],
        ]) {
          ctx.moveTo(cx - 6 + 8, cy + 6 - 3);
          ctx.lineTo(cx + ex, cy + ey);
        }
        break;
      }
      case 'hollow': // the broken ring
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          ctx.moveTo(cx + Math.cos(a) * 28, cy + Math.sin(a) * 28);
          ctx.arc(cx, cy, 28, a, a + Math.PI / 5);
        }
        break;
      case 'spring': // the source — two rings
        ctx.arc(cx, cy, 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        break;
    }
    ctx.stroke();
  });
  return { canvas: c, cells };
}

// ---------- the engine ----------

interface WaterBody {
  cx: number;
  cz: number;
  half: number; // quad half-size
  y: number;
  edgeIn: number;
  edgeOut: number;
}

interface GlowSprite {
  // rebuilt into the dynamic buffer each frame
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  r: number;
  g: number;
  b: number;
  a: number;
  tex?: number; // glyph atlas cell; undefined = procedural glow
}

export class RetreatEngine {
  private canvas: HTMLCanvasElement;
  private labelCanvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private lctx: CanvasRenderingContext2D;
  private cb: RetreatCallbacks;
  spots: RetreatSpot[] = [];
  reducedMotion = false;

  // camera
  private pos = { x: 0, y: 9, z: -112 };
  private yaw = 0;
  private pitch = 0;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private dprCap = 1.6;
  private readonly fov = (62 * Math.PI) / 180;

  // walking
  private mode: Mode = 'free';
  private vel = { x: 0, z: 0 };
  private bobPhase = 0;
  private lastStepSign = 1;
  private seatedAt: RetreatSpot | null = null;
  private suppressCapture: string | null = null; // just-released spot, until clear

  // autopilot
  private wp: { x: number; z: number }[] = [];
  private apSpot: RetreatSpot | null = null;
  private apLook: { x: number; y: number; z: number } | null = null;
  // stall guard: a leg that stops shortening yields instead of shoving
  private stallD = Infinity;
  private stallAt = 0;

  // gaze guidance (position untouched; any input cancels)
  private gaze: { p: [number, number, number]; yaw0: number; pitch0: number; t0: number; dur: number } | null = null;

  // reveal
  private revealFrom = { x: 0, y: 0, z: 0 };
  private revealStart = 0;
  private revealDone = false;
  private revealPath: [number, number, number][] = [];
  private glowAlpha = 0;

  // day
  private dayPhase = 0.1;
  private dayTarget = 0.1;

  // input (same discipline as the Voyage: cumulative slop, pinch = never a tap)
  private drag: { x: number; y: number; sx: number; sy: number; slop: number; moved: boolean; id: number } | null = null;
  private pinch: { idA: number; idB: number } | null = null;
  private keys = new Set<string>();
  private lookHeld = { x: 0, y: 0 };
  private lastInput = 0;

  // GL objects
  private progs!: {
    terrain: Prog;
    sky: Prog;
    water: Prog;
    bill: Prog;
    mesh: Prog;
    sprite: Prog;
    line: Prog;
  };
  private buffers: Record<string, WebGLBuffer> = {};
  private textures: Record<string, WebGLTexture> = {};
  private terrainIndexCount = 0;
  private treeVertCount = 0;
  private grassVertCount = 0;
  private structVertCount = 0;
  private waters: WaterBody[] = [];
  private lineData = new Float32Array(0);
  private lineCount = 0;

  // scatter (for collision)
  private treeGrid = new Map<string, { x: number; z: number }[]>();
  private paths: { x: number; z: number }[][] = [];
  // per-spot trail, spring end first — the walker's route network
  private spotPaths = new Map<string, { x: number; z: number }[]>();
  private moatC: [number, number] | null = null;
  private glyphCell = new Map<string, number>();
  private fallTop: [number, number, number] = [0, 0, 0];
  private fallBase: [number, number, number] = [0, 0, 0];
  private seatGlide: { x: number; z: number } | null = null;

  // particles
  private motes: { x: number; y: number; z: number; ph: number }[] = [];
  private flies: { bx: number; by: number; bz: number; ph: number; r: number; g: number; b: number }[] = [];

  private raf = 0;
  private last = 0;
  private t0 = 0;
  private disposed = false;
  private frameEma = 16;
  private quality = 1;
  private lakeCbAt = 0;
  private rng: () => number = mulberry32(1);

  constructor(canvas: HTMLCanvasElement, labelCanvas: HTMLCanvasElement, cb: RetreatCallbacks) {
    this.canvas = canvas;
    this.labelCanvas = labelCanvas;
    this.cb = cb;
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl;
    this.lctx = labelCanvas.getContext('2d')!;
  }

  // expose for tests — same spirit as __voyageEngine
  get frameEmaValue(): number {
    return this.frameEma;
  }
  get qualityValue(): number {
    return this.quality;
  }
  get modeValue(): string {
    return this.mode;
  }

  // ---------- terrain ----------

  private flatteners: { x: number; z: number; target: number; inner: number; outer: number }[] = [];

  private rawHeight(x: number, z: number): number {
    let h = (fbm(x * 0.006, z * 0.006, 4) - 0.48) * 34;
    const d0 = Math.hypot(x - PLAY_C[0], z - PLAY_C[1]);
    h *= 0.22 + 0.78 * smoothstep(50, 240, d0);
    h += (fbm(x * 0.045, z * 0.045, 3) - 0.5) * 2.2 * (0.3 + 0.7 * smoothstep(40, 140, d0));
    const rim = smoothstep(300, 780, d0);
    h += rim * (50 + fbm(x * 0.0028 + 13.7, z * 0.0028 + 9.1, 4) * 300);
    const dl = Math.hypot(x - LAKE_C[0], z - LAKE_C[1]);
    h = mix(h, -6.0, 1 - smoothstep(48, 96, dl));
    const dm = Math.hypot(x - SPRING_C[0], z - SPRING_C[1]);
    h = mix(h, 3.0, (1 - smoothstep(16, 52, dm)) * 0.92);
    const dt = Math.hypot(x, z + 58);
    h = mix(h, 6.0, (1 - smoothstep(12, 42, dt)) * 0.9);
    // the waterfall's headland — a rocky shoulder shoved into the lake's
    // west edge, steep on the water side
    const dmound = Math.hypot(x - FALL_MOUND[0], z - FALL_MOUND[1]);
    h += (1 - smoothstep(4, 20, dmound)) * 9.5;
    return h;
  }

  /** Final terrain height — spot pads flattened in. The single source of
   * truth for both the mesh and the walker's feet. */
  heightAt(x: number, z: number): number {
    let h = this.rawHeight(x, z);
    for (const f of this.flatteners) {
      const d = Math.hypot(x - f.x, z - f.z);
      if (d < f.outer) h = mix(f.target, h, smoothstep(f.inner, f.outer, d));
    }
    // the fortress keeps a dry moat — the trail's causeway is the only bridge
    if (this.moatC) {
      const d = Math.hypot(x - this.moatC[0], z - this.moatC[1]);
      if (d > 5.4 && d < 11.6) {
        h -= smoothstep(5.8, 7.2, d) * (1 - smoothstep(8.8, 10.6, d)) * 1.5;
      }
    }
    // trails stay dry: where a trail crosses a wet dip, the tread rises out
    // of it as a causeway — the fbm is free to bog the meadow, but never the
    // one line the walker must cross (found the hard way: a marsh at z≈-20
    // froze the very first walk of the session)
    if (h < 1.2 && this.paths.length) {
      const pd = this.pathDist(x, z);
      if (pd < 7) h = mix(1.2, h, smoothstep(2.6, 7, pd));
    }
    return h;
  }

  private groundY(x: number, z: number): number {
    // the dock is walkable water
    if (Math.abs(x - DOCK.x) < DOCK.w && z > DOCK.z0 - 1 && z < DOCK.z1 + 0.5) {
      return DOCK.h;
    }
    return this.heightAt(x, z);
  }

  private walkable(x: number, z: number): boolean {
    if (Math.abs(x - DOCK.x) < DOCK.w && z > DOCK.z0 - 1 && z < DOCK.z1 + 0.5) return true;
    if (this.heightAt(x, z) < 0.35) return false; // the lake is not a floor
    if (Math.hypot(x - PLAY_C[0], z - PLAY_C[1]) > WORLD_R) return false;
    // tree trunks push back (check the 3×3 neighborhood — trunks near a cell
    // boundary must not become ghosts)
    const ci = Math.floor(x / 16);
    const cj = Math.floor(z / 16);
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        const cell = this.treeGrid.get(`${ci + di},${cj + dj}`);
        if (!cell) continue;
        for (const t of cell) {
          if (Math.hypot(x - t.x, z - t.z) < 0.85) return false;
        }
      }
    }
    return true;
  }

  // ---------- layout ----------

  /** Place the session's spots into the valley, deterministically per seed. */
  private layout(seed: number): void {
    const rng = mulberry32(seed);
    this.rng = rng;
    const trailhead = this.spots.find((s) => s.kind === 'trailhead');
    const spring = this.spots.find((s) => s.kind === 'spring');
    const jetty = this.spots.find((s) => s.kind === 'jetty');
    const sites = this.spots.filter(
      (s) => s.kind !== 'trailhead' && s.kind !== 'spring' && s.kind !== 'jetty'
    );

    // site angles fan around the spring — the corridors north (jetty) and
    // south (trailhead) stay open
    const anglePool = [-135, -85, -42, 42, 85, 135];
    // deterministic pick of N slots, spread as evenly as the pool allows
    const step = anglePool.length / sites.length;
    sites.forEach((s, i) => {
      const a = ((anglePool[Math.floor(i * step)] + (rng() - 0.5) * 14) * Math.PI) / 180;
      const r = 44 + rng() * 14;
      const x = SPRING_C[0] + Math.sin(a) * r;
      const z = SPRING_C[1] + Math.cos(a) * r;
      const target = clamp(this.rawHeight(x, z), 1.3, 6.5);
      this.flatteners.push({ x, z, target, inner: 5.5, outer: 15 });
      s.pos = [x, target, z];
    });

    if (trailhead) {
      this.flatteners.push({ x: 0, z: -58, target: 6.0, inner: 6, outer: 16 });
      trailhead.pos = [0, 6.0, -58];
    }
    if (spring) {
      this.flatteners.push({ x: SPRING_C[0], z: SPRING_C[1], target: 3.0, inner: 9, outer: 24 });
      spring.pos = [SPRING_C[0], 3.0, SPRING_C[1]];
    }
    // a small headland lifts the dock's root out of the water
    this.flatteners.push({ x: DOCK.x, z: DOCK.z0 - 3, target: 1.4, inner: 5, outer: 14 });
    if (jetty) jetty.pos = [DOCK.x, DOCK.h, DOCK.z1 - 2];

    // paths: trailhead → spring, spring → each site, spring → dock root.
    // Sampled quadratic bows — one polyline is the single source of truth for
    // the baked tread, the tree exclusion, AND the autopilot's feet, so a
    // walk along a trail can never meet a trunk. All trails radiate from the
    // spring: every journey passes through the mechanism, as on the maps.
    const bow = (a: [number, number], b: [number, number], amt: number): { x: number; z: number }[] => {
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const l = Math.hypot(dx, dz) || 1;
      const o = (rng() - 0.5) * 2 * amt;
      const cx = (a[0] + b[0]) / 2 + (-dz / l) * o;
      const cz = (a[1] + b[1]) / 2 + (dx / l) * o;
      const pts: { x: number; z: number }[] = [];
      const n = 6;
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const w0 = (1 - u) * (1 - u);
        const w1 = 2 * (1 - u) * u;
        const w2 = u * u;
        pts.push({ x: w0 * a[0] + w1 * cx + w2 * b[0], z: w0 * a[1] + w1 * cz + w2 * b[1] });
      }
      return pts;
    };
    const addTrail = (spotId: string, to: [number, number], amt: number) => {
      const pts = bow(SPRING_C, to, amt);
      this.paths.push(pts);
      this.spotPaths.set(spotId, pts);
    };
    if (trailhead) addTrail('trailhead', [0, -58], 8);
    for (const s of sites) addTrail(s.id, [s.pos![0], s.pos![2]], 6);
    if (jetty) addTrail(jetty.id, [DOCK.x, DOCK.z0 - 2], 5);

    // lantern anchors: on the structure, ~1.9 m up
    for (const s of this.spots) {
      const p = s.pos!;
      const lanternY =
        s.kind === 'trailhead' ? 2.9 : s.kind === 'jetty' ? 1.6 : s.kind === 'spring' ? 1.3 : 1.9;
      s.lantern = [p[0], p[1] + lanternY, p[2]];
    }

    // seats: where the walker settles on capture, and what they settle
    // facing — each site receives you differently (AA: "a subtly different
    // experience" per stop). The glide there happens while seated.
    for (const s of this.spots) {
      const p = s.pos!;
      const dxs = SPRING_C[0] - p[0];
      const dzs = SPRING_C[1] - p[2];
      const l = Math.hypot(dxs, dzs) || 1;
      const tx = dxs / l; // unit vector toward the spring (the approach side)
      const tz = dzs / l;
      switch (s.kind) {
        case 'trailhead': // under the arch, looking through it at the valley
          s.seat = [p[0], p[2] - 2.4];
          s.seatLook = [p[0], p[1] + 2.2, p[2] + 6];
          break;
        case 'spring': // at the basin's south lip, looking over the water
          s.seat = [p[0], p[2] - 2.6];
          s.seatLook = [p[0], p[1] + 0.5, p[2]];
          break;
        case 'stoa': // inside the fortress walls, before the inscribed stele
          s.seat = [p[0] + tx * 2.6, p[2] + tz * 2.6];
          s.seatLook = [p[0], p[1] + 1.7, p[2]];
          break;
        case 'stupa': // under the bodhi tree, the stones before you
          s.seat = [p[0] + 2.2, p[2] + 1.7];
          s.seatLook = [p[0], p[1] + 1.1, p[2]];
          break;
        case 'arch': // inside the chapel ruin, facing altar and window light
          s.seat = [p[0] + tx * 2.7, p[2] + tz * 2.7];
          s.seatLook = [p[0] - tx * 1.6, p[1] + 1.8, p[2] - tz * 1.6];
          break;
        case 'circle': // at the very center of the spiral
          s.seat = [p[0], p[2]];
          s.seatLook = [p[0] + tx * 8, p[1] + 1.2, p[2] + tz * 8];
          break;
        case 'pool': // at the rim, looking down into the mirror
          s.seat = [p[0] + tx * 2.6, p[2] + tz * 2.6];
          s.seatLook = [p[0], p[1] + 0.3, p[2]];
          break;
        case 'flame':
          s.seat = [p[0] + tx * 2.3, p[2] + tz * 2.3];
          s.seatLook = [p[0], p[1] + 1.5, p[2]];
          break;
        case 'deck':
          s.seat = [p[0] + tx * 2.5, p[2] + tz * 2.5];
          s.seatLook = [p[0], p[1] + 1.6, p[2]];
          break;
        case 'hollow': // before the cracked basin
          s.seat = [p[0] + tx * 2.5, p[2] + tz * 2.5];
          s.seatLook = [p[0], p[1] + 0.7, p[2]];
          break;
        case 'jetty':
          break; // arrival needs no seat
      }
      if (s.kind === 'stoa') this.moatC = [p[0], p[2]];
    }
  }

  private pathDist(x: number, z: number): number {
    let best = Infinity;
    for (const path of this.paths) {
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i];
        const b = path[i + 1];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const l2 = dx * dx + dz * dz || 1;
        const u = clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1);
        const d = Math.hypot(x - (a.x + dx * u), z - (a.z + dz * u));
        if (d < best) best = d;
      }
    }
    return best;
  }

  // ---------- scene build ----------

  private buildTerrain(): void {
    const gl = this.gl;
    const SECTORS = 192;
    const RINGS = 96;
    const verts = new Float32Array(SECTORS * RINGS * 6);
    const radii: number[] = [];
    for (let i = 0; i < RINGS; i++) {
      radii.push(i <= 76 ? 500 * Math.pow(i / 76, 1.85) : 500 * Math.pow(3.4, (i - 76) / 19));
    }
    let vi = 0;
    for (let i = 0; i < RINGS; i++) {
      for (let j = 0; j < SECTORS; j++) {
        const a = (j / SECTORS) * Math.PI * 2;
        const x = PLAY_C[0] + Math.cos(a) * radii[i];
        const z = PLAY_C[1] + Math.sin(a) * radii[i];
        const y = this.heightAt(x, z);
        const e = Math.max(1.2, radii[i] * 0.02);
        const hx = this.heightAt(x + e, z) - this.heightAt(x - e, z);
        const hz = this.heightAt(x, z + e) - this.heightAt(x, z - e);
        const nl = Math.hypot(hx, 2 * e, hz);
        verts[vi++] = x;
        verts[vi++] = y;
        verts[vi++] = z;
        verts[vi++] = -hx / nl;
        verts[vi++] = (2 * e) / nl;
        verts[vi++] = -hz / nl;
      }
    }
    const idx = new Uint16Array((RINGS - 1) * SECTORS * 6);
    let ii = 0;
    for (let i = 0; i < RINGS - 1; i++) {
      for (let j = 0; j < SECTORS; j++) {
        const j1 = (j + 1) % SECTORS;
        const a = i * SECTORS + j;
        const b = i * SECTORS + j1;
        const c = (i + 1) * SECTORS + j;
        const d = (i + 1) * SECTORS + j1;
        idx[ii++] = a;
        idx[ii++] = c;
        idx[ii++] = b;
        idx[ii++] = b;
        idx[ii++] = c;
        idx[ii++] = d;
      }
    }
    this.terrainIndexCount = idx.length;
    this.buffers.terrain = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.terrain);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    this.buffers.terrainIdx = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.terrainIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  }

  /** Worn paths and gravel pads, drawn soft into a world-space mask. */
  private bakeGroundMask(): void {
    const S = 1024;
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, S, S);
    const toPx = (x: number, z: number): [number, number] => [
      ((x + 220) / 440) * S,
      ((z + 220) / 440) * S,
    ];
    // paths in red — a wide faint tread and a narrow worn line
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [wWide, alpha] of [
      [4.6, 0.45],
      [2.2, 0.85],
    ] as const) {
      ctx.strokeStyle = `rgba(255,0,0,${alpha})`;
      ctx.lineWidth = (wWide / 440) * S;
      for (const path of this.paths) {
        ctx.beginPath();
        const [x0, y0] = toPx(path[0].x, path[0].z);
        ctx.moveTo(x0, y0);
        for (let i = 1; i < path.length; i++) {
          const [x, y] = toPx(path[i].x, path[i].z);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    // pads in green
    for (const s of this.spots) {
      if (!s.pos || s.kind === 'jetty') continue;
      const [px, py] = toPx(s.pos[0], s.pos[2]);
      const r = ((s.kind === 'spring' ? 8 : 5.5) / 440) * S;
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, 'rgba(0,255,0,0.9)');
      g.addColorStop(0.7, 'rgba(0,255,0,0.7)');
      g.addColorStop(1, 'rgba(0,255,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    this.textures.ground = this.uploadTexture(c, { clamp: true });
  }

  private uploadTexture(
    src: HTMLCanvasElement,
    opts: { clamp?: boolean; premultiply?: boolean } = {}
  ): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, opts.premultiply ? 1 : 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const wrap = opts.clamp ? gl.CLAMP_TO_EDGE : gl.REPEAT;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
    return tex;
  }

  private scatter(): void {
    const gl = this.gl;
    const rng = mulberry32(917331);
    // ----- trees -----
    const trees: number[] = [];
    let treeCount = 0;
    const hollow = this.spots.find((s) => s.kind === 'hollow');
    const pushTree = (x: number, z: number, col: number, hgt: number, w: number) => {
      const y = this.heightAt(x, z);
      const tint = rng();
      // two triangles, corners (x: -0.5..0.5, y: 0..1)
      const corners = [
        [-0.5, 0],
        [0.5, 0],
        [0.5, 1],
        [-0.5, 0],
        [0.5, 1],
        [-0.5, 1],
      ];
      for (const [cx2, cy2] of corners) {
        trees.push(x, y - 0.3, z, cx2, cy2, w, hgt, col, tint);
      }
      treeCount++;
      const key = `${Math.floor(x / 16)},${Math.floor(z / 16)}`;
      if (!this.treeGrid.has(key)) this.treeGrid.set(key, []);
      this.treeGrid.get(key)!.push({ x, z });
    };
    for (let i = 0; i < 2600 && treeCount < 760; i++) {
      const a = rng() * Math.PI * 2;
      const r = 30 + Math.pow(rng(), 0.6) * 400;
      const x = PLAY_C[0] + Math.cos(a) * r;
      const z = PLAY_C[1] + Math.sin(a) * r;
      const h = this.heightAt(x, z);
      if (h < 1.0 || h > 90) continue;
      const e = 2;
      const slope =
        Math.hypot(
          this.heightAt(x + e, z) - this.heightAt(x - e, z),
          this.heightAt(x, z + e) - this.heightAt(x, z - e)
        ) /
        (2 * e);
      if (slope > 0.55) continue;
      if (this.pathDist(x, z) < 6.5) continue;
      let nearSpot = false;
      for (const s of this.spots) {
        if (s.pos && Math.hypot(x - s.pos[0], z - s.pos[2]) < 14) nearSpot = true;
      }
      if (nearSpot) continue;
      const dm = Math.hypot(x - SPRING_C[0], z - SPRING_C[1]);
      if (dm < 30) continue;
      if (dm < 55 && rng() < 0.72) continue; // the meadow stays open
      const conifer = h > 14 || rng() < 0.55;
      if (conifer) {
        const hgt = 8 + rng() * 7;
        pushTree(x, z, rng() < 0.5 ? 0 : 1, hgt, hgt * 0.52);
      } else {
        const hgt = 6 + rng() * 4;
        pushTree(x, z, 2, hgt, hgt * 0.92);
      }
    }
    // the dead tree stands over the dry hollow — just outside the capture
    // ring, so it never pins the walk in
    if (hollow?.pos) {
      pushTree(hollow.pos[0] + 3.4, hollow.pos[2] + 2.6, 3, 7.5, 5.6);
    }
    // the bodhi tree shades the stupa — the seat waits under it
    const stupa = this.spots.find((s) => s.kind === 'stupa');
    if (stupa?.pos) {
      pushTree(stupa.pos[0] + 3.1, stupa.pos[2] + 2.4, 2, 9.5, 8.6);
    }
    this.treeVertCount = treeCount * 6;
    this.buffers.trees = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.trees);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(trees), gl.STATIC_DRAW);

    // ----- grass — an even meadow, thick wherever the walker can stand -----
    const grass: number[] = [];
    let grassCount = 0;
    for (let i = 0; i < 9000 && grassCount < 2800; i++) {
      const a = rng() * Math.PI * 2;
      const r = Math.pow(rng(), 0.85) * 150;
      const x = PLAY_C[0] + Math.cos(a) * r;
      const z = PLAY_C[1] + Math.sin(a) * r;
      const h = this.heightAt(x, z);
      if (h < 0.6 || h > 24) continue;
      if (this.pathDist(x, z) < 2.0) continue;
      const y = h - 0.05;
      const s = 0.38 + rng() * 0.5;
      const corners = [
        [-0.5, 0],
        [0.5, 0],
        [0.5, 1],
        [-0.5, 0],
        [0.5, 1],
        [-0.5, 1],
      ];
      for (const [cx2, cy2] of corners) {
        grass.push(x, y, z, cx2, cy2, s * 1.5, s, 0, rng());
      }
      grassCount++;
    }
    // wildflowers: drifts in the meadow, and a ring around the spiral
    const pushFlower = (x: number, z: number) => {
      const h = this.heightAt(x, z);
      if (h < 0.6 || this.pathDist(x, z) < 1.8) return;
      const s = 0.34 + rng() * 0.3;
      const corners = [
        [-0.5, 0],
        [0.5, 0],
        [0.5, 1],
        [-0.5, 0],
        [0.5, 1],
        [-0.5, 1],
      ];
      for (const [cx2, cy2] of corners) {
        grass.push(x, h - 0.05, z, cx2, cy2, s * 1.5, s, 1, rng());
      }
      grassCount++;
    };
    for (let patch = 0; patch < 10; patch++) {
      const a = rng() * Math.PI * 2;
      const r = 18 + rng() * 90;
      const px = SPRING_C[0] + Math.cos(a) * r;
      const pz = SPRING_C[1] + Math.sin(a) * r;
      for (let i = 0; i < 42; i++) {
        pushFlower(px + (rng() - 0.5) * 14, pz + (rng() - 0.5) * 14);
      }
    }
    const circleSite = this.spots.find((s) => s.kind === 'circle');
    if (circleSite?.pos) {
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        const r = 3.4 + rng() * 0.8;
        pushFlower(circleSite.pos[0] + Math.cos(a) * r, circleSite.pos[2] + Math.sin(a) * r);
      }
    }
    this.grassVertCount = grassCount * 6;
    this.buffers.grass = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.grass);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(grass), gl.STATIC_DRAW);

    // ----- pollen motes + fireflies -----
    for (let i = 0; i < 64; i++) {
      this.motes.push({
        x: SPRING_C[0] + (rng() - 0.5) * 130,
        y: 0,
        z: SPRING_C[1] + (rng() - 0.5) * 130,
        ph: rng() * Math.PI * 2,
      });
    }
  }

  // ----- structures: boxes and drums, weathered by vertex color -----

  private structVerts: number[] = [];

  private pushBox(
    cx: number,
    cy: number,
    cz: number,
    sx: number,
    sy: number,
    sz: number,
    rotY: number,
    r: number,
    g: number,
    b: number
  ): void {
    const cr = Math.cos(rotY);
    const sr = Math.sin(rotY);
    const rot = (x: number, z: number): [number, number] => [x * cr - z * sr, x * sr + z * cr];
    // 6 faces, each 2 tris; normals rotated with the box
    const faces: { n: [number, number, number]; q: [number, number, number][] }[] = [
      { n: [0, 1, 0], q: [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]] },
      { n: [0, -1, 0], q: [[-1, -1, 1], [1, -1, 1], [1, -1, -1], [-1, -1, -1]] },
      { n: [1, 0, 0], q: [[1, -1, -1], [1, -1, 1], [1, 1, 1], [1, 1, -1]] },
      { n: [-1, 0, 0], q: [[-1, -1, 1], [-1, -1, -1], [-1, 1, -1], [-1, 1, 1]] },
      { n: [0, 0, 1], q: [[1, -1, 1], [-1, -1, 1], [-1, 1, 1], [1, 1, 1]] },
      { n: [0, 0, -1], q: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1]] },
    ];
    for (const f of faces) {
      const [nx, nz] = rot(f.n[0], f.n[2]);
      const pts = f.q.map(([qx, qy, qz]) => {
        const [px, pz] = rot((qx * sx) / 2, (qz * sz) / 2);
        return [cx + px, cy + (qy * sy) / 2, cz + pz];
      });
      const tone = 0.93 + this.rng() * 0.14;
      for (const tri of [
        [0, 1, 2],
        [0, 2, 3],
      ]) {
        for (const k of tri) {
          this.structVerts.push(
            pts[k][0], pts[k][1], pts[k][2], nx, f.n[1], nz, r * tone, g * tone, b * tone
          );
        }
      }
    }
  }

  private pushDrum(
    cx: number,
    cy: number,
    cz: number,
    r0: number,
    r1: number,
    hgt: number,
    r: number,
    g: number,
    b: number,
    segs = 10
  ): void {
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      const tone = 0.9 + this.rng() * 0.2;
      const push = (
        x: number,
        y: number,
        z: number,
        nx: number,
        ny: number,
        nz: number
      ) => this.structVerts.push(x, y, z, nx, ny, nz, r * tone, g * tone, b * tone);
      const p00 = [cx + Math.cos(a0) * r0, cy, cz + Math.sin(a0) * r0];
      const p10 = [cx + Math.cos(a1) * r0, cy, cz + Math.sin(a1) * r0];
      const p01 = [cx + Math.cos(a0) * r1, cy + hgt, cz + Math.sin(a0) * r1];
      const p11 = [cx + Math.cos(a1) * r1, cy + hgt, cz + Math.sin(a1) * r1];
      const nA = [Math.cos((a0 + a1) / 2), 0.15, Math.sin((a0 + a1) / 2)];
      push(p00[0], p00[1], p00[2], nA[0], nA[1], nA[2]);
      push(p10[0], p10[1], p10[2], nA[0], nA[1], nA[2]);
      push(p11[0], p11[1], p11[2], nA[0], nA[1], nA[2]);
      push(p00[0], p00[1], p00[2], nA[0], nA[1], nA[2]);
      push(p11[0], p11[1], p11[2], nA[0], nA[1], nA[2]);
      push(p01[0], p01[1], p01[2], nA[0], nA[1], nA[2]);
      // cap
      push(cx, cy + hgt, cz, 0, 1, 0);
      push(p11[0], p11[1], p11[2], 0, 1, 0);
      push(p01[0], p01[1], p01[2], 0, 1, 0);
    }
  }

  private stoneRing(cx: number, cz: number, y: number, radius: number, n: number, size: number): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + this.rng() * 0.3;
      const x = cx + Math.cos(a) * radius;
      const z = cz + Math.sin(a) * radius;
      const s = size * (0.75 + this.rng() * 0.5);
      const g = 0.4 + this.rng() * 0.12;
      this.pushBox(x, y + s * 0.28, z, s, s * 0.7, s * 0.8, this.rng() * Math.PI, g, g, g * 0.97);
    }
  }

  private waymark(x: number, z: number, y: number): void {
    // a small stone post with a lantern housing — every site's fixed star
    this.pushBox(x, y + 0.8, z, 0.22, 1.6, 0.22, 0.2, 0.52, 0.51, 0.49);
    this.pushBox(x, y + 1.78, z, 0.34, 0.34, 0.34, 0.6, 0.45, 0.37, 0.27);
  }

  private buildStructures(): void {
    for (const s of this.spots) {
      if (!s.pos) continue;
      const [x, y, z] = s.pos;
      // local frame: lf toward the spring (the approach), lr to its right
      const dxs = SPRING_C[0] - x;
      const dzs = SPRING_C[1] - z;
      const ll = Math.hypot(dxs, dzs) || 1;
      const tx = dxs / ll;
      const tz = dzs / ll;
      const ang = Math.atan2(tx, tz);
      const loc = (lr: number, lf: number): [number, number] => [
        x + tz * lr + tx * lf,
        z - tx * lr + tz * lf,
      ];
      switch (s.kind) {
        case 'trailhead': {
          const wood = [0.34, 0.25, 0.16] as const;
          this.pushBox(x - 1.7, y + 1.7, z, 0.3, 3.4, 0.3, 0.04, ...wood);
          this.pushBox(x + 1.7, y + 1.7, z, 0.3, 3.4, 0.3, -0.03, ...wood);
          this.pushBox(x, y + 3.35, z, 4.6, 0.28, 0.44, 0, ...wood);
          this.pushBox(x, y + 3.8, z, 3.6, 0.22, 0.36, 0, ...wood);
          // a low sign board
          this.pushBox(x - 2.6, y + 0.55, z + 0.4, 0.1, 1.1, 0.1, 0.1, ...wood);
          this.pushBox(x - 2.6, y + 1.2, z + 0.4, 1.1, 0.5, 0.07, 0.1, 0.4, 0.31, 0.2);
          break;
        }
        case 'spring': {
          this.stoneRing(x, z, y, 2.7, 9, 0.85);
          this.pushDrum(x, y, z, 1.5, 1.35, 0.4, 0.36, 0.36, 0.37, 12);
          this.waters.push({ cx: x, cz: z, half: 1.35, y: y + 0.34, edgeIn: 1.1, edgeOut: 1.32 });
          break;
        }
        case 'stoa': {
          // the inner citadel, ruined: broken walls around the inscribed
          // stele, a gate gap toward the spring, the dry moat carved outside
          const stone = [0.55, 0.54, 0.52] as const;
          const wallRuns: [number, number, number, number, number][] = [
            // [lr, lf, length, alongF (1) or alongR (0), height]
            [-4.5, -1.8, 3.0, 1, 1.9],
            [-4.5, 1.6, 2.4, 1, 1.2],
            [4.5, -1.4, 3.4, 1, 1.6],
            [4.5, 2.0, 1.8, 1, 1.0],
            [-2.9, -3.5, 2.8, 0, 1.8],
            [0.6, -3.5, 2.6, 0, 1.1],
            [3.3, -3.5, 1.8, 0, 1.5],
            [-3.2, 3.5, 2.2, 0, 1.4], // gate side — a gap stays open mid-wall
            [3.1, 3.5, 2.3, 0, 1.7],
          ];
          for (const [lr, lf, len, alongF, hgt] of wallRuns) {
            const [wx, wz] = loc(lr, lf);
            this.pushBox(
              wx,
              y + hgt / 2,
              wz,
              alongF ? 0.55 : len,
              hgt,
              alongF ? len : 0.55,
              ang,
              ...stone
            );
          }
          // the stele — the passage is carved on this stone
          this.pushBox(x, y + 1.55, z, 0.95, 3.1, 0.5, ang + 0.04, 0.52, 0.52, 0.53);
          const [bx, bz] = loc(-1.9, 1.4);
          this.pushBox(bx, y + 0.45, bz, 1.7, 0.16, 0.55, ang, 0.52, 0.51, 0.5);
          this.pushBox(bx - 0.6, y + 0.2, bz, 0.3, 0.4, 0.4, ang, 0.45, 0.45, 0.45);
          this.pushBox(bx + 0.6, y + 0.2, bz, 0.3, 0.4, 0.4, ang, 0.45, 0.45, 0.45);
          const [wmx, wmz] = loc(1.6, 4.8);
          this.waymark(wmx, wmz, this.heightAt(wmx, wmz));
          break;
        }
        case 'stupa': {
          this.pushDrum(x, y, z, 1.5, 1.28, 0.5, 0.58, 0.53, 0.45);
          this.pushDrum(x, y + 0.5, z, 1.12, 0.92, 0.45, 0.62, 0.57, 0.48);
          this.pushDrum(x, y + 0.95, z, 0.72, 0.55, 0.4, 0.58, 0.53, 0.45);
          this.pushDrum(x, y + 1.35, z, 0.34, 0.1, 0.55, 0.62, 0.57, 0.48, 8);
          // a prayer-flag line sways between two poles (cloth, not figures)
          const [p1x, p1z] = loc(-2.7, 1.1);
          const [p2x, p2z] = loc(2.7, 1.1);
          this.pushBox(p1x, y + 1.15, p1z, 0.12, 2.3, 0.12, ang, 0.36, 0.28, 0.2);
          this.pushBox(p2x, y + 1.15, p2z, 0.12, 2.3, 0.12, ang, 0.36, 0.28, 0.2);
          const cloth: [number, number, number][] = [
            [0.62, 0.32, 0.28],
            [0.72, 0.62, 0.34],
            [0.38, 0.55, 0.5],
            [0.75, 0.73, 0.68],
            [0.5, 0.42, 0.56],
          ];
          for (let i = 0; i < 7; i++) {
            const u = (i + 0.5) / 7;
            const fx = mix(p1x, p2x, u);
            const fz = mix(p1z, p2z, u);
            const sag = Math.sin(u * Math.PI) * 0.22;
            const col = cloth[i % cloth.length];
            this.pushBox(
              fx,
              y + 2.16 - sag,
              fz,
              0.3,
              0.24,
              0.03,
              ang + (this.rng() - 0.5) * 0.5,
              ...col
            );
          }
          this.waymark(x + 1.9, z - 1.4, y);
          break;
        }
        case 'flame': {
          this.pushBox(x, y + 0.5, z, 1.1, 1.0, 1.1, 0.1, 0.5, 0.42, 0.34);
          this.pushBox(x, y + 1.12, z, 0.7, 0.24, 0.7, 0.1, 0.56, 0.47, 0.38);
          this.pushBox(x, y + 1.3, z, 0.4, 0.18, 0.4, 0.35, 0.32, 0.28, 0.24);
          this.stoneRing(x, z, y, 2.2, 6, 0.5);
          break;
        }
        case 'arch': {
          // a roofless chapel: the arch is its door, light falls through the
          // window gap in the rear wall onto a low altar
          const pale = [0.62, 0.6, 0.57] as const;
          const [j1x, j1z] = loc(-1.0, 2.5);
          const [j2x, j2z] = loc(1.0, 2.5);
          const [lnx, lnz] = loc(0, 2.5);
          this.pushBox(j1x, y + 1.8, j1z, 0.55, 3.6, 0.7, ang, ...pale);
          this.pushBox(j2x, y + 1.8, j2z, 0.55, 3.6, 0.7, ang, ...pale);
          this.pushBox(lnx, y + 3.75, lnz, 2.9, 0.5, 0.75, ang, 0.65, 0.63, 0.6);
          // side walls, broken to different heights
          for (const [lr, lf, len, hgt] of [
            [-2.2, 0.9, 2.6, 2.3],
            [-2.2, -1.6, 1.7, 1.5],
            [2.2, 0.6, 2.0, 1.8],
            [2.2, -1.7, 1.6, 2.4],
          ] as const) {
            const [wx, wz] = loc(lr, lf);
            this.pushBox(wx, y + hgt / 2, wz, 0.45, hgt, len, ang, ...pale);
          }
          // rear wall with the window gap, lintel above it
          for (const lr of [-1.5, 1.5] as const) {
            const [wx, wz] = loc(lr, -2.5);
            this.pushBox(wx, y + 1.3, wz, 1.5, 2.6, 0.45, ang, ...pale);
          }
          const [wlx, wlz] = loc(0, -2.5);
          this.pushBox(wlx, y + 2.7, wlz, 4.4, 0.4, 0.45, ang, 0.65, 0.63, 0.6);
          // the altar the light lands on
          const [alx, alz] = loc(0, -1.5);
          this.pushBox(alx, y + 0.35, alz, 1.25, 0.7, 0.6, ang, 0.58, 0.56, 0.53);
          const [wmx, wmz] = loc(3.0, 3.0);
          this.waymark(wmx, wmz, this.heightAt(wmx, wmz));
          break;
        }
        case 'circle': {
          // a broken ring of low wall, a spiral of pebbles turning inward
          for (let i = 0; i < 9; i++) {
            const a = (i / 12) * Math.PI * 2 + 0.6;
            this.pushBox(
              x + Math.cos(a) * 2.9,
              y + 0.28,
              z + Math.sin(a) * 2.9,
              0.9,
              0.55,
              0.4,
              -a,
              0.55,
              0.52,
              0.48
            );
          }
          for (let i = 0; i < 14; i++) {
            const a = i * 0.75;
            const r = 2.1 - i * 0.13;
            this.pushBox(
              x + Math.cos(a) * r,
              y + 0.09,
              z + Math.sin(a) * r,
              0.24,
              0.18,
              0.24,
              a,
              0.5,
              0.49,
              0.47
            );
          }
          this.waymark(x - 2.4, z - 1.2, y);
          break;
        }
        case 'pool': {
          this.stoneRing(x, z, y, 2.5, 7, 0.6);
          this.pushDrum(x, y, z, 2.3, 2.15, 0.28, 0.4, 0.4, 0.41, 14);
          this.waters.push({ cx: x, cz: z, half: 2.15, y: y + 0.24, edgeIn: 1.8, edgeOut: 2.12 });
          this.waymark(x + 2.7, z + 0.4, y);
          break;
        }
        case 'deck': {
          this.pushBox(x, y + 0.3, z, 4.2, 0.22, 3.2, 0.05, 0.55, 0.50, 0.42);
          for (const [ox, oz] of [
            [-1.9, -1.4],
            [1.9, -1.4],
            [-1.9, 1.4],
            [1.9, 1.4],
          ]) {
            this.pushBox(x + ox, y + 0.15, z + oz, 0.24, 0.34, 0.24, 0, 0.4, 0.36, 0.3);
          }
          this.pushBox(x - 1.5, y + 1.35, z - 1.3, 0.16, 1.9, 0.16, 0, 0.48, 0.44, 0.38);
          this.pushBox(x + 1.5, y + 1.35, z - 1.3, 0.16, 1.9, 0.16, 0, 0.48, 0.44, 0.38);
          this.pushBox(x, y + 2.3, z - 1.3, 3.3, 0.14, 0.2, 0, 0.5, 0.46, 0.4);
          break;
        }
        case 'hollow': {
          // the basin is cracked and dry — no water body here, by design
          this.pushDrum(x, y, z, 1.6, 1.45, 0.3, 0.33, 0.30, 0.27, 12);
          this.stoneRing(x, z, y, 2.4, 5, 0.7);
          this.waymark(x - 1.9, z + 1.0, y);
          break;
        }
        case 'jetty': {
          const wood = [0.42, 0.34, 0.24] as const;
          for (let i = 0; i < 11; i++) {
            const pz = DOCK.z0 + i * 3.0;
            this.pushBox(
              DOCK.x,
              DOCK.h - 0.08 + this.rng() * 0.03,
              pz,
              2.6,
              0.12,
              2.9,
              (this.rng() - 0.5) * 0.02,
              ...wood
            );
            if (i % 3 === 1) {
              this.pushBox(DOCK.x - 1.25, DOCK.h + 0.55, pz, 0.16, 1.4, 0.16, 0, ...wood);
              this.pushBox(DOCK.x + 1.25, DOCK.h + 0.55, pz, 0.16, 1.4, 0.16, 0, ...wood);
            }
          }
          // the end platform, where arrival stands
          this.pushBox(DOCK.x, DOCK.h - 0.06, DOCK.z1 + 1.2, 4.2, 0.14, 3.0, 0, ...wood);
          break;
        }
      }
    }
    // benches along the way — places to simply sit, asked for and earned
    const bench = (bx: number, bz: number, face: number) => {
      const by = this.heightAt(bx, bz);
      this.pushBox(bx, by + 0.46, bz, 1.6, 0.09, 0.45, face, 0.44, 0.35, 0.24);
      const c = Math.cos(face);
      const sn = Math.sin(face);
      for (const o of [-0.6, 0.6]) {
        this.pushBox(bx + c * o, by + 0.2, bz - sn * o, 0.12, 0.42, 0.4, face, 0.38, 0.3, 0.2);
      }
    };
    const thTrail = this.spotPaths.get('trailhead');
    if (thTrail && thTrail.length > 3) {
      const m = thTrail[3];
      const n = thTrail[4] ?? m;
      const ddx = n.x - m.x;
      const ddz = n.z - m.z;
      const dl = Math.hypot(ddx, ddz) || 1;
      bench(m.x + (-ddz / dl) * 3.2, m.z + (ddx / dl) * 3.2, Math.atan2(ddx, ddz));
    }
    bench(3.4, 99, Math.PI); // by the shore, facing the water

    // the waterfall's rocky crown
    for (const [ox, oz, s] of [
      [-1.5, 1.5, 2.6],
      [2.5, 0.5, 1.9],
      [0.5, -2.5, 2.2],
      [5.0, -1.5, 1.4],
    ] as const) {
      const rx = FALL_MOUND[0] + ox;
      const rz = FALL_MOUND[1] + oz;
      const rh = this.heightAt(rx, rz);
      const g = 0.42 + this.rng() * 0.1;
      this.pushBox(rx, rh + s * 0.2, rz, s, s * 0.6, s * 0.85, this.rng() * Math.PI, g, g, g);
    }

    // boulders in the middle distance — the valley is a real place
    const rng = mulberry32(4451);
    for (let i = 0; i < 26; i++) {
      const a = rng() * Math.PI * 2;
      const r = 60 + rng() * 200;
      const x = PLAY_C[0] + Math.cos(a) * r;
      const z = PLAY_C[1] + Math.sin(a) * r;
      const h = this.heightAt(x, z);
      if (h < 1 || this.pathDist(x, z) < 5) continue;
      const s = 0.8 + rng() * 2.2;
      const g = 0.36 + rng() * 0.14;
      this.pushBox(x, h + s * 0.22, z, s, s * 0.62, s * 0.8, rng() * Math.PI, g, g, g);
    }

    const gl = this.gl;
    this.structVertCount = this.structVerts.length / 9;
    this.buffers.struct = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.struct);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.structVerts), gl.STATIC_DRAW);
    this.structVerts = [];
  }

  // ---------- public API ----------

  start(spots: RetreatSpot[], seed: number): void {
    const gl = this.gl;
    this.spots = spots;
    this.layout(seed);

    this.progs = {
      terrain: program(gl, TERRAIN_VS, TERRAIN_FS, ['aPos', 'aNormal'], [
        'uVP', 'uNoiseTex', 'uGroundTex', 'uCamPos', 'uSunDir', 'uSunCol', 'uAmb', 'uFogCol', 'uFogDens', 'uLights[0]', 'uLightCol[0]',
      ]),
      sky: program(gl, SKY_VS, SKY_FS, ['aPos'], [
        'uCamRight', 'uCamUp', 'uCamFwd', 'uTanHalf', 'uAspect', 'uSunDir', 'uSunCol', 'uZenith', 'uHorizon', 'uTime', 'uCloudCover', 'uFogCol', 'uFogDens',
      ]),
      water: program(gl, WATER_VS, WATER_FS, ['aPos'], [
        'uVP', 'uWaterY', 'uNoiseTex', 'uCamPos', 'uEdgeC', 'uEdgeR', 'uSunDir', 'uSunCol', 'uZenith', 'uHorizon', 'uTime', 'uCloudCover', 'uFogCol', 'uFogDens',
      ]),
      bill: program(gl, BILL_VS, BILL_FS, ['aCenter', 'aCorner', 'aMisc'], [
        'uVP', 'uCamPos', 'uTime', 'uCols', 'uNearShrink', 'uAtlas', 'uSunCol', 'uAmb', 'uFogCol', 'uFogDens',
      ]),
      mesh: program(gl, MESH_VS, MESH_FS, ['aPos', 'aNormal', 'aColor'], [
        'uVP', 'uCamPos', 'uSunDir', 'uSunCol', 'uAmb', 'uFogCol', 'uFogDens', 'uLights[0]', 'uLightCol[0]',
      ]),
      sprite: program(gl, SPRITE_VS, SPRITE_FS, ['aCenter', 'aCorner', 'aSize', 'aColor', 'aTex'], [
        'uVP', 'uCamRight', 'uCamUp', 'uGlyphs',
      ]),
      line: program(gl, LINE_VS, LINE_FS, ['aPos'], ['uVP', 'uColor']),
    };

    // textures
    this.textures.noise = this.uploadTexture(noiseTexture());
    const rngTex = mulberry32(88123);
    this.textures.trees = this.uploadTexture(treeAtlas(rngTex), { premultiply: true });
    this.textures.grass = this.uploadTexture(floraTexture(rngTex), { premultiply: true });
    const colorByKind = new Map<string, string>();
    for (const s of spots) colorByKind.set(s.kind, s.color);
    const ga = glyphAtlas(colorByKind);
    this.glyphCell = ga.cells;
    this.textures.glyphs = this.uploadTexture(ga.canvas, { premultiply: true, clamp: true });

    // geometry
    this.buildTerrain();
    this.bakeGroundMask();
    this.scatter();
    // the lake itself
    this.waters.unshift({
      cx: LAKE_C[0],
      cz: LAKE_C[1],
      half: 130,
      y: 0,
      edgeIn: 88,
      edgeOut: 104,
    });
    // where the fall pours off the headland's lakeward lip into the water
    const lipX = FALL_MOUND[0] + 6.5;
    const lipZ = FALL_MOUND[1] - 1;
    this.fallTop = [lipX, this.heightAt(lipX, lipZ) + 0.4, lipZ];
    this.fallBase = [lipX + 4.5, 0.25, lipZ - 0.5];
    this.buildStructures();

    // shared unit quad for water bodies (scaled per body via uniforms? — the
    // vertex positions are baked per body instead, tiny buffers)
    const skyTri = new Float32Array([-1, -1, 3, -1, -1, 3]);
    this.buffers.sky = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.sky);
    gl.bufferData(gl.ARRAY_BUFFER, skyTri, gl.STATIC_DRAW);
    for (let i = 0; i < this.waters.length; i++) {
      const wb = this.waters[i];
      const q = new Float32Array([
        wb.cx - wb.half, wb.cz - wb.half,
        wb.cx + wb.half, wb.cz - wb.half,
        wb.cx + wb.half, wb.cz + wb.half,
        wb.cx - wb.half, wb.cz - wb.half,
        wb.cx + wb.half, wb.cz + wb.half,
        wb.cx - wb.half, wb.cz + wb.half,
      ]);
      this.buffers[`water${i}`] = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[`water${i}`]);
      gl.bufferData(gl.ARRAY_BUFFER, q, gl.STATIC_DRAW);
    }
    this.buffers.sprites = gl.createBuffer()!;
    this.buffers.sprites2 = gl.createBuffer()!; // textured medallions, alpha pass
    this.buffers.lines = gl.createBuffer()!;

    // camera: standing on the trail south of the arch, facing the valley
    const th = this.spots.find((s) => s.kind === 'trailhead');
    const tz = th?.pos ? th.pos[2] - 9 : -114;
    this.pos = { x: 0, y: this.groundY(0, tz) + EYE, z: tz };
    this.yaw = 0;
    this.pitch = -0.02;

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE); // mirrored view convention — see viewProj()

    this.resize();
    this.bind();
    this.t0 = performance.now();
    this.last = this.t0;
    this.lastInput = this.t0;
    const loop = (now: number) => {
      if (this.disposed) return;
      this.tick(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.unbind();
  }

  patchSpot(id: string, patch: Partial<RetreatSpot>): void {
    const s = this.spots.find((x) => x.id === id);
    if (s) Object.assign(s, patch);
  }

  getSpotPos(id: string): [number, number, number] | null {
    const s = this.spots.find((x) => x.id === id);
    return s?.pos ?? null;
  }

  setDayPhase(p: number): void {
    this.dayTarget = clamp(p, 0, 1);
    if (this.reducedMotion) this.dayPhase = this.dayTarget;
  }

  setLookHeld(x: number, y: number): void {
    this.lookHeld.x = x;
    this.lookHeld.y = y;
    this.lastInput = performance.now();
    if (x !== 0 || y !== 0) this.gaze = null;
  }

  /** Walk to a spot along the ground; arriving opens it. */
  walkToSpot(id: string): void {
    if (this.mode === 'reveal' || this.mode === 'revealed') return;
    const s = this.spots.find((x) => x.id === id);
    if (!s || !s.pos) return;
    if (!s.active) return;
    if (s.locked) {
      this.cb.onLockedTap(s.id);
      return;
    }
    this.seatedAt = null;
    this.suppressCapture = null;
    this.gaze = null;
    if (this.reducedMotion) {
      // an instant cut to the spot's threshold
      const dx = this.pos.x - s.pos[0];
      const dz = this.pos.z - s.pos[2];
      const l = Math.hypot(dx, dz) || 1;
      this.pos.x = s.pos[0] + (dx / l) * 2.6;
      this.pos.z = s.pos[2] + (dz / l) * 2.6;
      this.pos.y = this.groundY(this.pos.x, this.pos.z) + EYE;
      this.capture(s);
      return;
    }
    this.wp = this.routeToSpot(s);
    this.apSpot = s;
    this.apLook = { x: s.pos[0], y: s.pos[1] + 1.4, z: s.pos[2] };
    this.stallD = Infinity;
    this.stallAt = performance.now();
    this.mode = 'autopilot';
  }

  /** Walk the trails: back along the nearest trail to the spring, then out
   * the target's trail. Trails are tree-free by construction, so a
   * spot-to-spot walk can never jam. */
  private routeToSpot(s: RetreatSpot): { x: number; z: number }[] {
    const tgt = this.spotPaths.get(s.id) ?? [];
    // nearest trail vertex to where I stand
    let bestSid = '';
    let bestI = 0;
    let bestD = Infinity;
    for (const [sid, pts] of this.spotPaths) {
      for (let i = 0; i < pts.length; i++) {
        const d = Math.hypot(pts[i].x - this.pos.x, pts[i].z - this.pos.z);
        if (d < bestD) {
          bestD = d;
          bestSid = sid;
          bestI = i;
        }
      }
    }
    const wps: { x: number; z: number }[] = [];
    if (bestD < 26) {
      const near = this.spotPaths.get(bestSid)!;
      if (bestSid === s.id) {
        for (let i = bestI; i < tgt.length; i++) wps.push(tgt[i]);
      } else {
        for (let i = bestI; i >= 0; i--) wps.push(near[i]); // home to the spring
        wps.push(...tgt);
      }
    } else {
      wps.push(...tgt); // wandered off-trail: head for the trail's spring end
    }
    wps.push({ x: s.pos![0], z: s.pos![2] });
    // prune: skip waypoints already at hand, collapse near-duplicates
    const out: { x: number; z: number }[] = [];
    for (const p of wps) {
      if (out.length === 0 && Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < 4) continue;
      const prev = out[out.length - 1];
      if (prev && Math.hypot(p.x - prev.x, p.z - prev.z) < 1) continue;
      out.push(p);
    }
    return out.length ? out : [{ x: s.pos![0], z: s.pos![2] }];
  }

  /** Carry the walker onward — to the cue, else the nearest unvisited site. */
  walkNext(): void {
    const cue = this.spots.find((t) => t.cue && t.active && !t.locked);
    if (cue) {
      this.walkToSpot(cue.id);
      return;
    }
    let best: RetreatSpot | null = null;
    let bestD = Infinity;
    for (const t of this.spots) {
      if (!t.active || t.visited || t.locked || !t.pos) continue;
      const d = Math.hypot(t.pos[0] - this.pos.x, t.pos[2] - this.pos.z);
      if (d < bestD) {
        best = t;
        bestD = d;
      }
    }
    if (best) this.walkToSpot(best.id);
  }

  /** Ease the gaze onto a point without moving the feet. */
  orientToward(p: [number, number, number], ms = 1700): void {
    if (this.reducedMotion) {
      this.lookAt(p[0], p[1], p[2]);
      return;
    }
    this.gaze = { p, yaw0: this.yaw, pitch0: this.pitch, t0: performance.now(), dur: ms };
  }

  /** The host counts UI interaction as presence — the idle walk waits. */
  noteActivity(): void {
    this.lastInput = performance.now();
  }

  /** Stand up from a spot's chamber and take a step back. */
  release(): void {
    if (this.mode === 'reveal' || this.mode === 'revealed') return;
    this.lastInput = performance.now(); // standing up is presence, not idleness
    this.seatGlide = null;
    const from = this.seatedAt;
    this.seatedAt = null;
    this.mode = 'free';
    if (from?.pos) {
      this.suppressCapture = from.id;
      // step back from the structure so its capture ring lets go
      const dx = this.pos.x - from.pos[0];
      const dz = this.pos.z - from.pos[2];
      const l = Math.hypot(dx, dz) || 1;
      const bx = this.pos.x + (dx / l) * 1.6;
      const bz = this.pos.z + (dz / l) * 1.6;
      if (this.walkable(bx, bz)) {
        this.pos.x = bx;
        this.pos.z = bz;
      }
    }
  }

  /** Arrival: dusk falls and the camera rises over the water. */
  reveal(visitedIds: string[]): void {
    this.seatedAt = null;
    this.setDayPhase(1);
    // the walked figure: trailhead → spring → sites in visit order → jetty
    const path: [number, number, number][] = [];
    const byKind = (k: SiteKind) => this.spots.find((s) => s.kind === k);
    const th = byKind('trailhead');
    const sp = byKind('spring');
    if (th?.lantern) path.push(th.lantern);
    if (sp?.lantern) path.push(sp.lantern);
    for (const id of visitedIds) {
      const s = this.spots.find((x) => x.id === id);
      if (s?.lantern) {
        path.push(s.lantern);
        if (sp?.lantern) path.push(sp.lantern); // each visit returns through the spring
      }
    }
    const je = byKind('jetty');
    if (je?.lantern) path.push(je.lantern);
    this.revealPath = path;
    this.buildRevealLines();
    this.revealFrom = { ...this.pos };
    this.revealStart = performance.now();
    this.revealDone = false;
    this.glowAlpha = 0;
    if (this.reducedMotion) {
      this.pos = { x: 0, y: 54, z: 172 };
      this.lookAt(0, 2, 20);
      this.mode = 'revealed';
      this.glowAlpha = 1;
      this.finishReveal();
      return;
    }
    this.mode = 'reveal';
  }

  private buildRevealLines(): void {
    const pts: number[] = [];
    for (let i = 0; i < this.revealPath.length - 1; i++) {
      const a = this.revealPath[i];
      const b = this.revealPath[i + 1];
      // lift the thread in a shallow arc over the ground
      const segs = 14;
      for (let k = 0; k < segs; k++) {
        for (const u of [k / segs, (k + 1) / segs]) {
          const x = mix(a[0], b[0], u);
          const z = mix(a[2], b[2], u);
          const y = mix(a[1], b[1], u) + Math.sin(u * Math.PI) * 3.2 + 0.4;
          pts.push(x, y, z);
        }
      }
    }
    this.lineData = new Float32Array(pts);
    this.lineCount = pts.length / 3;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.lines);
    gl.bufferData(gl.ARRAY_BUFFER, this.lineData, gl.STATIC_DRAW);
  }

  private finishReveal(): void {
    if (this.revealDone) return;
    this.revealDone = true;
    this.cb.onRevealDone();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, this.dprCap);
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.labelCanvas.width = Math.round(this.w * Math.min(this.dpr, 2));
    this.labelCanvas.height = Math.round(this.h * Math.min(this.dpr, 2));
    this.lctx.setTransform(Math.min(this.dpr, 2), 0, 0, Math.min(this.dpr, 2), 0, 0);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  // ---------- input ----------

  private onPointerDown = (e: PointerEvent) => {
    this.lastInput = performance.now();
    if (this.pinch) return;
    if (this.drag) {
      this.canvas.setPointerCapture(e.pointerId);
      this.pinch = { idA: this.drag.id, idB: e.pointerId };
      this.drag = null;
      return;
    }
    this.canvas.setPointerCapture(e.pointerId);
    this.drag = {
      x: e.clientX,
      y: e.clientY,
      sx: e.clientX,
      sy: e.clientY,
      slop: e.pointerType === 'touch' ? 9 : 4,
      moved: false,
      id: e.pointerId,
    };
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.drag || this.drag.id !== e.pointerId) return;
    const dx = e.clientX - this.drag.x;
    const dy = e.clientY - this.drag.y;
    if (Math.hypot(e.clientX - this.drag.sx, e.clientY - this.drag.sy) > this.drag.slop)
      this.drag.moved = true;
    if (this.drag.moved && (this.mode === 'free' || this.mode === 'revealed')) {
      this.lastInput = performance.now();
      this.gaze = null;
      this.yaw -= dx * 0.0030;
      this.pitch = clamp(this.pitch + dy * 0.0026, -1.15, 1.15);
    }
    this.drag.x = e.clientX;
    this.drag.y = e.clientY;
  };

  private onPointerUp = (e: PointerEvent) => {
    this.lastInput = performance.now();
    if (this.pinch) {
      if (e.pointerId === this.pinch.idA || e.pointerId === this.pinch.idB) this.pinch = null;
      return;
    }
    if (!this.drag || this.drag.id !== e.pointerId) return;
    const d = this.drag;
    this.drag = null;
    if (d.moved) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pick(e.clientX - rect.left, e.clientY - rect.top);
  };

  private onPointerCancel = (e: PointerEvent) => {
    if (this.pinch && (e.pointerId === this.pinch.idA || e.pointerId === this.pinch.idB))
      this.pinch = null;
    if (this.drag?.id === e.pointerId) this.drag = null;
  };

  private onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t?.closest?.('button, a, input, textarea, [tabindex]')) return;
    this.lastInput = performance.now();
    if (e.type === 'keydown') {
      if (e.key.startsWith('Arrow')) e.preventDefault();
      this.keys.add(e.key.toLowerCase());
    } else this.keys.delete(e.key.toLowerCase());
  };

  private bind(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerCancel);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKey);
  }

  private unbind(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKey);
  }

  private pick(sx: number, sy: number): void {
    if (this.mode === 'reveal') return;
    if (this.mode === 'seated') return; // the chamber owns the screen
    // spots first — normalized by ring size so near things don't shadow far
    let best: RetreatSpot | null = null;
    let bestScore = Infinity;
    for (const s of this.spots) {
      if (!s.pos) continue;
      if (!s.active && !s.locked) continue;
      const anchor = s.lantern ?? s.pos;
      const p = this.project(anchor[0], anchor[1] + 1.0, anchor[2]);
      if (!p) continue;
      const rad = Math.max(38, p.scale * 2.8); // the medallion is the target
      const d = Math.hypot(p.x - sx, p.y - sy);
      if (d > rad) continue;
      const score = d / rad;
      if (score < bestScore) {
        best = s;
        bestScore = score;
      }
    }
    if (best) {
      this.walkToSpot(best.id);
      return;
    }
    if (this.mode === 'revealed') return; // no ground walks from the sky
    // otherwise: walk to the tapped ground
    const g = this.groundHit(sx, sy);
    if (g && this.walkable(g.x, g.z)) {
      this.seatedAt = null;
      this.wp = this.routeTo(g.x, g.z);
      this.apSpot = null;
      this.apLook = null;
      this.stallD = Infinity;
      this.stallAt = performance.now();
      this.mode = 'autopilot';
    }
  }

  /** March the tap ray until it dips under the terrain. */
  private groundHit(sx: number, sy: number): { x: number; z: number } | null {
    const ndcX = (sx / this.w) * 2 - 1;
    const ndcY = 1 - (sy / this.h) * 2;
    const tanHalf = Math.tan(this.fov / 2);
    const b = this.camBasis;
    const aspect = this.w / this.h;
    const dir = {
      x: b.Fx + b.Sx * ndcX * tanHalf * aspect + b.Ux * ndcY * tanHalf,
      y: b.Fy + b.Sy * ndcX * tanHalf * aspect + b.Uy * ndcY * tanHalf,
      z: b.Fz + b.Sz * ndcX * tanHalf * aspect + b.Uz * ndcY * tanHalf,
    };
    const dl = Math.hypot(dir.x, dir.y, dir.z);
    dir.x /= dl;
    dir.y /= dl;
    dir.z /= dl;
    let t = 1;
    let px = this.pos.x;
    let py = this.pos.y;
    let pz = this.pos.z;
    for (let i = 0; i < 220 && t < 240; i++) {
      const x = this.pos.x + dir.x * t;
      const y = this.pos.y + dir.y * t;
      const z = this.pos.z + dir.z * t;
      const g = Math.max(this.heightAt(x, z), 0); // the lake surface stops taps
      if (y <= g) {
        // bisect between the last point above and this one
        let lo = { x: px, y: py, z: pz };
        let hi = { x, y, z };
        for (let k = 0; k < 6; k++) {
          const mxp = {
            x: (lo.x + hi.x) / 2,
            y: (lo.y + hi.y) / 2,
            z: (lo.z + hi.z) / 2,
          };
          if (mxp.y <= Math.max(this.heightAt(mxp.x, mxp.z), 0)) hi = mxp;
          else lo = mxp;
        }
        return { x: hi.x, z: hi.z };
      }
      px = x;
      py = y;
      pz = z;
      t += Math.max(0.8, (y - g) * 0.55);
    }
    return null;
  }

  /** Waypoints toward a target — via the dock root when the target is on the
   * dock, via the spring when the straight line would wade the lake. */
  private routeTo(x: number, z: number): { x: number; z: number }[] {
    const onDockTarget = Math.abs(x - DOCK.x) < DOCK.w && z > DOCK.z0 - 2;
    const selfOnDock = Math.abs(this.pos.x - DOCK.x) < DOCK.w && this.pos.z > DOCK.z0 - 2;
    const wps: { x: number; z: number }[] = [];
    if (onDockTarget && !selfOnDock) {
      wps.push({ x: DOCK.x, z: DOCK.z0 - 3 });
    } else if (!onDockTarget && selfOnDock) {
      wps.push({ x: DOCK.x, z: DOCK.z0 - 3 });
    } else if (!onDockTarget) {
      // wading check: sample the straight line
      for (let u = 0.15; u < 0.9; u += 0.14) {
        const mx2 = mix(this.pos.x, x, u);
        const mz2 = mix(this.pos.z, z, u);
        if (this.heightAt(mx2, mz2) < 0.3) {
          wps.push({ x: SPRING_C[0], z: SPRING_C[1] + 8 });
          break;
        }
      }
    }
    wps.push({ x, z });
    return wps;
  }

  // ---------- camera math ----------

  private forward(): { x: number; y: number; z: number } {
    return {
      x: Math.sin(this.yaw) * Math.cos(this.pitch),
      y: Math.sin(this.pitch),
      z: Math.cos(this.yaw) * Math.cos(this.pitch),
    };
  }

  private lookAt(x: number, y: number, z: number): void {
    const dx = x - this.pos.x;
    const dy = y - this.pos.y;
    const dz = z - this.pos.z;
    const l = Math.hypot(dx, dy, dz) || 1;
    this.yaw = Math.atan2(dx, dz);
    this.pitch = Math.asin(clamp(dy / l, -1, 1));
  }

  /** The Voyage's projection convention, as a matrix: yaw=0 looks +z, east
   * lands on screen-right. View rows are the camera basis; clip w = forward
   * depth. (This is mirrored relative to a standard GL lookAt — face culling
   * stays off everywhere, so winding never bites.) */
  private viewProj(): Float32Array {
    const f = 1 / Math.tan(this.fov / 2);
    const aspect = this.w / this.h;
    const near = 0.12;
    const far = 2600;
    const cy = Math.cos(this.yaw);
    const sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    // camera basis in world space
    const Sx = cy, Sy = 0, Sz = -sy; // screen right
    const Ux = -sy * sp, Uy = cp, Uz = -cy * sp; // screen up
    const Fx = sy * cp, Fy = sp, Fz = cy * cp; // forward
    const A = (far + near) / (far - near);
    const B = (-2 * far * near) / (far - near);
    const e = this.pos;
    const M = new Float32Array(16);
    // x_clip = (f/aspect) * dot(S, p - e)
    M[0] = (f / aspect) * Sx;
    M[4] = (f / aspect) * Sy;
    M[8] = (f / aspect) * Sz;
    M[12] = (f / aspect) * -(Sx * e.x + Sy * e.y + Sz * e.z);
    // y_clip = f * dot(U, p - e)
    M[1] = f * Ux;
    M[5] = f * Uy;
    M[9] = f * Uz;
    M[13] = f * -(Ux * e.x + Uy * e.y + Uz * e.z);
    // w_clip = dot(F, p - e);  z_clip = A * w + B
    const Fw = -(Fx * e.x + Fy * e.y + Fz * e.z);
    M[2] = A * Fx;
    M[6] = A * Fy;
    M[10] = A * Fz;
    M[14] = A * Fw + B;
    M[3] = Fx;
    M[7] = Fy;
    M[11] = Fz;
    M[15] = Fw;
    this.camBasis = { Sx, Sy, Sz, Ux, Uy, Uz, Fx, Fy, Fz };
    return M;
  }

  private camBasis = { Sx: 1, Sy: 0, Sz: 0, Ux: 0, Uy: 1, Uz: 0, Fx: 0, Fy: 0, Fz: 1 };
  private vpNow: Float32Array = new Float32Array(16);

  /** Project a world point to CSS pixels (null when behind the camera). */
  private project(x: number, y: number, z: number): { x: number; y: number; scale: number } | null {
    const M = this.vpNow;
    const cx = M[0] * x + M[4] * y + M[8] * z + M[12];
    const cy = M[1] * x + M[5] * y + M[9] * z + M[13];
    const cw = M[3] * x + M[7] * y + M[11] * z + M[15];
    if (cw < 0.12) return null;
    return {
      x: ((cx / cw) * 0.5 + 0.5) * this.w,
      y: (1 - ((cy / cw) * 0.5 + 0.5)) * this.h,
      scale: this.h / cw,
    };
  }

  // ---------- simulation ----------

  private capture(s: RetreatSpot): void {
    this.mode = 'seated';
    this.seatedAt = s;
    this.wp = [];
    this.apSpot = null;
    // settle into this place's own seat, gaze finding what it faces
    const look: [number, number, number] = s.seatLook ?? [
      s.pos![0],
      s.pos![1] + 1.35,
      s.pos![2],
    ];
    if (s.seat) {
      if (this.reducedMotion) {
        this.pos.x = s.seat[0];
        this.pos.z = s.seat[1];
        this.pos.y = this.groundY(s.seat[0], s.seat[1]) + EYE;
        this.lookAt(look[0], look[1], look[2]);
      } else {
        this.seatGlide = { x: s.seat[0], z: s.seat[1] };
        this.orientToward(look, 1300);
      }
    } else if (s.pos) {
      this.orientToward(look, 900);
    }
    this.cb.onCapture(s.id);
  }

  private tick(now: number): void {
    // the clamp caps catch-up after a hidden tab, but must stay generous —
    // clamping at one frame's length makes slow devices walk in slow motion
    const dt = clamp(now - this.last, 0, 100) / 1000;
    this.last = now;
    // rAF's first timestamp can predate the performance.now() taken in
    // start() — a negative t once turned a modulo negative and indexed a
    // trail at [-1]. Time never runs backwards here.
    const t = Math.max(0, (now - this.t0) / 1000);
    const wt = this.reducedMotion ? 0 : t;

    // adaptive quality — resolution is the real lever (same recipe as the
    // Voyage), with a second, harder tier for software rasterizers
    this.frameEma = this.frameEma * 0.95 + dt * 1000 * 0.05;
    if (this.frameEma > 30 && now - this.t0 > 4000) {
      if (this.quality === 1) {
        this.quality = 0.5;
        this.dprCap = 1.0;
        this.resize();
        this.frameEma = 16;
      } else if (this.quality === 0.5) {
        this.quality = 0.25;
        this.dprCap = 0.72;
        this.resize();
        this.frameEma = 16;
      }
    }

    // day drifts toward its target — time passing, not a lighting change
    if (!this.reducedMotion) {
      this.dayPhase += (this.dayTarget - this.dayPhase) * Math.min(1, dt * 0.12);
    }

    if (this.mode === 'free') this.freeWalk(dt, now);
    else if (this.mode === 'autopilot') this.autoWalk(dt, now);
    else if (this.mode === 'reveal') this.riseReveal(now);
    else if (this.mode === 'seated' && this.seatGlide) {
      // drifting the last arm's length into the seat while the chamber opens
      const k = Math.min(1, dt * 2.0);
      this.pos.x += (this.seatGlide.x - this.pos.x) * k;
      this.pos.z += (this.seatGlide.z - this.pos.z) * k;
      this.pos.y += (this.groundY(this.pos.x, this.pos.z) + EYE - this.pos.y) * k;
      if (Math.hypot(this.seatGlide.x - this.pos.x, this.seatGlide.z - this.pos.z) < 0.06) {
        this.seatGlide = null;
      }
    }

    // gaze guidance
    if (this.gaze && this.mode !== 'autopilot') {
      const g = this.gaze;
      const u = easeInOut(clamp((now - g.t0) / g.dur, 0, 1));
      const dx = g.p[0] - this.pos.x;
      const dy = g.p[1] - this.pos.y;
      const dz = g.p[2] - this.pos.z;
      const l = Math.hypot(dx, dy, dz) || 1;
      let wantYaw = Math.atan2(dx, dz);
      const wantPitch = Math.asin(clamp(dy / l, -1, 1));
      while (wantYaw - g.yaw0 > Math.PI) wantYaw -= Math.PI * 2;
      while (wantYaw - g.yaw0 < -Math.PI) wantYaw += Math.PI * 2;
      this.yaw = g.yaw0 + (wantYaw - g.yaw0) * u;
      this.pitch = g.pitch0 + (wantPitch - g.pitch0) * u;
      if (u >= 1) this.gaze = null;
    }

    // proximity → the world's voices (throttled): shore, waterfall, and the
    // nearest lit site's own sound
    if (now - this.lakeCbAt > 400) {
      this.lakeCbAt = now;
      const dl = Math.hypot(this.pos.x - LAKE_C[0], this.pos.z - LAKE_C[1]);
      this.cb.onLakeCloseness(clamp(1 - (dl - 60) / 80, 0, 1));
      const df = Math.hypot(this.pos.x - this.fallBase[0], this.pos.z - this.fallBase[2]);
      this.cb.onFallCloseness(clamp(1 - df / 75, 0, 1));
      let bestKind: string | null = null;
      let bestK = 0;
      if (this.seatedAt?.lit) {
        bestKind = this.seatedAt.kind;
        bestK = 1;
      } else {
        for (const s of this.spots) {
          if (!s.lit || !s.pos) continue;
          const k = clamp(1 - Math.hypot(this.pos.x - s.pos[0], this.pos.z - s.pos[2]) / 26, 0, 1);
          if (k > bestK) {
            bestK = k;
            bestKind = s.kind;
          }
        }
      }
      this.cb.onNearSite(bestK > 0.02 ? bestKind : null, bestK);
    }

    this.render(wt);
  }

  private freeWalk(dt: number, now: number): void {
    if (this.reducedMotion) return; // taps move; the body holds still
    // looking
    const lookX =
      (this.keys.has('arrowleft') ? -1 : 0) + (this.keys.has('arrowright') ? 1 : 0) + this.lookHeld.x;
    const lookY =
      (this.keys.has('arrowup') ? -1 : 0) + (this.keys.has('arrowdown') ? 1 : 0) + this.lookHeld.y;
    if (lookX !== 0 || lookY !== 0) {
      this.gaze = null;
      this.yaw += lookX * 1.15 * dt;
      this.pitch = clamp(this.pitch - lookY * 0.9 * dt, -1.15, 1.15);
    }

    // walking: W forward, S back, A/D sidestep
    const fw = this.forward();
    const fx = fw.x;
    const fzz = fw.z;
    const fl = Math.hypot(fx, fzz) || 1;
    const dirX = fx / fl;
    const dirZ = fzz / fl;
    const strafe = (this.keys.has('d') ? 1 : 0) - (this.keys.has('a') ? 1 : 0);
    const ahead = (this.keys.has('w') || this.keys.has(' ') ? 1 : 0) - (this.keys.has('s') ? 1 : 0);
    let vx = (dirX * ahead + dirZ * strafe) * WALK_SPEED;
    let vz = (dirZ * ahead - dirX * strafe) * WALK_SPEED;

    // idle: the retreat carries you toward what waits (any input takes over)
    if (ahead === 0 && strafe === 0 && !this.gaze && now - this.lastInput > 10000) {
      const cue = this.spots.find((s) => s.cue && s.active && !s.locked);
      if (cue) {
        this.walkToSpot(cue.id);
        // idle travel shouldn't count as input — arriving re-idles at the spot
        this.lastInput = now - 6000;
        return;
      }
    }

    this.vel.x += (vx - this.vel.x) * Math.min(1, dt * 6);
    this.vel.z += (vz - this.vel.z) * Math.min(1, dt * 6);
    this.step(this.vel.x * dt, this.vel.z * dt, dt);

    // spot capture by proximity
    if (this.mode === 'free') this.checkCapture();
  }

  private autoWalk(dt: number, now: number): void {
    const target = this.wp[0];
    if (!target) {
      this.mode = 'free';
      return;
    }
    const dx = target.x - this.pos.x;
    const dz = target.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    // progress watchdog — pinned against something? stand down gracefully
    if (d < this.stallD - 0.25) {
      this.stallD = d;
      this.stallAt = now;
    } else if (now - this.stallAt > 2200) {
      this.wp = [];
      this.apSpot = null;
      this.vel.x = 0;
      this.vel.z = 0;
      this.mode = 'free';
      return;
    }
    const arriveR = this.wp.length > 1 ? 1.6 : this.apSpot ? CAPTURE_R * 0.85 : 0.7;
    if (d < arriveR) {
      this.wp.shift();
      this.stallD = Infinity; // each leg gets its own watchdog
      this.stallAt = now;
      if (this.wp.length === 0) {
        const s = this.apSpot;
        this.apSpot = null;
        this.vel.x = 0;
        this.vel.z = 0;
        if (s) this.capture(s);
        else this.mode = 'free';
      }
      return;
    }
    const speed = Math.min(AUTO_SPEED, d * 1.6 + 0.6);
    const vx = (dx / d) * speed;
    const vz = (dz / d) * speed;
    this.vel.x += (vx - this.vel.x) * Math.min(1, dt * 4);
    this.vel.z += (vz - this.vel.z) * Math.min(1, dt * 4);
    this.step(this.vel.x * dt, this.vel.z * dt, dt);
    // the gaze leads the walk — mostly ahead, drifting onto the destination
    const lookP = this.apLook ?? { x: target.x, y: this.groundY(target.x, target.z) + 1.3, z: target.z };
    const ldx = lookP.x - this.pos.x;
    const ldy = lookP.y - this.pos.y;
    const ldz = lookP.z - this.pos.z;
    const ll = Math.hypot(ldx, ldy, ldz) || 1;
    let wantYaw = Math.atan2(ldx, ldz);
    const wantPitch = Math.asin(clamp(ldy / ll, -1, 1)) * 0.8;
    while (wantYaw - this.yaw > Math.PI) wantYaw -= Math.PI * 2;
    while (wantYaw - this.yaw < -Math.PI) wantYaw += Math.PI * 2;
    const g = Math.min(1, dt * 2.2);
    this.yaw += (wantYaw - this.yaw) * g;
    this.pitch += (wantPitch - this.pitch) * g;
    void now;
  }

  /** One movement step with sliding collision + head bob + footfalls. */
  private step(mx: number, mz: number, dt: number): void {
    if (mx === 0 && mz === 0) {
      this.pos.y += (this.groundY(this.pos.x, this.pos.z) + EYE - this.pos.y) * Math.min(1, dt * 10);
      return;
    }
    let nx = this.pos.x + mx;
    let nz = this.pos.z + mz;
    if (!this.walkable(nx, nz)) {
      if (this.walkable(this.pos.x + mx, this.pos.z)) nz = this.pos.z;
      else if (this.walkable(this.pos.x, this.pos.z + mz)) nx = this.pos.x;
      else {
        nx = this.pos.x;
        nz = this.pos.z;
        this.wp = []; // an autopilot pinned against a rock gives up gracefully
      }
    }
    // release suppression clears once you're out of the spot's ring
    if (this.suppressCapture) {
      const s = this.spots.find((x) => x.id === this.suppressCapture);
      if (!s?.pos || Math.hypot(nx - s.pos[0], nz - s.pos[2]) > CAPTURE_R + 1.2) {
        this.suppressCapture = null;
      }
    }
    const moved = Math.hypot(nx - this.pos.x, nz - this.pos.z);
    this.pos.x = nx;
    this.pos.z = nz;
    const bobAmp = this.reducedMotion ? 0 : 0.045;
    this.bobPhase += moved * 1.9;
    const bob = Math.sin(this.bobPhase) * bobAmp * clamp(moved / (dt || 1) / WALK_SPEED, 0, 1);
    const sign = Math.sign(Math.sin(this.bobPhase));
    if (sign !== this.lastStepSign && moved > 0.005) {
      this.lastStepSign = sign;
      this.cb.onStep();
    }
    const gy = this.groundY(this.pos.x, this.pos.z) + EYE + bob;
    this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 10);
  }

  private checkCapture(): void {
    for (const s of this.spots) {
      if (!s.pos || !s.active) continue;
      if (s.id === this.suppressCapture) continue;
      const d = Math.hypot(this.pos.x - s.pos[0], this.pos.z - s.pos[2]);
      if (d < CAPTURE_R) {
        if (s.locked) {
          // standing at the dark jetty — say why it won't open, once
          this.cb.onLockedTap(s.id);
          this.suppressCapture = s.id;
          return;
        }
        this.capture(s);
        return;
      }
    }
  }

  private riseReveal(now: number): void {
    const u = easeInOut(clamp((now - this.revealStart) / 7000, 0, 1));
    // rise off the jetty, out over the water, and turn back to the valley —
    // the whole walked figure below, lanterns lit, dusk falling
    const vantage = { x: 0, y: 54, z: 172 };
    this.pos.x = mix(this.revealFrom.x, vantage.x, u);
    this.pos.y = mix(this.revealFrom.y, vantage.y, u * u);
    this.pos.z = mix(this.revealFrom.z, vantage.z, u);
    this.glowAlpha = clamp(u * 1.6, 0, 1);
    // gaze eases from wherever it was onto the whole retreat
    const want = { x: 0, y: 2, z: 20 };
    const dx = want.x - this.pos.x;
    const dy = want.y - this.pos.y;
    const dz = want.z - this.pos.z;
    const l = Math.hypot(dx, dy, dz) || 1;
    let wantYaw = Math.atan2(dx, dz);
    const wantPitch = Math.asin(clamp(dy / l, -1, 1));
    while (wantYaw - this.yaw > Math.PI) wantYaw -= Math.PI * 2;
    while (wantYaw - this.yaw < -Math.PI) wantYaw += Math.PI * 2;
    const g = Math.min(1, u * 2);
    this.yaw += (wantYaw - this.yaw) * g * 0.08;
    this.pitch += (wantPitch - this.pitch) * g * 0.08;
    if (u >= 1) {
      this.mode = 'revealed';
      this.finishReveal();
    }
  }

  // ---------- render ----------

  private render(t: number): void {
    const gl = this.gl;
    const day = dayAt(this.dayPhase);
    const elev = (day.elev * Math.PI) / 180;
    const az = (day.az * Math.PI) / 180;
    const sunDir: [number, number, number] = [
      Math.sin(az) * Math.cos(elev),
      Math.sin(elev),
      Math.cos(az) * Math.cos(elev),
    ];
    const amb: [number, number, number] = [
      mix(day.horizon[0], day.zenith[0], 0.5) * 0.75,
      mix(day.horizon[1], day.zenith[1], 0.5) * 0.75,
      mix(day.horizon[2], day.zenith[2], 0.5) * 0.75,
    ];
    const fogCol = day.horizon;
    const M = this.viewProj();
    this.vpNow = M;
    const cb = this.camBasis;

    // lantern lights: lit spots glow; dusk deepens them; cues breathe
    const duskK = smoothstep(0.55, 1, this.dayPhase);
    const lights = new Float32Array(48);
    const lightCols = new Float32Array(36);
    let li = 0;
    for (const s of this.spots) {
      if (li >= 12 || !s.lantern) continue;
      let k = 0;
      if (s.lit && (!s.locked || s.kind !== 'jetty')) {
        k = 0.35 + duskK * 1.6;
        if (s.cue && !this.reducedMotion) k *= 0.75 + 0.45 * Math.sin(t * 1.7);
        if (s.kind === 'hollow') k *= 0.5 + 0.3 * Math.sin(t * 6.3) * Math.sin(t * 1.1); // it gutters
      }
      lights[li * 4] = s.lantern[0];
      lights[li * 4 + 1] = s.lantern[1];
      lights[li * 4 + 2] = s.lantern[2];
      lights[li * 4 + 3] = k;
      const [r, g, b] = hexRgb(s.color);
      lightCols[li * 3] = r;
      lightCols[li * 3 + 1] = g;
      lightCols[li * 3 + 2] = b;
      li++;
    }

    gl.clearColor(fogCol[0], fogCol[1], fogCol[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // ----- sky -----
    const sky = this.progs.sky;
    gl.useProgram(sky.p);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.sky);
    gl.enableVertexAttribArray(sky.a.aPos);
    gl.vertexAttribPointer(sky.a.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform3f(sky.u.uCamRight, cb.Sx, cb.Sy, cb.Sz);
    gl.uniform3f(sky.u.uCamUp, cb.Ux, cb.Uy, cb.Uz);
    gl.uniform3f(sky.u.uCamFwd, cb.Fx, cb.Fy, cb.Fz);
    gl.uniform1f(sky.u.uTanHalf, Math.tan(this.fov / 2));
    gl.uniform1f(sky.u.uAspect, this.w / this.h);
    gl.uniform3fv(sky.u.uSunDir, sunDir);
    gl.uniform3fv(sky.u.uSunCol, day.sun);
    gl.uniform3fv(sky.u.uZenith, day.zenith);
    gl.uniform3fv(sky.u.uHorizon, day.horizon);
    gl.uniform1f(sky.u.uTime, t);
    gl.uniform1f(sky.u.uCloudCover, day.clouds);
    gl.uniform3fv(sky.u.uFogCol, fogCol);
    gl.uniform1f(sky.u.uFogDens, day.fog);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST);

    // ----- terrain -----
    const ter = this.progs.terrain;
    gl.useProgram(ter.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.terrain);
    gl.enableVertexAttribArray(ter.a.aPos);
    gl.vertexAttribPointer(ter.a.aPos, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(ter.a.aNormal);
    gl.vertexAttribPointer(ter.a.aNormal, 3, gl.FLOAT, false, 24, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.terrainIdx);
    gl.uniformMatrix4fv(ter.u.uVP, false, M);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.noise);
    gl.uniform1i(ter.u.uNoiseTex, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.ground);
    gl.uniform1i(ter.u.uGroundTex, 1);
    gl.uniform3f(ter.u.uCamPos, this.pos.x, this.pos.y, this.pos.z);
    gl.uniform3fv(ter.u.uSunDir, sunDir);
    gl.uniform3fv(ter.u.uSunCol, day.sun);
    gl.uniform3fv(ter.u.uAmb, amb);
    gl.uniform3fv(ter.u.uFogCol, fogCol);
    gl.uniform1f(ter.u.uFogDens, day.fog);
    gl.uniform4fv(ter.u['uLights[0]'], lights);
    gl.uniform3fv(ter.u['uLightCol[0]'], lightCols);
    gl.drawElements(gl.TRIANGLES, this.terrainIndexCount, gl.UNSIGNED_SHORT, 0);

    // ----- structures -----
    const mesh = this.progs.mesh;
    gl.useProgram(mesh.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.struct);
    gl.enableVertexAttribArray(mesh.a.aPos);
    gl.vertexAttribPointer(mesh.a.aPos, 3, gl.FLOAT, false, 36, 0);
    gl.enableVertexAttribArray(mesh.a.aNormal);
    gl.vertexAttribPointer(mesh.a.aNormal, 3, gl.FLOAT, false, 36, 12);
    gl.enableVertexAttribArray(mesh.a.aColor);
    gl.vertexAttribPointer(mesh.a.aColor, 3, gl.FLOAT, false, 36, 24);
    gl.uniformMatrix4fv(mesh.u.uVP, false, M);
    gl.uniform3f(mesh.u.uCamPos, this.pos.x, this.pos.y, this.pos.z);
    gl.uniform3fv(mesh.u.uSunDir, sunDir);
    gl.uniform3fv(mesh.u.uSunCol, day.sun);
    gl.uniform3fv(mesh.u.uAmb, amb);
    gl.uniform3fv(mesh.u.uFogCol, fogCol);
    gl.uniform1f(mesh.u.uFogDens, day.fog);
    gl.uniform4fv(mesh.u['uLights[0]'], lights);
    gl.uniform3fv(mesh.u['uLightCol[0]'], lightCols);
    gl.drawArrays(gl.TRIANGLES, 0, this.structVertCount);

    // ----- trees + grass (alpha-tested, depth-written; order-free) -----
    const bill = this.progs.bill;
    gl.useProgram(bill.p);
    const bindBillBuffer = (buf: WebGLBuffer) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(bill.a.aCenter);
      gl.vertexAttribPointer(bill.a.aCenter, 3, gl.FLOAT, false, 36, 0);
      gl.enableVertexAttribArray(bill.a.aCorner);
      gl.vertexAttribPointer(bill.a.aCorner, 2, gl.FLOAT, false, 36, 12);
      gl.enableVertexAttribArray(bill.a.aMisc);
      gl.vertexAttribPointer(bill.a.aMisc, 4, gl.FLOAT, false, 36, 20);
    };
    gl.uniformMatrix4fv(bill.u.uVP, false, M);
    gl.uniform3f(bill.u.uCamPos, this.pos.x, this.pos.y, this.pos.z);
    gl.uniform1f(bill.u.uTime, t);
    gl.uniform3fv(bill.u.uSunCol, day.sun);
    gl.uniform3fv(bill.u.uAmb, amb);
    gl.uniform3fv(bill.u.uFogCol, fogCol);
    gl.uniform1f(bill.u.uFogDens, day.fog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.trees);
    gl.uniform1i(bill.u.uAtlas, 0);
    gl.uniform1f(bill.u.uCols, 4);
    gl.uniform1f(bill.u.uNearShrink, 0);
    bindBillBuffer(this.buffers.trees);
    gl.drawArrays(gl.TRIANGLES, 0, this.treeVertCount);
    if (this.quality > 0.25) {
      gl.bindTexture(gl.TEXTURE_2D, this.textures.grass);
      gl.uniform1f(bill.u.uCols, 2);
      gl.uniform1f(bill.u.uNearShrink, 1);
      bindBillBuffer(this.buffers.grass);
      gl.drawArrays(
        gl.TRIANGLES,
        0,
        this.quality === 1 ? this.grassVertCount : Math.floor(this.grassVertCount / 2 / 6) * 6
      );
    }

    // ----- water (after trees so far shores dim beneath the surface) -----
    const wat = this.progs.water;
    gl.useProgram(wat.p);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.uniformMatrix4fv(wat.u.uVP, false, M);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.noise);
    gl.uniform1i(wat.u.uNoiseTex, 0);
    gl.uniform3f(wat.u.uCamPos, this.pos.x, this.pos.y, this.pos.z);
    gl.uniform3fv(wat.u.uSunDir, sunDir);
    gl.uniform3fv(wat.u.uSunCol, day.sun);
    gl.uniform3fv(wat.u.uZenith, day.zenith);
    gl.uniform3fv(wat.u.uHorizon, day.horizon);
    gl.uniform1f(wat.u.uTime, t);
    gl.uniform1f(wat.u.uCloudCover, day.clouds);
    gl.uniform3fv(wat.u.uFogCol, fogCol);
    gl.uniform1f(wat.u.uFogDens, day.fog);
    for (let i = 0; i < this.waters.length; i++) {
      const wb = this.waters[i];
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[`water${i}`]);
      gl.enableVertexAttribArray(wat.a.aPos);
      gl.vertexAttribPointer(wat.a.aPos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(wat.u.uWaterY, wb.y);
      gl.uniform2f(wat.u.uEdgeC, wb.cx, wb.cz);
      gl.uniform2f(wat.u.uEdgeR, wb.edgeIn, wb.edgeOut);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    // ----- glow sprites (additive): lanterns, mist, flame, motes, fireflies -----
    this.drawSprites(t, duskK, M, cb);

    // ----- the walked figure, at arrival -----
    if (this.glowAlpha > 0.01 && this.lineCount > 1) {
      const line = this.progs.line;
      gl.useProgram(line.p);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.lines);
      gl.enableVertexAttribArray(line.a.aPos);
      gl.vertexAttribPointer(line.a.aPos, 3, gl.FLOAT, false, 0, 0);
      gl.uniformMatrix4fv(line.u.uVP, false, M);
      gl.uniform4f(line.u.uColor, 0.85 * this.glowAlpha, 0.72 * this.glowAlpha, 0.42 * this.glowAlpha, 1);
      gl.drawArrays(gl.LINES, 0, this.lineCount);
    }

    gl.depthMask(true);
    gl.disable(gl.BLEND);

    this.drawLabels(t, duskK);
  }

  private drawSprites(
    t: number,
    duskK: number,
    M: Float32Array,
    cb: { Sx: number; Sy: number; Sz: number; Ux: number; Uy: number; Uz: number }
  ): void {
    const gl = this.gl;
    const sprites: GlowSprite[] = []; // additive glows
    const marks: GlowSprite[] = []; // textured medallions, alpha-blended
    const push = (sp: GlowSprite) => sprites.push(sp);

    for (const s of this.spots) {
      if (!s.lantern) continue;
      const [lx, ly, lz] = s.lantern;
      const [r, g, b] = hexRgb(s.color);
      if (s.lit) {
        let a = 0.5 + duskK * 0.5;
        let size = 1.2;
        if (s.cue && !this.reducedMotion) {
          const ph = 0.5 + 0.5 * Math.sin(t * 1.7);
          a *= 0.7 + 0.5 * ph;
          size *= 1 + ph * 0.4;
        }
        if (s.kind === 'hollow') {
          // the ember gutters — it never holds steady
          a *= 0.45 + 0.3 * Math.sin(t * 6.3) * Math.sin(t * 1.1) + 0.15;
          size *= 0.85;
        }
        push({ x: lx, y: ly, z: lz, w: size, h: size, r, g, b, a });
        push({ x: lx, y: ly, z: lz, w: size * 3.6, h: size * 3.6, r, g, b, a: a * 0.13 });
        // a soft column above the cue — findable across the meadow
        if (s.cue) {
          push({ x: lx, y: ly + 4.5, z: lz, w: 1.6, h: 9, r, g, b, a: 0.10 + duskK * 0.05 });
        }
        // the medallion: this place's seal, hanging in the air above it —
        // the Atlas's pulling-light language, planted in the world
        const cell = this.glyphCell.get(s.kind);
        if (cell !== undefined) {
          let mSize = 1.35;
          let mA = 0.92;
          if (s.visited) {
            mSize = 0.95;
            mA = 0.42;
          } else if (!this.reducedMotion) {
            const breathe = 0.5 + 0.5 * Math.sin(t * 1.1 + lx * 0.3);
            mSize *= 1 + breathe * 0.1;
            mA *= 0.8 + breathe * 0.2;
          }
          if (s.cue) mSize *= 1.25;
          marks.push({
            x: lx,
            y: ly + 1.0 + (this.reducedMotion ? 0 : Math.sin(t * 0.7 + lz) * 0.12),
            z: lz,
            w: mSize,
            h: mSize,
            r: 1,
            g: 1,
            b: 1,
            a: mA,
            tex: cell,
          });
        }
      }
      // spot-specific breath
      if (s.kind === 'spring' && s.lit) {
        const mh = 1.6 + (this.reducedMotion ? 0 : Math.sin(t * 0.8) * 0.3);
        push({ x: lx, y: ly + 0.6, z: lz, w: 2.6, h: mh * 2, r: 0.75, g: 0.82, b: 0.9, a: 0.10 });
      }
      if (s.kind === 'flame' && s.lit) {
        const fl = this.reducedMotion ? 1 : 0.8 + 0.4 * Math.abs(Math.sin(t * 7.1) * Math.sin(t * 2.3));
        push({ x: lx, y: ly - 0.35, z: lz, w: 0.55 * fl, h: 1.1 * fl, r: 1, g: 0.62, b: 0.25, a: 0.85 });
      }
      if (s.kind === 'arch' && s.lit) {
        push({ x: lx, y: ly + 1.2, z: lz, w: 2.2, h: 7.5, r: 1, g: 0.9, b: 0.7, a: 0.07 + duskK * 0.05 });
      }
    }

    // the waterfall — white water off the headland into the lake, mist and
    // foam where it lands
    {
      const [tx2, ty2, tz2] = this.fallTop;
      const [bx2, by2, bz2] = this.fallBase;
      const n = this.quality > 0.25 ? 14 : 7;
      for (let i = 0; i < n; i++) {
        const u = this.reducedMotion ? i / n : (((t * 0.5 + i / n) % 1) + 1) % 1;
        const lane = ((i % 3) - 1) * 0.55; // three braided strands
        const x = mix(tx2, bx2, u) + Math.sin(i * 2.4) * 0.25;
        const y = mix(ty2, by2, u * u); // falls faster as it drops
        const z = mix(tz2, bz2, u) + lane + Math.cos(i * 1.9) * 0.2;
        const fade = Math.sin(u * Math.PI);
        push({ x, y, z, w: 0.65, h: 1.9, r: 0.85, g: 0.92, b: 0.98, a: 0.3 * fade + 0.1 });
      }
      const mistPh = this.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * 0.6);
      push({ x: bx2, y: by2 + 0.8, z: bz2, w: 4.2 + mistPh, h: 2.6, r: 0.85, g: 0.9, b: 0.95, a: 0.13 });
      push({ x: bx2 + 0.8, y: by2 + 0.15, z: bz2, w: 5.2, h: 1.1, r: 0.95, g: 0.97, b: 1, a: 0.16 });
    }

    // light drifts along the trail to the cue — the way itself beckons
    if (!this.reducedMotion) {
      const cueSpot = this.spots.find((s) => s.cue && s.lit && !s.locked);
      const trail = cueSpot ? this.spotPaths.get(cueSpot.id) : null;
      if (cueSpot && trail && trail.length > 1) {
        const [cr, cg2, cb2] = hexRgb(cueSpot.color);
        for (let i = 0; i < 7; i++) {
          const u = (((t * 0.045 + i / 7) % 1) + 1) % 1; // stays positive
          const fi = u * (trail.length - 1);
          const seg = clamp(Math.floor(fi), 0, trail.length - 2);
          const su = fi - seg;
          const x = mix(trail[seg].x, trail[seg + 1].x, su);
          const z = mix(trail[seg].z, trail[seg + 1].z, su);
          const y = this.heightAt(x, z) + 0.5 + Math.sin(t * 1.3 + i * 2) * 0.15;
          push({ x, y, z, w: 0.16, h: 0.16, r: cr, g: cg2, b: cb2, a: 0.55 * Math.sin(u * Math.PI) });
        }
      }
    }

    // pollen motes drift through the meadow air
    if (!this.reducedMotion && this.quality > 0.25) {
      for (const m of this.motes) {
        const y =
          this.heightAt(m.x, m.z) + 1.1 + Math.sin(t * 0.35 + m.ph) * 0.8;
        const x = m.x + Math.sin(t * 0.22 + m.ph * 2.1) * 1.6;
        const z = m.z + Math.cos(t * 0.19 + m.ph * 1.3) * 1.6;
        const d = Math.hypot(x - this.pos.x, z - this.pos.z);
        if (d > 70) continue;
        push({ x, y, z, w: 0.05, h: 0.05, r: 1, g: 0.95, b: 0.8, a: 0.5 * (1 - d / 70) });
      }
      // fireflies wake with the dusk, around lit lanterns
      if (duskK > 0.25) {
        if (this.flies.length === 0) {
          const rng = mulberry32(5150);
          for (const s of this.spots) {
            if (!s.lantern) continue;
            for (let i = 0; i < 5; i++) {
              const [r, g, b] = hexRgb(s.color);
              this.flies.push({
                bx: s.lantern[0],
                by: s.lantern[1],
                bz: s.lantern[2],
                ph: rng() * Math.PI * 2,
                r: mix(r, 1, 0.4),
                g: mix(g, 0.95, 0.4),
                b: mix(b, 0.5, 0.4),
              });
            }
          }
        }
        for (const f of this.flies) {
          const spot = this.spots.find(
            (s) => s.lantern && s.lantern[0] === f.bx && s.lantern[2] === f.bz
          );
          if (spot && !spot.lit) continue;
          const x = f.bx + Math.sin(t * 0.6 + f.ph * 3.1) * 2.8;
          const y = f.by + Math.sin(t * 0.9 + f.ph * 1.7) * 1.2 - 0.4;
          const z = f.bz + Math.cos(t * 0.5 + f.ph * 2.3) * 2.8;
          const blink = Math.max(0, Math.sin(t * 1.8 + f.ph * 5));
          push({ x, y, z, w: 0.07, h: 0.07, r: f.r, g: f.g, b: f.b, a: blink * duskK * 0.9 });
        }
      }
    }

    if (sprites.length === 0 && marks.length === 0) return;
    const FLOATS = 12;
    const corners = [
      [-0.5, -0.5],
      [0.5, -0.5],
      [0.5, 0.5],
      [-0.5, -0.5],
      [0.5, 0.5],
      [-0.5, 0.5],
    ];
    const pack = (list: GlowSprite[]): Float32Array => {
      const D = new Float32Array(list.length * 6 * FLOATS);
      let o = 0;
      for (const sp of list) {
        for (const [cx2, cy2] of corners) {
          D[o++] = sp.x;
          D[o++] = sp.y;
          D[o++] = sp.z;
          D[o++] = cx2;
          D[o++] = cy2;
          D[o++] = sp.w;
          D[o++] = sp.h;
          D[o++] = sp.r;
          D[o++] = sp.g;
          D[o++] = sp.b;
          D[o++] = sp.a;
          D[o++] = sp.tex ?? -1;
        }
      }
      return D;
    };
    const prog = this.progs.sprite;
    gl.useProgram(prog.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.glyphs);
    gl.uniform1i(prog.u.uGlyphs, 0);
    gl.uniformMatrix4fv(prog.u.uVP, false, M);
    gl.uniform3f(prog.u.uCamRight, cb.Sx, cb.Sy, cb.Sz);
    gl.uniform3f(prog.u.uCamUp, cb.Ux, cb.Uy, cb.Uz);
    const stride = FLOATS * 4;
    const bindAndDraw = (buf: WebGLBuffer, list: GlowSprite[]) => {
      if (!list.length) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, pack(list), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(prog.a.aCenter);
      gl.vertexAttribPointer(prog.a.aCenter, 3, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(prog.a.aCorner);
      gl.vertexAttribPointer(prog.a.aCorner, 2, gl.FLOAT, false, stride, 12);
      gl.enableVertexAttribArray(prog.a.aSize);
      gl.vertexAttribPointer(prog.a.aSize, 2, gl.FLOAT, false, stride, 20);
      gl.enableVertexAttribArray(prog.a.aColor);
      gl.vertexAttribPointer(prog.a.aColor, 4, gl.FLOAT, false, stride, 28);
      gl.enableVertexAttribArray(prog.a.aTex);
      gl.vertexAttribPointer(prog.a.aTex, 1, gl.FLOAT, false, stride, 44);
      gl.drawArrays(gl.TRIANGLES, 0, list.length * 6);
    };
    // glows add light; medallions sit over the sky like set seals
    gl.blendFunc(gl.ONE, gl.ONE);
    bindAndDraw(this.buffers.sprites, sprites);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    bindAndDraw(this.buffers.sprites2, marks);
  }

  /** Etched labels on the 2D overlay — the Voyage's label language, walked. */
  private drawLabels(t: number, duskK: number): void {
    const ctx = this.lctx;
    ctx.clearRect(0, 0, this.w, this.h);
    if (this.mode === 'seated' || this.mode === 'reveal') return;
    for (const s of this.spots) {
      if (!s.pos || !s.lantern) continue;
      const showable = s.active || s.visited || s.locked;
      if (!showable) continue;
      const d = Math.hypot(s.pos[0] - this.pos.x, s.pos[2] - this.pos.z);
      // unvisited places call from further away — discovery over tidiness
      const range = s.lit && !s.visited ? 250 : 130;
      if (d > range) continue;
      const p = this.project(s.lantern[0], s.lantern[1] + 1.9, s.lantern[2]);
      if (!p) continue;
      const alpha =
        clamp(1.6 - d / (range * 0.62), 0, 0.95) * (s.active || s.locked ? 1 : 0.55);
      if (alpha <= 0.03) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      let y = p.y;
      if (s.subtitle) {
        ctx.font = '9px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.fillStyle = s.color;
        ctx.globalAlpha = alpha * 0.85;
        ctx.fillText(s.subtitle.toUpperCase().split('').join('  '), p.x, y);
        y += 15;
        ctx.globalAlpha = alpha;
      }
      ctx.font = '13px Georgia, serif';
      const bright = 0.75 + duskK * 0.2;
      ctx.fillStyle = `rgba(${Math.round(245 * bright)},${Math.round(248 * bright)},${Math.round(250 * bright)},0.95)`;
      ctx.shadowColor = 'rgba(10,14,20,0.75)';
      ctx.shadowBlur = 4;
      const words = s.title.split(' ');
      const lines: string[] = [];
      let cur = '';
      for (const wd of words) {
        if (cur && (cur + ' ' + wd).length > 26) {
          lines.push(cur);
          cur = wd;
        } else cur = cur ? cur + ' ' + wd : wd;
        if (lines.length === 2) break;
      }
      if (cur && lines.length < 2) lines.push(cur);
      lines.forEach((ln, i) => ctx.fillText(ln, p.x, y + i * 16));
      ctx.restore();
    }
    void t;
  }
}
