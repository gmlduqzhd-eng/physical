import { useState, useCallback, useRef } from 'react';
import { isRecord, nonnegativeNumber, readJsonStorage, writeStorage } from './browserStorage';

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

export const normalizeTamagotchiState = (value: unknown): TamagotchiState => {
  if (!isRecord(value)) return {
    name: '땀방이', xp: 120, coins: 350, equippedHat: 'sweatband', equippedAccessory: '', equippedMedal: 'bronze',
    inventory: ['sweatband', 'bronze', 'sunglasses'],
  };
  const inventory = Array.isArray(value.inventory)
    ? [...new Set(value.inventory.filter((id): id is string => typeof id === 'string' && TAMAGOTCHI_ITEMS.some(item => item.id === id)))]
    : ['sweatband', 'bronze', 'sunglasses'];
  const equipped = (id: unknown, category: TamagotchiItem['category']) =>
    typeof id === 'string' && inventory.includes(id) && TAMAGOTCHI_ITEMS.some(item => item.id === id && item.category === category) ? id : '';
  return {
    name: typeof value.name === 'string' && value.name.trim() ? value.name.trim().slice(0, 20) : '땀방이',
    xp: nonnegativeNumber(value.xp, 120), coins: nonnegativeNumber(value.coins, 350), inventory,
    equippedHat: equipped(value.equippedHat, 'hat'),
    equippedAccessory: equipped(value.equippedAccessory, 'accessory'),
    equippedMedal: equipped(value.equippedMedal, 'medal'),
  };
};

export const useTamagotchi = () => {
  const [state, setState] = useState<TamagotchiState>(() => normalizeTamagotchiState(readJsonStorage(STORAGE_KEY)));
  const stateRef = useRef(state);

  const level = Math.min(10, Math.floor(state.xp / 100) + 1);
  const currentLevelXp = level === 10 ? 100 : state.xp % 100;
  const nextLevelXp = 100;

  const save = useCallback((nextState: TamagotchiState) => {
    stateRef.current = nextState;
    setState(nextState);
    writeStorage(STORAGE_KEY, JSON.stringify(nextState));
  }, []);

  const addXpAndCoins = useCallback((xpGain: number, coinGain: number) => {
    if (!Number.isFinite(xpGain) || !Number.isFinite(coinGain) || xpGain < 0 || coinGain < 0) return;
    const current = stateRef.current;
    save({ ...current, xp: current.xp + xpGain, coins: current.coins + coinGain });
  }, [save]);

  const buyItem = useCallback((item: TamagotchiItem) => {
    const current = stateRef.current;
    const catalogItem = TAMAGOTCHI_ITEMS.find(candidate => candidate.id === item.id);
    if (!catalogItem || current.coins < catalogItem.cost || current.inventory.includes(item.id)
      || Math.floor(current.xp / 100) + 1 < catalogItem.requiredLevel) return false;
    const next: TamagotchiState = {
      ...current,
      coins: current.coins - catalogItem.cost,
      inventory: [...current.inventory, item.id]
    };
    save(next);
    return true;
  }, [save]);

  const equipItem = useCallback((item: TamagotchiItem) => {
    const current = stateRef.current;
    const catalogItem = TAMAGOTCHI_ITEMS.find(candidate => candidate.id === item.id);
    if (!catalogItem || !current.inventory.includes(item.id)) return;
    const next: TamagotchiState = { ...current };
    if (catalogItem.category === 'hat') {
      next.equippedHat = next.equippedHat === item.id ? '' : item.id;
    } else if (catalogItem.category === 'accessory') {
      next.equippedAccessory = next.equippedAccessory === item.id ? '' : item.id;
    } else if (catalogItem.category === 'medal') {
      next.equippedMedal = next.equippedMedal === item.id ? '' : item.id;
    }
    save(next);
  }, [save]);

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
