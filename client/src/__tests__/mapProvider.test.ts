import { describe, it, expect, vi } from 'vitest';
import { getActiveMapProvider } from '../services/mapProviderAdapter';
import { fetchMissionTrack, fetchTrackingHealth } from '../services/api';

describe('Map Provider Adapter (Section 1 & 14)', () => {
  it('loads OpenStreetMap provider by default without hardcoding business logic', () => {
    const provider = getActiveMapProvider('openstreetmap');
    expect(provider).toBeDefined();
    expect(provider.id).toBe('openstreetmap');
    expect(provider.name).toContain('OpenStreetMap');

    const tileConfig = provider.getTileConfig();
    expect(tileConfig.url).toContain('{z}/{x}/{y}');
    expect(tileConfig.attribution).toContain('OpenStreetMap');
    expect(tileConfig.maxZoom).toBeGreaterThanOrEqual(18);
  });

  it('provides default center coordinates at Photharam Hospital (PDH)', () => {
    const provider = getActiveMapProvider();
    const [lat, lng] = provider.getDefaultCenter();
    expect(lat).toBeCloseTo(13.693822, 4);
    expect(lng).toBeCloseTo(99.851921, 4);
    expect(provider.getDefaultZoom()).toBe(12);
  });

  it('falls back to default OpenStreetMap if an unknown provider name is supplied', () => {
    const fallback = getActiveMapProvider('unknown_provider_xyz');
    expect(fallback.id).toBe('openstreetmap');
  });

  it('fetchMissionTrack returns null gracefully when server fails', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const res = await fetchMissionTrack('REF-999');
    expect(res).toBeNull();
    globalThis.fetch = origFetch;
  });

  it('fetchTrackingHealth returns null gracefully when server fails', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const res = await fetchTrackingHealth();
    expect(res).toBeNull();
    globalThis.fetch = origFetch;
  });
});
