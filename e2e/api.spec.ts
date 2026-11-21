import { expect, test } from "@playwright/test";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "API flow runs once");

test("health reports integration status honestly", async ({ request }) => {
  const r = await request.get("/api/health");
  const j = await r.json();
  expect(j.ok).toBe(true);
  expect(j.launchpad).toContain("disabled");
  expect(j.agentIdRegistry.verifiedByOfficialDocs).toBe(false);
  expect(j.treasury).toEqual({ address: "0xfEB14057bbF5Ba1C18a28E13a0Bf6e4c7DC337Ff", chainId: 56, mode: "read-only" });
});

test("treasury is admin-only and cannot be used as a user account", async ({ request }) => {
  expect((await request.get("/api/admin/treasury")).status()).toBe(401);
  // Guard runs before any signature check, so no key is needed (and none is used).
  const r = await request.post("/api/auth/verify", {
    data: { address: "0xfEB14057bbF5Ba1C18a28E13a0Bf6e4c7DC337Ff", message: "x".repeat(40), signature: "0x00" },
  });
  expect(r.status()).toBe(403);
  expect((await r.json()).error).toMatch(/treasury/i);
});

test("protected routes reject unauthenticated requests", async ({ request }) => {
  expect((await request.post("/api/agents", { data: {} })).status()).toBe(401);
  expect((await request.get("/api/videos")).status()).toBe(401);
  expect((await request.get("/api/admin/overview")).status()).toBe(401);
});

test("wallet-signature auth → agent creation → admin denied", async ({ request, baseURL }) => {
  // Throwaway key generated for this test run only.
  const account = privateKeyToAccount(generatePrivateKey());
  const host = new URL(baseURL!).host;
  const { nonce } = await (await request.post("/api/auth/nonce")).json();
  const message = [
    `${host} wants you to sign in with your Ethereum account:`,
    account.address,
    "",
    "Sign in to Sniply. This request will not trigger a blockchain transaction or cost any gas.",
    "",
    `URI: ${baseURL}`,
    "Version: 1",
    "Chain ID: 97",
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join("\n");

  // wrong signer is rejected
  const other = privateKeyToAccount(generatePrivateKey());
  const bad = await request.post("/api/auth/verify", { data: { address: account.address, message, signature: await other.signMessage({ message }) } });
  expect(bad.status()).toBe(401);

  const ok = await request.post("/api/auth/verify", { data: { address: account.address, message, signature: await account.signMessage({ message }) } });
  expect(ok.status()).toBe(200);

  // nonce replay is rejected
  const replay = await request.post("/api/auth/verify", { data: { address: account.address, message, signature: await account.signMessage({ message }) } });
  expect(replay.status()).toBe(400);

  const s = await (await request.get("/api/auth/session")).json();
  expect(s.user.wallet).toBe(account.address.toLowerCase());
  expect(s.user.isAdmin).toBe(false);

  const created = await request.post("/api/agents", {
    data: { name: "E2E Hound", description: "test", avatarHue: 200, mode: "assisted", preferences: { clipMinSec: 8, clipMaxSec: 25, suggestions: 3, category: "gaming", captionStyle: "bold", aspect: "9:16", autoDraft: true, notifyOnDraft: false } },
  });
  expect(created.status()).toBe(201);
  const { agent } = await created.json();
  expect(agent.permissions.canLaunchTokens).toBe(false);

  const pub = await (await request.get(`/api/agents/${agent.slug}`)).json();
  expect(pub.agent.identity.verified).toBe(false);
  expect(pub.activity[0].kind).toBe("agent.registered");

  expect((await request.get("/api/admin/overview")).status()).toBe(403);

  // uploads require a rights attestation and a real video container
  const up = await request.post("/api/videos", { multipart: { file: { name: "x.mp4", mimeType: "video/mp4", buffer: Buffer.from("not a video") }, rightsAttested: "true" } });
  expect(up.status()).toBe(415);
  const noRights = await request.post("/api/videos", { multipart: { file: { name: "x.mp4", mimeType: "video/mp4", buffer: Buffer.from("x") }, rightsAttested: "false" } });
  expect(noRights.status()).toBe(403);

  // launch endpoint fails closed while no verified launch infrastructure is configured
  const launch = await request.post("/api/launches", { data: { draftId: crypto.randomUUID(), txHash: `0x${"a".repeat(64)}` } });
  expect(launch.status()).toBe(503);
});
