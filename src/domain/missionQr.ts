export const TREASURE_QR_CODES=['TREASURE_SCORE_500','TREASURE_SCORE_1000','TREASURE_ITEM_DOUBLE','TREASURE_ITEM_COOLDOWN','TREASURE_ITEM_BONUS','TREASURE_BOMB_DEFUSE'] as const;
export function missionQrValue(text:string,missionIds:readonly string[]):string|null{
 return text.length<=4096&&(missionIds.includes(text)||(TREASURE_QR_CODES as readonly string[]).includes(text))?text:null;
}
