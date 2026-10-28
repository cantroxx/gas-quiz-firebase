/* Port of the supplied StudioPrismTransform / StudioColorTransform reference.
 * Keep float32 operations explicit; fixtures cover nibble-space boundaries. */
(function(root) {
  'use strict';
  const f=Math.fround,add=(a,b)=>f(a+b),sub=(a,b)=>f(a-b),mul=(a,b)=>f(a*b),div=(a,b)=>f(a/b);
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  function even(n){const lo=Math.floor(n),r=n-lo;return r<.5?lo:r>.5?lo+1:lo%2===0?lo:lo+1;}
  function prism(data,p={},effect=false) {
    const {Palette:palette=0,Hue:hue=0,Saturation:saturation=0,Brightness:brightness=0,BlackInclusive:black=false}=p;
    if(!hue&&!saturation&&!brightness)return;
    let full=effect;for(let i=0;!full&&i<data.length;i+=4)full=!!data[i+3]&&(data[i]%17!==0||data[i+1]%17!==0||data[i+2]%17!==0);
    const chroma=sub(f((saturation+100)/100),1),light=sub(f((brightness+100)/100),1),inv=div(1,255);
    const inPalette=(a,s)=>palette===1?(a<30||a>=330)&&s!==0:palette>1?a>=[0,0,30,90,150,210,270][palette]&&a<=[0,0,90,150,210,270,330][palette]:true;
    const pack=v=>clamp(full?Math.floor(mul(255,v)):17*Math.floor(div(mul(255,v),17)),0,255);
    for(let i=0;i<data.length;i+=4){
      const [red,green,blue]=data.subarray(i,i+3);if(!data[i+3]||(!black&&!red&&!green&&!blue)||(red===255&&green===255&&blue===255))continue;
      const r=full?mul(red,inv):div(red,255),g=full?mul(green,inv):div(green,255),b=full?mul(blue,inv):div(blue,255);
      let value=Math.max(r,g,b),delta=sub(value,Math.min(r,g,b)),sat=value>0?div(delta,value):0,angle=0;
      if(red!==green||green!==blue){angle=r===value?div(sub(g,b),delta):g===value?add(2,div(sub(b,r),delta)):add(4,div(sub(r,g),delta));angle=mul(angle,60);if(angle<0)angle=add(angle,360);}
      if(!(black&&sat===0)&&!inPalette(Math.trunc(angle),sat))continue;
      angle=f(add(angle,hue)%360);let so=0,vo=0;
      if(saturation<0){so=mul(chroma,sat);vo=div(mul(mul(chroma,sat),value),2);}
      else if(sat>0&&value<1){so=mul(mul(chroma,sub(2,sat)),sub(1,value));vo=mul(mul(chroma,sub(1,sat)),value);}
      const ns=clamp(add(sat,so)),nv=clamp(add(value,vo));let ls=0,lv;
      if(brightness<0)lv=mul(mul(light,sat),nv);
      else{ls=-mul(light,ns);lv=mul(div(mul(light,sub(15,mul(12,sat))),15),sub(1,nv));}
      sat=clamp(add(ns,ls));value=clamp(add(nv,lv));
      const c=mul(value,sat),x=mul(c,sub(1,Math.abs(sub(f(angle/60%2),1)))),m=sub(value,c);
      const rgb=[[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][Math.min(5,Math.trunc(div(angle,60)))];
      for(let k=0;k<3;k++)data[i+k]=pack(add(rgb[k],m));
    }
  }
  function color(data,hue=0,saturation=1,brightness=1,width=data.length/4) {
    if(hue===0&&saturation===1&&brightness===1)return;
    let degrees=f(hue);if(degrees<0)degrees=add(degrees,360);
    const angle=mul(degrees,div(f(Math.PI),180)),c=f(Math.cos(angle)),s=f(Math.sin(angle)),a=f(saturation);
    const rot=[sub(add(f(.213),mul(c,f(.787))),mul(s,f(.213))),sub(sub(f(.715),mul(c,f(.715))),mul(s,f(.715))),add(sub(f(.072),mul(c,f(.072))),mul(s,f(.928))),add(sub(f(.213),mul(c,f(.213))),mul(s,f(.143))),add(add(f(.715),mul(c,f(.285))),mul(s,f(.140))),sub(sub(f(.072),mul(c,f(.072))),mul(s,f(.283))),sub(sub(f(.213),mul(c,f(.213))),mul(s,f(.787))),add(sub(f(.715),mul(c,f(.715))),mul(s,f(.715))),add(add(f(.072),mul(c,f(.928))),mul(s,f(.072)))];
    const sat=[add(f(.213),mul(f(.787),a)),sub(f(.715),mul(f(.715),a)),0,sub(f(.213),mul(f(.213),a)),add(f(.715),mul(f(.285),a)),0,sub(f(.213),mul(f(.213),a)),sub(f(.715),mul(f(.715),a)),0];
    for(let j=0;j<9;j+=3)sat[j+2]=sub(1,add(sat[j],sat[j+1]));
    const inv=div(1,255);
    for(let i=0;i<data.length;i+=4){if(!data[i+3])continue;const grouped=(i/4)%width<Math.trunc(width/8)*8;
      const pack=v=>clamp(grouped?even(mul(v,255)):Math.floor(add(mul(v,255),.5)),0,255);
      const matrix=m=>{const r=mul(data[i],inv),g=mul(data[i+1],inv),b=mul(data[i+2],inv);for(let k=0;k<3;k++)data[i+k]=pack(add(add(mul(r,m[k*3]),mul(g,m[k*3+1])),mul(b,m[k*3+2])));};
      if(hue!==0)matrix(rot);if(saturation!==1)matrix(sat);if(brightness!==1)for(let k=0;k<3;k++)data[i+k]=pack(mul(mul(data[i+k],inv),f(brightness)));
    }
  }
  function normalize(image){for(let i=0;i<image.data.length;i+=4){const a=image.data[i+3];if(a===0||a===255)continue;for(let k=0;k<3;k++)image.data[i+k]=Math.floor(Math.floor((image.data[i+k]*a+127)/255)*255/a);}return image;}
  const api={prism,color,normalize,even};if(typeof module==='object'&&module.exports)module.exports=api;else root.DJ48CoordiPixels=api;
})(typeof window==='undefined'?globalThis:window);
