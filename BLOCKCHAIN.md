# Blockchain

## Networks
Production runs on **BNB Smart Chain mainnet (56)**: `NEXT_PUBLIC_SNIPLY_NETWORK=mainnet` on Vercel and Railway. It falls back to the official BNB Chain public RPC `https://bsc-dataseed.bnbchain.org`. Use a dedicated RPC provider for higher limits. Set `testnet` (BSC Testnet 97) for staging. On mainnet, the trade panel warns users that swaps spend real funds from their own wallet. Agent ID checks always read BSC mainnet, where the registry lives.

## Token launch: why it's off by default
We couldn't find official integration docs for an existing BNB Chain launchpad. Four.meme has community ABIs and SDKs only, and indexers warn that its contracts change. **We don't assume Pump.fun-style infrastructure exists on BNB.** Sniply instead ships:

- `contracts/SniplyTokenFactory.sol`: a minimal, auditable factory. It mints a fixed 1B-supply plain BEP-20 to the creator, with no owner functions, tax, mint or blacklist. There's a public flat fee, one token per clip (`clipRef`), and it emits `TokenCreated`.
- A launch adapter (`NEXT_PUBLIC_LAUNCHPAD=sniply-factory` + `NEXT_PUBLIC_SNIPLY_FACTORY_ADDRESS`).

**Status: unaudited, not deployed.** To turn it on (testnet): get a security review → deploy with Foundry/Hardhat → set the env vars. Don't deploy to mainnet without explicit authorization and an audit.

## Launch verification (server)
`src/server/launch.ts`. A launch is recorded only when **all** of these hold:
receipt `status=success` · `tx.to` == configured factory · `tx.from` == the signed-in creator · a `TokenCreated` log from the factory · on-chain name/symbol == the reviewed draft.
Reverted → `reverted`. RPC errors → `unknown` (retried on poll). One live attempt per draft. Tx hash is unique.

## Trading
PancakeSwap V2 (public router/factory addresses in `src/lib/chain-config.ts`). Quotes come from `getAmountsOut`. Min-out uses the user's slippage (default 1%, max 15%). Sells first request an **exact-amount** approval, never unlimited. Swaps use the fee-on-transfer-safe router functions with a 10-minute deadline. Trading is turned off on market pages for tokens without a Sniply-verified launch.

## Market data
Read live from the chain: ERC-20 metadata/supply, pair reserves (spot price, liquidity), and `Swap` logs from the last ~4,900 blocks (recent trades + price line). There's no USD conversion until an oracle or indexer (Bitquery/Codex) is configured. We never estimate volume or holder counts.

## Company treasury
- **Address:** `0xfEB14057bbF5Ba1C18a28E13a0Bf6e4c7DC337Ff` on BNB Smart Chain mainnet (chain 56). Configured with `SNIPLY_TREASURY_ADDRESS` (validated: EVM address, EIP-55 checksum when mixed-case, not the zero address). The built-in default is the same address.
- **Verified on mainnet (read-only, 2026-11-21):** chain ID 56. The address is an externally owned wallet (no contract code). The BNB balance and nonce are readable, and the USDT/USDC balance reads work.
- **Read-only by construction:** `src/server/treasury.ts` uses only a viem public client. There's no wallet client, account or key anywhere in `src` (enforced by a unit test).
- **Visibility:** `/api/health` exposes the public address and chain. `/api/admin/treasury` (admin-only) shows live connectivity, account type, nonce and BNB/USDT/USDC balances. These also appear on the admin dashboard.
- **Separation:**
  - The treasury can't sign in as a user, so it can't be an agent operator or creator wallet. Set `ALLOW_TREASURY_SIGNIN=true` only if you deliberately need that.
  - User wallets stay user-controlled.
  - Agent identities stay Binance Agent ID records. Agentic Wallets aren't integrated.
- **Revenue:** no platform revenue flow is active today. Sniply charges no trading fee, and the launch contract isn't deployed. Any future fee must be disclosed in the UI before signing and paid by the user's own signed transaction to this public address. The app never transfers user funds automatically.
