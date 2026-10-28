/* studio-plus.js — ส่วนเสริมสตูดิโอวาดรูป (โหลดหลังสคริปต์หลัก ใช้ตัวแปร LY, act, W, H, snap, render ร่วมกัน) */
(function(){
const K='hh:stamps',jg=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}};
let mode=null,stampImg=null;
const css=document.createElement('style');
css.textContent='#xpBtn{position:fixed;right:10px;bottom:90px;z-index:50;border:0;border-radius:24px;padding:10px 14px;background:#285b4f;color:#fff;font:600 14px sans-serif;box-shadow:0 3px 10px #0004}#xp{position:fixed;left:8px;right:8px;bottom:8px;max-height:62vh;overflow:auto;z-index:60;background:#fff;color:#222;border-radius:16px;padding:12px;box-shadow:0 6px 24px #0006;font:14px sans-serif}#xp[hidden]{display:none}#xp h4{margin:10px 0 4px}#xp .r{display:flex;gap:6px;flex-wrap:wrap;align-items:center}#xp button,#xp select,#xp input{padding:6px 9px;border:1px solid #ccc;border-radius:8px;background:#f7f7f2;font:inherit}#xp input[type=color]{padding:0;width:36px;height:30px}#xp .st{width:48px;height:48px;object-fit:contain;border:1px solid #ccc;border-radius:8px;background:#fff}';
document.head.appendChild(css);
const btn=document.createElement('button');btn.id='xpBtn';btn.textContent='✨ เพิ่มเติม';document.body.appendChild(btn);
const p=document.createElement('div');p.id='xp';p.hidden=true;document.body.appendChild(p);
p.innerHTML=`<div class="r"><b>✨ เครื่องมือเพิ่มเติม</b><span style="flex:1"></span><button id="xpX">ปิด</button></div>
<h4>เส้นร่างให้ระบายสี (วางเป็นชั้นล่างสุด)</h4><div class="r"><input id="xpT" size="4" value="ก" maxlength="4" aria-label="ตัวอักษรหรืออีโมจิ"><select id="xpP"><option value="ก ข ค A B C">ตัวอักษร</option><option value="1 2 3 4 5 6 7 8 9 0">ตัวเลข</option><option value="🐱 🐶 🐟 🐘 🦋 🐢">สัตว์</option><option value="🍎 🍌 🍇 🍓 🍊 🍉">ผลไม้</option></select><button id="xpTpl">วางเส้นร่าง</button><button id="xpOut">แปลงภาพวาดเป็นเส้นร่าง</button></div>
<h4>เติมไล่เฉดสี (บนเนื้อภาพในชั้นปัจจุบัน)</h4><div class="r"><input type="color" id="xg1" value="#ff7a59"><input type="color" id="xg2" value="#5b8def"><select id="xgd"><option value="v">แนวตั้ง</option><option value="h">แนวนอน</option><option value="d">เฉียง</option></select><button id="xpGr">เติม</button></div>
<h4>ข้อความบนภาพ (แตะบนภาพเพื่อวาง)</h4><div class="r"><input id="xtx" value="สวัสดี" size="8"><select id="xtf"><option>Noto Sans Thai</option><option>Mali</option><option>Caveat</option><option>serif</option></select><input id="xts" type="number" value="90" style="width:64px"><input type="color" id="xtc" value="#ffffff"><input type="color" id="xto" value="#222222"><label><input type="checkbox" id="xtsh" checked>เงา</label><button id="xtgo">วางข้อความ</button></div>
<h4>แสตมป์ (เก็บเนื้อภาพในชั้นนี้ แล้วแตะประทับซ้ำ)</h4><div class="r"><button id="xsSave">เก็บชั้นนี้เป็นแสตมป์</button><input id="xss" type="number" value="100" style="width:64px" aria-label="ขนาด %">%</div><div class="r" id="xsL"></div>
<h4>ฟิลเตอร์ (ชั้นปัจจุบัน)</h4><div class="r"><button data-f="bw">ขาวดำ</button><button data-f="sepia">ซีเปีย</button><button data-f="wc">สีน้ำ</button></div>
<h4>ส่งออกสติกเกอร์</h4><div class="r"><select id="xe"><option value="512x512">512×512 (ทั่วไป/WhatsApp)</option><option value="370x320">370×320 (LINE)</option><option value="408x368">408×368 (LINE ใหญ่)</option></select><input id="xeb" type="number" value="14" style="width:60px" aria-label="ขอบขาว">px ขอบ<button id="xeGo">ดาวน์โหลด PNG</button></div>
<h4>ส่งภาพวาดไปใช้ต่อ</h4><div class="r"><input id="xlt" placeholder="ชื่อ/แท็ก" size="12"><button id="xlGo">เก็บเข้าคลังรวม (พิมพ์บนใบงาน/การ์ด)</button></div>`;
const $x=id=>document.getElementById(id);
btn.onclick=()=>{p.hidden=!p.hidden;stampsUI()};$x('xpX').onclick=()=>{p.hidden=true;mode=null};
const done=m=>{render();try{saveSoon()}catch(e){}toast(m)};
function edge(src,w,h,th){const g=src.getContext('2d'),d=g.getImageData(0,0,w,h).data,o=document.createElement('canvas');o.width=w;o.height=h;const og=o.getContext('2d'),od=og.createImageData(w,h);
 const v=(x,y)=>{const i=(y*w+x)*4,a=d[i+3];return a<20?255:(d[i]+d[i+1]+d[i+2])/3*a/255+255*(1-a/255)};
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const gx=v(x+1,y)-v(x-1,y),gy=v(x,y+1)-v(x,y-1),aa=d[((y*w+x)*4)+3]>20?1:0,an=d[(((y*w)+x+1)*4)+3]>20&&d[((((y+1)*w)+x)*4)+3]>20&&d[(((y*w)+x-1)*4)+3]>20&&d[((((y-1)*w)+x)*4)+3]>20?1:0;
  const e=Math.hypot(gx,gy)>th||(aa&&!an);const i=(y*w+x)*4;if(e){od.data[i+3]=255}}
 og.putImageData(od,0,0);return o}
