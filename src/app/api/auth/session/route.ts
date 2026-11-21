import { currentUser, destroySession, isAdmin } from "@/server/auth";
import { handle, json } from "@/server/http";

export const GET = handle(async () => {
  const u = await currentUser();
  return json({ user: u ? { id: u.id, wallet: u.wallet, username: u.username, isAdmin: isAdmin(u) } : null });
});

export const DELETE = handle(async () => {
  await destroySession();
  return json({ ok: true });
});
