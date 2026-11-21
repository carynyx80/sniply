import "server-only";
import { FLAP } from "@/lib/flap";

/**
 * Upload token metadata + image to Flap's IPFS service (GraphQL multipart request, per
 * Flap's docs). Returns the metadata CID passed as `meta` to newTokenV6.
 */
export async function uploadFlapMetadata(image: { bytes: Buffer; filename: string; type: string }, meta: { description: string; website?: string | null; twitter?: string | null; telegram?: string | null; creator: string }) {
  const operations = {
    query: "mutation Create($file: Upload!, $meta: MetadataInput!) { create(file: $file, meta: $meta) }",
    variables: {
      file: null,
      meta: {
        description: meta.description,
        website: meta.website || null,
        twitter: meta.twitter || null,
        telegram: meta.telegram || null,
        creator: meta.creator,
      },
    },
  };
  const fd = new FormData();
  fd.set("operations", JSON.stringify(operations));
  fd.set("map", JSON.stringify({ "0": ["variables.file"] }));
  fd.set("0", new Blob([new Uint8Array(image.bytes)], { type: image.type }), image.filename);
  const r = await fetch(FLAP.uploadEndpoint, { method: "POST", body: fd, signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`Flap metadata upload failed (${r.status})`);
  const j = (await r.json()) as { data?: { create?: string }; errors?: { message: string }[] };
  const cid = j.data?.create;
  if (!cid || !/^[a-zA-Z0-9]{20,}$/.test(cid)) throw new Error(j.errors?.[0]?.message ?? "Flap returned no metadata CID");
  return cid;
}
