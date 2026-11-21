import { encodePacked, getContractAddress, keccak256, toBytes, type Address, type Hex } from "viem";

/**
 * Flap (flap.sh) bonding-curve Portal integration — BNB Smart Chain mainnet.
 * Source: official Flap developer docs (docs.flap.sh, "Launch tokens" + "Tax Token V3").
 * Sniply deploys no contract of its own: creators call Flap's Portal from their own wallet.
 *
 * Fee model (Flap Tax Token V3, enforced by the protocol):
 *  - Every buy/sell pays `taxRateBps`. Flap takes its protocol fee first.
 *  - Sniply (commissionReceiver = company treasury) gets a protocol-computed commission
 *    of the remainder: 6% when tax ≤ 1%, else floor(60000 / taxBps) bps.
 *  - The creator (beneficiary) gets 100% of what's left (mktBps = 10000).
 */

export const FLAP = {
  chainId: 56,
  portal: "0xe2cE6ab80874Fa9Fa2aAE65D277Dd6B8e65C9De0" as Address,
  taxTokenV3Impl: "0x024f18294970B5c76c0691b87f138A0317156422" as Address,
  vanitySuffix: "7777",
  ipfsGateway: "https://flap.mypinata.cloud/ipfs/",
  uploadEndpoint: "https://funcs.flap.sh/api/upload",
} as const;

/** Sniply's fixed launch configuration: 1% symmetric tax (maximises Flap's integrator commission at 6%). */
export const SNIPLY_TAX_BPS = 100;

// Enum values (member order from Flap's Solidity definitions)
export const DexThreshType = { FOUR_FIFTHS: 1 } as const;
export const MigratorType = { V2_MIGRATOR: 1 } as const;
export const DEXId = { DEX0: 0 } as const; // PancakeSwap on BSC
export const V3LPFeeProfile = { STANDARD: 0 } as const;
export const TokenVersion = { TOKEN_TAXED_V3: 6 } as const;

export const flapPortalAbi = [
  {
    type: "function",
    name: "newTokenV6",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "meta", type: "string" },
          { name: "dexThresh", type: "uint8" },
          { name: "salt", type: "bytes32" },
          { name: "migratorType", type: "uint8" },
          { name: "quoteToken", type: "address" },
          { name: "quoteAmt", type: "uint256" },
          { name: "beneficiary", type: "address" },
          { name: "permitData", type: "bytes" },
          { name: "extensionID", type: "bytes32" },
          { name: "extensionData", type: "bytes" },
          { name: "dexId", type: "uint8" },
          { name: "lpFeeProfile", type: "uint8" },
          { name: "buyTaxRate", type: "uint16" },
          { name: "sellTaxRate", type: "uint16" },
          { name: "taxDuration", type: "uint64" },
          { name: "antiFarmerDuration", type: "uint64" },
          { name: "mktBps", type: "uint16" },
          { name: "deflationBps", type: "uint16" },
          { name: "dividendBps", type: "uint16" },
          { name: "lpBps", type: "uint16" },
          { name: "minimumShareBalance", type: "uint256" },
          { name: "dividendToken", type: "address" },
          { name: "commissionReceiver", type: "address" },
          { name: "tokenVersion", type: "uint8" },
        ],
      },
    ],
    outputs: [{ name: "token", type: "address" }],
  },
  {
    type: "event",
    name: "TokenCreated",
    inputs: [
      { name: "ts", type: "uint256", indexed: false },
      { name: "creator", type: "address", indexed: false },
      { name: "nonce", type: "uint256", indexed: false },
      { name: "token", type: "address", indexed: false },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
      { name: "meta", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "FlapTokenAsymmetricTaxSet",
    inputs: [
      { name: "token", type: "address", indexed: false },
      { name: "buyTax", type: "uint256", indexed: false },
      { name: "sellTax", type: "uint256", indexed: false },
    ],
  },
] as const;

const ZERO = "0x0000000000000000000000000000000000000000" as Address;
const ZERO32 = `0x${"0".repeat(64)}` as Hex;

/** EIP-1167 minimal-proxy init code for a clone of `impl`. */
export function cloneBytecode(impl: Address): Hex {
  return `0x3d602d80600a3d3981f3363d3d373d3d3d363d73${impl.slice(2).toLowerCase()}5af43d82803e903d91602b57fd5bf3` as Hex;
}

export function predictTokenAddress(salt: Hex): Address {
  return getContractAddress({ from: FLAP.portal, salt: toBytes(salt), bytecode: cloneBytecode(FLAP.taxTokenV3Impl), opcode: "CREATE2" });
}

/** Mine a salt whose predicted clone address ends with the Tax V3 vanity suffix (avg ~65k hashes). */
export function findVanitySalt(seed: Hex, maxIterations = 2_000_000): { salt: Hex; token: Address } {
  let salt = keccak256(seed);
  for (let i = 0; i < maxIterations; i++) {
    const token = predictTokenAddress(salt);
    if (token.toLowerCase().endsWith(FLAP.vanitySuffix)) return { salt, token };
    salt = keccak256(salt);
  }
  throw new Error("Could not find a vanity salt");
}

/** Protocol-computed integrator commission in bps of the post-protocol-fee remainder (Flap docs). */
export function flapCommissionBps(buyTaxBps: number, sellTaxBps: number): number {
  const eff = Math.max(buyTaxBps, sellTaxBps);
  if (eff <= 0) return 0;
  return eff <= 100 ? 600 : Math.floor((10000 * 6) / eff);
}

export function feeSplit(taxBps = SNIPLY_TAX_BPS) {
  const commission = flapCommissionBps(taxBps, taxBps);
  return { taxBps, sniplyShareBps: commission, creatorShareBps: 10000 - commission };
}

export type FlapLaunchInput = {
  name: string;
  symbol: string;
  metaCid: string;
  salt: Hex;
  creator: Address; // beneficiary — receives the creator share
  commissionReceiver: Address; // Sniply company treasury
  initialBuyWei: bigint; // creator's optional first buy (0 allowed)
};

export function buildNewTokenV6Params(i: FlapLaunchInput) {
  return {
    name: i.name,
    symbol: i.symbol,
    meta: i.metaCid,
    dexThresh: DexThreshType.FOUR_FIFTHS,
    salt: i.salt,
    migratorType: MigratorType.V2_MIGRATOR,
    quoteToken: ZERO, // native BNB
    quoteAmt: i.initialBuyWei,
    beneficiary: i.creator,
    permitData: "0x" as Hex,
    extensionID: ZERO32,
    extensionData: "0x" as Hex,
    dexId: DEXId.DEX0,
    lpFeeProfile: V3LPFeeProfile.STANDARD,
    buyTaxRate: SNIPLY_TAX_BPS,
    sellTaxRate: SNIPLY_TAX_BPS,
    taxDuration: BigInt(100 * 365 * 24 * 3600), // permanent (Flap max: 100 years)
    antiFarmerDuration: BigInt(0),
    mktBps: 10000, // 100% of remainder → creator
    deflationBps: 0,
    dividendBps: 0,
    lpBps: 0,
    minimumShareBalance: BigInt(0),
    dividendToken: ZERO,
    commissionReceiver: i.commissionReceiver,
    tokenVersion: TokenVersion.TOKEN_TAXED_V3,
  } as const;
}

/** Deterministic seed so the same draft always mines the same salt. */
export const saltSeedFor = (draftId: string, creator: Address) => keccak256(encodePacked(["string", "address"], [draftId, creator]));
