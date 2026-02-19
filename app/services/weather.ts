// Open-Meteo Weather Service
// Free API, no key required - https://open-meteo.com/

export interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  weatherCode: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  sunrise: string;
  sunset: string;
  updatedAt: Date;
}

// WMO Weather Codes: https://open-meteo.com/en/docs
const WEATHER_DESCRIPTIONS: Record<number, { label: string; icon: 'sun' | 'cloud' | 'cloud-sun' | 'cloud-rain' | 'cloud-snow' | 'cloud-fog' | 'cloud-lightning' }> = {
  0: { label: 'Clear sky', icon: 'sun' },
  1: { label: 'Mainly clear', icon: 'sun' },
  2: { label: 'Partly cloudy', icon: 'cloud-sun' },
  3: { label: 'Overcast', icon: 'cloud' },
  45: { label: 'Foggy', icon: 'cloud-fog' },
  48: { label: 'Depositing rime fog', icon: 'cloud-fog' },
  51: { label: 'Light drizzle', icon: 'cloud-rain' },
  53: { label: 'Moderate drizzle', icon: 'cloud-rain' },
  55: { label: 'Dense drizzle', icon: 'cloud-rain' },
  61: { label: 'Slight rain', icon: 'cloud-rain' },
  63: { label: 'Moderate rain', icon: 'cloud-rain' },
  65: { label: 'Heavy rain', icon: 'cloud-rain' },
  71: { label: 'Slight snow', icon: 'cloud-snow' },
  73: { label: 'Moderate snow', icon: 'cloud-snow' },
  75: { label: 'Heavy snow', icon: 'cloud-snow' },
  77: { label: 'Snow grains', icon: 'cloud-snow' },
  80: { label: 'Slight rain showers', icon: 'cloud-rain' },
  81: { label: 'Moderate rain showers', icon: 'cloud-rain' },
  82: { label: 'Violent rain showers', icon: 'cloud-rain' },
  85: { label: 'Slight snow showers', icon: 'cloud-snow' },
  86: { label: 'Heavy snow showers', icon: 'cloud-snow' },
  95: { label: 'Thunderstorm', icon: 'cloud-lightning' },
  96: { label: 'Thunderstorm with hail', icon: 'cloud-lightning' },
  99: { label: 'Thunderstorm with heavy hail', icon: 'cloud-lightning' },
};

export function getWeatherDescription(code: number): { label: string; icon: string } {
  return WEATHER_DESCRIPTIONS[code] || { label: 'Unknown', icon: 'cloud' };
}

export function getWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

// Chop assessment based on wind speed (mph)
export interface ChopAssessment {
  level: 'calm' | 'light' | 'moderate' | 'heavy' | 'dangerous';
  label: string;
  color: string;
  description: string;
}

export function assessChop(windSpeed: number, windGusts?: number): ChopAssessment {
  // Use gusts if significantly higher than sustained wind
  const effectiveWind = windGusts && windGusts > windSpeed * 1.3 ? (windSpeed + windGusts) / 2 : windSpeed;
  
  if (effectiveWind < 5) {
    return {
      level: 'calm',
      label: 'Calm',
      color: 'var(--success)',
      description: 'Flat water, ideal paddling',
    };
  } else if (effectiveWind < 10) {
    return {
      level: 'light',
      label: 'Light chop',
      color: 'var(--success)',
      description: 'Small ripples, easy paddling',
    };
  } else if (effectiveWind < 15) {
    return {
      level: 'moderate',
      label: 'Moderate chop',
      color: 'var(--warning)',
      description: 'Noticeable waves, some spray',
    };
  } else if (effectiveWind < 20) {
    return {
      level: 'heavy',
      label: 'Heavy chop',
      color: 'var(--danger)',
      description: 'Large waves, challenging conditions',
    };
  } else {
    return {
      level: 'dangerous',
      label: 'Dangerous',
      color: 'var(--danger)',
      description: 'Not recommended for paddling',
    };
  }
}

// Fetch wind data for multiple points along a route and average them
export async function fetchRouteWindConditions(
  coords: [number, number][]
): Promise<{ avgWind: WeatherData; chop: ChopAssessment } | null> {
  if (coords.length === 0) return null;
  
  // Sample up to 3 points along the route (start, middle, end)
  const samplePoints: [number, number][] = [];
  
  if (coords.length === 1) {
    samplePoints.push(coords[0]);
  } else if (coords.length === 2) {
    samplePoints.push(coords[0], coords[coords.length - 1]);
  } else {
    const midIndex = Math.floor(coords.length / 2);
    samplePoints.push(coords[0], coords[midIndex], coords[coords.length - 1]);
  }
  
  try {
    // Fetch weather for each sample point
    const weatherPromises = samplePoints.map(([lng, lat]) => fetchWeather(lat, lng));
    const weatherResults = await Promise.all(weatherPromises);
    
    // Average the results
    const avgWeather: WeatherData = {
      temperature: Math.round(weatherResults.reduce((sum, w) => sum + w.temperature, 0) / weatherResults.length),
      apparentTemperature: Math.round(weatherResults.reduce((sum, w) => sum + w.apparentTemperature, 0) / weatherResults.length),
      humidity: Math.round(weatherResults.reduce((sum, w) => sum + w.humidity, 0) / weatherResults.length),
      weatherCode: weatherResults[0].weatherCode, // Use first point's weather code
      windSpeed: Math.round(weatherResults.reduce((sum, w) => sum + w.windSpeed, 0) / weatherResults.length),
      windDirection: Math.round(weatherResults.reduce((sum, w) => sum + w.windDirection, 0) / weatherResults.length),
      windGusts: Math.round(weatherResults.reduce((sum, w) => sum + w.windGusts, 0) / weatherResults.length),
      sunrise: weatherResults[0].sunrise,
      sunset: weatherResults[0].sunset,
      updatedAt: new Date(),
    };
    
    const chop = assessChop(avgWeather.windSpeed, avgWeather.windGusts);
    
    return { avgWind: avgWeather, chop };
  } catch (error) {
    console.error('Failed to fetch route wind conditions:', error);
    return null;
  }
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    current: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
    ].join(','),
    daily: 'sunrise,sunset',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    timezone: 'auto',
    forecast_days: '1',
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    temperature: Math.round(data.current.temperature_2m),
    apparentTemperature: Math.round(data.current.apparent_temperature),
    humidity: data.current.relative_humidity_2m,
    weatherCode: data.current.weather_code,
    windSpeed: Math.round(data.current.wind_speed_10m),
    windDirection: data.current.wind_direction_10m,
    windGusts: Math.round(data.current.wind_gusts_10m),
    sunrise: data.daily.sunrise[0],
    sunset: data.daily.sunset[0],
    updatedAt: new Date(),
  };
}
