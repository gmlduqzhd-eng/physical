// Only input provenance is described here; this does not assess body performance.
export const rescueInputMode=(usedAssistance:boolean,assisted:boolean)=>usedAssistance||assisted?'assisted' as const:'camera' as const;
export function shipExchangeReady(previous:number,owned:number,axes:{claimed:boolean}[]){return previous>=0&&owned>=0&&owned!==previous&&axes.length===2&&axes.every(axis=>axis.claimed);}
export function shadowTiming(baseMs:number,slow:boolean){const sampleMs=baseMs*(slow?1.5:1);return {sampleMs,previewMs:8*sampleMs};}
