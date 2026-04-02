import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(private supabase: SupabaseService) {}

  async getWeather(userId: string, location?: string) {
    // Get user's location if not provided
    let lat: number;
    let lon: number;

    if (location) {
      // Use geocoding to get coordinates (simplified - using hardcoded major cities)
      const coords = this.getCoordinatesForCity(location);
      if (!coords) {
        throw new BadRequestException('Location not found');
      }
      lat = coords.lat;
      lon = coords.lon;
    } else {
      // Try to get from user's elderly profile
      const { data: user } = await this.supabase.db
        .from('user')
        .select(`
          id,
          elderlyprofile (
            id,
            location
          )
        `)
        .eq('id', userId)
        .single();

      const elderlyProfile = user?.elderlyprofile;
      
      let profileLoc = null;
      if (elderlyProfile) {
        if (Array.isArray(elderlyProfile)) {
          profileLoc = elderlyProfile[0]?.location;
        } else {
          profileLoc = (elderlyProfile as any).location;
        }
      }

      if (profileLoc) {
        const location = profileLoc;
        const coords = this.getCoordinatesForCity(location);
        if (!coords) {
          throw new BadRequestException('User location not found');
        }
        lat = coords.lat;
        lon = coords.lon;
      } else {
        // Default to São Paulo
        lat = -23.5505;
        lon = -46.6333;
      }
    }

    // Fetch from Open-Meteo API
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=celsius`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new BadRequestException('Failed to fetch weather data');
    }

    const data = await response.json();
    const current = data.current_weather;

    const temperature = current.temperature;
    const weatherCode = current.weathercode;

    const weatherDescription = this.getWeatherDescription(weatherCode);
    const clothingAdvice = this.getClothingAdvice(temperature);

    this.logger.log(
      `Weather fetched for lat=${lat}, lon=${lon}: ${temperature}°C`,
    );

    return {
      temperature,
      temperatureUnit: 'celsius',
      weatherCode,
      weatherDescription,
      clothingAdvice,
    };
  }

  private getCoordinatesForCity(
    city: string,
  ): { lat: number; lon: number } | null {
    const cities: Record<string, { lat: number; lon: number }> = {
      'são paulo': { lat: -23.5505, lon: -46.6333 },
      'rio de janeiro': { lat: -22.9068, lon: -43.1729 },
      brasília: { lat: -15.8267, lon: -47.9218 },
      salvador: { lat: -12.9714, lon: -38.5014 },
      fortaleza: { lat: -3.7172, lon: -38.5433 },
      'belo horizonte': { lat: -19.9167, lon: -43.9345 },
      manaus: { lat: -3.119, lon: -60.0217 },
      curitiba: { lat: -25.4284, lon: -49.2733 },
      recife: { lat: -8.0476, lon: -34.877 },
      'porto alegre': { lat: -30.0346, lon: -51.2177 },
    };

    return cities[city.toLowerCase()] || null;
  }

  private getWeatherDescription(code: number): string {
    const descriptions: Record<number, string> = {
      0: 'Céu limpo',
      1: 'Principalmente limpo',
      2: 'Parcialmente nublado',
      3: 'Nublado',
      45: 'Neblina',
      48: 'Névoa gelada',
      51: 'Garoa leve',
      53: 'Garoa moderada',
      55: 'Garoa forte',
      61: 'Chuva leve',
      63: 'Chuva moderada',
      65: 'Chuva forte',
      71: 'Neve leve',
      73: 'Neve moderada',
      75: 'Neve forte',
      77: 'Granizo',
      80: 'Pancadas de chuva leves',
      81: 'Pancadas de chuva moderadas',
      82: 'Pancadas de chuva fortes',
      85: 'Pancadas de neve leves',
      86: 'Pancadas de neve fortes',
      95: 'Trovoada',
      96: 'Trovoada com granizo leve',
      99: 'Trovoada com granizo forte',
    };

    return descriptions[code] || 'Condição desconhecida';
  }

  private getClothingAdvice(temperature: number): string {
    if (temperature < 15) {
      return 'Vista um casaco quente hoje.';
    } else if (temperature >= 15 && temperature <= 22) {
      return 'Uma blusa leve é uma boa ideia.';
    } else if (temperature > 22 && temperature <= 30) {
      return 'Pode usar roupa leve hoje.';
    } else {
      return 'Está muito quente! Use roupa bem leve e beba água.';
    }
  }
}
