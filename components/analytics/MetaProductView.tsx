'use client';

import { useEffect, useRef } from 'react';
import { PRIVACY_CHANGED_EVENT } from '@/lib/privacy';
import { trackMetaEvent } from '@/lib/meta-pixel';

export function MetaProductView({ id, name, value }: { id: string; name: string; value: number }) {
  const trackedId = useRef<string | null>(null);
  useEffect(() => {
    const track = () => {
      if (trackedId.current !== id && trackMetaEvent('ViewContent', {
        content_ids: [id], content_name: name, content_type: 'product', value, currency: 'BRL',
      })) trackedId.current = id;
    };
    track();
    window.addEventListener(PRIVACY_CHANGED_EVENT, track);
    return () => window.removeEventListener(PRIVACY_CHANGED_EVENT, track);
  }, [id, name, value]);
  return null;
}
