import {armInput,type PosePoint} from '../domain/flagship';

export type PoseDiagnostics={body:boolean;shoulder:boolean;wrist:boolean};
const visible=(p:PosePoint|undefined)=>!!p&&[p.x,p.y,p.visibility].every(v=>typeof v==='number'&&Number.isFinite(v))&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1&&(p.visibility??0)>=.65;

// Guidance uses the same confidence boundary as the game. A partly inferred
// or off-frame arm must not become a successful movement measurement.
export function assessArmFrame(points:PosePoint[]){
 const diagnostic:PoseDiagnostics={body:points.length>0,shoulder:visible(points[12]),wrist:visible(points[16])};
 let message='';
 if(!diagnostic.body)message='몸을 찾지 못했어요. 미리 보기를 켜고 기기에서 조금 떨어져 상체와 두 팔이 화면에 들어오게 해 주세요.';
 else if(!diagnostic.shoulder)message='오른쪽 어깨가 잘 보이지 않아요. 상체가 화면 안에 들어오도록 기기의 높이와 방향을 조절해 주세요.';
 else if(!diagnostic.wrist)message='오른손목이 잘 보이지 않아요. 손목을 화면 안에 두고 몸이나 물건에 가리지 않게 해 주세요.';
 const value=message?null:armInput(points);
 if(!message&&!value)message='어깨와 손목이 겹치지 않게 오른팔을 편안한 범위에서 조금 펼쳐 주세요.';
 return {diagnostic,value,message};
}
