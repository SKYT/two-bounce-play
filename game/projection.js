// The existing shot rules use a 400 × 500 logical court. Convert to metres at the render boundary.
export function makeProjection(scene, focus, width, height) {
  const {court, hoop, camera} = scene;
  const c = Math.cos(camera.angle), s = Math.sin(camera.angle);
  function plane(x,y) {
    return {x:x*c-y*s, y:(x*s+y*c)*camera.depth};
  }
  function depth(y) {
    if (y <= 105) return (y-52)*hoop.depthM/53;
    if (y <= 330) return hoop.depthM+(y-105)*(court.freeThrowDepthM-hoop.depthM)/225;
    return court.freeThrowDepthM+(y-330)*(court.lengthM-court.freeThrowDepthM)/148;
  }
  const across = x => (x-200)*court.widthM/368;
  const feet = plane(across(focus.x),depth(focus.y)), basket = plane(0,hoop.depthM);
  const vertical = Math.sqrt(1-camera.depth**2);
  const left = Math.min(feet.x-.85,basket.x-1.6), right = Math.max(feet.x+.85,basket.x+1.6);
  const top = Math.min(feet.y-3.4,basket.y-(hoop.boardTopM+.30)*vertical-.65);
  const bottom = Math.max(feet.y+.45,basket.y+.75);
  const scale = Math.min(camera.pixelsPerMeter,(width-16)/(right-left),(height-78)/(bottom-top));
  const ox = width/2-(left+right)*scale/2, oy = height/2+16-(top+bottom)*scale/2;
  function project(x,y) {
    const p = plane(x,y);
    return {x:ox+p.x*scale,y:oy+p.y*scale};
  }
  return {scale, project, lift:hoop.heightM*scale*vertical,
    floor: point => project(across(point.x),depth(point.y))};
}
