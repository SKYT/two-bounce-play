'use strict';
const $=id=>document.getElementById(id);
const canvas=$('screen'),ctx=canvas.getContext('2d'),outfit={band:'없음',costume:'기본'},hoop={x:316,y:58};
const lerp=(a,b,t)=>a+(b-a)*t;
function handPosition(x,g,p){return{x:x+15-6*p.reach,y:g-p.jump-37+9*p.bend-27*p.reach}}
function drawFullPlayer(x,ground,pose,actor,model){
    const portrait=false;
    const view=3;
    const bones=model.bones[view], texture=model.image;
    const scale=portrait?.72:61/96,face=portrait?1:x>hoop.x?-1:1;
    const bend=pose.bend*12, reach=pose.reach;
    const hand=handPosition(x,ground,pose,actor);
    const target=[32+(hand.x-x)*face/scale,98+(hand.y-ground+pose.jump)/scale+3];
    function part(id){ctx.drawImage(texture,id*64,view*100,64,100,0,0,64,100)}
    function segment(id,a,b,A,B){
      const dx=b[0]-a[0],dy=b[1]-a[1],X=B[0]-A[0],Y=B[1]-A[1];
      ctx.save();ctx.translate(...A);ctx.rotate(Math.atan2(Y,X)-Math.atan2(dy,dx));
      const stretch=Math.hypot(X,Y)/Math.hypot(dx,dy);
      ctx.rotate(Math.atan2(dy,dx));ctx.scale(stretch,1);ctx.rotate(-Math.atan2(dy,dx));
      ctx.translate(-a[0],-a[1]);part(id);ctx.restore();
    }
    ctx.save();ctx.translate(x,ground-pose.jump);ctx.scale(face*scale,scale);ctx.translate(-32,-98);
    for(let n of [2,3,0,-1,1]){
      if(n===-1){ctx.save();ctx.translate(0,bend);part(0);ctx.restore();continue}
      const [a,b,c]=bones[n],A=[a[0],a[1]+bend];
      let B,C;
      if(n>=2){B=[b[0]+bend*.70,b[1]+bend*.35];C=c}
      else{
        const mix=Math.min(1,reach*2.3);
        C=[c[0]+(target[0]-c[0])*mix,c[1]+bend+(target[1]-c[1]-bend)*mix];
        B=[b[0]+(target[0]-b[0]+(n?4:-6))*mix,b[1]+bend+(target[1]+15-b[1]-bend)*mix];
      }
      segment(1+n*2,a,b,A,B);segment(2+n*2,b,c,B,C);
    }
    if(outfit.band!=='없음')tile(27,9+bend,10,2,{화이트:'#fff4de',블랙:'#222432',골드:'#efbe52'}[outfit.band]);
    if(outfit.costume==='크리스마스 산타'){tile(27,4+bend,10,5,'#c53541');tile(26,8+bend,12,2,'#fff0dc')}
    ctx.restore();
    const wrist=bones[1][2],mix=Math.min(1,reach*2.3);
    return {x:lerp(x+face*((wrist[0]-32)*scale+4),hand.x,mix),y:lerp(ground-pose.jump+(wrist[1]+bend-98)*scale,hand.y,mix)};
  }
