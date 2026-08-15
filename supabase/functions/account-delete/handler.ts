import { hasFreshOtp } from './fresh-otp.ts';

export interface AccountDeletionDependencies {
  nowSeconds(): number;
  newCorrelationId(): string;
  verifyJwt(jwt: string): Promise<{ sub?: unknown; amr?: unknown }>;
  deleteUser(userId: string): Promise<void>;
}

export async function handleAccountDeletion(
  request: Request,
  dependencies: AccountDeletionDependencies
): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405 });
  }

  const authorization = request.headers.get('authorization');
  const bearerMatch = authorization?.match(/^Bearer ([^\s]+)$/);
  if (!bearerMatch) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  let claims: { sub?: unknown; amr?: unknown };
  try {
    claims = await dependencies.verifyJwt(bearerMatch[1]);
  } catch {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (typeof claims.sub !== 'string' || !isUuid(claims.sub)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!hasFreshOtp(claims.amr, dependencies.nowSeconds())) {
    return Response.json({ error: 'reauthentication_required' }, { status: 403 });
  }

  try {
    await dependencies.deleteUser(claims.sub);
  } catch {
    return Response.json(
      { error: 'delete_failed', correlationId: dependencies.newCorrelationId() },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
