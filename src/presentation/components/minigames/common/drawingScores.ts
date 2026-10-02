export interface DrawingPoint { x: number; y: number; }

const distance = (a: DrawingPoint, b: DrawingPoint) => Math.hypot(a.x - b.x, a.y - b.y);

export const calculateCircleScore = (points: DrawingPoint[]) => {
  if (points.length < 10) return 0;
  const center = points.reduce((sum, p) => ({ x: sum.x + p.x / points.length, y: sum.y + p.y / points.length }), { x: 0, y: 0 });
  const radii = points.map(p => distance(p, center));
  const radius = radii.reduce((sum, r) => sum + r, 0) / radii.length;
  if (radius < 15) return 0;
  const deviation = Math.sqrt(radii.reduce((sum, r) => sum + (r - radius) ** 2, 0) / radii.length);
  const sectors = new Set(points.map(p => Math.floor((Math.atan2(p.y - center.y, p.x - center.x) + Math.PI) / (Math.PI * 2) * 24) % 24));
  const coverage = sectors.size / 24;
  const closure = Math.max(0, 1 - distance(points[0], points[points.length - 1]) / radius);
  return Math.round(500 * Math.max(0, 1 - deviation / radius * 3) * coverage * closure);
};

const segmentDistance = (point: DrawingPoint, start: DrawingPoint, end: DrawingPoint) => {
  const dx = end.x - start.x, dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)) : 0;
  return distance(point, { x: start.x + t * dx, y: start.y + t * dy });
};

/** Coordinates are normalized to the 100 by 100 drawing canvas. */
export const calculateTraceScore = (points: DrawingPoint[], outline: number[][]) => {
  if (points.length < 5 || outline.length < 3) return 0;
  const vertices = outline.map(([x, y]) => ({ x, y }));
  const samples: DrawingPoint[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const start = vertices[i], end = vertices[(i + 1) % vertices.length];
    const count = Math.max(1, Math.ceil(distance(start, end) / 4));
    for (let j = 0; j < count; j++) samples.push({ x: start.x + (end.x - start.x) * j / count, y: start.y + (end.y - start.y) * j / count });
  }
  const meanDistance = points.reduce((sum, p) => sum + Math.min(...vertices.map((start, i) => segmentDistance(p, start, vertices[(i + 1) % vertices.length]))), 0) / points.length;
  const accuracy = Math.max(0, 1 - meanDistance / 12);
  const coverage = samples.filter(sample => points.some(p => distance(p, sample) <= 8)).length / samples.length;
  return Math.round(500 * accuracy * coverage);
};
