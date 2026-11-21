# Binance Agent ID integration

## What we verified (and didn't)
Research on 2026-11-21 found **no official Binance developer documentation** for Agent ID contracts or SDKs. Every source was a third-party Binance Agent ID Hackathon project, and they agree on:
- Registry: `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` on **BSC mainnet (chainId 56)**, described as the SPACE ID Agent ID registry.
- ERC-721, soulbound, **no enumeration**. The standard ownership check is `balanceOf(owner) > 0`.
- Users get an Agent ID in the Binance app → Wallet → Agent ID.

Because this isn't from official docs, the address is **configurable** (`NEXT_PUBLIC_AGENT_ID_REGISTRY`) and flagged `verifiedByOfficialDocs: false`. The UI and `/api/health` say so too. **Before production, confirm the address with Binance.**

## Flow
1. The operator signs in with a wallet signature. This proves wallet ownership server-side.
2. Studio → My Agents → **Verify on BNB Chain** → `POST /api/agents/:id/verify`.
3. The server calls `balanceOf(sessionWallet)` on the registry over the BSC mainnet RPC and records the block number.
4. If the balance is above zero, it writes an `agent_identities` row (owner wallet, registry, chainId, balance, block, timestamp), records an activity event, and adds an audit log entry.
5. Public profiles label every field as **on-chain**, **signature**, **Sniply** or **unverified**.

## Limitations
- We can't resolve which token ID or `.ai` name a wallet holds (no enumeration or name resolver in the public sources). Operators can enter a **claimed name**, which is always shown as *unverified*.
- Agent ID is an identity, not a signer. Sniply never assumes Agent ID can sign or spend. Agentic Wallet / delegated spending isn't integrated, and financial autonomy stays off until its permission and spending-limit model is documented and verified.
- Re-verification is manual. Add a periodic job that re-checks `balanceOf` and revokes on transfer or burn.

## Reputation (transparent formula)
`reputation = max(0, Σ deltas)` with: job success +2, job failure −1, clip published +3, launch confirmed +5, moderated removal −15. Engagement is shown but **not** folded in, to resist farming. Reputation measures platform activity only, never investment quality.
