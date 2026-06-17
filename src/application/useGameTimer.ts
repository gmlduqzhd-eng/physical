import { useState, useEffect } from 'react';
import type { GameControl } from '../domain/types';

export const useGameTimer = (gameControl: GameControl | null) => {
  const [timeLeft, setTimeLeft] = useState<number>(300);

  useEffect(() => {
    if (!gameControl) return;

    const interval = setInterval(() => {
      if (gameControl.status === 'playing' && gameControl.started_at) {
        const start = new Date(gameControl.started_at).getTime();
        const now = new Date().getTime();
        const elapsed = Math.floor((now - start) / 1000);
        
        let remaining = 300 - elapsed + gameControl.global_time_modifier;
        if (remaining < 0) remaining = 0;
        setTimeLeft(remaining);
      } else if (!gameControl.started_at) {
        let remaining = 300 + gameControl.global_time_modifier;
        if (remaining < 0) remaining = 0;
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameControl]);

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');
  const isDanger = timeLeft > 0 && timeLeft <= 60;
  const isTimeUp = timeLeft <= 0;

  return { timeLeft, mins, secs, isDanger, isTimeUp };
};
