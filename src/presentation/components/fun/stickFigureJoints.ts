import type {Pose} from '../../../domain/signature/types';

export type P=[number,number];
export interface Joints {head:P;hip:P;lElbow:P;lHand:P;rElbow:P;rHand:P;lKnee:P;lFoot:P;rKnee:P;rFoot:P}
const stand:Joints={head:[50,18],hip:[50,68],lElbow:[40,52],lHand:[37,68],rElbow:[60,52],rHand:[63,68],lKnee:[44,88],lFoot:[42,108],rKnee:[56,88],rFoot:[58,108]};
export const POSE_JOINTS:Readonly<Record<Pose,Joints>>={
 stand,
 armsUp:{...stand,lElbow:[40,22],lHand:[36,6],rElbow:[60,22],rHand:[64,6]},
 armsSide:{...stand,lElbow:[32,36],lHand:[14,36],rElbow:[68,36],rHand:[86,36]},
 armsFront:{...stand,lElbow:[42,44],lHand:[40,52],rElbow:[58,44],rHand:[60,52],head:[50,18]},
 armsDown:{...stand,lElbow:[45,54],lHand:[44,72],rElbow:[55,54],rHand:[56,72]},
 squat:{...stand,head:[50,32],hip:[50,80],lElbow:[38,58],lHand:[30,60],rElbow:[62,58],rHand:[70,60],lKnee:[36,88],lFoot:[40,108],rKnee:[64,88],rFoot:[60,108]},
 jump:{...stand,head:[50,10],hip:[50,60],lElbow:[34,20],lHand:[22,6],rElbow:[66,20],rHand:[78,6],lKnee:[38,78],lFoot:[30,94],rKnee:[62,78],rFoot:[70,94]},
 stepLeft:{...stand,head:[44,18],hip:[46,68],lKnee:[34,88],lFoot:[24,108],rKnee:[54,88],rFoot:[58,108]},
 stepRight:{...stand,head:[56,18],hip:[54,68],lKnee:[46,88],lFoot:[42,108],rKnee:[66,88],rFoot:[76,108]},
 oneLeg:{...stand,lElbow:[32,40],lHand:[18,44],rElbow:[68,40],rHand:[82,44],rKnee:[66,80],rFoot:[56,90]},
 clap:{...stand,lElbow:[40,44],lHand:[49,30],rElbow:[60,44],rHand:[51,30]},
 point:{...stand,rElbow:[70,32],rHand:[90,24]},
 freeze:{...stand,lElbow:[38,46],lHand:[30,34],rElbow:[62,46],rHand:[70,34]},
 punch:{...stand,rElbow:[70,38],rHand:[92,38],lElbow:[42,46],lHand:[48,40]},
 wave:{...stand,rElbow:[68,24],rHand:[76,8]},
 sit:{...stand,head:[50,30],hip:[46,76],lKnee:[66,76],lFoot:[68,100],rKnee:[66,80],rFoot:[70,104],lElbow:[40,60],lHand:[44,74],rElbow:[58,60],rHand:[62,74]},
 run:{...stand,lElbow:[38,46],lHand:[44,58],rElbow:[62,30],rHand:[70,40],lKnee:[38,84],lFoot:[30,98],rKnee:[60,80],rFoot:[64,106]},
};

/**
 * 막대 사람 관절. seated면 다리는 늘 앉은 자세(의자에 앉음)이고, 머리·팔은 그 자세의 윗몸 모양을
 * 앉은 높이로 내려 그린다(점프·달리기·한 발 서기도 앉아서 하는 팔 동작으로 보인다).
 */
export function figureJoints(pose:Pose,seated=false):Joints{
 const j=POSE_JOINTS[pose]??stand;
 if(!seated||pose==='sit')return j;
 const sit=POSE_JOINTS.sit,dy=sit.head[1]-j.head[1],dx=sit.head[0]-j.head[0];
 const move=(p:P):P=>[p[0]+dx,p[1]+dy];
 return {
  head:sit.head,hip:sit.hip,lKnee:sit.lKnee,lFoot:sit.lFoot,rKnee:sit.rKnee,rFoot:sit.rFoot,
  lElbow:move(j.lElbow),lHand:move(j.lHand),rElbow:move(j.rElbow),rHand:move(j.rHand),
 };
}
