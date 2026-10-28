/* Portable lossless PNG/RGBA I/O. No canvas premultiplication or color conversion. */
(function(root) {
  'use strict';
  const signature = [137,80,78,71,13,10,26,10];
  const table = Uint32Array.from({length:256}, (_, n) => { for(let k=0;k<8;k++) n=n&1?0xedb88320^(n>>>1):n>>>1; return n>>>0; });
  const crc = bytes => { let c=0xffffffff; for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0; };
  const concat = arrays => {const out=new Uint8Array(arrays.reduce((s,a)=>s+a.length,0));let p=0;for(const a of arrays){out.set(a,p);p+=a.length;}return out;};
  const read32 = (b,p) => new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(p);
  const put32 = (b,p,n) => new DataView(b.buffer,b.byteOffset,b.byteLength).setUint32(p,n);
  async function stream(bytes, compress, limit) {
    const reader=new Blob([bytes]).stream().pipeThrough(compress?new CompressionStream('deflate'):new DecompressionStream('deflate')).getReader();
    const chunks=[];let size=0;
    try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw Error('PNG decoded size limit');chunks.push(value);}}finally{await reader.cancel();}
    return concat(chunks);
  }
  const fromBase64 = s => typeof Buffer!=='undefined'?new Uint8Array(Buffer.from(s,'base64')):Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  function toBase64(bytes) {if(typeof Buffer!=='undefined')return Buffer.from(bytes).toString('base64');let s='';for(let p=0;p<bytes.length;p+=8192)s+=String.fromCharCode(...bytes.subarray(p,p+8192));return btoa(s);}
  async function decode(input) {
    const b=typeof input==='string'?fromBase64(input):new Uint8Array(input);
    if(b.length>4000000||signature.some((n,i)=>b[i]!==n))throw Error('Invalid PNG');
    let w,h,depth,type,channels,palette,transparency,ended=false;const ids=[];
    for(let p=8;p<b.length;){
      if(p+12>b.length)throw Error('Truncated PNG');const len=read32(b,p),end=p+12+len;
      if(end>b.length)throw Error('Truncated PNG chunk');
      const tag=String.fromCharCode(...b.subarray(p+4,p+8)),d=b.subarray(p+8,p+8+len);
      if(crc(b.subarray(p+4,p+8+len))!==read32(b,p+8+len))throw Error('PNG CRC mismatch');
      if(tag==='IHDR') {w=read32(d,0);h=read32(d,4);depth=d[8];type=d[9];channels={0:1,2:3,3:1,4:2,6:4}[type];if(!w||!h||w>2048||h>2048||!channels||d[10]||d[11]||d[12]||!(depth===8||([0,3].includes(type)&&[1,2,4].includes(depth))))throw Error('Unsupported PNG layout');}
      else if(tag==='PLTE')palette=d;else if(tag==='tRNS')transparency=d;else if(tag==='IDAT')ids.push(d);else if(tag==='IEND'){ended=true;break;}
      p=end;
    }
    if(!w||!ended||!ids.length)throw Error('Incomplete PNG');
    const stride=Math.ceil(w*channels*depth/8),bpp=Math.max(1,Math.ceil(channels*depth/8));
    const raw=await stream(concat(ids),false,(stride+1)*h);
    if(raw.length!==(stride+1)*h)throw Error('PNG scanline length');
    const pixels=new Uint8Array(stride*h);
    const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
    for(let y=0;y<h;y++){const filter=raw[y*(stride+1)];if(filter>4)throw Error('PNG filter');for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=bpp?pixels[i-bpp]:0,up=y?pixels[i-stride]:0,c=y&&x>=bpp?pixels[i-stride-bpp]:0;pixels[i]=raw[y*(stride+1)+1+x]+[0,a,up,Math.floor((a+up)/2),paeth(a,up,c)][filter];}}
    const data=new Uint8Array(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=(y*w+x)*4,p=y*stride+x*channels;
      const value=depth===8?pixels[p]:(pixels[y*stride+Math.floor(x*depth/8)]>>(8-depth-(x*depth)%8))&((1<<depth)-1);
      if(type===6){data.set(pixels.subarray(p,p+4),i);continue;}
      if(type===2){data.set(pixels.subarray(p,p+3),i);data[i+3]=transparency&&pixels[p]===transparency[1]&&pixels[p+1]===transparency[3]&&pixels[p+2]===transparency[5]?0:255;}
      else if(type===3){if(!palette||value*3+2>=palette.length)throw Error('PNG palette');data.set(palette.subarray(value*3,value*3+3),i);data[i+3]=transparency?.[value]??255;}
      else {const gray=depth===8?value:Math.round(value*255/((1<<depth)-1));data.fill(gray,i,i+3);data[i+3]=type===4?pixels[p+1]:transparency&&value===transparency[1]?0:255;}
    }
    return {width:w,height:h,data};
  }
  function chunk(tag,data) {const b=new Uint8Array(data.length+12);put32(b,0,data.length);b.set(Array.from(tag,c=>c.charCodeAt(0)),4);b.set(data,8);put32(b,8+data.length,crc(b.subarray(4,8+data.length)));return b;}
  async function encode({width,height,data}) {
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>2048||height>2048||data.length!==width*height*4)throw Error('Invalid RGBA dimensions');
    const head=new Uint8Array(13);put32(head,0,width);put32(head,4,height);head[8]=8;head[9]=6;
    const raw=new Uint8Array((width*4+1)*height);for(let y=0;y<height;y++)raw.set(data.subarray(y*width*4,(y+1)*width*4),y*(width*4+1)+1);
    return concat([Uint8Array.from(signature),chunk('IHDR',head),chunk('IDAT',await stream(raw,true,20000000)),chunk('IEND',new Uint8Array())]);
  }
  const api={decode,encode,fromBase64,toBase64};if(typeof module==='object'&&module.exports)module.exports=api;else root.DJ48CoordiPng=api;
})(typeof window==='undefined'?globalThis:window);
