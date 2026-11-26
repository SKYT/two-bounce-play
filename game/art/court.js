export const court = {
  floor: '#216563', line: '#c4d6c6', lineWidth: 1.8,
  widthM: 15, lengthM: 14, laneWidthM: 4.9, freeThrowDepthM: 5.8,
  circleRadiusM: 1.8, arcRadiusM: 6.75, cornerOffsetM: 6.6
};

export function drawCourt(ctx, project, court, rimDepth) {
  function path(points, close = false) {
    ctx.beginPath();
    points.forEach(([x,y], i) => {
      const p = project(x,y);
      if (i) ctx.lineTo(p.x,p.y);
      else ctx.moveTo(p.x,p.y);
    });
    if (close) ctx.closePath();
    ctx.stroke();
  }
  function arc(depth, radius, start, end) {
    return Array.from({length:65}, (_,i) => {
      const t = start + (end - start) * i / 64;
      return [radius * Math.cos(t), depth + radius * Math.sin(t)];
    });
  }
  ctx.strokeStyle = court.line;
  ctx.lineWidth = court.lineWidth;
  const half = court.widthM / 2, lane = court.laneWidthM / 2;
  const end = court.lengthM, free = court.freeThrowDepthM, corner = court.cornerOffsetM;
  path([[-half,0],[half,0],[half,end],[-half,end]], true);
  path([[-lane,0],[-lane,free],[lane,free],[lane,0]]);
  path(arc(free,court.circleRadiusM,0,Math.PI));
  path(arc(end,court.circleRadiusM,Math.PI,2*Math.PI));
  const a = Math.acos(corner / court.arcRadiusM);
  path([[corner,0],...arc(rimDepth,court.arcRadiusM,a,Math.PI-a),[-corner,0]]);
}
