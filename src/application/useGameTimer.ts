import { useState, useEffect } from 'react';
import type { GameRoom } from '../domain/types';
import { timeOffset } from './timeSync';

export const useGameTimer = (gameRoom: GameRoom | null) => {
  const [timeLeft, setTimeLeft] = useState<number>(300);

  useEffect(() => {
    if (!gameRoom) return;

      const activeStatuses = ['playing', 'boss_raid', 'time_attack', 'defense', 'zombie', 'mafia', 'tsunami'];
      
      const updateTimer = () => {
        if (gameRoom.started_at) {
          const start = new Date(gameRoom.started_at).getTime();
          const now = Date.now() + timeOffset;
          const elapsed = Math.floor((now - start) / 1000);
          
          let remaining = 300 - elapsed + gameRoom.global_time_modifier;
          if (remaining < 0) remaining = 0;
          setTimeLeft(remaining);
        } else {
          let remaining = 300 + gameRoom.global_time_modifier;
          if (remaining < 0) remaining = 0;
          setTimeLeft(remaining);
        }
      };

      // Initial update when gameRoom changes
      updateTimer();

      const interval = setInterval(() => {
        if (activeStatuses.includes(gameRoom.status)) {
          updateTimer();
        }
      }, 1000);

    return () => clearInterval(interval);
  }, [gameRoom]);

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');
  const isDanger = timeLeft > 0 && timeLeft <= 60;
  const isTimeUp = timeLeft <= 0;

  return { timeLeft, mins, secs, isDanger, isTimeUp };
};
