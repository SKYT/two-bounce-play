export const hoop = {
  depthM: 1.575, heightM: 3.05, radiusM: .26, netLengthM: .48,
  boardWidthM: 1.80, boardBottomM: 2.90, boardTopM: 3.95,
  edge: '#56574e', board: '#deddd2', rim: '#ff8939', net: '#f6ebcf'
};

// Draw the hoop at game resolution for crisp edges. A second pass puts the near net in front of a made shot.
export function createHoopLayer(width, height) {
  const layer = document.createElement('canvas');
  layer.width = width;
  layer.height = height;
  const pen = layer.getContext('2d');
  return (target, projection, scene, age, reducedMotion, foreground = false) => {
    pen.clearRect(0,0,width,height);
    paint(pen, projection, scene.hoop, scene.camera.angle, age, reducedMotion, foreground);
    target.drawImage(layer,0,0);
  };
}

function paint(ctx, projection, style, angleRad, age, reducedMotion, foreground) {
  const rimRadius = style.radiusM, lift = projection.lift;
  function vertex(x,depth,z){
    const p=projection.project(x,depth);
    return [p.x,p.y-z*lift/style.heightM];
  }
  function shape(points,color,weight,fill){
    ctx.beginPath();
    points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
    if(fill){ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
    ctx.strokeStyle=color;ctx.lineWidth=weight;ctx.stroke();
  }
  // The endline and both board edges run along the court's x axis.
  const front=style.depthM-rimRadius-.10, back=front-.11, half=style.boardWidthM/2, low=style.boardBottomM, high=style.boardTopM;
  const frontFace=(w,y,b,t)=>[vertex(-w,y,b),vertex(w,y,b),vertex(w,y,t),vertex(-w,y,t),vertex(-w,y,b)];
  const edge=style.edge;
  if(!foreground){
    shape([vertex(0,-.38,0),vertex(0,-.38,3.45),vertex(0,back,3.45)],edge,4);
    shape([vertex(0,-.38,2.45),vertex(0,back,3.4)],'#608486',2);
    shape([vertex(0,-.38,3.45),vertex(0,back,high-.08)],'#999888',2);
    shape([vertex(0,-.38,3.45),vertex(0,back,3.45)],'#c2c0b0',2);
    const cosine=Math.cos(angleRad);
    if(cosine>.001 && lift>0){
      shape(frontFace(half,front,low,high),edge,3,style.board);
      shape([vertex(-half+.04,front,low+.04),vertex(-half+.04,front,high-.04),vertex(half-.04,front,high-.04)],'#fff7dc',2);
      shape(frontFace(.32,front,style.heightM,3.55),'#5e5c56',1.5);
    }
    shape([vertex(-half,back,high),vertex(half,back,high),vertex(half,front,high),vertex(-half,front,high)],edge,1,'#e2f1e7');
    if(Math.abs(Math.sin(angleRad))>.001){
      const side=Math.sign(Math.sin(angleRad))*half;
      shape([vertex(side,back,low),vertex(side,front,low),vertex(side,front,high),vertex(side,back,high)],edge,1,'#99998a');
    }
    shape([vertex(0,front,style.heightM),vertex(0,style.depthM-rimRadius,style.heightM)],'#af562f',3);
  }
  function ring(t,z,r){return vertex(r*Math.cos(t),style.depthM+r*Math.sin(t),z);}
  // Anchor the lowest net knot in screen space so camera tilt cannot shorten it.
  const netSteps=8;
  const knots=Array.from({length:netSteps},(_,i)=>ring((i+.5)*2*Math.PI/netSteps,style.heightM,rimRadius*.62));
  const rimCenter=vertex(0,style.depthM,style.heightM);
  const netDrop=rimCenter[1]+style.netLengthM*projection.scale-Math.max(...knots.map(p=>p[1]));

  const t=Math.min(1,Math.max(0,age/760));
  // Bend each strand at its midpoint. Both upper segments stay anchored.
  const bend=reducedMotion?0:(t<.2
    ? Math.sin(Math.PI*t/.4)
    : Math.cos((t-.2)*Math.PI*3/.8)*((1-t)/.8)**2)*Math.PI/3;
  const cos=Math.cos(bend),sin=Math.sin(bend);
  for(let i=0;i<netSteps;i++){
    const angle=i*2*Math.PI/netSteps;
    if(foreground && Math.sin(angle+Math.PI/netSteps+angleRad)<1e-9)continue;
    const left=ring(angle,style.heightM,rimRadius),right=ring(angle+2*Math.PI/netSteps,style.heightM,rimRadius);
    const [x,y]=knots[i],bottom=y+netDrop;
    const midLeft=[(left[0]+x)/2,(left[1]+bottom)/2];
    const midRight=[(right[0]+x)/2,(right[1]+bottom)/2];
    const pivotX=(midLeft[0]+midRight[0])/2,pivotY=(midLeft[1]+midRight[1])/2;
    const dx=x-pivotX,dy=bottom-pivotY;
    const tip=[pivotX+dx*cos+dy*sin,pivotY-dx*sin+dy*cos];
    shape([left,midLeft,tip,midRight,right],style.net,1.2);
  }
  const rim=Array.from({length:foreground?13:25},(_,i)=>ring(i*Math.PI/12-(foreground?angleRad:0),style.heightM,rimRadius));
  const stroke=Math.max(1.5,projection.scale*.035);
  shape(rim,'#493334',stroke+1);shape(rim,style.rim,stroke);
}
