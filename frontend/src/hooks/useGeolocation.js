import { useState, useCallback } from 'react';

export function useGeolocation() {
  const [geo, setGeo] = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | loading | ok | denied | unavailable | timeout

  const capture = useCallback((options = {}) => {
    const desiredAccuracy = Number(options.desiredAccuracyMeters ?? 30);
    const timeoutMs = Number(options.timeoutMs ?? 20000);

    if (!navigator.geolocation) {
      setGeoStatus('unavailable');
      return Promise.reject(new Error('Geolocalización no disponible en este navegador'));
    }

    setGeoStatus('loading');

    return new Promise((resolve, reject) => {
      let best = null;
      let settled = false;

      const finishSuccess = (result) => {
        if (settled) return;
        settled = true;
        navigator.geolocation.clearWatch(watchId);
        clearTimeout(timerId);
        setGeo(result);
        setGeoStatus('ok');
        resolve(result);
      };

      const finishError = (status) => {
        if (settled) return;
        settled = true;
        navigator.geolocation.clearWatch(watchId);
        clearTimeout(timerId);
        setGeoStatus(status);
        reject(new Error(status));
      };

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const current = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
            capturedAt: new Date().toISOString(),
            status: 'ok',
          };

          if (!best || current.accuracyMeters < best.accuracyMeters) {
            best = current;
          }

          if (current.accuracyMeters <= desiredAccuracy) {
            finishSuccess(current);
          }
        },
        (error) => {
          let status = 'unavailable';
          if (error.code === error.PERMISSION_DENIED) status = 'denied';
          else if (error.code === error.TIMEOUT) status = 'timeout';
          finishError(status);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      const timerId = setTimeout(() => {
        if (best) {
          finishSuccess(best);
        } else {
          finishError('timeout');
        }
      }, timeoutMs);
    });
  }, []);

  function reset() {
    setGeo(null);
    setGeoStatus('idle');
  }

  return { geo, geoStatus, capture, reset };
}
