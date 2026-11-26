const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),button=document.querySelector('#shoot'),statusLine=document.querySelector('#status');
const hoop={x:200,y:105},free={x:200,y:330},width=400,height=500;
let player={...free},ball={...free},phase='ready',start=0,shot=null,scored=0,attempts=0,sequence=0,active=null,audio,soundOn=true;
const difficulty = document.querySelector('#level');
const records = document.querySelector('#records');
const milestone = document.querySelector('#milestone');
const haptic = document.querySelector('#haptic');
function readSetting(key) {
  try { return localStorage.getItem('two-bounce:dev:v22:' + key); } catch { return null; }
}
function saveSetting(key, value) {
  try { localStorage.setItem('two-bounce:dev:v22:' + key, String(value)); } catch {}
}
const home = document.querySelector('#home');
const court = document.querySelector('#court');
const settings = document.querySelector('#settings');
const play = document.querySelector('#play');
const options = document.querySelector('#options');
const savedLevel = readSetting('difficulty');
if (Array.from(difficulty.options).some(option => option.value === savedLevel)) difficulty.value = savedLevel;
soundOn = readSetting('sound') !== 'off';
const looks = {"costume":["기본","크리스마스 산타"],"actor":["루키","가드","센터","번개","준 · 남자 7등신","서진 · 여자 7등신","구지"],"floor":["그린","야간","우드"],"skinBall":["오렌지","아이스","라임","클래식"],"jersey":["크림","블루","레드"],"band":["없음","화이트","블랙","골드"]};
const outfit = {};
let rewards;
try { rewards = JSON.parse(readSetting('rewards')) || {}; } catch { rewards = {}; }
let totalGoals = Number.isSafeInteger(rewards.goals) && rewards.goals >= 0 ? rewards.goals : 0;
let goldBand = rewards.gold === true;
function refreshRewards() {
  const ballOption = document.querySelector('#skinBall option[value="클래식"]');
  ballOption.disabled = false;
  ballOption.textContent = ballOption.disabled ? '클래식 농구공 · '+totalGoals+'/5골' : '클래식 농구공';
  const bandOption = document.querySelector('#band option[value="골드"]');
  bandOption.disabled = false;
  bandOption.textContent = '골드 헤어밴드';
}
function awardGoal(streak, notices) {
  totalGoals++;
  if (totalGoals === 5) notices.push('클래식 농구공 해금!');
  if (!goldBand && streak >= 3) {
    goldBand = true;
    notices.push('골드 헤어밴드 해금!');
  }
  saveSetting('rewards', JSON.stringify({goals:totalGoals, gold:goldBand}));
  refreshRewards();
}
refreshRewards();
const numberInput = document.querySelector('#jerseyNumber');
const skinPalettes = {
  light: {skin:'#f6d5bf', shade:'#d39e89', light:'#ffe9d7'},
  golden: {skin:'#d6a366', shade:'#ae7548', light:'#efbf85'},
  deep: {skin:'#815139', shade:'#613b31', light:'#aa7353'}
};
const defaultTones = {루키:'light', 가드:'golden', 센터:'deep', 번개:'golden','준 · 남자 7등신':'deep','서진 · 여자 7등신':'golden',구지:'golden'};
const playerTones = {};
const tonePicker = document.getElementById('skinTone');
for (const actor of looks.actor) {
  const saved = readSetting('skin-tone-' + actor);
  playerTones[actor] = Object.hasOwn(skinPalettes,saved) ? saved : defaultTones[actor];
}
tonePicker.onchange = () => {
  playerTones[outfit.actor] = tonePicker.value;
  saveSetting('skin-tone-' + outfit.actor,tonePicker.value);
};
function applyLook(key, value) {
  const selected = looks[key].includes(value) ? value : looks[key][0];
  outfit[key] = selected;
  if (key === 'actor') tonePicker.value = playerTones[selected];
  document.getElementById(key).value = selected;
  document.querySelector('#homePlayer').textContent = '선수 · ' + outfit.actor;
  canvas.style.backgroundColor = {그린:'#216563', 야간:'#213451', 우드:'#835838'}[outfit.floor] || '#216563';
}
for (const key of Object.keys(looks)) {
  applyLook(key, key==='actor' && new URLSearchParams(location.search).get('player')==='guji' ? '구지' : (readSetting('look-' + key) || (key === 'actor' ? '구지' : null)));
  document.getElementById(key).onchange = event => {
    applyLook(key, event.target.value);
    saveSetting('look-' + key, outfit[key]);
    syncPreset();
  };
}
const savedNumber = readSetting('jerseyNumber');
numberInput.value = /^\d{1,2}$/.test(savedNumber) ? savedNumber : '7';
numberInput.onchange = () => {
  numberInput.value = /^\d{1,2}$/.test(numberInput.value) ? numberInput.value : '7';
  saveSetting('jerseyNumber', numberInput.value);
};
function syncPreset() {
  const index = looks.floor.findIndex((floor,i) => floor === outfit.floor && looks.actor[i] === outfit.actor && looks.skinBall[i] === outfit.skinBall);
  document.querySelector('#preset').selectedIndex = index+1;
}
syncPreset();
document.querySelector('#preset').onchange = () => {
  const index = document.querySelector('#preset').selectedIndex - 1;
  for (const key of ['floor', 'skinBall', 'actor']) {
    applyLook(key, looks[key][index]);
    saveSetting('look-' + key, outfit[key]);
  }
  refreshPortraits();
};
const ink = '#302535';
function holdExpired(profile, tier, elapsed) {
  const limit = profile.motion === 'classic' ? gaugeDuration(profile, tier) : 4000;
  return elapsed >= limit;
}
const ballReleaseMs = 120;
const gujiReleaseMs=265;
const gujiHands=[[79,58],[79,76],[79,45],[78,27],[86,29],[80,28],[81,58],[77,76],[76,72],[73,69],[78,27],[80,20],[80,20],[86,29]];
function gujiPose(state,ms){
  let cell=0,jump=0;
  if(state==='hold') cell=ms<90?1:ms<200?2:3;
  if(state==='flight'){
    const air=Math.max(0,Math.min(1,(ms-40)/450));
    jump=104*air*(1-air);
    cell=ms<190?3:ms<265?10:ms<366?11:ms<418?12:ms<450?13:ms<490?4:ms<600?7:8;
  }
  if(state==='fumble')cell=ms<350?1:8;
  return {cell,jump};
}
function poseAt(state, ms) {
  if(outfit.actor==='구지')return gujiPose(state,ms);
  if (state === 'hold') return {reach:.45, bend:1, jump:0};
  if (state === 'fumble') return {reach:0, bend:1-ms/holdRecoveryMs, jump:0};
  if (state !== 'flight') return {reach:0, bend:0, jump:0};
  const air = Math.min(1, ms/410);
  const extend = Math.min(1, ms/ballReleaseMs);
  return {reach:(.45+.55*extend)*Math.max(0,1-Math.max(0,(ms-ballReleaseMs)/290)), bend:1-extend,
    jump:16*Math.sin(Math.PI*air)};
}
const holdRecoveryMs = 900;
function loseGrip(now) {
  if (phase !== 'hold') return;
  active=null;
  phase='fumble';
  start=now;
  attempts++;
  recordShot(false);
  score.textContent=scored+' / '+attempts+' 슛';
  statusLine.textContent=session.motion==='classic'?'타이밍 놓침 · 공을 놓쳤어요':'시간 초과 · 공을 놓쳤어요';
  tone(180,.1);
}
function handPosition(x,ground,pose,actor=outfit.actor) {
  if(actor==='구지'){
    const [hx,hy]=gujiHands[pose.cell??0];
    return {x:x+(x>hoop.x?-1:1)*(hx-64),y:ground-pose.jump+hy-116};
  }
  if(actor.endsWith('7등신')) return {x:x+(x>hoop.x?-1:1)*(15-6*pose.reach),y:ground-pose.jump-37+9*pose.bend-27*pose.reach};
  const height={루키:0,가드:-2,센터:4,번개:8}[actor];
  const face=x>hoop.x?-1:1;
  return {x:x+face*(13-6*pose.reach),y:ground-24-height-(actor==='번개'?3:0)-pose.jump+5*pose.bend-24*pose.reach};
}
// Arcade ball diameter in court units, shared by the entire roster.
const ballCourtDiameter=.40;
const netCourtLength=1.2*ballCourtDiameter;
// Sprite height and corresponding court height.
const playerArt = {
  루키:[45,1.82], 가드:[43,1.76], 센터:[49,2.06], 번개:[52,1.93],
  '준 · 남자 7등신':[61,1.98], '서진 · 여자 7등신':[61,1.85],구지:[88,1.85]
};
const gujiAtlas={image:new Image(),colors:new Map()};
gujiAtlas.image.onload=()=>refreshPortraits();
gujiAtlas.image.src='../game/art/guji/atlas.webp';
const referenceSheet=new Image();
const referenceColors=new Map();
referenceSheet.onload=()=>refreshPortraits();
if(window.twoBounceAtlas)referenceSheet.src=window.twoBounceAtlas;
function referenceBody(actor,cloth){
  const tone=skinPalettes[playerTones[actor]].skin;
  const key=actor+tone+cloth;
  if(referenceColors.has(key))return referenceColors.get(key);
  const layer=document.createElement('canvas');layer.width=128;layer.height=64;
  const brush=layer.getContext('2d');
  brush.drawImage(referenceSheet,actor.startsWith('서진')?128:0,0,128,64,0,0,128,64);
  const image=brush.getImageData(0,0,128,64),p=image.data;
  const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const skin=rgb(tone),jersey=rgb(cloth);
  for(let i=0;i<p.length;i+=4){
    if(!p[i+3])continue;
    const y=Math.floor(i/4/128),r=p[i],g=p[i+1],b=p[i+2];
    if(y>21 && Math.max(r,g,b)-Math.min(r,g,b)<27){
      for(let k=0;k<3;k++)p[i+k]=jersey[k]*(r+g+b)/630;
    }else if(r>85 && r>g*1.14 && g>b*1.10){
      for(let k=0;k<3;k++)p[i+k]=skin[k]*r/218;
    }
  }
  brush.putImageData(image,0,0);referenceColors.set(key,layer);return layer;
}
const fullModels=(window.fullPlayers||[]).map(model=>{
  const image=new Image();image.onload=refreshPortraits;image.src=model.src;
  return {image,bones:model.bones,colors:new Map()};
});
const customSkin=new Set(looks.actor.filter(actor=>readSetting('skin-tone-'+actor)));
tonePicker.addEventListener('change',()=>{customSkin.add(outfit.actor);refreshPortraits()});
function modelTexture(model,actor){
  const tone=customSkin.has(actor)?playerTones[actor]:'';
  const cloth=outfit.costume==='크리스마스 산타'?'레드':outfit.jersey;
  if(!tone && cloth==='크림')return model.image;
  const key=tone+cloth;
  if(model.colors.has(key))return model.colors.get(key);
  const layer=document.createElement('canvas');layer.width=model.image.width;layer.height=model.image.height;
  const brush=layer.getContext('2d');brush.drawImage(model.image,0,0);
  const data=brush.getImageData(0,0,layer.width,layer.height),p=data.data;
  const skin=tone?skinPalettes[tone].skin.match(/\w\w/g).map(x=>parseInt(x,16)):null;
  const shirt={레드:[217,77,63],블루:[82,155,211]}[cloth];
  for(let i=0;i<p.length;i+=4){
    if(!p[i+3])continue;
    const y=actor==='구지'?(Math.floor(i/4/layer.width)%256)/2-16:Math.floor(i/4/layer.width)%100,r=p[i],g=p[i+1],b=p[i+2];
    if(skin && r>85 && r>g*1.14 && g>b*1.1){
      for(let k=0;k<3;k++)p[i+k]=skin[k]*r/218;
    }else if(shirt && y>16 && y<46 && Math.max(r,g,b)-Math.min(r,g,b)<27){
      for(let k=0;k<3;k++)p[i+k]=shirt[k]*r/210;
    }
  }
  brush.putImageData(data,0,0);model.colors.set(key,layer);return layer;
}
const courtBalls={};
for(const [skin,fill] of Object.entries({오렌지:'#ef913b',아이스:'#a6ddf0',라임:'#bbe660',클래식:'#c17d4d'})){
  const art=document.createElement('canvas');art.width=art.height=24;
  const pen=art.getContext('2d');
  pen.beginPath();pen.arc(12,12,11,0,Math.PI*2);pen.fillStyle=fill;pen.fill();
  pen.strokeStyle='#513321';pen.lineWidth=1.8;pen.stroke();
  pen.save();pen.clip();pen.beginPath();pen.moveTo(1,12);pen.lineTo(23,12);
  pen.moveTo(10,1);pen.quadraticCurveTo(18,13,10,23);pen.stroke();pen.restore();
  pen.fillStyle='#ffe2a5';pen.fillRect(6,5,3,2);courtBalls[skin]=art;
}
function makeRenderer(ctx) {
  function tile(x,y,w,h,color) {
    ctx.fillStyle=color;
    ctx.fillRect(Math.round(x),Math.round(y),w,h);
  }
  // Square stamps keep diagonal limbs and the net on the same pixel grid.
  function pixelLine(x,y,endX,endY,size,color) {
    const steps=Math.max(1,Math.ceil(Math.hypot(endX-x,endY-y)));
    for(let i=0;i<=steps;i++) tile(x+(endX-x)*i/steps-size/2,y+(endY-y)*i/steps-size/2,size,size,color);
  }
  function sprite(x,y,rows,palette) {
    rows.forEach((row,dy)=>Array.from(row).forEach((key,dx)=>{
      if(palette[key]) tile(x+dx*2,y+dy*2,2,2,palette[key]);
    }));
  }
  function drawFullPlayer(x,ground,pose,actor,model){
    const portrait=ctx.canvas!==canvas;
    const view=portrait?0:{side:1,top:2,quarter:3}[document.getElementById('camera').value];
    const bones=model.bones[view], texture=modelTexture(model,actor);
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
  function drawLongPlayer(x,ground,pose,actor) {
    const pony=actor.startsWith('서진'), face=x>hoop.x?-1:1;
    const hand=handPosition(x,ground,pose,actor), wrist=(hand.x-x)*face-2;
    const palm=hand.y-ground+pose.jump+4;
    const hip=-31+9*pose.bend, shoulder=hip-19, width=pony?6:7;
    const {skin,shade,light}=skinPalettes[playerTones[actor]];
    const santa=outfit.costume==='크리스마스 산타';
    const cloth=santa?'#c83f49':{블루:'#69b8e7',크림:'#efd293',레드:'#e66654'}[outfit.jersey];
    function segment(x1,y1,x2,y2,w,color){
      pixelLine(x1,y1,x2,y2,w+2,ink);
      pixelLine(x1,y1,x2,y2,w,color);
    }
    tile(x-10,ground,21,2,'#143f43');
    ctx.save();ctx.translate(Math.round(x),Math.round(ground-pose.jump));ctx.scale(face,1);
    for(const side of [-1,1]){
      const knee=side*5+6*pose.bend, ankle=side*7;
      segment(side*3,hip,knee,-16+3*pose.bend,5,side<0?shade:skin);
      segment(knee,-16+3*pose.bend,ankle,-4,4,skin);
      tile(ankle-2,-8,4,5,'#ece6d3');tile(ankle-3,-4,9,4,ink);tile(ankle-2,-3,7,2,cloth);
    }
    function arm(side){
      const elbow=side*6+5, y=shoulder+12-17*pose.reach;
      segment(side*(width-1),shoulder+2,elbow,y,4,side<0?shade:skin);
      segment(elbow,y,wrist+side,palm,3,skin);tile(elbow-1,y-1,2,2,light);
    }
    arm(-1);
    const textured=referenceSheet.complete && referenceSheet.naturalWidth>0;
    if(!textured){
    for(let row=0;row<20;row++){
      const half=row===0?width-2:row>10?width-1:width;
      tile(-half,shoulder+row,2*half,1,ink);tile(1-half,shoulder+row,2*half-2,1,cloth);
    }
    }
    tile(-width,hip-1,width*2,7,pony?'#24223c':'#292a30');tile(-width,hip-1,width*2,2,santa?'#fff1d8':'#bcc7c2');
    if(textured){
      const view=ctx.canvas===canvas?document.getElementById('camera').value:'front';
      const index={front:0,side:1,top:2,quarter:3}[view];
      const bodyWidth=index===1?12:width*2+4;
      ctx.drawImage(referenceBody(actor,cloth),index*32,0,32,64,-bodyWidth/2,shoulder-11,bodyWidth,hip-shoulder+12);
    }else{
    tile(-2,shoulder-4,4,5,shade);
    tile(-4,shoulder-11,9,9,ink);tile(-3,shoulder-9,7,6,skin);tile(2,shoulder-8,2,1,light);tile(3,shoulder-7,2,1,ink);
    tile(-4,shoulder-11,8,3,'#51393d');tile(-4,shoulder-9,2,4,'#51393d');
    if(pony){tile(-7,shoulder-9,4,3,cloth);tile(-8,shoulder-7,3,7,'#49313b');}
    }
    if(outfit.band!=='없음')tile(-4,shoulder-9,9,2,{화이트:'#fff5de',골드:'#ffcb44',블랙:'#202331'}[outfit.band]);
    if(santa){tile(-4,shoulder-14,7,4,cloth);tile(-5,shoulder-11,10,2,'#fff1d8');tile(-6,shoulder-14,3,3,'#fff1d8');}
    ctx.save();ctx.scale(face,1);ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillStyle=ink;ctx.fillText(numberInput.value,0,shoulder+12);ctx.restore();
    arm(1);ctx.restore();return hand;
  }
  function drawPlayer(x,ground,pose,actor=outfit.actor) {
    if(actor==='구지'){
      const cell=pose.cell??0,portrait=ctx.canvas!==canvas,k=portrait?.73:1;
      ctx.save();ctx.translate(Math.round(x),Math.round(ground-pose.jump));ctx.scale((x>hoop.x?-1:1)*k,k);
      ctx.imageSmoothingEnabled=false;
      if(gujiAtlas.image.naturalWidth){
        ctx.drawImage(modelTexture(gujiAtlas,actor),(cell%5)*256,Math.floor(cell/5)*256,256,256,-64,-116,128,128);
        if(outfit.band!=='없음'||outfit.costume==='크리스마스 산타'){
          const [hx,hy]=[[-1,-82],[-1,-68],[-2,-78],[-4,-80],[-5,-84],[-5,-85],[-5,-76],[-1,-66],[-1,-72],[-1,-78],[-4,-80],[-5,-84],[-5,-84],[-5,-84]][cell];
          if(outfit.costume==='크리스마스 산타'){tile(hx-5,hy-5,10,5,'#bf3841');tile(hx-6,hy,12,2,'#fff0da')}
          if(outfit.band!=='없음')tile(hx-5,hy+2,10,2,{화이트:'#fff5de',블랙:'#222432',골드:'#efbe52'}[outfit.band]);
        }
      }
      ctx.restore();return handPosition(x,ground,pose,actor);
    }
    if(actor.endsWith("7등신")){
      const model=fullModels[actor.startsWith('준')?0:1];
      if(model?.image.complete && model.image.naturalWidth)return drawFullPlayer(x,ground,pose,actor,model);
      return drawLongPlayer(x,ground,pose,actor);
    }
    const face=x>hoop.x?-1:1;
    const tall={루키:0,가드:-2,센터:4,번개:8}[actor];
    const wide={루키:8,가드:7,센터:10,번개:9}[actor];
    const hip=(actor==='번개'?-19:-16)+5*pose.bend;
    const shoulder=hip-12-tall;
    const {skin,shade,light} = skinPalettes[playerTones[actor]];
    const santa = outfit.costume === '크리스마스 산타';
    const shirt=santa ? '#d53a42' : {크림:'#ffe3a2',블루:'#79caff',레드:'#ff765e'}[outfit.jersey];
    const trim=santa?'#96293b':{크림:'#c79559',블루:'#3983ae',레드:'#bc5249'}[outfit.jersey];
    const hand=handPosition(x,ground,pose,actor);
    tile(x-12,ground-1,24,3,'#143f43');
    ctx.save();
    ctx.translate(Math.round(x),Math.round(ground-pose.jump));
    ctx.scale(face,1);
    function limb(ax,ay,bx,by,cx,cy,color) {
      for(const [size,tint] of [[8,ink],[6,shade],[4,color]]) {
        pixelLine(ax,ay,bx,by,size,tint); pixelLine(bx,by,cx,cy,size,tint);
      }
      pixelLine(ax-1,ay-1,(ax+bx)/2-1,(ay+by)/2-1,2,light);
      tile(bx-2,by-2,3,2,light);
    }
    for(const side of [-1,1]) {
      const foot=side*6;
      limb(side*4,hip,foot+2+5*pose.bend,-8+pose.bend,foot,-3,skin);
      tile(foot-3,-4,10,5,ink);tile(foot-2,-5,4,2,'#d5d8cc');tile(foot-2,-3,7,3,shirt);tile(foot,-3,3,1,'#fff3d2');tile(foot-2,0,8,1,'#c5bcae');
    }
    const wristX=(hand.x-x)*face-2, wristY=hand.y-ground+pose.jump+5;
    limb(-wide+1,shoulder+3,1,shoulder+11-17*pose.reach,wristX-3,wristY+1,skin);
    // Step the silhouette inward from the shoulders to the waist.
    for(let row=0;row<hip-shoulder;row++){
      const half=wide-(row===0?3:row<3?1:row>hip-shoulder-5?2:0);
      tile(-half,shoulder+row,half*2,1,ink);
      tile(1-half,shoulder+row,half*2-2,1,shirt);
      tile(1-half,shoulder+row,row<4?2:3,1,trim);
    }
    tile(-wide+3,shoulder+2,3,2,'#fff2cd');
    tile(wide-5,shoulder+3,2,4,trim);
    tile(-wide+4,hip-5,4,2,trim);
    tile(-wide+7,hip-6,3,1,trim);
    tile(2-wide,hip-1,wide*2-4,2,ink);
    for(const side of [-1,1]){
      const left=side<0?-wide:0;
      tile(left,hip+1,wide,5,ink);
      tile(left+1,hip+1,wide-2,4,side<0?'#38435c':'#536681');
      tile(left+1,hip+1,2,3,trim);
    }
    if (actor === '번개' && !santa) {
      tile(2-wide,shoulder+2,4,5,'#248c91');
      tile(4-wide,shoulder+7,3,3,'#248c91');
      tile(6-wide,shoulder+10,2,2,'#248c91');
    }
    if (santa) {
      tile(2-wide,hip-4,wide*2-4,3,'#fff1d8');
      tile(-wide,hip-1,wide*2,3,ink);
      tile(-2,hip-1,4,3,'#ffd365');
    }
    // The neck bridges the chin and jersey in every crouch and jump frame.
    tile(-4,shoulder-5,9,8,ink);
    tile(-2,shoulder-5,6,8,skin);
    tile(-2,shoulder-4,2,3,shade);
    if (actor === '번개') {
      sprite(-11,shoulder-17,[
        '..kk..kkk..','..khkkhhkk.','.khhhhhhhhk',
        'khhhtthhhhk','khhsskkllsk','.ksssksskek',
        '.ksssssnnsk','..ksssssksk','...kkssskk.','.....kkk...'
      ],{k:ink,h:'#352f51',t:'#69d6ca',s:skin,l:light,n:shade,e:'#fff3d2'});
    } else {
      const crowns={
        루키:['...kkkkkk..','..khaaahhk.','.khhahhhhhh','khhhhkkhhhk'],
        가드:['.....kk..k.','...kkahkkhk','.kkahhahhhk','khhhhhhkkhk'],
        센터:['..kkkkkkk..','.kaaaaahhk.','.khhhhhhhh.','.khhkkkkhhk']
      };
      sprite(-11,shoulder-20,[...crowns[actor],
        '.khhnssllsk','.khnsnkkskk','.knsnsssekk','..knssllssk',
        '..knnssskk.','...knnsssk.','....kkkkk..'
      ],{k:ink,h:actor==='센터'?'#443832':'#553746',a:actor==='가드'?'#ad6651':'#896049',s:skin,n:shade,l:light,e:'#fff4df'});
    }
    if (santa) {
      sprite(-15,shoulder-27,[
        '....rrrrr...',
        '..rrrssrrr..',
        '.rrr.rrrrrr.',
        '.ww..rrrrrrr',
        'www.wwwwwwww',
        '.w..wwwwwwww'
      ],{r:'#d53a42',s:'#9d2638',w:'#fff1d8'});
    }
    if(outfit.band!=='없음') tile(-7,shoulder-13,14,3,outfit.band==='화이트'?'#fff5de':outfit.band==='골드'?'#ffcb44':'#202331');
    ctx.save();ctx.scale(face,1);ctx.fillStyle=santa?'#fff1d8':ink;ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillText(numberInput.value,0,shoulder+10);ctx.restore();
    limb(wide-2,shoulder+4,wide+5,shoulder+12-21*pose.reach,wristX,wristY,skin);
    pixelLine(wristX,wristY,wristX+4,wristY-2+4*pose.reach,3,skin);
    ctx.restore();
    return hand;
  }
  function drawBall(x,y,actor=outfit.actor) {
    const [height,meters]=playerArt[actor],diameter=ballCourtDiameter*height/meters;
    ctx.drawImage(courtBalls[outfit.skinBall],x-diameter/2,y-diameter/2,diameter,diameter);
  }
  return {tile,pixelLine,drawPlayer,drawBall};
}
const {tile,pixelLine,drawPlayer,drawBall} = makeRenderer(ctx);
const roster = document.querySelector('#roster');
const portraits = looks.actor.map(actor => {
  const card = document.createElement('button');
  card.type = 'button';
  const portrait = document.createElement('canvas');
  portrait.width = 68;
  portrait.height = 80;
  portrait.setAttribute('aria-hidden','true');
  card.append(portrait,document.createTextNode(actor));
  roster.append(card);
  card.onclick = () => {
    applyLook('actor',actor);
    saveSetting('look-actor',actor);
    syncPreset();
    refreshPortraits();
  };
  return {actor,card,portrait,renderer:makeRenderer(portrait.getContext('2d'))};
});
function refreshPortraits() {
  for (const {actor,card,portrait,renderer} of portraits) {
    card.setAttribute('aria-pressed',String(actor === outfit.actor));
    portrait.style.backgroundColor = canvas.style.backgroundColor;
    portrait.getContext('2d').clearRect(0,0,portrait.width,portrait.height);
    const full=actor==="구지"||actor.endsWith("7등신");
    const hand = renderer.drawPlayer(full?34:29,73,{reach:full?0:.22,bend:full?0:.25,jump:0},actor);
    if(!full)renderer.drawBall(hand.x,hand.y,actor);
  }
  if (typeof requestLabPreview === 'function') requestLabPreview();
}
refreshPortraits();
numberInput.addEventListener('input',refreshPortraits);
document.querySelector('#appearance').addEventListener('change',refreshPortraits);
function currentRimRadius(){return .26}
const hoopLayer=document.createElement('canvas');
hoopLayer.width=width;hoopLayer.height=height;
const hoopPen=hoopLayer.getContext('2d');
function drawHoop(now,foreground=false) {
  hoopPen.clearRect(0,0,width,height);
  paintHoopPixels(hoopPen,now,foreground);
  ctx.drawImage(hoopLayer,0,0);
}
function paintHoopPixels(ctx,now,foreground) {
  const rimRadius=currentRimRadius();
  const lift=rimHeightPixels();
  function vertex(x,depth,z){
    const p=projectCourt(x,depth);
    return [p.x,p.y-z*lift/3.05];
  }
  function shape(points,color,weight,fill){
    ctx.beginPath();
    points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
    if(fill){ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
    ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.stroke();
  }
  // The endline and both board edges run along the court's x axis.
  const front=1.575-rimRadius-.10, back=front-.11, half=.90, low=2.90, high=3.95;
  const frontFace=(w,y,b,t)=>[vertex(-w,y,b),vertex(w,y,b),vertex(w,y,t),vertex(-w,y,t),vertex(-w,y,b)];
  const edge='#56574e';
  if(!foreground){
  shape([vertex(0,-.38,0),vertex(0,-.38,3.45),vertex(0,back,3.45)],edge,4);
  shape([vertex(0,-.38,2.45),vertex(0,back,3.4)],'#608486',2);
  shape([vertex(0,-.38,3.45),vertex(0,back,high-.08)],'#999888',2);
  shape([vertex(0,-.38,3.45),vertex(0,back,3.45)],'#c2c0b0',2);
  const cosine=Math.cos(cameras[camera.value].angle);
  if(cosine>.001 && lift>0){
    shape(frontFace(half,front,low,high),edge,3,'#deddd2');
    shape([vertex(-half+.04,front,low+.04),vertex(-half+.04,front,high-.04),vertex(half-.04,front,high-.04)],'#fff7dc',2);
    shape(frontFace(.32,front,3.05,3.55),'#5e5c56',1.5);
  }
  shape([vertex(-half,back,high),vertex(half,back,high),vertex(half,front,high),vertex(-half,front,high)],edge,1,'#e2f1e7');
  if(Math.abs(Math.sin(cameras[camera.value].angle))>.001){
    const side=Math.sign(Math.sin(cameras[camera.value].angle))*half;
    shape([vertex(side,back,low),vertex(side,front,low),vertex(side,front,high),vertex(side,back,high)],edge,1,'#99998a');
  }
  shape([vertex(0,front,3.05),vertex(0,1.575-rimRadius,3.05)],'#af562f',3);
  }
  function ring(t,z,r){return vertex(r*Math.cos(t),1.575+r*Math.sin(t),z);}
  // Anchor the lowest net knot in screen space so camera tilt cannot shorten it.
  const netSteps=8;
  const knots=Array.from({length:netSteps},(_,i)=>ring((i+.5)*2*Math.PI/netSteps,3.05,rimRadius*.62));
  const rimCenter=vertex(0,1.575,3.05);
  const netDrop=rimCenter[1]+netCourtLength*courtScale(cameras[camera.value].angle)-Math.max(...knots.map(p=>p[1]));
  const age=now-goalAt;
  const t=Math.min(1,Math.max(0,age/760));
  // Bend each strand at its midpoint. Both upper segments stay anchored.
  const bend=reducedMotion.matches?0:(t<.2
    ? Math.sin(Math.PI*t/.4)
    : Math.cos((t-.2)*Math.PI*3/.8)*((1-t)/.8)**2)*Math.PI/3;
  const cos=Math.cos(bend),sin=Math.sin(bend);
  for(let i=0;i<netSteps;i++){
    const angle=i*2*Math.PI/netSteps;
    if(foreground && Math.sin(angle+Math.PI/netSteps+cameras[camera.value].angle)<1e-9)continue;
    const left=ring(angle,3.05,rimRadius),right=ring(angle+2*Math.PI/netSteps,3.05,rimRadius);
    const [x,y]=knots[i],bottom=y+netDrop;
    const midLeft=[(left[0]+x)/2,(left[1]+bottom)/2];
    const midRight=[(right[0]+x)/2,(right[1]+bottom)/2];
    const pivotX=(midLeft[0]+midRight[0])/2,pivotY=(midLeft[1]+midRight[1])/2;
    const dx=x-pivotX,dy=bottom-pivotY;
    const tip=[pivotX+dx*cos+dy*sin,pivotY-dx*sin+dy*cos];
    shape([left,midLeft,tip,midRight,right],'#f6ebcf',1.2);
  }
  const rim=Array.from({length:foreground?13:25},(_,i)=>ring(i*Math.PI/12-(foreground?cameras[camera.value].angle:0),3.05,rimRadius));
  const stroke=Math.max(1.5,courtScale()*.035);
  shape(rim,'#493334',stroke+1);shape(rim,'#ff8939',stroke);
}
const tiers = [
  {width:.45, shift:.06}, {width:.30, shift:.09}, {width:.18, shift:.12},
  {width:.14, shift:.15}, {width:.10, shift:.18}
];
const starts = {'.45':1, '.18':3, '.10':5};
const labels = {'.45':'쉬움', '.18':'보통', '.10':'어려움'};
const modes = ['randomBand','promotion','fadeBand'].map(id => document.getElementById(id));
const ledger = new Map();
let session, band;
const motion = document.querySelector('#motion');
const pace = document.querySelector('#pace');
for (const select of [motion, pace]) {
  const saved = readSetting(select.id);
  if (Array.from(select.options).some(option => option.value === saved)) select.value = saved;
  select.onchange = () => { saveSetting(select.id, select.value); refreshRecords(); };
}
function gaugeDuration(profile, tier) {
  const durations = {classic:950, auto:tier <= 2 ? 1200 : 1000, slow:1200, normal:1000, fast:750};
  return durations[profile.pace];
}
function cycleBand(profile, base, elapsed) {
  const duration = gaugeDuration(profile, base.tier) * (profile.motion === 'bounce' ? 2 : 1);
  const cycles = profile.motion === 'classic' ? 0 : Math.floor(Math.max(0, elapsed) / duration);
  if (!cycles) return {...base, alpha:1};
  const width = base.width * Math.max(.40, .8 ** cycles);
  const targetAlpha = n => Math.max(.25, .7 ** n);
  const fade = Math.min(1, (elapsed - cycles * duration) / 160);
  const alpha = targetAlpha(cycles-1) + (targetAlpha(cycles)-targetAlpha(cycles-1))*fade;
  return {...base, width, low:base.center-width/2, high:base.center+width/2, alpha};
}
function gaugePower(profile, tier, elapsed) {
  const travel = Math.max(0, elapsed) / gaugeDuration(profile,tier);
  if (profile.motion === 'bounce') return 1 - Math.abs(1 - travel % 2);
  if (profile.motion === 'dial') return travel % 1;
  return Math.min(1, travel);
}
function settingsProfile() {
  const [random, promote, fade] = modes.map(control => control.checked);
  return {level:difficulty.value, motion:motion.value, pace:pace.value, random, promote, fade};
}
function profileKey(p) {
  const flags = [p.random,p.promote,p.fade].map(Number).join('');
  const base = flags === '000' ? p.level : p.level + ':' + flags;
  return p.motion === 'classic' && p.pace === 'classic' ? base : [base,p.motion,p.pace].join(':');
}
function tierAt(p, goals) {
  return Math.min(5, starts[p.level] + (p.promote ? Math.floor(goals/10) : 0));
}
function prepareBand(p, goals, base, first, rng=Math.random) {
  const tier = tierAt(p, goals);
  const {width, shift} = tiers[tier-1];
  let center = base;
  if (p.random && !first) {
    const low = Math.max(.05 + width/2, base-shift);
    const high = Math.min(.95 - width/2, base+shift);
    center = low + rng()*(high-low);
  }
  return {tier, center, width, low:center-width/2, high:center+width/2};
}
function prepareNextShot(first) {
  band = prepareBand(session, scored, target(player), first);
  const progress = session.promote && band.tier<5 ? ' · '+scored+'/'+(Math.floor(scored/10)*10+10)+'골' : '';
  document.querySelector('#tierStatus').textContent = 'Lv.'+band.tier+(band.tier===5?' · 최고 단계':'')+progress;
}
function opacityAt(tier, elapsed, enabled) {
  if (!enabled || tier<4) return 1;
  const [delay,duration,floor] = tier===4 ? [150,400,.25] : [100,300,0];
  return 1-(1-floor)*Math.min(1,Math.max(0,(elapsed-delay)/duration));
}
function getRecord(p) {
  const key = profileKey(p);
  if (!ledger.has(key)) ledger.set(key,{
    best:Math.max(0,Number(readSetting('best:'+key))||0),
    reached:Math.min(5,Math.max(starts[p.level],Number(readSetting('reached:'+key))||0))
  });
  return ledger.get(key);
}
function listRecords() {
  const list = document.querySelector('#rankList');
  list.replaceChildren();
  for (const level of ['.45','.18','.10']) {
    const rows=[];
    for(let flags=0;flags<8;flags++) {
      const p={level,random:Boolean(flags&4),promote:Boolean(flags&2),fade:Boolean(flags&1)};
      for (const shape of motion.options) {
        for (const speed of pace.options) {
          const profile = {...p, motion:shape.value, pace:speed.value};
          const record = getRecord(profile);
          if (record.best) rows.push({p:profile, record, modeLabel:shape.text, speedLabel:speed.text});
        }
      }
    }
    rows.sort((a,b)=>b.record.best-a.record.best);
    for(const {p,record,modeLabel,speedLabel} of rows) {
      const item=document.createElement('li');
      const options=[p.random&&'랜덤',p.promote&&'승급',p.fade&&'숨김'].filter(Boolean).join(' · ')||'기본';
      item.textContent=labels[level]+' · '+record.best+'연속 · Lv.'+starts[level]+' → Lv.'+record.reached+' · '+options+' · '+modeLabel+' · '+speedLabel;
      list.append(item);
    }
  }
  if(!list.children.length) list.textContent='첫 득점 후 기록이 표시됩니다.';
}
let streak = 0;
let hapticsOn = readSetting('haptics') !== 'off';
function refreshRecords() {
  const p=settingsProfile();
  const best=getRecord(p).best;
  document.querySelector('#homeRecord').textContent=labels[p.level]+' · 최고 '+best+'연속';
  records.textContent='현재 '+streak+'연속 · 같은 조건 최고 '+best+'연속';
  document.querySelector('#promotionHint').textContent=starts[p.level]===5?'최고 단계에서 시작해요':'';
}
for (const control of modes) {
  control.checked=readSetting(control.id)==='on';
  control.onchange=()=>{saveSetting(control.id,control.checked?'on':'off');refreshRecords();};
}
document.querySelector('#ranking').ontoggle=event=>{if(event.target.open) listRecords();};
function refreshHaptics() {
  haptic.textContent = hapticsOn ? '진동 켜짐' : '진동 꺼짐';
  haptic.setAttribute('aria-pressed', String(hapticsOn));
}
function vibrate(pattern) {
  if (hapticsOn) navigator.vibrate?.(pattern);
}
const missLimit = 3;
let misses = 0;
const gameOver = document.querySelector('#gameOver');
const retry = document.querySelector('#retry');
function refreshMissCount() {
  document.querySelector('#missCount').textContent = '실패 ' + misses + ' / ' + missLimit;
}
function endGame() {
  phase = 'over';
  active = null;
  button.hidden = true;
  gameOver.hidden = false;
  statusLine.textContent = '누적 3회 실패로 경기가 끝났어요.';
  document.querySelector('#result').textContent = attempts + '번 슛 · ' + scored + '골';
  retry.focus();
}
function recordShot(hit) {
  if (!hit) { misses++; refreshMissCount(); }
  streak = hit ? streak + 1 : 0;
  const key = profileKey(session);
  const record = getRecord(session);
  const nextTier = tierAt(session,scored);
  const notices = [];

  if(nextTier>band.tier) notices.push(scored+'골 달성 · 다음 슛 Lv.'+nextTier);
  if(nextTier>record.reached){record.reached=nextTier;saveSetting('reached:'+key,nextTier);}
  if ([3, 5, 10].includes(streak)) notices.push(streak + '연속!');
  if (streak > record.best) {
    record.best=streak;
    saveSetting('best:' + key, streak);
    notices.push('개인 최고 경신');
  }
  milestone.textContent = notices.join(' · ');
  refreshRecords();
}
difficulty.onchange = () => { saveSetting('difficulty', difficulty.value); streak = 0; milestone.textContent = ''; refreshRecords(); };
haptic.onclick = () => {
  hapticsOn = !hapticsOn;
  saveSetting('haptics', hapticsOn ? 'on' : 'off');
  refreshHaptics();
};
refreshRecords();
refreshHaptics();
const lerp=(a,b,t)=>a+(b-a)*t;
function distance(p){return Math.hypot(p.x-hoop.x,p.y-hoop.y)}
function target(p){return Math.min(.84,.25+distance(p)/600)}
function outside(p){return p.x<16||p.x>384||p.y<52||p.y>478||distance(p)>320}
function nextSpot(p){return outside(p)?{...free}:{...p}}
function tone(freq,time){if(!soundOn||!audio||audio.state!=='running')return;const osc=audio.createOscillator(),gain=audio.createGain();osc.frequency.setValueAtTime(freq,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(freq*.45,audio.currentTime+time);gain.gain.setValueAtTime(.12,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+time);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+time)}
function press(id){if(court.hidden||phase!=='ready'||active!==null)return false;active=id;difficulty.disabled=true;try{audio??=new AudioContext();audio.resume().catch(()=>{})}catch{}phase='hold';start=performance.now();statusLine.textContent=session.motion==='classic'?'끝에 닿기 전에 놓으세요 · 목표 중앙은 PERFECT':'4초 안에 놓으세요 · 목표 중앙은 PERFECT';return true}
function judgeShot(power, band) {
  if (power < band.low || power > band.high) return 'miss';
  const radius = band.width / 8;
  return power >= band.center - radius && power <= band.center + radius ? 'perfect' : 'goal';
}
function swish() {
  if (!soundOn || !audio || audio.state !== 'running') return;
  const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * .15), audio.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = (Math.random()*2-1) * .25 * (1-i/samples.length)**3;
  const noise = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2800;
  noise.buffer = buffer;
  noise.connect(filter);
  filter.connect(audio.destination);
  noise.onended = () => { noise.disconnect(); filter.disconnect(); };
  noise.start();
}
function release(id){if(id!==active||phase!=='hold')return;const now=performance.now();if(holdExpired(session,band.tier,now-start)){loseGrip(now);return}active=null;const power=gaugePower(session,band.tier,now-start),error=power-band.center,grade=judgeShot(power,cycleBand(session,band,now-start)),hit=grade!=='miss';
const angle=hit?Math.PI*(.10+Math.random()*.80):Math.PI*(error<0?.28:.72)+(Math.random()-.5)*1.4,range=hit?48+Math.random()*55:110+Math.abs(error)*380;
const detach=outfit.actor==='구지'?gujiReleaseMs:ballReleaseMs;
shot={detach,origin:handPosition(player.x,player.y,poseAt('flight',detach)),from:{...player},power,hit,perfect:grade==='perfect',end:{x:hoop.x+Math.cos(angle)*range,y:hoop.y+Math.sin(angle)*range},contact:hit?hoop.x:hoop.x+(error<0?-14:14)};phase='flight';sequence=0;start=performance.now();attempts++;statusLine.textContent='슛';tone(400,.07)}
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel()});
function cancel(){active=null;if(phase==='hold'){phase='ready';difficulty.disabled=false;statusLine.textContent='다시 누르면 점프해요'}}
for(const surface of [canvas,button]){surface.onpointerdown=e=>{if(e.button===0&&press(e.pointerId)){surface.setPointerCapture(e.pointerId);e.preventDefault()}};surface.onpointerup=e=>release(e.pointerId);surface.onpointercancel=e=>{if(active===e.pointerId)cancel()}}
button.onkeydown=e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();if(!e.repeat)press('key')}};button.onkeyup=e=>{if([' ','Enter'].includes(e.key))release('key')};window.addEventListener('blur',cancel);
const soundButton = document.querySelector('#sound');
function refreshSound() {
  soundButton.textContent = soundOn ? '소리 켜짐' : '소리 꺼짐';
  soundButton.setAttribute('aria-pressed', String(soundOn));
}
refreshSound();
soundButton.onclick = () => {
  soundOn = !soundOn;
  saveSetting('sound', soundOn ? 'on' : 'off');
  refreshSound();
};
function showScreen(screen) {
  for (const section of [home, court, settings]) section.hidden = section !== screen;
}
options.onclick = () => { showScreen(settings); difficulty.focus(); };
document.querySelector('#back').onclick = () => { showScreen(home); options.focus(); };
let animation = 0;
function startGame() {
  misses = 0;
  refreshMissCount();
  gameOver.hidden = true;
  button.hidden = false;
  player = {...free};
  ball = {...free};
  phase = 'ready';
  active = null;
  shot = null;
  scored = attempts = sequence = streak = 0;
  session=settingsProfile();
  prepareNextShot(true);
  goalAt = -Infinity;
  difficulty.disabled = false;
  document.querySelector('#score').textContent = '0 / 0 슛';
  milestone.textContent = '';
  statusLine.textContent = '자유투 라인 · 꾹 누르고 목표 띠에서 놓으세요';
  refreshRecords();
  showScreen(court);
  button.focus();
  animation = requestAnimationFrame(frame);
}
play.onclick = retry.onclick = startGame;
document.querySelector('#leave').onclick = () => {
  cancelAnimationFrame(animation);
  cancel();
  difficulty.disabled = false;
  showScreen(home);
  if(document.querySelector("#ranking").open) listRecords();
  play.focus();
};
function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
function line(x,y,X,Y,color,w){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(X,Y);ctx.stroke()}
let goalAt = -Infinity;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function drawGoal(now) {
  const progress = (now - goalAt) / 570;
  if (progress >= 1) return;
  ctx.save();
  if (!reducedMotion.matches && progress>.30) {
    ctx.globalAlpha = .62*(1-progress);
    ctx.strokeStyle = '#ffe375';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(hoop.x, hoop.y, 16 + 42 * progress, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 20; i++) {
      const angle = i * Math.PI / 10;
      const radius = 18 + progress * (i % 2 ? 56 : 38);
      circle(hoop.x + Math.cos(angle) * radius, hoop.y + Math.sin(angle) * radius, 3, i % 2 ? '#fff4ce' : '#ffc158');
    }
  }
  ctx.textAlign = 'center';
  ctx.font = 'bold 26px system-ui';
  ctx.fillStyle = '#fff4ce';
  ctx.fillText(shot?.perfect ? 'PERFECT' : '골!', hoop.x, hoop.y - 32);
  ctx.restore();
}

