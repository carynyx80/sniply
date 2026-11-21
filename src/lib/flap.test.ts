import { describe, expect, it } from "vitest";
import { getAddress, keccak256, toHex } from "viem";
import { buildNewTokenV6Params, cloneBytecode, feeSplit, findVanitySalt, FLAP, flapCommissionBps, predictTokenAddress, SNIPLY_TAX_BPS, TokenVersion } from "./flap";

describe("Flap commission (per Flap Tax Token V3 docs)", () => {
  it("matches the documented table", () => {
    expect(flapCommissionBps(100, 100)).toBe(600);
    expect(flapCommissionBps(200, 200)).toBe(300);
    expect(flapCommissionBps(300, 300)).toBe(200);
    expect(flapCommissionBps(500, 500)).toBe(120);
    expect(flapCommissionBps(1000, 1000)).toBe(60);
  });
  it("uses the larger of buy/sell tax and never divides by zero", () => {
    expect(flapCommissionBps(100, 300)).toBe(200);
    expect(flapCommissionBps(0, 0)).toBe(0);
  });
  it("Sniply's 1% launch terms give creator 94% / Sniply 6% of the post-fee remainder", () => {
    expect(SNIPLY_TAX_BPS).toBe(100);
    expect(feeSplit()).toEqual({ taxBps: 100, sniplyShareBps: 600, creatorShareBps: 9400 });
  });
});

describe("vanity salt + address prediction", () => {
  it("builds the EIP-1167 clone bytecode for the Tax V3 implementation", () => {
    const code = cloneBytecode(FLAP.taxTokenV3Impl);
    expect(code.startsWith("0x3d602d80600a3d3981f3363d3d373d3d3d363d73")).toBe(true);
    expect(code).toContain(FLAP.taxTokenV3Impl.slice(2).toLowerCase());
    expect(code.endsWith("5af43d82803e903d91602b57fd5bf3")).toBe(true);
  });
  it("finds a salt whose predicted token ends in 7777, deterministically", () => {
    const seed = keccak256(toHex("sniply-test-seed"));
    const a = findVanitySalt(seed);
    const b = findVanitySalt(seed);
    expect(a.token.toLowerCase().endsWith("7777")).toBe(true);
    expect(a).toEqual(b);
    expect(predictTokenAddress(a.salt)).toBe(a.token);
  }, 120_000);
});

describe("launch params", () => {
  const creator = getAddress("0x1111111111111111111111111111111111111111");
  const treasury = getAddress("0xfEB14057bbF5Ba1C18a28E13a0Bf6e4c7DC337Ff");
  const p = buildNewTokenV6Params({ name: "Clip", symbol: "CLIP", metaCid: "bafkreiexample", salt: `0x${"ab".repeat(32)}`, creator, commissionReceiver: treasury, initialBuyWei: BigInt(0) });
  it("pays the creator fee to the creator and the commission to the treasury", () => {
    expect(p.beneficiary).toBe(creator);
    expect(p.commissionReceiver).toBe(treasury);
    expect(p.mktBps).toBe(10000);
    expect(p.deflationBps + p.dividendBps + p.lpBps).toBe(0);
  });
  it("is a 1% symmetric Tax V3 token traded in native BNB", () => {
    expect(p.buyTaxRate).toBe(100);
    expect(p.sellTaxRate).toBe(100);
    expect(p.tokenVersion).toBe(TokenVersion.TOKEN_TAXED_V3);
    expect(p.quoteToken).toBe("0x0000000000000000000000000000000000000000");
    expect(p.quoteAmt).toBe(BigInt(0));
  });
});
