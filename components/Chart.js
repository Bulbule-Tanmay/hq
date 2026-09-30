'use client';

import { fmtNum, shortDate } from '../lib/engine';

export default function Chart({ points, target, lowerBetter, type = 'line', label }) {
  if (!points.length) return null;
  const W = 640, H = 200, pl = 44, pr = 16, pt = 16, pb = 32;
  const vals = points.map((p) => p.y);
  if (target !== undefined && target !== null) vals.push(target);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (type === 'bar') min = Math.min(0, min);
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  if (type !== 'bar') min -= span * 0.12;
  max += span * 0.12;
  const iw = W - pl - pr;
  const slot = iw / points.length;
  const X = (i) => (type === 'bar' ? pl + slot * (i + 0.5) : pl + (points.length === 1 ? iw / 2 : (i * iw) / (points.length - 1)));
  const Y = (v) => pt + (H - pt - pb) * (1 - (v - min) / (max - min));
  const bw = Math.min(24, slot * 0.6);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  const summary = `${label || 'Chart'}. Latest value ${fmtNum(last.y)} on ${shortDate(last.x)}.`;

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
      <line x1={pl} x2={W - pr} y1={Y(min)} y2={Y(min)} stroke="var(--line)" />
      <text x={pl - 8} y={Y(max) + 4} textAnchor="end" className="chart-t">{fmtNum(Math.round(max * 10) / 10)}</text>
      <text x={pl - 8} y={Y(min) + 4} textAnchor="end" className="chart-t">{fmtNum(Math.round(min * 10) / 10)}</text>
      {target !== undefined && target !== null && (
        <g>
          <line x1={pl} x2={W - pr} y1={Y(target)} y2={Y(target)} stroke="var(--muted)" strokeDasharray="4 4" />
          <text x={W - pr} y={Y(target) - 6} textAnchor="end" className="chart-t">{lowerBetter ? 'limit' : 'target'} {fmtNum(target)}</text>
        </g>
      )}
      {type === 'bar' ? (
        points.map((p, i) => (
          <rect
            key={i}
            x={X(i) - bw / 2}
            y={Y(p.y)}
            width={bw}
            height={Math.max(2, Y(min) - Y(p.y))}
            rx="4"
            fill={lowerBetter && target != null && p.y > target ? 'var(--bad)' : 'var(--accent)'}
          />
        ))
      ) : (
        <>
          <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => <circle key={i} cx={X(i)} cy={Y(p.y)} r={i === points.length - 1 ? 5 : 3} fill="var(--accent)" />)}
        </>
      )}
      <text x={X(0)} y={H - 8} textAnchor={type === 'bar' ? 'middle' : 'start'} className="chart-t">{shortDate(points[0].x)}</text>
      {points.length > 1 && (
        <text x={X(points.length - 1)} y={H - 8} textAnchor={type === 'bar' ? 'middle' : 'end'} className="chart-t">{shortDate(last.x)}</text>
      )}
    </svg>
  );
}
