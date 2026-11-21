import { describe, expect, it } from "vitest";
import { minOut, priceImpact, spotPrice } from "./trade-math";

describe("trade math", () => {
  it("applies slippage", () => {
    expect(minOut(BigInt(10_000), 100)).toBe(BigInt(9_900));
    expect(minOut(BigInt(10_000), 0)).toBe(BigInt(10_000));
  });
  it("rejects invalid slippage", () => {
    expect(() => minOut(BigInt(1), -1)).toThrow();
    expect(() => minOut(BigInt(1), 10_001)).toThrow();
  });
  it("computes spot price", () => {
    // 1,000,000 tokens (18 dec) vs 10 BNB → 0.00001 BNB/token
    expect(spotPrice(BigInt(1_000_000) * BigInt(1e18), BigInt(10) * BigInt(1e18), 18)).toBeCloseTo(0.00001);
  });
  it("price impact grows with size", () => {
    const r = BigInt(100) * BigInt(1e18);
    expect(priceImpact(BigInt(1e18), r)).toBeLessThan(priceImpact(BigInt(10) * BigInt(1e18), r));
  });
});
