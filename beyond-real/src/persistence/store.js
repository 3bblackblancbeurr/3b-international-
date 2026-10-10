export class MemoryPersistenceStore {
  constructor(seed = {}) {
    this.records = new Map(Object.entries(structuredClone(seed)));
  }

  saveSpatialObject(record) {
    if (!record?.id || !record.logicalId || !record.ownerId) throw new Error('Spatial object id, logicalId and ownerId are required.');
    const next = Object.freeze({
      version: 1,
      id: String(record.id),
      logicalId: String(record.logicalId),
      ownerId: String(record.ownerId),
      roomRef: record.roomRef ? String(record.roomRef) : null,
      anchorRef: record.anchorRef ? String(record.anchorRef) : null,
      pose: record.pose ? Object.freeze({ ...record.pose }) : null,
      state: record.state || 'placed',
      updatedAt: Number(record.updatedAt) || Date.now(),
    });
    this.records.set(`spatial:${next.id}`, next);
    return next;
  }

  loadSpatialObject(id) {
    const value = this.records.get(`spatial:${id}`);
    return value ? structuredClone(value) : null;
  }

  listSpatialObjects(ownerId) {
    return [...this.records.entries()]
      .filter(([key, value]) => key.startsWith('spatial:') && (!ownerId || value.ownerId === ownerId))
      .map(([, value]) => structuredClone(value));
  }

  detachAnchor(id, updatedAt = Date.now()) {
    const current = this.loadSpatialObject(id);
    if (!current) return null;
    return this.saveSpatialObject({ ...current, anchorRef: null, state: 'needs-relocation', updatedAt });
  }

  set(key, value) { this.records.set(String(key), structuredClone(value)); }
  get(key) { const value = this.records.get(String(key)); return value == null ? null : structuredClone(value); }
}
