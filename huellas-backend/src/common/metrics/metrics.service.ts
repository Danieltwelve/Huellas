import { Injectable } from '@nestjs/common';

type MetricRecord = {
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
};

@Injectable()
export class MetricsService {
  private metrics: Map<string, MetricRecord> = new Map();

  record(endpoint: string, ms: number) {
    const key = endpoint;
    const current = this.metrics.get(key);
    if (!current) {
      this.metrics.set(key, { count: 1, totalMs: ms, minMs: ms, maxMs: ms });
      return;
    }

    current.count += 1;
    current.totalMs += ms;
    current.minMs = Math.min(current.minMs, ms);
    current.maxMs = Math.max(current.maxMs, ms);
    this.metrics.set(key, current);
  }

  getSnapshot() {
    const out: Record<string, any> = {};
    this.metrics.forEach((v, k) => {
      out[k] = {
        count: v.count,
        avgMs: v.totalMs / v.count,
        minMs: v.minMs,
        maxMs: v.maxMs,
      };
    });
    return out;
  }
}
