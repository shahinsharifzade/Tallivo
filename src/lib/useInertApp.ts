import { useEffect } from 'react';

/** Makes the app behind a full-screen overlay unreachable by focus and pointer while mounted. */
export function useInertApp(): void {
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    root.inert = true;
    return () => {
      root.inert = false;
    };
  }, []);
}