const camera = document.getElementById('camera');
const cameras = {
  top: {angle:0, depth:1},
  side: {angle:-Math.PI/2, depth:.14},
  quarter: {angle:Math.PI/4, depth:.46}
};
camera.value = Object.hasOwn(cameras,readSetting('camera')) ? readSetting('camera') : 'quarter';
const requestedCamera=new URLSearchParams(location.search).get('camera');
if(Object.hasOwn(cameras,requestedCamera))camera.value=requestedCamera;
camera.onchange = () => saveSetting('camera',camera.value);
// Court metres are shared by the floor, hoop, ball and all player sprites.
const closeCourtScale=64;
let framing={scale:closeCourtScale,x:0,y:0};
function courtScale(){return framing.scale}
function rimHeightPixels(){
  return 3.05*framing.scale*Math.sqrt(1-cameras[camera.value].depth**2);
}
function courtDepth(y){
  return y<=105?(y-52)*1.575/53:y<=330?1.575+(y-105)*4.225/225:5.8+(y-330)*8.2/148;
}
function cameraPlane(x,y){
  const {angle,depth}=cameras[camera.value],c=Math.cos(angle),s=Math.sin(angle);
  return {x:x*c-y*s,y:(x*s+y*c)*depth};
}
function frameCourt(now){
  let x=player.x,y=player.y;
  if(phase==='bounce'){
    const t=Math.min(1,(now-start)/(shot.hit?1420:890));
    x=lerp(x,shot.end.x,t);y=lerp(y,shot.end.y,t);
  }
  const feet=cameraPlane((x-200)*15/368,courtDepth(y));
  const basket=cameraPlane(0,1.575),vertical=Math.sqrt(1-cameras[camera.value].depth**2);
  const left=Math.min(feet.x-.85,basket.x-1.6),right=Math.max(feet.x+.85,basket.x+1.6);
  const top=Math.min(feet.y-3.4,basket.y-4.25*vertical-.65);
  const bottom=Math.max(feet.y+.45,basket.y+.75);
  const scale=Math.min(closeCourtScale,(width-16)/(right-left),(height-78)/(bottom-top));
  framing={scale,x:width/2-(left+right)*scale/2,y:height/2+16-(top+bottom)*scale/2};
}
function projectCourt(x,y){
  const p=cameraPlane(x,y);
  return {x:framing.x+p.x*framing.scale,y:framing.y+p.y*framing.scale};
}
function floorPoint(x,y){return projectCourt((x-200)*15/368,courtDepth(y))}
function paintCourt() {
  function path(points,close=false) {
    ctx.beginPath();
    points.forEach(([x,y],i)=>{const p=projectCourt(x,y);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y)});
    if(close)ctx.closePath();
    ctx.stroke();
  }
  function arc(y,r,a,b) {
    return Array.from({length:65},(_,i)=>{const t=a+(b-a)*i/64;return [r*Math.cos(t),y+r*Math.sin(t)]});
  }
  ctx.strokeStyle='#c4d6c6';ctx.lineWidth=1.8;
  path([[-7.5,0],[7.5,0],[7.5,14],[-7.5,14]],true);
  path([[-2.45,0],[-2.45,5.8],[2.45,5.8],[2.45,0]]);
  path(arc(5.8,1.8,0,Math.PI));
  path(arc(14,1.8,Math.PI,2*Math.PI));
  const a=Math.acos(6.6/6.75);
  path([[6.6,0],...arc(1.575,6.75,a,Math.PI-a),[-6.6,0]]);
}
function atPoint(screen,x,y,draw,flip=1,scale=1) {
  ctx.save();ctx.translate(screen.x,screen.y);ctx.scale(flip*scale,scale);ctx.translate(-x,-y);
  const result=draw();ctx.restore();return result;
}

