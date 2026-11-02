'use client';
import { useEffect, useRef } from 'react';
//@ts-ignore
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet marker icon fix — runs once
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

export default function MapInner({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Guard against a stale _leaflet_id on a recycled DOM node
    if ((el as any)._leaflet_id) {
      delete (el as any)._leaflet_id;
    }

    const map = L.map(el, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([lat, lng]).addTo(map);

    mapRef.current = map;
    markerRef.current = marker;

    // Force a resize after mount so tiles align correctly
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      if ((el as any)._leaflet_id) delete (el as any)._leaflet_id;
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // init once per mount

  // Recenter marker + view when coords change (e.g., every telemetry update)
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    mapRef.current.setView([lat, lng], mapRef.current.getZoom(), {
      animate: true,
    });
    markerRef.current.setLatLng([lat, lng]);
  }, [lat, lng]);

  return <div ref={containerRef} style={{ height: 360, width: '100%' }} />;
}