function newBottom(c,name){if(LY.length>=MAXL)return toast('ครบจำนวนชั้น');snapAll();LY.unshift({c:c,v:true,o:1,n:name});act=0;list();done('วางเส้นร่างแล้ว ระบายสีบนชั้นอื่นได้เลย')}
$x('xpTpl').onclick=()=>{const t=$x('xpT').value.trim();if(!t)return;const c=mk(),g=c.getContext('2d');g.font=`700 ${Math.min(W,H)*(t.length>1&&!/[\u{1F300}-\u{1FAFF}]/u.test(t)?.35:.7)}px "Noto Sans Thai",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#000';g.fillText(t,W/2,H/2);
 const o=edge(c,W,H,60);const og=o.getContext('2d');og.globalCompositeOperation='source-in';og.fillStyle='#333';og.fillRect(0,0,W,H);c.getContext('2d').clearRect(0,0,W,H);c.getContext('2d').drawImage(o,0,0);
 const g2=c.getContext('2d');g2.globalCompositeOperation='source-over';g2.drawImage(o,1,0);g2.drawImage(o,0,1);newBottom(c,'เส้นร่าง '+t)};
$x('xpT').oninput=()=>{};$x('xpP').onchange=e=>{$x('xpT').value=e.target.value.split(' ')[0]};
$x('xpOut').onclick=()=>{const f=flat(true),o=edge(f,W,H,40),c=mk(),g=c.getContext('2d');g.drawImage(o,0,0);g.drawImage(o,1,0);g.drawImage(o,0,1);g.globalCompositeOperation='source-in';g.fillStyle='#333';g.fillRect(0,0,W,H);newBottom(c,'เส้นร่างจากภาพ')};
$x('xpGr').onclick=()=>{snap();const g=gc(),d=$x('xgd').value,gr=d==='v'?g.createLinearGradient(0,0,0,H):d==='h'?g.createLinearGradient(0,0,W,0):g.createLinearGradient(0,0,W,H);
 gr.addColorStop(0,$x('xg1').value);gr.addColorStop(1,$x('xg2').value);g.save();g.globalCompositeOperation='source-atop';g.fillStyle=gr;g.fillRect(0,0,W,H);g.restore();done('เติมไล่เฉดแล้ว')};
// วางข้อความ/แสตมป์ด้วยการแตะ
$x('xtgo').onclick=()=>{mode='text';p.hidden=true;toast('แตะบนภาพเพื่อวางข้อความ')};
function bounds(c){const d=c.getContext('2d').getImageData(0,0,W,H).data;let x0=W,y0=H,x1=-1,y1=-1;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(d[(y*W+x)*4+3]>8){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}return x1<0?null:[x0,y0,x1-x0+1,y1-y0+1]}
$x('xsSave').onclick=()=>{const b=bounds(LY[act].c);if(!b)return toast('ชั้นนี้ว่างอยู่');const t=document.createElement('canvas');t.width=b[2];t.height=b[3];t.getContext('2d').drawImage(LY[act].c,b[0],b[1],b[2],b[3],0,0,b[2],b[3]);
 const s=Math.min(1,160/Math.max(b[2],b[3])),q=document.createElement('canvas');q.width=Math.round(b[2]*s);q.height=Math.round(b[3]*s);q.getContext('2d').drawImage(t,0,0,q.width,q.height);
 const L=jg(K,[]);L.unshift(q.toDataURL('image/png'));try{localStorage.setItem(K,JSON.stringify(L.slice(0,24)))}catch(e){return toast('พื้นที่เก็บเต็ม')}stampsUI();toast('เก็บแสตมป์แล้ว')};
function stampsUI(){$x('xsL').innerHTML=jg(K,[]).map((u,i)=>`<img class="st" src="${u}" data-i="${i}" alt="แสตมป์ ${i+1}">`).join('')||'ยังไม่มีแสตมป์'}
$x('xsL').onclick=e=>{const i=e.target.dataset.i;if(i==null)return;const im=new Image();im.onload=()=>{stampImg=im;mode='stamp';p.hidden=true;toast('แตะบนภาพเพื่อประทับ')};im.src=jg(K,[])[i]};
cv.addEventListener('pointerdown',e=>{if(!mode)return;e.stopPropagation();e.preventDefault();
 const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*W,y=(e.clientY-r.top)/r.height*H;snap();const g=gc();g.save();
 if(mode==='stamp'){const s=+$x('xss').value/100;g.drawImage(stampImg,x-stampImg.width*s/2,y-stampImg.height*s/2,stampImg.width*s,stampImg.height*s)}
 else{g.font=`700 ${+$x('xts').value}px "${$x('xtf').value}",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
  if($x('xtsh').checked){g.shadowColor='#0007';g.shadowBlur=10;g.shadowOffsetY=4}g.lineWidth=Math.max(4,+$x('xts').value/8);g.strokeStyle=$x('xto').value;g.strokeText($x('xtx').value,x,y);g.shadowColor='transparent';g.fillStyle=$x('xtc').value;g.fillText($x('xtx').value,x,y)}
 g.restore();render();try{saveSoon()}catch(_){}},true);
