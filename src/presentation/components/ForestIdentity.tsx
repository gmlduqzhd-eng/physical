import {Droplets} from 'lucide-react';

export function ForestBrand({subtitle}:{subtitle?:string}){
 return <><Droplets className="forest-brand-mark" aria-hidden="true"/><span className="forest-brand-name">땀방울 원정대{subtitle&&<small>{subtitle}</small>}</span></>;
}

export function ForestOrbit(){
 return <div className="forest-orbit" aria-hidden="true"><span className="forest-ring forest-ring-back"/><span className="forest-ring"/><span className="forest-orbit-label">MOVE · CONNECT · PLAY</span></div>;
}
