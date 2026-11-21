# Blockchain

## Networks
`NEXT_PUBLIC_SNIPLY_NETWORK=testnet` (default, BSC Testnet 97) or `mainnet` (BSC 56). Agent ID checks always read BSC mainnet, where the registry lives.

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
