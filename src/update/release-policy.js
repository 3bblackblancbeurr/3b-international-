/** Only a server release with a real build identifier can announce an update. */
export function serverReleaseDecision(value, currentBuildId) {
  if (!value || typeof value !== 'object') return { status: 'unknown' };
  const buildId = String(value.buildId || '').trim();
  if (!buildId || buildId === 'service-worker') return { status: 'unknown' };
  if (buildId === currentBuildId) return { status: 'current' };
  return {
    status: 'available',
    release: {
      buildId,
      version: String(value.version || '').trim() || 'nouvelle',
      mandatory: value.mandatory === true,
    },
  };
}
