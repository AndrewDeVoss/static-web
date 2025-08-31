window.onload = function() {
  const canvas = document.getElementById('tree-canvas');
  const ctx = canvas.getContext('2d');
  const centerX = canvas.width / 2;

  // Draw trunk
  ctx.fillStyle = '#8B5C2A';
  ctx.fillRect(centerX - 10, canvas.height - 150, 20, 100);

  // Draw leaves (simple circles)
  ctx.beginPath();
  ctx.arc(centerX, canvas.height - 180, 50, 0, Math.PI * 2);
  ctx.fillStyle = '#228B22';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerX - 30, canvas.height - 200, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#2E8B57';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(centerX + 30, canvas.height - 200, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#2E8B57';
  ctx.fill();
};