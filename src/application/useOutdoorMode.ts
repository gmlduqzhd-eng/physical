import { useState, useEffect } from 'react';

export const useOutdoorMode = () => {
  const [isOutdoorMode, setIsOutdoorMode] = useState(() => {
    return localStorage.getItem('physical_outdoor_mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('physical_outdoor_mode', String(isOutdoorMode));
    if (isOutdoorMode) {
      document.documentElement.classList.add('outdoor-mode');
    } else {
      document.documentElement.classList.remove('outdoor-mode');
    }
  }, [isOutdoorMode]);

  const toggleOutdoorMode = () => setIsOutdoorMode(prev => !prev);

  return { isOutdoorMode, toggleOutdoorMode };
};
