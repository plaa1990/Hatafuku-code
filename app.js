const L=["1. สูตรเดียวใช้ได้ทุกอย่าง", "2. สัตว์น่ารัก (ตัวอย่าง: แมวนั่ง)", "3. คนด้วยหุ่นโครง", "4. มือ (หมวดที่ยากที่สุด)", "5. สัตว์น่ารักทีละตัว", "6. ผม", "7. สิ่งของ: ทุกอย่างคือทรงพื้นฐาน", "8. สีและพาเลท", "แผนฝึก 7 วัน"];
const C=['ดูภาพครบทุกขั้น','วาดตามในสตูดิโอ 1 ครั้ง','วาดซ้ำโดยไม่ดูตัวอย่าง'];
const Q=[{q:'ลำดับวาดที่ถูกต้อง?',o:['รูปทรงพื้นฐาน → โครง → รายละเอียด → ตัดเส้น → ลงสี','ลงสี → ตัดเส้น → รูปทรง','รายละเอียด → รูปทรง → โครง']},
{q:'เส้นร่างควรเป็นแบบไหน?',o:['บางเบา แก้ง่าย','หนักและเข้มทันที']},
{q:'ควรลงสีส่วนใดก่อน?',o:['สีพื้น แล้วค่อยเงาและไฮไลต์','ไฮไลต์ก่อน']},
{q:'ควรตัดเส้นที่ไหนในสตูดิโอ?',o:['เลเยอร์แยกเหนือชั้นร่าง','ชั้นเดียวกับสีพื้น']},
{q:'ระบบทบทวนซ้ำช่วยอะไร?',o:['ให้จำได้ระยะยาว','ให้วาดเร็วขึ้นทันที']},
{q:'ก่อนใส่รายละเอียดควรทำอะไร?',o:['วางสัดส่วนด้วยรูปทรงพื้นฐาน','ใส่ขนทุกเส้น']}];
const $=id=>document.getElementById(id);
const T=()=>new Date().toLocaleDateString('sv');
const DN=()=>Math.floor((Date.now()-new Date().getTimezoneOffset()*6e4)/864e5);
let D;try{D=JSON.parse(localStorage.getItem('sh4'))}catch(e){}
D=D||{ls:{},min:{},goal:10,exp:Date.now()};
const sv=()=>{try{localStorage.setItem('sh4',JSON.stringify(D))}catch(e){}};
const ls=i=>D.ls[i]||(D.ls[i]={c:[0,0,0],q:0,due:0,st:0});
const done=i=>{const s=ls(i);return s.c.every(Boolean)&&s.q};
function streak(){let n=0,d=new Date();if(!D.min[T()])d.setDate(d.getDate()-1);while(D.min[d.toLocaleDateString('sv')]>0){n++;d.setDate(d.getDate()-1)}return n}
function toast(t){let e=$('toast');if(!e){e=document.createElement('div');e.id='toast';e.setAttribute('role','status');document.body.append(e)}e.textContent=t;e.className='s';clearTimeout(e.t);e.t=setTimeout(()=>e.className='',2200)}
function modal(h){const m=document.createElement('div');m.className='md';m.innerHTML='<div class="bx" role="dialog" aria-modal="true" tabindex="-1">'+h+'</div>';document.body.append(m);const k=e=>e.key==='Escape'&&m.close();m.close=()=>{m.remove();removeEventListener('keydown',k)};addEventListener('keydown',k);m.onclick=e=>{if(e.target==m)m.close()};m.querySelector('.bx').focus();return m}
function quiz(i,rev,after){const qs=[...Q].sort(()=>Math.random()-.5).slice(0,3).map(q=>({q:q.q,o:q.o.map((t,j)=>[t,j]).sort(()=>Math.random()-.5)}));
const m=modal('<h2>'+L[i]+'</h2>'+qs.map((q,n)=>'<fieldset><legend>'+q.q+'</legend>'+q.o.map(o=>'<label><input type="radio" name="q'+n+'" value="'+o[1]+'"> '+o[0]+'</label>').join('')+'</fieldset>').join('')+'<button class="b" id="go">ส่งคำตอบ</button> <button class="b" id="x">ปิด (Esc)</button>');
m.querySelector('#x').onclick=m.close;
m.querySelector('#go').onclick=()=>{let ok=0;qs.forEach((q,n)=>{const c=m.querySelector('input[name=q'+n+']:checked');if(c&&c.value==='0')ok++});rl();const s=ls(i);
if(ok>=2){s.q=1;s.st=rev?Math.min(s.st+1,4):0;s.due=DN()+[1,2,4,8,16][s.st];toast('ผ่าน '+ok+'/3 ทบทวนอีก '+[1,2,4,8,16][s.st]+' วัน')}else{if(rev){s.st=0;s.due=DN()+1}toast('ได้ '+ok+'/3 ลองใหม่')}
sv();m.close();after&&after()}}
function lessonUI(){const hs=[...document.querySelectorAll('main h2')];hs.forEach((h,i)=>{h.id='l'+i;const b=document.createElement('div');b.className='card lw';const nx=hs[i+1];nx?nx.parentNode.insertBefore(b,nx):h.closest('main').append(b);
const r=()=>{const s=ls(i);b.innerHTML='<b>เช็กลิสต์</b>'+C.map((t,j)=>'<label><input type="checkbox" data-j="'+j+'"'+(s.c[j]?' checked':'')+'> '+t+'</label>').join('')+'<p>'+(done(i)?'✅ จบบทแล้ว':'ติ๊กครบและสอบผ่านจึงนับว่าจบ')+'</p><button class="b">ทำแบบทดสอบ</button>';
b.querySelectorAll('input').forEach(x=>x.onchange=()=>{rl();ls(i).c[+x.dataset.j]=x.checked?1:0;sv();r()});b.querySelector('button').onclick=()=>quiz(i,false,r)};r()});
if(location.hash)document.querySelector(location.hash)?.scrollIntoView()}
const rl=()=>{try{const x=JSON.parse(localStorage.getItem('sh4'));if(x)D=x}catch(e){}};
if(top===window)setInterval(()=>{if(!document.hidden){rl();D.min[T()]=(D.min[T()]||0)+5;if(window.PR)window.PR.tk+=5;sv()}},5e3);
const pr=()=>{const m=Math.round(((D.pr||{})[T()]||0)/60);return m?'<p>ฝึกจับเวลาวันนี้ '+m+' นาที นับรวมแล้ว</p>':''};
function home(){const m=Math.floor((D.min[T()]||0)/60),due=L.map((_,i)=>i).filter(i=>ls(i).q&&ls(i).due<=DN());
const k=L.findIndex((_,i)=>!done(i)),nx=()=>k<0?'<p>🎉 จบครบทุกบทแล้ว</p>':'<a class="b cta" href="lessons.html#l'+k+'">▶ เรียนต่อ: '+L[k]+'</a>',old=Date.now()-D.exp>6048e5;
$('home').innerHTML=(old?'<div class="ban">ข้อมูลอยู่ในเบราว์เซอร์เท่านั้น ส่งออกสำรองแล้วหรือยัง? <button id="ex2">ส่งออก</button></div>':'')+
'<section class="hero"><div class="ring" style="--p:'+Math.min(100,m/D.goal*100)+'%" role="img" aria-label="วันนี้ '+m+' จาก '+D.goal+' นาที"><b>'+m+'</b><span>/ '+D.goal+' นาที</span></div><div class="hs"><div><b>'+streak()+'</b>วันติดต่อกัน</div><div><b>'+(Object.values(D.min).reduce((a,b)=>a+b,0)/60|0)+'</b>นาทีสะสม</div>'+pr()+'</div></section>'+nx()+'<a class="b cta alt" href="studio.html">🎨 เปิดสตูดิโอวาดรูป</a>'+'<p>เป้าหมายรายวัน <input id="goal" type="number" min="1" max="240" value="'+D.goal+'" aria-label="เป้าหมายนาทีต่อวัน" style="width:64px"> นาที <button id="nt">เปิดแจ้งเตือน</button></p>'+
(due.length?'<h2>ถึงเวลาทบทวน</h2>'+due.map(i=>'<button class="li" data-r="'+i+'">'+L[i]+'<span>ทบทวน</span></button>').join(''):'<p>ยังไม่มีบทที่ต้องทบทวน</p>')+
'<h2>บทเรียน</h2>'+L.map((t,i)=>'<a class="li" href="lessons.html#l'+i+'"><span>'+t+'</span><span>'+(done(i)?'✅':ls(i).c.filter(Boolean).length+'/3')+'</span></a>').join('')+
'<p><button id="ex">ส่งออกข้อมูล</button> <button id="im">นำเข้า</button></p>';
$('goal').onchange=e=>{D.goal=Math.max(1,+e.target.value||10);sv();home()};
document.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>quiz(+b.dataset.r,true,home));
$('nt').onclick=()=>window.Notification?Notification.requestPermission().then(p=>toast(p=='granted'?'จะเตือนหลัง 18:00 ถ้ายังไม่ถึงเป้า (ตอนเปิดแอป)':'ไม่ได้รับอนุญาต')):toast('เบราว์เซอร์ไม่รองรับ');
const ex=()=>{D.exp=Date.now();sv();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(D)],{type:'application/json'}));a.download='skillhub-backup.json';a.click();home()};
$('ex').onclick=ex;$('ex2')&&($('ex2').onclick=ex);
$('im').onclick=()=>{const f=document.createElement('input');f.type='file';f.accept='.json';f.onchange=async()=>{try{D=JSON.parse(await f.files[0].text());sv();home();toast('นำเข้าแล้ว')}catch(e){toast('ไฟล์ไม่ถูกต้อง')}};f.click()}}
if(window.Notification&&Notification.permission=='granted'&&new Date().getHours()>=18&&(D.min[T()]||0)<D.goal*60&&D.nt!=T()){D.nt=T();sv();try{new Notification('SkillHub',{body:'วันนี้ยังไม่ถึงเป้าวาด '+D.goal+' นาที'})}catch(e){}}
addEventListener('DOMContentLoaded',()=>{if(!$('cv')&&top===window){document.body.classList.add('pg');const p=location.pathname,n=document.createElement('nav');n.className='tab';n.setAttribute('aria-label','เมนูหลัก');n.innerHTML=[['index.html','🏠','หน้าหลัก'],['lessons.html','📖','บทเรียน'],['studio.html','🎨','สตูดิโอ']].map(a=>'<a href="'+a[0]+'"'+((p.endsWith(a[0])||(a[0]=='index.html'&&p.endsWith('/')))?' class="on" aria-current="page"':'')+'><b>'+a[1]+'</b>'+a[2]+'</a>').join('');document.body.append(n)}if($('home'))home();if(document.querySelector('main h2')&&!$('home')&&!$('cv'))lessonUI()});
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
