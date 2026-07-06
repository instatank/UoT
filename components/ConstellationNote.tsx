'use client';

import { useEffect, useState } from 'react';
import { loadSessionRecords } from '@/lib/constellation';

// Dev-facing note that the persistence stub is working — deliberately not a
// progression signal; just plumbing visibility for the sandbox.
export default function ConstellationNote() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    setCount(loadSessionRecords().length);
  }, []);
  if (!count) return null;
  return (
    <p>
      Constellation stub: {count} session record{count === 1 ? '' : 's'} in localStorage
      (`uot.constellation.v1`), shaped for the future cross-session layer.
    </p>
  );
}
