import { describe, expect, it } from "vitest";
import { excitement, fuse, movingAverage, normalize, pickCandidates, type Signals } from "./highlights";

const flat = (n: number, v = 0.1) => Array.from({ length: n }, () => v);

function signalsWithSpike(n: number, at: number, width: number): Signals {
  const energy = flat(n);
  const flux = flat(n);
  const scene = flat(n, 0);
  for (let i = at; i < at + width; i++) {
    energy[i] = 0.95;
    flux[i] = 0.9;
  }
  const e = normalize(energy);
  return { binSec: 0.5, energy: e, flux: normalize(flux), excite: normalize(excitement(e, 0.5)), scene };
}

describe("highlight detection", () => {
  it("normalize maps to 0..1", () => {
    const out = normalize([0, 5, 10, 10, 10, 10, 10, 10, 10, 10]);
    expect(Math.min(...out)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...out)).toBeLessThanOrEqual(1);
  });

  it("movingAverage preserves length and smooths", () => {
    const out = movingAverage([0, 0, 10, 0, 0], 1);
    expect(out).toHaveLength(5);
    expect(out[2]).toBeCloseTo(10 / 3);
  });

  it("fuse weights all four signals", () => {
    const z = [1, 0, 0, 0, 0, 0]; const s: Signals = { binSec: 1, energy: z, flux: z, excite: z, scene: z };
    const f = fuse(s);
    expect(f[0]).toBeGreaterThan(f[4]);
  });

  it("finds the spike and respects min/max length", () => {
    const s = signalsWithSpike(600, 300, 24); // spike at 150s–162s
    const c = pickCandidates(s, { minSec: 8, maxSec: 30, count: 3 });
    expect(c.length).toBeGreaterThan(0);
    const top = c[0];
    expect(top.startSec).toBeLessThanOrEqual(150);
    expect(top.endSec).toBeGreaterThanOrEqual(156);
    expect(top.endSec - top.startSec).toBeGreaterThanOrEqual(8);
    expect(top.endSec - top.startSec).toBeLessThanOrEqual(30.5);
    expect(top.reasons.length).toBeGreaterThan(0);
  });

  it("candidates never overlap", () => {
    const s = signalsWithSpike(600, 100, 20);
    for (let i = 400; i < 420; i++) {
      s.energy[i] = 1;
      s.flux[i] = 1;
    }
    const c = [...pickCandidates(s, { minSec: 5, maxSec: 20, count: 5 })].sort((a, b) => a.startSec - b.startSec);
    for (let i = 1; i < c.length; i++) expect(c[i].startSec).toBeGreaterThanOrEqual(c[i - 1].endSec);
  });

  it("is not driven by loudness alone: a flat-loud track yields low excitement", () => {
    const e = flat(200, 0.9);
    const ex = excitement(e, 0.5);
    expect(Math.max(...ex)).toBeLessThan(0.01);
  });
});
