import { useState, useCallback } from 'react';

export interface TamagotchiItem {
  id: string;
  name: string;
  category: 'hat' | 'accessory' | 'medal';
  emoji: string;
  requiredLevel: number;
  cost: number;
}

export const TAMAGOTCHI_ITEMS: TamagotchiItem[] = [
  { id: 'sweatband', name: '스포츠 헤어밴드', category: 'hat', emoji: '🔴', requiredLevel: 1, cost: 0 },
  { id: 'cap', name: '스냅백 모자', category: 'hat', emoji: '🧢', requiredLevel: 2, cost: 100 },
  { id: 'crown', name: '황금 왕관', category: 'hat', emoji: '👑', requiredLevel: 5, cost: 500 },
  { id: 'sunglasses', name: '멋쟁이 선글라스', category: 'accessory', emoji: '🕶️', requiredLevel: 1, cost: 50 },
  { id: 'headset', name: '게이밍 헤드셋', category: 'accessory', emoji: '🎧', requiredLevel: 3, cost: 200 },
  { id: 'basketball', name: '미니 농구공', category: 'accessory', emoji: '🏀', requiredLevel: 2, cost: 150 },
  { id: 'bronze', name: '동메달', category: 'medal', emoji: '🥉', requiredLevel: 1, cost: 0 },
  { id: 'silver', name: '은메달', category: 'medal', emoji: '🥈', requiredLevel: 3, cost: 250 },
  { id: 'gold', name: '금메달', category: 'medal', emoji: '🥇', requiredLevel: 5, cost: 500 },
];

export interface TamagotchiState {
  name: string;
  xp: number;
  coins: number;
  equippedHat: string;
  equippedAccessory: string;
  equippedMedal: string;
  inventory: string[];
}

const STORAGE_KEY = 'dambang_tamagotchi_v1';

export const useTamagotchi = () => {
  const [state, setState] = useState<TamagotchiState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      name: '땀방이',
      xp: 120,
      coins: 350,
      equippedHat: 'sweatband',
      equippedAccessory: '',
      equippedMedal: 'bronze',
      inventory: ['sweatband', 'bronze', 'sunglasses']
    };
  });

  const level = Math.min(10, Math.floor(state.xp / 100) + 1);
  const currentLevelXp = state.xp % 100;
  const nextLevelXp = 100;

  const save = (nextState: TamagotchiState) => {
    setState(nextState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch {}
  };

  const addXpAndCoins = useCallback((xpGain: number, coinGain: number) => {
    setState(prev => {
      const next = {
        ...prev,
        xp: prev.xp + xpGain,
        coins: prev.coins + coinGain
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const buyItem = useCallback((item: TamagotchiItem) => {
    if (state.coins < item.cost || state.inventory.includes(item.id)) return false;
    const next: TamagotchiState = {
      ...state,
      coins: state.coins - item.cost,
      inventory: [...state.inventory, item.id]
    };
    save(next);
    return true;
  }, [state]);

  const equipItem = useCallback((item: TamagotchiItem) => {
    if (!state.inventory.includes(item.id)) return;
    const next: TamagotchiState = { ...state };
    if (item.category === 'hat') {
      next.equippedHat = next.equippedHat === item.id ? '' : item.id;
    } else if (item.category === 'accessory') {
      next.equippedAccessory = next.equippedAccessory === item.id ? '' : item.id;
    } else if (item.category === 'medal') {
      next.equippedMedal = next.equippedMedal === item.id ? '' : item.id;
    }
    save(next);
  }, [state]);

  return {
    state,
    level,
    currentLevelXp,
    nextLevelXp,
    addXpAndCoins,
    buyItem,
    equipItem
  };
};
