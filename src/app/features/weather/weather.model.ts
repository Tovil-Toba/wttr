export interface WeatherDesc {
  value: string;
}

export interface WeatherIconUrl {
  value: string;
}

export interface CurrentCondition {
  FeelsLikeC: string;
  FeelsLikeF: string;
  cloudcover: string;
  humidity: string;
  observation_time: string;
  precipInches: string;
  precipMM: string;
  pressure: string;
  pressureInches: string;
  temp_C: string;
  temp_F: string;
  uvIndex: string;
  visibility: string;
  visibilityMiles: string;
  weatherCode: string;
  weatherDesc: WeatherDesc[];
  lang_ru?: WeatherDesc[];
  lang_xx?: WeatherDesc[];
  [key: string]: any;
  weatherIconUrl: WeatherIconUrl[];
  winddir16Point: string;
  winddirDegree: string;
  windspeedKmph: string;
  windspeedMiles: string;
}

export interface Astronomy {
  moon_illumination: string;
  moon_phase: string;
  moonrise: string;
  moonset: string;
  sunrise: string;
  sunset: string;
}

export interface HourlyWeather {
  time: string;
  tempC: string;
  tempF: string;
  FeelsLikeC: string;
  FeelsLikeF: string;
  weatherCode: string;
  weatherDesc: WeatherDesc[];
  lang_ru?: WeatherDesc[];
  lang_xx?: WeatherDesc[];
  [key: string]: any;
  weatherIconUrl: WeatherIconUrl[];
  windspeedKmph: string;
  windspeedMiles: string;
  winddir16Point: string;
  winddirDegree: string;
  humidity: string;
  precipMM: string;
  precipInches: string;
  pressure: string;
  pressureInches: string;
  cloudcover: string;
  HeatIndexC: string;
  HeatIndexF: string;
  DewPointC: string;
  DewPointF: string;
  WindChillC: string;
  WindChillF: string;
  WindGustKmph: string;
  WindGustMiles: string;
  chanceoffog: string;
  chanceoffrost: string;
  chanceofhightemp: string;
  chanceofovercast: string;
  chanceofrain: string;
  chanceofremdry: string;
  chanceofsnow: string;
  chanceofsunshine: string;
  chanceofthunder: string;
  chanceofwindy: string;
  uvIndex: string;
  visibility: string;
  visibilityMiles: string;
}

export interface WeatherDay {
  date: string;
  astronomy: Astronomy[];
  avgtempC: string;
  avgtempF: string;
  maxtempC: string;
  maxtempF: string;
  mintempC: string;
  mintempF: string;
  sunHour: string;
  totalSnow_cm: string;
  uvIndex: string;
  hourly: HourlyWeather[];
}

export interface AreaValue {
  value: string;
}

export interface NearestArea {
  areaName: AreaValue[];
  country: AreaValue[];
  region: AreaValue[];
  latitude: string;
  longitude: string;
  population?: string;
}

export interface WttrResponse {
  current_condition: CurrentCondition[];
  weather: WeatherDay[];
  nearest_area: NearestArea[];
}

export type TempUnit = 'C' | 'F';
export type WindUnit = 'kmh' | 'ms' | 'mph';
export type PressureUnit = 'mmHg' | 'hPa';

export interface WeatherSettings {
  tempUnit: TempUnit;
  windUnit: WindUnit;
  pressureUnit: PressureUnit;
}

export interface FavoriteLocation {
  name: string;
  query: string;
  country?: string;
  addedAt: number;
}

export interface SupportedLanguage {
  code: string;
  label: string;
  nativeName: string;
  badge: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'ru', label: 'Русский', nativeName: 'Русский', badge: 'RU', flag: '🇷🇺' },
  { code: 'en', label: 'English', nativeName: 'English', badge: 'EN', flag: '🇬🇧' },
  { code: 'be', label: 'Беларуская', nativeName: 'Беларуская', badge: 'BE', flag: '🇧🇾' },
  { code: 'de', label: 'Deutsch', nativeName: 'Deutsch', badge: 'DE', flag: '🇩🇪' },
  { code: 'es', label: 'Español', nativeName: 'Español', badge: 'ES', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', nativeName: 'Français', badge: 'FR', flag: '🇫🇷' },
  { code: 'it', label: 'Italiano', nativeName: 'Italiano', badge: 'IT', flag: '🇮🇹' },
  { code: 'kk', label: 'Қазақша', nativeName: 'Қазақша', badge: 'KK', flag: '🇰🇿' },
  { code: 'pt-br', label: 'Português (BR)', nativeName: 'Português', badge: 'PT', flag: '🇧🇷' },
  { code: 'tr', label: 'Türkçe', nativeName: 'Türkçe', badge: 'TR', flag: '🇹🇷' },
  { code: 'zh-cn', label: '简体中文', nativeName: '简体中文', badge: 'ZH', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', nativeName: '日本語', badge: 'JA', flag: '🇯🇵' },
];
