export function sourceViewTransform(sourceWidth, sourceHeight, viewRect, displayWidth, displayHeight, contain = true) {
  const rect = viewRect || [0, 0, sourceWidth, sourceHeight];
  const sx = rect[0], sy = rect[1], sw = rect[2], sh = rect[3];
  if (!(sw > 0 && sh > 0 && displayWidth > 0 && displayHeight > 0)) {
    throw new RangeError('source view dimensions must be positive');
  }
  const scaleX = displayWidth / sw, scaleY = displayHeight / sh;
  const fitX = contain ? Math.min(scaleX, scaleY) : scaleX;
  const fitY = contain ? fitX : scaleY;
  const dw = sw * fitX, dh = sh * fitY;
  return {
    sx, sy, sw, sh, fitX, fitY, dw, dh,
    ox: (displayWidth - dw) / 2,
    oy: (displayHeight - dh) / 2
  };
}

export function mapSourceViewPoint(clientX, clientY, displayRect, transform) {
  const x = (clientX - displayRect.left - transform.ox) / transform.fitX + transform.sx;
  const y = (clientY - displayRect.top - transform.oy) / transform.fitY + transform.sy;
  return {
    x,
    y,
    inside: clientX >= displayRect.left + transform.ox &&
      clientX <= displayRect.left + transform.ox + transform.dw &&
      clientY >= displayRect.top + transform.oy &&
      clientY <= displayRect.top + transform.oy + transform.dh
  };
}