p.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{snap();const g=gc(),im=g.getImageData(0,0,W,H),d=im.data,f=b.dataset.f;
 if(f==='wc'){const t=document.createElement('canvas');t.width=W;t.height=H;const tg=t.getContext('2d');tg.filter='blur(3px) saturate(1.25)';tg.drawImage(LY[act].c,0,0);g.clearRect(0,0,W,H);g.drawImage(t,0,0);const d2=g.getImageData(0,0,W,H);for(let i=0;i<d2.data.length;i+=4)for(let c=0;c<3;c++)d2.data[i+c]=Math.round(d2.data[i+c]/32)*32+8;g.putImageData(d2,0,0);g.globalAlpha=.85}
 else{for(let i=0;i<d.length;i+=4){const r=d[i],gg=d[i+1],b2=d[i+2],l=.299*r+.587*gg+.114*b2;if(f==='bw'){d[i]=d[i+1]=d[i+2]=l}else{d[i]=Math.min(255,l*1.07+30);d[i+1]=Math.min(255,l*.95+12);d[i+2]=l*.75}}g.putImageData(im,0,0)}
 done('ใช้ฟิลเตอร์แล้ว')});
function stickerCanvas(){const f=flat(false),b=bounds(f);if(!b)return null;const[w,h]=$x('xe').value.split('x').map(Number),bd=+$x('xeb').value||0,o=document.createElement('canvas');o.width=w;o.height=h;const g=o.getContext('2d');
 const s=Math.min((w-2*bd-8)/b[2],(h-2*bd-8)/b[3]),dw=b[2]*s,dh=b[3]*s,dx=(w-dw)/2,dy=(h-dh)/2;
 const t=document.createElement('canvas');t.width=w;t.height=h;t.getContext('2d').drawImage(f,b[0],b[1],b[2],b[3],dx,dy,dw,dh);
 const sil=document.createElement('canvas');sil.width=w;sil.height=h;const sg=sil.getContext('2d');for(let a=0;a<24;a++){const ang=a/24*6.283;sg.drawImage(t,Math.cos(ang)*bd,Math.sin(ang)*bd)}sg.globalCompositeOperation='source-in';sg.fillStyle='#fff';sg.fillRect(0,0,w,h);
 g.shadowColor='#0003';g.shadowBlur=4;g.drawImage(sil,0,0);g.shadowColor='transparent';g.drawImage(t,0,0);return o}
$x('xeGo').onclick=()=>{const o=stickerCanvas();if(!o)return toast('ยังไม่มีภาพ');o.toBlob(bl=>{const a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download='sticker-'+o.width+'x'+o.height+'.png';a.click()})};
$x('xlGo').onclick=()=>{const f=flat(true),m=Math.min(1,600/Math.max(W,H)),c=document.createElement('canvas');c.width=Math.round(W*m);c.height=Math.round(H*m);c.getContext('2d').drawImage(f,0,0,c.width,c.height);
 const u=c.toDataURL('image/jpeg',.85),L=jg('hh:lib',[]),t=$x('xlt').value.trim()||'ภาพวาด';
 L.unshift({id:Date.now(),type:'ภาพวาด',date:new Date().toISOString().slice(0,10),title:t,tag:t,html:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${c.width} ${c.height}"><image href="${u}" width="${c.width}" height="${c.height}"/></svg>`});
 try{localStorage.setItem('hh:lib',JSON.stringify(L));toast('ส่งไปคลังผลงานแล้ว เปิดพิมพ์ได้ที่ "เครื่องมือเสริม"')}catch(e){toast('พื้นที่เก็บเต็ม')}};
})();
