export type SyncDecision =
  | { type: 'noop' }
  | { type: 'adopt-remote' }
  | { type: 'push'; expectedRevision: number }
  | { type: 'conflict'; expectedRevision: number; remoteRevision: number };

export type SyncDecisionInput = {
  local: { revision: number; dirty: boolean } | null;
  remote: { revision: number; hasData: boolean };
};

/**
 * Decides how a locally cached snapshot should be reconciled with the cloud.
 *
 * - No local copy: adopt the cloud once it has anything worth adopting.
 * - Clean local copy: adopt any newer cloud revision.
 * - Dirty local copy: push when it is based on the current cloud revision,
 *   otherwise surface a conflict instead of silently overwriting either side.
 */
export function decideSyncAction({ local, remote }: SyncDecisionInput): SyncDecision {
  if (!local) {
    return remote.hasData || remote.revision > 0 ? { type: 'adopt-remote' } : { type: 'noop' };
  }

  if (local.dirty) {
    const sameRevision = local.revision === remote.revision;
    const legacyRemoteData = remote.revision === 0 && remote.hasData;

    if (sameRevision && !legacyRemoteData) {
      return { type: 'push', expectedRevision: local.revision };
    }

    return {
      type: 'conflict',
      expectedRevision: local.revision,
      remoteRevision: remote.revision,
    };
  }

  if (remote.revision === local.revision) {
    if (remote.hasData && remote.revision === 0) {
      return { type: 'adopt-remote' };
    }

    return { type: 'noop' };
  }

  return { type: 'adopt-remote' };
}
