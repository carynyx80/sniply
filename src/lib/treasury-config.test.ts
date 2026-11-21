import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { DEFAULT_TREASURY_ADDRESS, isTreasuryAddress, parseTreasuryAddress, TREASURY_CHAIN_ID } from "./treasury-config";

describe("treasury config", () => {
  it("defaults to the official company wallet on BSC mainnet", () => {
    const t = parseTreasuryAddress(undefined);
    expect(t.address).toBe("0xfEB14057bbF5Ba1C18a28E13a0Bf6e4c7DC337Ff");
    expect(t.address).toBe(DEFAULT_TREASURY_ADDRESS);
    expect(t.chainId).toBe(56);
    expect(TREASURY_CHAIN_ID).toBe(56);
    expect(t.source).toBe("default");
  });

  it("accepts an env override and normalises lowercase input to checksum form", () => {
    const t = parseTreasuryAddress("0xfeb14057bbf5ba1c18a28e13a0bf6e4c7dc337ff");
    expect(t.address).toBe("0xfEB14057bbF5Ba1C18a28E13a0Bf6e4c7DC337Ff");
    expect(t.source).toBe("env");
  });

  it("rejects a mixed-case address with a bad checksum (typo protection)", () => {
    expect(() => parseTreasuryAddress("0xFEB14057bbF5Ba1C18a28E13a0Bf6e4c7DC337Ff")).toThrow(/checksum/);
  });

  it("rejects invalid and zero addresses", () => {
    expect(() => parseTreasuryAddress("0x1234")).toThrow(/valid/);
    expect(() => parseTreasuryAddress("not-an-address")).toThrow(/valid/);
    expect(() => parseTreasuryAddress("0x0000000000000000000000000000000000000000")).toThrow(/zero/);
  });

  it("matches the treasury case-insensitively and nothing else", () => {
    const { address } = parseTreasuryAddress(undefined);
    expect(isTreasuryAddress("0xfeb14057bbf5ba1c18a28e13a0bf6e4c7dc337ff", address)).toBe(true);
    expect(isTreasuryAddress("0x000000000000000000000000000000000000dEaD", address)).toBe(false);
    expect(isTreasuryAddress(null, address)).toBe(false);
    expect(isTreasuryAddress("garbage", address)).toBe(false);
  });
});

describe("no signing capability in the app", () => {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = path.join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f)) files.push(p);
    }
  };
  walk(path.resolve(__dirname, ".."));

  it("never creates a wallet client or loads a private key", () => {
    const offenders = files.filter((f) => /createWalletClient|privateKeyToAccount|mnemonicToAccount|PRIVATE_KEY/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
