export class OfflineEventQueue {
  constructor({ deviceId = 'sim-device', seed = [] } = {}) {
    this.deviceId = deviceId;
    this.next = 1;
    this.pending = [];
    for (const entry of seed) this.enqueue(entry.event, entry.sequence);
  }

  enqueue(event, forcedSequence = null) {
    const sequence = forcedSequence ?? this.next;
    if (!Number.isInteger(sequence) || sequence < 1) throw new Error('Offline sequence must be a positive integer.');
    if (this.pending.some(entry => entry.sequence === sequence)) return sequence;
    this.pending.push(Object.freeze({ deviceId: this.deviceId, sequence, event }));
    this.pending.sort((a, b) => a.sequence - b.sequence);
    this.next = Math.max(this.next, sequence + 1);
    return sequence;
  }

  async flush(sendBatch, batchSize = 50) {
    let acknowledged = 0;
    while (this.pending.length) {
      const batch = this.pending.slice(0, Math.max(1, Math.min(100, batchSize)));
      const result = await sendBatch(batch);
      acknowledged = Math.max(acknowledged, Number(result?.acknowledgedSequence) || 0);
      if (!acknowledged) break;
      this.pending = this.pending.filter(entry => entry.sequence > acknowledged);
    }
    return { acknowledgedSequence: acknowledged, pending: this.pending.length };
  }

  snapshot() {
    return { deviceId: this.deviceId, next: this.next, pending: this.pending.map(entry => ({ ...entry })) };
  }
}
