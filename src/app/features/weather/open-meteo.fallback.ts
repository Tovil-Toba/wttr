import { WttrResponse } from './weather.model';

export interface OpenMeteoGeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

export function mapWmoToWttr(wmoCode: number, lang = 'ru'): { code: string; desc: string } {
  switch (wmoCode) {
    case 0:
      return { code: '113', desc: lang === 'ru' ? 'Ясно' : 'Sunny' };
    case 1:
      return { code: '116', desc: lang === 'ru' ? 'Преимущественно ясно' : 'Mainly clear' };
    case 2:
      return { code: '116', desc: lang === 'ru' ? 'Переменная облачность' : 'Partly cloudy' };
    case 3:
      return { code: '119', desc: lang === 'ru' ? 'Пасмурно' : 'Overcast' };
    case 45:
    case 48:
      return { code: '248', desc: lang === 'ru' ? 'Туман' : 'Fog' };
    case 51:
    case 53:
    case 55:
      return { code: '266', desc: lang === 'ru' ? 'Морось' : 'Drizzle' };
    case 56:
    case 57:
      return { code: '311', desc: lang === 'ru' ? 'Ледяная морось' : 'Freezing drizzle' };
    case 61:
      return { code: '296', desc: lang === 'ru' ? 'Небольшой дождь' : 'Light rain' };
    case 63:
      return { code: '302', desc: lang === 'ru' ? 'Умеренный дождь' : 'Moderate rain' };
    case 65:
      return { code: '308', desc: lang === 'ru' ? 'Сильный дождь' : 'Heavy rain' };
    case 66:
    case 67:
      return { code: '314', desc: lang === 'ru' ? 'Ледяной дождь' : 'Freezing rain' };
    case 71:
      return { code: '326', desc: lang === 'ru' ? 'Небольшой снег' : 'Light snow' };
    case 73:
      return { code: '332', desc: lang === 'ru' ? 'Умеренный снег' : 'Moderate snow' };
    case 75:
      return { code: '338', desc: lang === 'ru' ? 'Сильный снегопад' : 'Heavy snow' };
    case 77:
      return { code: '323', desc: lang === 'ru' ? 'Снежные зерна' : 'Snow grains' };
    case 80:
      return { code: '353', desc: lang === 'ru' ? 'Кратковременный дождь' : 'Light shower rain' };
    case 81:
    case 82:
      return { code: '356', desc: lang === 'ru' ? 'Ливень' : 'Heavy rain shower' };
    case 85:
    case 86:
      return { code: '368', desc: lang === 'ru' ? 'Снегопад' : 'Snow shower' };
    case 95:
      return { code: '386', desc: lang === 'ru' ? 'Гроза' : 'Thunderstorm' };
    case 96:
    case 99:
      return { code: '389', desc: lang === 'ru' ? 'Гроза с градом' : 'Thunderstorm with hail' };
    default:
      return { code: '116', desc: lang === 'ru' ? 'Облачно' : 'Cloudy' };
  }
}

export function degreesToCompass(deg: number): string {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
  ];
  const idx = Math.round(deg / 22.5) % 16;
  return directions[idx] || 'N';
}

export function cToF(c: number): string {
  return String(Math.round((c * 9) / 5 + 32));
}

export function formatIsoToTime(isoStr: string): string {
  if (!isoStr) return '06:00 AM';
  const parts = isoStr.split('T');
  if (parts.length < 2) return '06:00 AM';
  const [hh, mm] = parts[1].split(':');
  const hNum = parseInt(hh, 10);
  const ampm = hNum >= 12 ? 'PM' : 'AM';
  const h12 = hNum % 12 || 12;
  const padH = h12 < 10 ? `0${h12}` : `${h12}`;
  return `${padH}:${mm} ${ampm}`;
}

