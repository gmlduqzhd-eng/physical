import type {PoseDetector} from './localPoseSession';

export type PoseMode='auto'|'compatibility';
export function poseCameraConstraints(mode:PoseMode,facingMode:'user'|'environment'):MediaStreamConstraints{
 return {audio:false,video:{width:{ideal:mode==='auto'?640:480},height:{ideal:mode==='auto'?480:360},frameRate:{ideal:24,max:30},facingMode}};
}

// GPU is optional: keep the same locally hosted model and confidence limits
// when falling back. This never opens another camera or uploads a frame.
export async function compatiblePoseDetector(create:(engine:'GPU'|'CPU')=>Promise<Omit<PoseDetector,'engine'>>,cpuOnly=false):Promise<PoseDetector>{
 let engine:'GPU'|'CPU'=cpuOnly?'CPU':'GPU',model:Omit<PoseDetector,'engine'>;
 try{model=await create(engine);}catch(error){if(cpuOnly)throw error;engine='CPU';model=await create(engine);}
 return {engine,detectForVideo:(video,time)=>model.detectForVideo(video,time),close:()=>model.close()};
}
