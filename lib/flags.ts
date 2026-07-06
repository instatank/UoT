// Feature flags. The Door (Two Doors + Naming + crisis off-ramp, locked
// decision 11) is Phase 3 product work being trialed inside the sandbox:
// on in dev so AA can feel it, opt-in in production via NEXT_PUBLIC_DOORS=1
// so the deployed sandbox home stays unchanged until Phase 3 flips it.
// Both values are inlined at build time.
export const doorsEnabled =
  process.env.NEXT_PUBLIC_DOORS === '1' || process.env.NODE_ENV === 'development';