const court=document.createElement('canvas');court.width=400;court.height=252;
const g=court.getContext('2d');g.fillStyle='#214f53';g.fillRect(0,0,400,252);
function path(points,color,fill=false){g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.strokeStyle=color;g.lineWidth=2;if(fill){g.fillStyle=color;g.fill()}else g.stroke()}
path([[3,172],[212,82],[396,147],[180,246],[3,172]],'#78a79c');path([[175,97],[232,119],[157,153],[105,133]],'#78a79c');path([[325,112],[325,34],[338,38]],'#bdbbaa');path([[300,22],[340,37],[340,68],[300,53]],'#e1e1d5',true);
g.beginPath();g.ellipse(316,58,13,4,.1,0,7);g.strokeStyle='#ff9a48';g.stroke();path([[304,59],[309,73],[315,61],[321,76],[327,60]],'#edecd2');
const ball=document.createElement('canvas');ball.width=ball.height=24;const bc=ball.getContext('2d');bc.fillStyle='#ec8c38';bc.strokeStyle='#563726';bc.lineWidth=2;bc.beginPath();bc.arc(12,12,10,0,7);bc.fill();bc.stroke();bc.beginPath();bc.moveTo(2,12);bc.lineTo(22,12);bc.moveTo(10,2);bc.quadraticCurveTo(17,13,10,22);bc.stroke();
const img=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src});
let assets={},auto=true,rate=1,large=false,time=0,manual='ready',last=0,phaseScene,loading;
async function startPhaser(){
 if(loading)return loading;
 loading=(async()=>{await new Promise((res,rej)=>{let s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/phaser@3.90.0/dist/phaser.min.js';s.onload=res;s.onerror=rej;document.head.append(s)});
 new Phaser.Game({type:Phaser.AUTO,width:400,height:252,parent:'ph',audio:{noAudio:true},pixelArt:true,scene:{create(){
 this.textures.addCanvas('floor',court);this.textures.addCanvas('ball',ball);
 for(const k of Object.keys(assets)){ this.textures.addSpriteSheet(k,assets[k].sheet,{frameWidth:128,frameHeight:128});this.textures.addSpriteSheet(k+'-release',assets[k].release,{frameWidth:128,frameHeight:128}); }
 this.add.image(0,0,'floor').setOrigin(0);this.actor=this.add.sprite(0,0,'jun').setOrigin(.5,116/128);this.orb=this.add.image(0,0,'ball');phaseScene=this;
 }}})})();return loading}
$('mode').onchange=async()=>{const c=$('mode').value==='c';canvas.hidden=c;canvas.style.display=c?'none':'block';$('ph').style.display=c?'block':'none';if(c)try{await startPhaser()}catch{$('mode').value='b';canvas.style.display='block';$('ph').style.display='none';alert('Phaser를 불러오지 못했습니다. Canvas 비교를 계속합니다.');loading=null}};
$('auto').onclick=()=>{auto=!auto;manual='ready';time=0;$('auto').textContent=auto?'자동 반복 끄기':'자동 반복 켜기'};
$('speed').onclick=()=>{rate=rate===1?.5:1;$('speed').textContent='속도 '+rate+'×'};
$('zoom').onclick=()=>{large=!large;$('zoom').textContent=large?'코트 크기':'선수 확대'};
$('hold').onpointerdown=e=>{if(auto)$('auto').click();manual='hold';time=0;e.target.setPointerCapture(e.pointerId)};
$('hold').onpointerup=()=>{if(manual==='hold'){manual='shoot';time=0}};
$('hold').onpointercancel=()=>{manual='ready';time=0};
const X=116,Y=193;
function render(now){
 time+=Math.min(100,now-(last||now))*rate;last=now;
 const cycle=time%3100;
 const phase=auto?(cycle<320?'ready':cycle<1140?'hold':'shoot'):manual;
 const ms=auto?(phase==='hold'?cycle-320:phase==='shoot'?cycle-1140:0):time;
 if(!auto&&manual==='shoot'&&ms>1700)manual='ready';
 const flight=phase==='shoot',rise=flight?Math.sin(Math.PI*Math.min(1,ms/470))*18:0;
 let f=phase==='ready'?0:phase==='hold'?(ms<90?1:ms<180?2:3):ms<110?3:ms<170?4:ms<300?5:ms<430?6:ms<560?7:ms<700?8:ms<840?9:0;
 const key=$('who').value,a=assets[key],mode=$('mode').value,scale=large?1.55:.48;
 const refined=mode==='b'||mode==='c';
 const liftAt=t=>{const u=Math.max(0,Math.min(1,(t-45)/420));return 4*u*(1-u)*18*(large?1.55:1)};
 let sheet=a.sheet,texture=key,yRise=rise;
 if(refined){
   yRise=flight?liftAt(ms):0;
   if(flight){
     // Keep the set grounded until push-off; preserve one shooting arm into descent.
     if(ms<100) f=3;
     else if(ms<385){
       f=ms<147?0:ms<238?1:ms<304?2:3;
       sheet=a.release;texture=key+'-release';
     }else f=ms<465?4:ms<585?7:ms<705?8:ms<850?9:0;
   }
 }
 let origin=(i,jump)=>({x:X+(a.hands[i][0]-64)*scale,y:Y-jump+(a.hands[i][1]-116)*scale});
 let h=origin(f,rise),launch=origin(4,Math.sin(Math.PI*120/470)*18);
 const detach=refined?150:120;
 if(refined){
   const hand=key==='jun'?[80,20]:[78,19];
   const socket=jump=>({x:X+(hand[0]-64)*scale,y:Y-jump+(hand[1]-116)*scale});
   launch=socket(liftAt(detach));
   h=origin(f,yRise);
   if(flight && ms>=100 && ms<detach){
     const start=origin(3,yRise),end=socket(yRise),u=Math.min(1,(ms-100)/47);
     h={x:lerp(start.x,end.x,u),y:lerp(start.y,end.y,u)};
   }
 }
 if(mode!=='c'){ctx.imageSmoothingEnabled=false;ctx.drawImage(court,0,0);
 if(mode==='b'||mode==='old')ctx.drawImage(sheet,f%5*128,Math.floor(f/5)*128,128,128,X-64*scale,Y-yRise-116*scale,128*scale,128*scale);
 else{const extend=Math.min(1,ms/120),pose=phase==='hold'?{reach:.45,bend:1,jump:0}:flight?{reach:(.45+.55*extend)*Math.max(0,1-Math.max(0,(ms-120)/290)),bend:1-extend,jump:16*Math.sin(Math.PI*Math.min(1,ms/410))}:{reach:0,bend:0,jump:0};
 const z=scale*88/61;ctx.save();ctx.translate(X,Y);ctx.scale(z,z);let p=drawFullPlayer(0,0,pose,key,a);ctx.restore();h={x:X+p.x*z,y:Y+p.y*z};let q=handPosition(0,0,{reach:1,bend:0,jump:16*Math.sin(Math.PI*120/410)});launch={x:X+q.x*z,y:Y+q.y*z};}
 }else if(phaseScene){phaseScene.actor.setTexture(texture,f).setPosition(X,Y-yRise).setScale(scale)}
 if(flight&&ms>=detach){const t=Math.min(1,(ms-detach)/(650-detach));h={x:lerp(launch.x,316,t),y:lerp(launch.y,58,t)-65*Math.sin(Math.PI*t)};
 if(ms>650){const d=Math.min(1,(ms-650)/420);h.y+=58*d*d;if(ms>1070){const u=Math.min(1,(ms-1070)/480);h.x-=60*u;h.y+=25*u-28*Math.sin(Math.PI*u)}}}
 const size=large?22:13;
 if(mode==='c'&&phaseScene)phaseScene.orb.setPosition(h.x,h.y).setDisplaySize(size,size);else if(mode!=='c')ctx.drawImage(ball,h.x-size/2,h.y-size/2,size,size);
 $('status').textContent=mode==='c'&&!phaseScene?'Phaser 로딩 중':phase==='hold'?'차지 · 발 고정':!flight?'준비':ms<detach?'이륙':ms<300?'릴리즈':ms<650?'착지':ms<1070?'득점 · 낙하':'바닥 반사';
 requestAnimationFrame(render)}
Promise.all(['jun','seojin'].map(async(k,i)=>{let m=window.fullPlayers[i],s=window.shotSheets[k];assets[k]={bones:m.bones,image:await img(m.src),sheet:await img(s.src),release:await img(window.releaseArt[k]),hands:s.hands}})).then(()=>requestAnimationFrame(render)).catch(()=>{$('status').textContent='이미지를 불러오지 못했습니다. 새로고침해 주세요.'});
