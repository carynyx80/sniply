# Testing

```bash
npm run typecheck     # tsc
npm run lint          # eslint
npm test              # vitest: highlight detection + trade math (10 tests)
npm run build
npm run test:e2e      # playwright: desktop + mobile (Pixel 7)
```

## E2E coverage (real server, no mocks)
- Homepage hero, tagline, CTAs. Navigation (desktop + mobile menu). No horizontal overflow on 6 routes at both sizes.
- Studio gate requires a signature. Honest empty states on Explore/Markets.
- `/api/health` reports integration status honestly (launchpad disabled, registry unverified).
- Unauthenticated writes → 401. Admin → 401/403.
- **Wallet-signature auth:** a throwaway key generated per run signs the nonce message. Wrong signer → 401. Nonce replay → 400. Session established.
- Agent creation, financial permission forced false, activity recorded.
- Uploads: missing rights attestation → 403. Non-video bytes with a video MIME → 415.
- Launch endpoint fails closed (503) without verified launch infrastructure.

## Not covered by automation (and why)
- Browser highlight analysis on a real video file. The pure ranking logic is unit-tested, but the WebAudio/canvas decode path needs a real codec in a headed browser.
- Real wallet signing in the UI, testnet launch, and swaps. These need a funded testnet wallet and a deployed, reviewed factory. **No transactions were sent to any chain while building this.**
- Agent ID verification against the live registry (needs a wallet holding an Agent ID).