export function getMoonPhaseName(date: Date): { phase: string; illumination: string } {
  const knownNewMoon = new Date('2000-01-06T18:14:00Z').getTime();
  const cycle = 29.53058867 * 24 * 60 * 60 * 1000;
  const diff = (date.getTime() - knownNewMoon) % cycle;
  const phaseFrac = (diff < 0 ? diff + cycle : diff) / cycle;

  let phase = 'New Moon';
  if (phaseFrac < 0.03 || phaseFrac > 0.97) phase = 'New Moon';
  else if (phaseFrac < 0.22) phase = 'Waxing Crescent';
  else if (phaseFrac < 0.28) phase = 'First Quarter';
  else if (phaseFrac < 0.47) phase = 'Waxing Gibbous';
  else if (phaseFrac < 0.53) phase = 'Full Moon';
  else if (phaseFrac < 0.72) phase = 'Waning Gibbous';
  else if (phaseFrac < 0.78) phase = 'Last Quarter';
  else phase = 'Waning Crescent';

  const illumination = Math.round(0.5 * (1 - Math.cos(2 * Math.PI * phaseFrac)) * 100);
  return { phase, illumination: String(illumination) };
}

export function transformOpenMeteoToWttr(
  raw: any,
  geo: OpenMeteoGeoResult,
  lang = 'ru',
): WttrResponse {
  const current = raw.current || {};
  const daily = raw.daily || {};
  const hourly = raw.hourly || {};

  const currentCondition = mapWmoToWttr(current.weather_code ?? 0, lang);
  const curTempC = Math.round(current.temperature_2m ?? 10);
  const curApparentC = Math.round(current.apparent_temperature ?? curTempC);

  const transformed: WttrResponse = {
    current_condition: [
      {
        temp_C: String(curTempC),
        temp_F: cToF(curTempC),
        FeelsLikeC: String(curApparentC),
        FeelsLikeF: cToF(curApparentC),
        humidity: String(Math.round(current.relative_humidity_2m ?? 60)),
        pressure: String(Math.round(current.surface_pressure ?? 1013)),
        pressureInches: String(Math.round((current.surface_pressure ?? 1013) * 0.02953)),
        visibility: '10',
        visibilityMiles: '6',
        windspeedKmph: String(Math.round(current.wind_speed_10m ?? 10)),
        windspeedMiles: String(Math.round((current.wind_speed_10m ?? 10) * 0.621371)),
        winddir16Point: degreesToCompass(current.wind_direction_10m ?? 0),
        winddirDegree: String(Math.round(current.wind_direction_10m ?? 0)),
        weatherCode: currentCondition.code,
        weatherDesc: [{ value: currentCondition.desc }],
        lang_ru: [{ value: mapWmoToWttr(current.weather_code ?? 0, 'ru').desc }],
        weatherIconUrl: [{ value: '' }],
        uvIndex: String(Math.round(daily.uv_index_max?.[0] ?? 1)),
        cloudcover: String(Math.round(current.cloud_cover ?? 50)),
        precipMM: String(current.precipitation ?? 0.0),
        precipInches: String(((current.precipitation ?? 0.0) * 0.03937).toFixed(2)),
        observation_time: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ],
    nearest_area: [
      {
        areaName: [{ value: geo.name }],
        country: [{ value: geo.country || 'Russia' }],
        region: [{ value: geo.admin1 || geo.name }],
        latitude: String(geo.latitude),
        longitude: String(geo.longitude),
      },
    ],
    weather: [],
  };

  const dayCount = Math.min(daily.time?.length ?? 0, 3);
  for (let i = 0; i < dayCount; i++) {
    const dayDate = daily.time[i];
    const maxC = Math.round(daily.temperature_2m_max?.[i] ?? curTempC);
    const minC = Math.round(daily.temperature_2m_min?.[i] ?? curTempC - 5);
    const avgC = Math.round((maxC + minC) / 2);

    const sunrise = formatIsoToTime(daily.sunrise?.[i]);
    const sunset = formatIsoToTime(daily.sunset?.[i]);
    const moon = getMoonPhaseName(new Date(dayDate));

    const hourlyList = [];
    const hourlyTimes = [0, 3, 6, 9, 12, 15, 18, 21];

    for (const h of hourlyTimes) {
      const hIdx = i * 24 + h;
      const hTempC = Math.round(hourly.temperature_2m?.[hIdx] ?? avgC);
      const hApparentC = Math.round(hourly.apparent_temperature?.[hIdx] ?? hTempC);
      const hCode = hourly.weather_code?.[hIdx] ?? 0;
      const hCond = mapWmoToWttr(hCode, lang);

      hourlyList.push({
        time: String(h * 100),
        tempC: String(hTempC),
        tempF: cToF(hTempC),
        FeelsLikeC: String(hApparentC),
        FeelsLikeF: cToF(hApparentC),
        weatherCode: hCond.code,
        weatherDesc: [{ value: hCond.desc }],
        lang_ru: [{ value: mapWmoToWttr(hCode, 'ru').desc }],
        weatherIconUrl: [{ value: '' }],
        windspeedKmph: String(Math.round(hourly.wind_speed_10m?.[hIdx] ?? 10)),
        windspeedMiles: String(Math.round((hourly.wind_speed_10m?.[hIdx] ?? 10) * 0.621371)),
        winddir16Point: degreesToCompass(hourly.wind_direction_10m?.[hIdx] ?? 0),
        winddirDegree: String(Math.round(hourly.wind_direction_10m?.[hIdx] ?? 0)),
        humidity: String(Math.round(hourly.relative_humidity_2m?.[hIdx] ?? 60)),
        pressure: String(Math.round(hourly.surface_pressure?.[hIdx] ?? 1013)),
        pressureInches: String(Math.round((hourly.surface_pressure?.[hIdx] ?? 1013) * 0.02953)),
        cloudcover: String(Math.round(hourly.cloud_cover?.[hIdx] ?? 50)),
        precipMM: String(hourly.precipitation?.[hIdx] ?? 0.0),
        precipInches: String(((hourly.precipitation?.[hIdx] ?? 0.0) * 0.03937).toFixed(2)),
        chanceofrain: String(Math.round(hourly.precipitation_probability?.[hIdx] ?? 0)),
        uvIndex: String(Math.round(daily.uv_index_max?.[i] ?? 1)),
        visibility: '10',
        visibilityMiles: '6',
        HeatIndexC: String(hTempC),
        HeatIndexF: cToF(hTempC),
        DewPointC: String(hTempC - 2),
        DewPointF: cToF(hTempC - 2),
        WindChillC: String(hApparentC),
        WindChillF: cToF(hApparentC),
        WindGustKmph: String(Math.round((hourly.wind_speed_10m?.[hIdx] ?? 10) * 1.3)),
        WindGustMiles: String(Math.round((hourly.wind_speed_10m?.[hIdx] ?? 10) * 0.621371 * 1.3)),
        chanceoffog: '0',
        chanceoffrost: '0',
        chanceofhightemp: '0',
        chanceofovercast: String(Math.round(hourly.cloud_cover?.[hIdx] ?? 50)),
        chanceofremdry: '80',
        chanceofsnow: '0',
        chanceofsunshine: '80',
        chanceofthunder: '0',
        chanceofwindy: '10',
      });
    }

    transformed.weather.push({
      date: dayDate,
      maxtempC: String(maxC),
      maxtempF: cToF(maxC),
      mintempC: String(minC),
      mintempF: cToF(minC),
      avgtempC: String(avgC),
      avgtempF: cToF(avgC),
      sunHour: '8.0',
      totalSnow_cm: '0.0',
      uvIndex: String(Math.round(daily.uv_index_max?.[i] ?? 1)),
      astronomy: [
        {
          sunrise,
          sunset,
          moon_phase: moon.phase,
          moon_illumination: moon.illumination,
          moonrise: '08:00 PM',
          moonset: '06:00 AM',
        },
      ],
      hourly: hourlyList,
    });
  }

  return transformed;
}
