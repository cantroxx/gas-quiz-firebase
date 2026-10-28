(function(root) {
  'use strict';
  // Differences between color variants identify visible hair while keeping the
  // face, clothes, background and occluding hats byte-for-byte unchanged.
  function maskFor(base, variants) {
    const mask=new Uint8Array(base.length/4);
    for(let i=0;i<base.length;i+=4) {
      if(!base[i+3])continue;
      if(variants.some(v=>v.length!==base.length))throw Error('헤어 미리보기 크기가 일치하지 않아요.');
      mask[i/4]=variants.some(v=>v[i+3]===base[i+3] && Math.max(Math.abs(v[i]-base[i]),Math.abs(v[i+1]-base[i+1]),Math.abs(v[i+2]-base[i+2]))>=3)?1:0;
    }
    return mask;
  }
  function recolor(base,mask,p={}) {
    const out=new Uint8ClampedArray(base);
    for(let i=0;i<out.length;i+=4) {
      if(!mask[i/4])continue;
      const r=base[i]/255,g=base[i+1]/255,b=base[i+2]/255;
      const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
      let h=0,l=(max+min)/2,s=d===0?0:d/(1-Math.abs(2*l-1));
      if(d)h=((max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4)*60);
      const palette=Number(p.palette)||0;
      if(palette && !(Math.abs(((h-[0,0,60,120,180,240,300][palette]+540)%360)-180)<=30))continue;
      h=(h+(Number(p.tone)||0))%360;
      s=Math.max(0,Math.min(1,s+(Number(p.chroma)||0)/100));
      l=Math.max(0,Math.min(1,l+(Number(p.brightness)||0)/100));
      const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;
      const rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
      for(let k=0;k<3;k++)out[i+k]=Math.round((rgb[k]+m)*255);
    }
    return out;
  }
  function createRenderer(render,decode,encode) {
    const cache=new Map();
    return async function(payload) {
      const prism=payload.itemPrism?.hair;
      if(!prism || !(prism.tone||prism.chroma||prism.brightness))return render(payload);
      const itemPrism={...payload.itemPrism};delete itemPrism.hair;
      const basePayload={...payload,itemPrism};const key=JSON.stringify(basePayload);
      if(!cache.has(key)) {
        const task=(async()=>{
          const code=Number(payload.itemCode.hair),baseCode=Math.floor(code/10)*10,color=code%10;
          const colors=[color,(color+3)%8,(color+5)%8];
          const results=await Promise.all(colors.map(hairColor=>render({...basePayload,itemCode:{...payload.itemCode,hair:baseCode+hairColor}})));
          if(results.some(r=>!r?.success||!r.imageUrl))throw Error('헤어 색상 미리보기를 불러오지 못했어요. 다시 시도해 주세요.');
          const images=await Promise.all(results.map(r=>decode(r.imageUrl)));
          if(images.some(im=>im.width!==images[0].width||im.height!==images[0].height))throw Error('헤어 미리보기 크기가 일치하지 않아요.');
          return {result:results[0],image:images[0],mask:maskFor(images[0].data,images.slice(1).map(i=>i.data))};
        })();
        cache.set(key,task);task.catch(()=>cache.delete(key));
        if(cache.size>24)cache.delete(cache.keys().next().value);
      }
      const {result,image,mask}=await cache.get(key);
      if(!mask.some(Boolean))throw Error('이 헤어의 색상 영역을 구분하지 못했어요. 다른 기본색을 선택해 주세요.');
      return {...result,imageUrl:await encode({...image,data:recolor(image.data,mask,prism)}),renderer:'quiztown-hair-prism'};
    };
  }
  async function decode(url) {
    const image=new Image();image.src=url;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
    return {width:canvas.width,height:canvas.height,data:context.getImageData(0,0,canvas.width,canvas.height).data};
  }
  function encode(image) {
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    canvas.getContext('2d').putImageData(new ImageData(image.data,image.width,image.height),0,0);
    return canvas.toDataURL('image/png');
  }
  const api={maskFor,recolor,createRenderer,decode,encode};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.DJ48HairPrism=api;
})(typeof window==='undefined'?globalThis:window);
