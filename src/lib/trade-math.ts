/** Pure helpers for swap math, unit-tested. */
export function minOut(quoted: bigint, slippageBps: number): bigint {
  if (slippageBps < 0 || slippageBps > 10_000) throw new Error("bad slippage");
  return (quoted * BigInt(10_000 - slippageBps)) / BigInt(10_000);
}

/** Spot price of token in native units given reserves & decimals. */
export function spotPrice(reserveToken: bigint, reserveNative: bigint, tokenDecimals: number): number {
  if (reserveToken === BigInt(0)) return 0;
  return (Number(reserveNative) / 1e18) / (Number(reserveToken) / 10 ** tokenDecimals);
}

/** Price impact of selling amountIn into a constant-product pool (0.25% fee). */
export function priceImpact(amountIn: bigint, reserveIn: bigint): number {
  if (reserveIn === BigInt(0)) return 1;
  const a = Number(amountIn) * 0.9975;
  return a / (Number(reserveIn) + a);
}
