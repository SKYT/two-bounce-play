import {asset} from '../version.js?v=8573a3d';

export const ball = {
  diameterM: .40,
  // 24px pixel-art ball; the vector ball below shows until it has loaded.
  sprite: asset('./ball.webp', import.meta.url),
  // Backspin turns per second while the ball is in the air.
  spinTurnsPerSecond: 2.4,
  fill: '#ef913b', seam: '#513321', highlight: '#ffe2a5'
};

export function createBallSprite(style) {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 24;
  const pen = sprite.getContext('2d');
  pen.beginPath();
  pen.arc(12, 12, 11, 0, Math.PI * 2);
  pen.fillStyle = style.fill;
  pen.fill();
  pen.strokeStyle = style.seam;
  pen.lineWidth = 1.8;
  pen.stroke();
  pen.clip();
  pen.beginPath();
  pen.moveTo(1, 12);
  pen.lineTo(23, 12);
  pen.moveTo(10, 1);
  pen.quadraticCurveTo(18, 13, 10, 23);
  pen.stroke();
  pen.fillStyle = style.highlight;
  pen.fillRect(6, 5, 3, 2);
  if (style.sprite) {
    const art = new Image();
    art.onload = () => {
      sprite.width = 24; // resets the canvas and its clip
      pen.drawImage(art, 0, 0, 24, 24);
    };
    art.src = style.sprite;
  }
  return sprite;
}
