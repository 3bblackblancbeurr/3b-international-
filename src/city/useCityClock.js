import {useEffect, useRef, useState} from 'react';

export default function useCityClock(serverTime) {
  const anchor = useRef({source: null, time: Date.now(), tick: performance.now()});
  if (serverTime && anchor.current.source !== serverTime) {
    const parsed = Date.parse(serverTime);
    if (Number.isFinite(parsed)) anchor.current = {source: serverTime, time: parsed, tick: performance.now()};
  }
  const [, setTick] = useState(0);
  useEffect(() => {
    const update = () => { if (!document.hidden) setTick(value => value + 1); };
    const timer = setInterval(update, 1000);
    document.addEventListener('visibilitychange', update);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, []);
  return anchor.current.time + performance.now() - anchor.current.tick;
}
