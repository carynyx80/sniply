import { z } from "zod";
import { getAddress } from "viem";
import { db, now } from "@/server/db";
import { requireUser, HttpError } from "@/server/auth";
import { handle, json, rateLimit } from "@/server/http";
import { getObject } from "@/server/storage";
import { uploadFlapMetadata } from "@/server/flap";
import { treasury } from "@/server/treasury";
import { feeSplit, findVanitySalt, FLAP, saltSeedFor, SNIPLY_TAX_BPS } from "@/lib/flap";
import { LAUNCHPAD, launchEnabled } from "@/lib/chain-config";

const Body = z.object({ draftId: z.string().uuid() });

/**
 * Prepare a Flap launch for a reviewed draft: upload metadata + clip thumbnail to Flap's
 * IPFS, mine the vanity salt, and return everything the creator's wallet needs to sign.
 * Nothing is signed or sent here. Idempotent per draft.
 */
export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  rateLimit(`prepare:${user.id}`, 10, 3_600_000);
  if (!launchEnabled() || LAUNCHPAD.kind !== "flap") throw new HttpError(503, "Flap launches are not enabled");
  const { draftId } = Body.parse(await req.json());
  const draft = await db.get("token_drafts", draftId);
  if (!draft || draft.creatorId !== user.id) throw new HttpError(404, "Draft not found");
  if (draft.status === "confirmed") throw new HttpError(409, "This draft is already launched");
  const clip = await db.get("clips", draft.clipId);
  if (!clip || clip.status !== "published") throw new HttpError(409, "The clip must be published");
  if (await db.findOne("token_launches", { clipId: clip.id })) throw new HttpError(409, "This clip already has a token");

  let flap = draft.flap;
  if (!flap) {
    if (!clip.thumbnailPath) throw new HttpError(409, "The clip needs a thumbnail to use as the token image");
    const bytes = await getObject(clip.thumbnailPath);
    const metaCid = await uploadFlapMetadata(
      { bytes, filename: `${draft.symbol.toLowerCase()}.jpg`, type: "image/jpeg" },
      { description: draft.description, website: draft.links.website, twitter: draft.links.x, telegram: draft.links.telegram, creator: getAddress(user.wallet) },
    );
    const { salt, token } = findVanitySalt(saltSeedFor(draft.id, getAddress(user.wallet)));
    flap = { metaCid, salt, predictedToken: token, taxBps: SNIPLY_TAX_BPS, preparedAt: now() };
    await db.update("token_drafts", draft.id, { flap });
  }
  return json({
    portal: FLAP.portal,
    commissionReceiver: treasury.address,
    beneficiary: getAddress(user.wallet),
    metaCid: flap.metaCid,
    metaUrl: `${FLAP.ipfsGateway}${flap.metaCid}`,
    salt: flap.salt,
    predictedToken: flap.predictedToken,
    split: feeSplit(flap.taxBps),
  });
});
