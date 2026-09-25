export interface TileLayerConfig {
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string[];
}

export interface IClientMapProvider {
  id: string;
  name: string;
  getTileConfig(): TileLayerConfig;
  getDefaultCenter(): [number, number];
  getDefaultZoom(): number;
}

export class OpenStreetMapClientProvider implements IClientMapProvider {
  id = 'openstreetmap';
  name = 'OpenStreetMap Standard';

  getTileConfig(): TileLayerConfig {
    return {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    };
  }

  getDefaultCenter(): [number, number] {
    // Photharam Hospital (PDH) Ratchaburi
    return [13.693822, 99.851921];
  }

  getDefaultZoom(): number {
    return 12;
  }
}

export class MapboxSatelliteClientProvider implements IClientMapProvider {
  id = 'carto_dark';
  name = 'CartoDB Dark Matter';

  getTileConfig(): TileLayerConfig {
    return {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution: '&copy; CartoDB & OpenStreetMap',
      maxZoom: 19,
      subdomains: ['a', 'b', 'c', 'd']
    };
  }

  getDefaultCenter(): [number, number] {
    return [13.693822, 99.851921];
  }

  getDefaultZoom(): number {
    return 12;
  }
}

export const MAP_PROVIDERS: Record<string, IClientMapProvider> = {
  openstreetmap: new OpenStreetMapClientProvider(),
  carto_voyager: new MapboxSatelliteClientProvider()
};

export function getActiveMapProvider(providerId = 'openstreetmap'): IClientMapProvider {
  return MAP_PROVIDERS[providerId] || MAP_PROVIDERS.openstreetmap;
}
