import { useEffect, useRef } from 'react';

/**
 * V7 removes the country splash page entirely. The canonical travel handoff is
 * triggered immediately after the user chooses a country in the Nexus.
 */
export default function NexusCountryArrival({ world, onEnter }) {
  const launched = useRef(false);
  useEffect(() => {
    if (!world || launched.current) return;
    launched.current = true;
    void onEnter();
  }, [world, onEnter]);
  return null;
}