// A made basket stays in the net before it can scatter across the floor.
function madeBasketPosition(t,end,rim,lift,scale) {
  const netExit={x:rim.x,y:rim.y+netCourtLength*scale};
  const radius=ballCourtDiameter*scale/2;
  const floor=floorPoint(hoop.x,hoop.y);
  // Overhead projection collapses height. Keep the illustrated drop legible.
  const impact={x:floor.x,y:Math.max(rim.y+lift-radius,netExit.y+radius*2.4)};
  if(t<=.24) return {x:rim.x,y:lerp(rim.y,netExit.y,t/.24)};
  if(t<=.56) {
    const u=(t-.24)/.32;
    return {x:impact.x,y:lerp(netExit.y,impact.y,u*(.45+.55*u))};
  }
  const u=(t-.56)/.44, landing=floorPoint(end.x,end.y);
  return {x:lerp(impact.x,landing.x,u),y:lerp(impact.y,landing.y-radius,u)-4*u*(1-u)*scale*1.75};
}
function frame(now,previewOnly=false){
const detach=shot?.detach??ballReleaseMs;
const bounceDuration=shot?.hit?1420:890;
const finishedBounce = phase === 'bounce' && now-start >= bounceDuration;
const finishedFumble = phase === 'fumble' && now-start >= holdRecoveryMs;
if (misses >= missLimit && (finishedBounce || finishedFumble)) {
  if (finishedBounce) { tone(125,.12); vibrate(10); }
  endGame();
  return;
}
const resolution=Math.max(1,Math.min(4,Math.ceil(canvas.clientWidth*(window.devicePixelRatio||1)/width)));
if(canvas.width!==width*resolution||canvas.height!==height*resolution){canvas.width=width*resolution;canvas.height=height*resolution}
ctx.setTransform(resolution,0,0,resolution,0,0);ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,width,height);
frameCourt(now);
paintCourt();
const rim=floorPoint(hoop.x,hoop.y), lift=rimHeightPixels();
rim.y-=lift;
if(phase==='hold' && holdExpired(session,band.tier,now-start)) loseGrip(now);
if(phase==='fumble' && now-start>=holdRecoveryMs){phase='ready';difficulty.disabled=false;prepareNextShot(false);statusLine.textContent='다시 준비 · 목표 띠에서 놓으세요';}
let elapsed=Math.max(0,now-start),power=phase==='hold'?gaugePower(session,band.tier,elapsed):0;
if(phase==='flight'){let t=Math.min(1,Math.max(0,elapsed-detach)/500);ball={x:lerp(shot.origin.x,shot.contact,t),y:lerp(shot.origin.y,105,t)-95*Math.sin(Math.PI*t)};if(t===1){phase='bounce';start=now;if(shot.hit){scored++;goalAt=now;vibrate([30,45,30])}recordShot(shot.hit);score.textContent=scored+' / '+attempts+' 슛';if(shot.perfect)swish();else tone(shot.hit?740:310,.13);statusLine.textContent=shot.perfect?'PERFECT · 다음 바운드를 보세요':shot.hit?'득점 · 다음 바운드를 보세요':'림 · 다음 바운드를 보세요'}}
if(phase==='bounce'){const t=Math.min(1,(now-start)/bounceDuration),first=.56,u=t<first?t/first:(t-first)/(1-first);ball={x:lerp(shot.contact,shot.end.x,t),y:lerp(105,shot.end.y,t)-(t<first?32*(1-u)+42*Math.sin(Math.PI*u):34*Math.sin(Math.PI*u))};if(t>=first&&sequence===0){tone(155,.13);vibrate(10);sequence=1}if(t===1){tone(125,.12);vibrate(10);difficulty.disabled=false;player=nextSpot(shot.end);prepareNextShot(false);phase='ready';statusLine.textContent=outside(shot.end)?'범위 이탈 · 자유투 라인에서 다시 시작':'두 번째 바운드 · 이 자리에서 다음 슛'}}
drawHoop(now);
let px=player.x,py=player.y;if(phase==='bounce'){const t=Math.min(1,(now-start)/bounceDuration);px=lerp(px,shot.end.x,t);py=lerp(py,shot.end.y,t)}
const pose=poseAt(phase,elapsed);const feet=floorPoint(px,py);
const flip=(px>hoop.x?-1:1)*(feet.x>rim.x?-1:1);
const pixelsPerMeter=courtScale();
const [sourceHeight,meters]=playerArt[outfit.actor];
const actorScale=pixelsPerMeter*meters/sourceHeight;
const hand=atPoint(feet,px,py,()=>drawPlayer(px,py,pose),flip,actorScale);if(phase==='ready'||phase==='hold'||(phase==='flight' && elapsed<detach))ball=hand;
if(phase==='fumble'){
  const u=elapsed/holdRecoveryMs;
  const handAtLoss=handPosition(px,py,poseAt('hold',holdRecoveryMs));
  const floor=py-7;
  const y=u<.35?lerp(handAtLoss.y,floor,(u/.35)**2):floor-(u<.7?15*Math.sin(Math.PI*(u-.35)/.35):7*Math.sin(Math.PI*(u-.7)/.3));
  ball={x:lerp(handAtLoss.x,px+(px>hoop.x?-13:13),u),y};
}
let shown={x:feet.x+(ball.x-px)*flip*actorScale,y:feet.y+(ball.y-py)*actorScale};
if(phase==='flight' && elapsed>=detach){
  const t=Math.min(1,(elapsed-detach)/500);
  const origin=floorPoint(shot.from.x,shot.from.y), target=floorPoint(shot.contact,hoop.y);
  shown={x:lerp(origin.x+(shot.origin.x-shot.from.x)*flip*actorScale,target.x,t),y:lerp(origin.y+(shot.origin.y-shot.from.y)*actorScale,target.y-lift,t)-95*Math.sin(Math.PI*t)};
}else if(phase==='bounce'){
  const t=Math.min(1,(now-start)/bounceDuration), u=t<.56?t/.56:(t-.56)/.44;
  if(shot.hit) shown=madeBasketPosition(t,shot.end,rim,lift,pixelsPerMeter);
  else {
    shown=floorPoint(ball.x,lerp(hoop.y,shot.end.y,t));
    shown.y-=(t<.56?lift*(1-u)+42*Math.sin(Math.PI*u):34*Math.sin(Math.PI*u));
  }
}
if(phase==='bounce' && shot.hit){
  const t=(now-start)/bounceDuration;
  if(t>=.56 && t<.76 && !reducedMotion.matches){
    const impact=madeBasketPosition(.56,shot.end,rim,lift,pixelsPerMeter);
    const u=(t-.56)/.20;
    ctx.save();ctx.globalAlpha=1-u;ctx.strokeStyle='#fff0c4';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(impact.x,impact.y+ballCourtDiameter*pixelsPerMeter/2,(.22+u*.7)*pixelsPerMeter,(.08+u*.18)*pixelsPerMeter,0,0,2*Math.PI);ctx.stroke();ctx.restore();
  }
}
atPoint(shown,0,0,()=>drawBall(0,0),1,actorScale);
if(phase==='bounce' && shot.hit && now-start<.32*bounceDuration){
  drawHoop(now,true);
}
px=feet.x;py=feet.y;
const activeBand = (phase==='ready'||phase==='hold') ? cycleBand(session,band,phase==='hold'?elapsed:0) : null;
if((phase==='ready'||phase==='hold') && session.motion==='dial'){
  const cx=px>320?px-35:px+35, cy=Math.max(24,py-63), radius=18;
  const angle=value=>(value*2-.5)*Math.PI;
  ctx.save();
  ctx.lineWidth=7;
  ctx.strokeStyle='#123a39';
  ctx.beginPath();ctx.arc(cx,cy,radius,0,2*Math.PI);ctx.stroke();
  ctx.globalAlpha=activeBand.alpha*opacityAt(band.tier,elapsed,session.fade && phase==='hold');
  ctx.strokeStyle='#99f1aa';
  ctx.beginPath();ctx.arc(cx,cy,radius,angle(activeBand.low),angle(activeBand.high));ctx.stroke();
  ctx.restore();
  line(cx,cy,cx+21*Math.cos(angle(power)),cy+21*Math.sin(angle(power)),'white',3);
}else if(phase==='ready'||phase==='hold'){const x=px>320?px-34:px+26,y=py-80,span=activeBand.width;ctx.fillStyle='#123a39';ctx.fillRect(x,y,14,74);ctx.save();ctx.globalAlpha=activeBand.alpha*opacityAt(band.tier,elapsed,session.fade && phase==='hold');ctx.fillStyle='#99f1aa';ctx.fillRect(x,y+74*(1-activeBand.high),14,74*span);ctx.restore();line(x-3,y+74*(1-power),x+17,y+74*(1-power),'white',3)}
atPoint(rim,hoop.x,hoop.y,()=>drawGoal(now));if(!previewOnly)animation=requestAnimationFrame(frame)}
