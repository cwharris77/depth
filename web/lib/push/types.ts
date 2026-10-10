// The sender's view of a subscribed device and of an event it may deliver, plus the
// mappers from the Postgres rows.

import type { TeamEventTier, TeamEventType } from '@/lib/events/types';

export type PushTier = 'big_moments' | 'everything' | 'off';
export type ApnsEnvironment = 'production' | 'sandbox';

export interface PushDevice {
  id: string;
  apnsToken: string;
  teamId: string;
  tier: PushTier;
  // The APNs topic.
  bundleId: string;
  apnsEnvironment: ApnsEnvironment;
  // ISO 8601. Events created at or before this are never sent to the device.
  notifyAfter: string;
}

export interface PushableEvent {
  id: string;
  type: TeamEventType;
  tier: TeamEventTier;
  teamId: string;
  headline: string;
  detail: string | null;
  // ISO 8601, when the detector wrote the row.
  createdAt: string;
}

export interface PushDeviceRow {
  id: string;
  apns_token: string;
  team_id: string;
  tier: string;
  bundle_id: string;
  apns_environment: string;
  notify_after: string;
}

export function fromPushDeviceRow(row: PushDeviceRow): PushDevice {
  return {
    id: row.id,
    apnsToken: row.apns_token,
    teamId: row.team_id,
    tier: row.tier as PushTier,
    bundleId: row.bundle_id,
    apnsEnvironment: row.apns_environment as ApnsEnvironment,
    notifyAfter: row.notify_after,
  };
}

export interface PushableEventRow {
  id: string;
  event_type: string;
  tier: string;
  team_id: string;
  headline: string;
  detail: string | null;
  created_at: string;
}

export function fromTeamEventRow(row: PushableEventRow): PushableEvent {
  return {
    id: row.id,
    type: row.event_type as TeamEventType,
    tier: row.tier as TeamEventTier,
    teamId: row.team_id,
    headline: row.headline,
    detail: row.detail,
    createdAt: row.created_at,
  };
}
