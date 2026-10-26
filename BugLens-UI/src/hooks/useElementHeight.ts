import { useEffect, useState } from "react";

// Height of an element, updated whenever it resizes (window resize, sidebar collapse...).
// Returns a callback ref, so it also works when the element mounts later.
export function useElementHeight<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setHeight(Math.floor(entry.contentRect.height)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return [setElement, height] as const;
}
