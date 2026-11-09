import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const target=new URL('../public/vision/',import.meta.url);
await mkdir(target,{recursive:true});
const expected='59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a';
const model=new URL('pose_landmarker_lite.task',target);
let bytes=await readFile(model).catch(()=>null);
if(!bytes||createHash('sha256').update(bytes).digest('hex')!==expected){
 const response=await fetch('https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',{signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error('Official pose model download failed');bytes=Buffer.from(await response.arrayBuffer());
 if(createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('Pose model integrity mismatch');await writeFile(model,bytes);
}
for(const file of ['vision_wasm_internal.js','vision_wasm_internal.wasm','vision_wasm_module_internal.js','vision_wasm_module_internal.wasm'])await copyFile(new URL('../node_modules/@mediapipe/tasks-vision/wasm/'+file,import.meta.url),new URL(file,target));
await writeFile(new URL('NOTICE.txt',target),'MediaPipe Tasks Vision 1.2.2, Apache-2.0. Google pose_landmarker_lite float16 model version 1. Source: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker . Model SHA256: '+expected+'\n');
await copyFile(new URL('../docs/licenses/MediaPipe-Apache-2.0.txt',import.meta.url),new URL('LICENSE.txt',target));
console.log('Prepared pinned, same-origin vision runtime and verified model. No camera data is used by this build.');
