export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface RouteRecommendationResult {
  providerName: string;
  isEstimatedOnly: boolean;
  distanceKm: number;
  estimatedDurationMinutes: number;
  waypoints?: RouteCoordinate[];
  notice: string;
}

export interface IRoutingProvider {
  getName(): string;
  calculateSuggestedRoute(
    origin: RouteCoordinate,
    destination: RouteCoordinate
  ): Promise<RouteRecommendationResult>;
}

/**
 * Haversine formula calculation with road curvature factor (default 1.35x for realistic road estimate)
 */
export class SimpleEstimateRoutingProvider implements IRoutingProvider {
  getName(): string {
    return 'simple_estimate';
  }

  async calculateSuggestedRoute(
    origin: RouteCoordinate,
    destination: RouteCoordinate
  ): Promise<RouteRecommendationResult> {
    const R = 6371; // Earth radius in km
    const dLat = (destination.latitude - origin.latitude) * (Math.PI / 180);
    const dLon = (destination.longitude - origin.longitude) * (Math.PI / 180);
    const lat1 = origin.latitude * (Math.PI / 180);
    const lat2 = destination.latitude * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightLineKm = R * c;

    // Road factor ~ 1.35x straight line in urban/suburban Ratchaburi/Thailand
    const roadKm = Math.round(straightLineKm * 1.35 * 10) / 10;
    // Average EMS speed ~ 50 km/h with traffic & turns
    const durationMins = Math.max(3, Math.round((roadKm / 50) * 60));

    return {
      providerName: 'SimpleEstimateRoutingProvider',
      isEstimatedOnly: true,
      distanceKm: roadKm,
      estimatedDurationMinutes: durationMins,
      notice: 'Estimated / Suggested route only. Not a guaranteed arrival time.'
    };
  }
}

export class RoutingProviderFactory {
  private static providers: Map<string, IRoutingProvider> = new Map([
    ['simple_estimate', new SimpleEstimateRoutingProvider()]
  ]);

  public static getProvider(name?: string): IRoutingProvider {
    const key = (name || process.env.DEFAULT_ROUTING_PROVIDER || 'simple_estimate').toLowerCase();
    const provider = this.providers.get(key);
    if (!provider) {
      console.warn(`Routing provider '${key}' not found, falling back to 'simple_estimate'`);
      return this.providers.get('simple_estimate')!;
    }
    return provider;
  }
}
