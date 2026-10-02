export const PX=10.75,PY=.35,PZ=.9,L=1.65,HR=.22,GX=12.1;
export const initial=Math.PI;
export const hit=Math.acos((GX-.0375-HR-.005-PX)/L);
export const GY=PY+L*Math.sin(hit);
export function strikerAngle(t,release,strike){
 let theta=initial;
 if(t>release&&t<strike){const u=(t-release)/(strike-release);theta=initial+(hit-initial)*u*u;}
 if(t>=strike){const q=t-strike;theta=hit+.16*(1-Math.exp(-q*16))+.04*Math.sin(q*22)*Math.exp(-q*7);}
 return Math.max(hit,theta);
}
