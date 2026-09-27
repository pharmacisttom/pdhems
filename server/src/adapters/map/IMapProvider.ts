export interface MapTileConfig {
  providerName: string;
  tileUrl: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string[];
}

export interface IMapProvider {
  getName(): string;
  getTileConfig(): MapTileConfig;
  getDefaultCenter(): { latitude: number; longitude: number; zoom: number };
}

export class OpenStreetMapProvider implements IMapProvider {
  getName(): string {
    return 'openstreetmap';
  }

  getTileConfig(): MapTileConfig {
    return {
      providerName: 'OpenStreetMap',
      tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    };
  }

  getDefaultCenter(): { latitude: number; longitude: number; zoom: number } {
    return {
      latitude: 12.9756, // Pluakdaeng Hospital (PDH) Rayong
      longitude: 101.2155,
      zoom: 12
    };
  }
}

export class MapProviderFactory {
  private static providers: Map<string, IMapProvider> = new Map([
    ['openstreetmap', new OpenStreetMapProvider()],
  ]);

  public static getProvider(name?: string): IMapProvider {
    const key = (name || process.env.DEFAULT_MAP_PROVIDER || 'openstreetmap').toLowerCase();
    const provider = this.providers.get(key);
    if (!provider) {
      console.warn(`Map provider '${key}' not found, falling back to 'openstreetmap'`);
      return this.providers.get('openstreetmap')!;
    }
    return provider;
  }

  public static registerProvider(name: string, provider: IMapProvider): void {
    this.providers.set(name.toLowerCase(), provider);
  }
}
