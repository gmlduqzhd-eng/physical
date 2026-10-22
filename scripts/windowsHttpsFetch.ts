import {spawnSync} from 'node:child_process';
// Use the Windows certificate store on this Windows test host. Certificate
// validation stays enabled; credentials only pass through curl's stdin.
export const windowsHttpsFetch:typeof fetch=async(input,init)=>{
 const request=new Request(input,init);if(new URL(request.url).protocol!=='https:')throw Error('HTTPS required');
 const config=['silent','show-error','ssl-revoke-best-effort','url = '+JSON.stringify(request.url),'request = '+JSON.stringify(request.method),'write-out = "\\n%{http_code}"'];
 request.headers.forEach((value,key)=>config.push('header = '+JSON.stringify(key+': '+value)));
 if(!['GET','HEAD'].includes(request.method))config.push('data = '+JSON.stringify(await request.text()));
 const result=spawnSync('curl.exe',['--config','-'],{input:config.join('\n'),encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});
 if(result.status!==0)throw Error('Windows verified HTTPS request failed');
 const split=result.stdout.lastIndexOf('\n'),status=Number(result.stdout.slice(split+1));
 return new Response(status===204?null:result.stdout.slice(0,split),{status,headers:{'content-type':'application/json'}});
};
