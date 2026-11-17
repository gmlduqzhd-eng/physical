import type {SignatureModule} from '../moduleTypes';
import signalCaptain from './sig-signal-captain';
import bossRaid from './sig-boss-raid';
import moveBingo from './sig-move-bingo';
import mirrorPair from './sig-mirror-pair';
import memoryRelay from './sig-memory-relay';
import stageShow from './sig-stage-show';

/** 대표 게임 id → 화면 부품. 여섯 게임 모두 미리 연결해 두었으니, 각 모듈 파일만 고치면 된다. */
export const SIGNATURE_MODULES:Readonly<Record<string,SignatureModule>>={
 'sig-signal-captain':signalCaptain,
 'sig-boss-raid':bossRaid,
 'sig-move-bingo':moveBingo,
 'sig-mirror-pair':mirrorPair,
 'sig-memory-relay':memoryRelay,
 'sig-stage-show':stageShow,
};
