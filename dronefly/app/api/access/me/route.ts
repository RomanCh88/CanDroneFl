import { handleError, json, requireUser, resolveMembership } from '@/lib/server/access';

/** Membership status for the signed-in user (bootstraps admin + legacy users). */
export async function POST(req: Request) {
  try {
    const u = await requireUser(req);
    return json(await resolveMembership(u));
  } catch (e) {
    return handleError(e);
  }
}
