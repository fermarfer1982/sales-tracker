import { useState, useCallback } from 'react';

const MAX_ACCEPTABLE_ACCURACY_METERS = 2000;
const WATCH_BEST_EFFORT_WINDOW_MS = 15000;

function buildGeoResult(position) {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracyMeters: position.coords.accuracy,
    capturedAt: new Date().toISOString(),
    status: 'ok',
  };
}

export function useGeolocation() {
  const [geo, setGeo] = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | loading | ok | denied | unavailable | timeout | low_accuracy

  const capture = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus('unavailable');
      return Promise.reject(new Error('Geolocalización no disponible en este navegador'));
    }

    setGeoStatus('loading');

    return new Promise((resolve, reject) => {
      let bestResult = null;

      const handleSuccess = (position) => {
        const result = buildGeoResult(position);

        if (!bestResult || result.accuracyMeters < bestResult.accuracyMeters) {
          bestResult = result;
        }

        if (result.accuracyMeters <= MAX_ACCEPTABLE_ACCURACY_METERS) {
          setGeo(result);
          setGeoStatus('ok');
          resolve(result);
          return true;
        }

        return false;
      };

      const handleError = (error) => {
        let status = 'unavailable';
        if (error.code === error.PERMISSION_DENIED) status = 'denied';
        else if (error.code === error.TIMEOUT) status = 'timeout';
        setGeoStatus(status);
        reject(new Error(status));
      };

      navigator.geolocation.getCurrentPosition(
        (firstPosition) => {
          if (handleSuccess(firstPosition)) return;

          let finished = false;
          const finishLowAccuracy = () => {
            if (finished) return;
            finished = true;
            if (watchId) navigator.geolocation.clearWatch(watchId);
            setGeoStatus('low_accuracy');
            const err = new Error('low_accuracy');
            err.details = { accuracyMeters: bestResult?.accuracyMeters || null };
            reject(err);
          };

          const watchId = navigator.geolocation.watchPosition(
            (position) => {
              if (finished) return;
              if (handleSuccess(position)) {
                finished = true;
                navigator.geolocation.clearWatch(watchId);
              }
            },
            (error) => {
              if (finished) return;
              finished = true;
              navigator.geolocation.clearWatch(watchId);
              handleError(error);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );

          setTimeout(finishLowAccuracy, WATCH_BEST_EFFORT_WINDOW_MS);
        },
        handleError,
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
