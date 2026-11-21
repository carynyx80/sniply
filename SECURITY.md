# Security

- **Auth:** EIP-4361-style message bound to host, address and a single-use, 10-minute nonce. Verified with viem. HMAC-SHA256 session cookie (httpOnly, sameSite=lax, secure in prod). `SESSION_SECRET` is required in production (the server fails closed).
- **Authorization:** every mutating route checks ownership server-side. Admin comes only from the `ADMIN_WALLETS` env var, never a client flag.
- **Validation:** Zod on every input. Uploads use a MIME allow-list, magic-byte sniffing, a size cap and a rights attestation. Thumbnails must be JPEG and are size-capped. Storage keys are sanitized.
- **Rate limits:** per-IP or per-user fixed windows on auth, uploads, jobs, clips, AI, launches, reports and engagement. In-memory today. Use Redis/Upstash for multi-instance.
- **Keys:** the server never holds user keys and never signs transactions. No private keys anywhere in the repo.
- **Financial integrity:** no Sniply trading fee; LP fee and gas are disclosed. Exact approvals. Slippage is capped. A launch counts as successful only after receipt verification. No fabricated volume, holders or metrics. The token draft API rejects return promises ("guaranteed", "100x", etc.).
- **Agents:** permission scopes, three modes, emergency pause, audit log. `canLaunchTokens` is false in code and by DB constraint.
- **Content:** reports (incl. copyright takedown), admin moderation with reasons, audit trail, reputation penalty on removal.
- **Headers:** nosniff, DENY framing, strict referrer, restrictive permissions policy.
- **Known gaps:** no CSP yet (wallet SDKs need tuning). In-memory rate limits. Local dev media route is unauthenticated (production uses signed URLs). No malware scanning on uploads.
