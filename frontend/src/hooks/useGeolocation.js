import { useState, useCallback } from 'react';

export function useGeolocation() {
  const [geo, setGeo] = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | loading | ok | denied | unavailable | timeout

  const capture = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus('unavailable');
      return Promise.reject(new Error('Geolocalización no disponible en este navegador'));
    }
    setGeoStatus('loading');
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const result = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
            capturedAt: new Date().toISOString(),
            status: 'ok',
          };
          setGeo(result);
          setGeoStatus('ok');
          resolve(result);
        },
        (error) => {
          let status = 'unavailable';
          if (error.code === error.PERMISSION_DENIED) status = 'denied';
          else if (error.code === error.TIMEOUT) status = 'timeout';
          setGeoStatus(status);
          reject(new Error(status));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  function reset() {
    setGeo(null);
    setGeoStatus('idle');
  }

  return { geo, geoStatus, capture, reset };
}
