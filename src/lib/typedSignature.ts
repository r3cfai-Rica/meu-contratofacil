// Render a typed name as a handwritten-looking signature on a canvas, return PNG dataURL.
export function renderTypedSignature(name: string): string {
  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  const width = 600;
  const height = 180;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#0f172a";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  // System cursive-style stack
  ctx.font =
    'italic 64px "Brush Script MT", "Lucida Handwriting", "Apple Chancery", "Segoe Script", cursive';
  ctx.fillText(name.trim() || " ", width / 2, height / 2);

  return canvas.toDataURL("image/png");
}
