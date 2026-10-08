const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Upstream sources
const PRIMARY_BASE = 'https://wttr.in';
const FALLBACK_BASE = 'https://wttr.is';

// Simple in-memory server cache (3 min TTL) to minimize upstream latency
const cache = new Map();
const CACHE_TTL_MS = 3 * 60 * 1000;

function getCached(key) {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL_MS) {
    return item.data;
  }
  return null;
}

function setCached(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
  if (cache.size > 300) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

// Fetch with fallback across mirrors
async function fetchUpstream(endpoint, responseType = 'json') {
  const mirrors = [PRIMARY_BASE, FALLBACK_BASE];
  let lastError = null;

  for (const base of mirrors) {
    try {
      const url = `${base}${endpoint}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'curl/7.68.0',
          Accept: responseType === 'json' ? 'application/json' : responseType === 'image' ? 'image/png' : '*/*',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        if (responseType === 'json') {
          try {
            return await res.json();
          } catch (jsonErr) {
            lastError = new Error(`Invalid JSON from ${base}: ${jsonErr.message}`);
            continue;
          }
        }
        if (responseType === 'image') {
          const arrayBuffer = await res.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
        return await res.text();
      }
      lastError = new Error(`Mirror ${base} responded with ${res.status}`);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All upstream mirrors failed');
}

// Open-Meteo fallback on server side
async function fetchOpenMeteoFallbackOnServer(city, lang = 'ru') {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=${lang}&format=json`;
  const geoRes = await fetch(geoUrl, {
    headers: { 'User-Agent': 'wttr-hub-proxy/1.0' },
    signal: AbortSignal.timeout(5000),
  });
  if (!geoRes.ok) throw new Error(`Geocoding failed with status ${geoRes.status}`);
  const geoData = await geoRes.json();
  if (!geoData.results || geoData.results.length === 0) {
    throw new Error(`Location not found: ${city}`);
  }
  const geo = geoData.results[0];

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,uv_index&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,pressure_msl,wind_speed_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&wind_speed_unit=kmh&timeformat=iso8601&timezone=auto&forecast_days=3`;
  const wRes = await fetch(weatherUrl, {
    headers: { 'User-Agent': 'wttr-hub-proxy/1.0' },
    signal: AbortSignal.timeout(6000),
  });
  if (!wRes.ok) throw new Error(`Open-Meteo forecast failed with status ${wRes.status}`);
  const raw = await wRes.json();

  return transformOpenMeteo(raw, geo, lang);
}

function mapWmo(code, lang) {
  const map = {
    0: lang === 'ru' ? 'Ясно' : 'Sunny',
    1: lang === 'ru' ? 'Преимущественно ясно' : 'Mainly clear',
    2: lang === 'ru' ? 'Переменная облачность' : 'Partly cloudy',
    3: lang === 'ru' ? 'Пасмурно' : 'Overcast',
    45: lang === 'ru' ? 'Туман' : 'Fog',
    48: lang === 'ru' ? 'Туман' : 'Fog',
    51: lang === 'ru' ? 'Морось' : 'Drizzle',
    61: lang === 'ru' ? 'Небольшой дождь' : 'Light rain',
    63: lang === 'ru' ? 'Умеренный дождь' : 'Moderate rain',
    65: lang === 'ru' ? 'Сильный дождь' : 'Heavy rain',
    71: lang === 'ru' ? 'Небольшой снег' : 'Light snow',
    73: lang === 'ru' ? 'Умеренный снег' : 'Moderate snow',
    75: lang === 'ru' ? 'Сильный снегопад' : 'Heavy snow',
    80: lang === 'ru' ? 'Кратковременный дождь' : 'Light shower rain',
    81: lang === 'ru' ? 'Ливень' : 'Heavy rain shower',
    95: lang === 'ru' ? 'Гроза' : 'Thunderstorm',
  };
  return { code: '116', desc: map[code] || (lang === 'ru' ? 'Облачно' : 'Cloudy') };
}

function transformOpenMeteo(raw, geo, lang) {
  const cur = raw.current || {};
  const daily = raw.daily || {};
  const cond = mapWmo(cur.weather_code ?? 0, lang);
  const tempC = Math.round(cur.temperature_2m ?? 10);
  const feelsC = Math.round(cur.apparent_temperature ?? tempC);

  const weatherDays = [];
  const dayCount = Math.min(daily.time?.length ?? 0, 3);
  for (let i = 0; i < dayCount; i++) {
    const maxC = Math.round(daily.temperature_2m_max?.[i] ?? tempC);
    const minC = Math.round(daily.temperature_2m_min?.[i] ?? tempC - 4);
    weatherDays.push({
      date: daily.time[i],
      maxtempC: String(maxC),
      maxtempF: String(Math.round((maxC * 9) / 5 + 32)),
      mintempC: String(minC),
      mintempF: String(Math.round((minC * 9) / 5 + 32)),
      avgtempC: String(Math.round((maxC + minC) / 2)),
      avgtempF: String(Math.round((((maxC + minC) / 2) * 9) / 5 + 32)),
      sunHour: '8.0',
      totalSnow_cm: '0.0',
      uvIndex: String(Math.round(daily.uv_index_max?.[i] ?? 1)),
      astronomy: [
        {
          sunrise: daily.sunrise?.[i]?.split('T')?.[1] || '06:00',
          sunset: daily.sunset?.[i]?.split('T')?.[1] || '19:00',
          moon_phase: 'Waxing Gibbous',
          moon_illumination: '75',
          moonrise: '08:00 PM',
          moonset: '06:00 AM',
        },
      ],
      hourly: [0, 3, 6, 9, 12, 15, 18, 21].map((h) => ({
        time: String(h * 100),
        tempC: String(tempC),
        tempF: String(Math.round((tempC * 9) / 5 + 32)),
        FeelsLikeC: String(feelsC),
        FeelsLikeF: String(Math.round((feelsC * 9) / 5 + 32)),
        weatherCode: cond.code,
        weatherDesc: [{ value: cond.desc }],
        lang_ru: [{ value: cond.desc }],
        windspeedKmph: String(Math.round(cur.wind_speed_10m ?? 10)),
        windspeedMiles: String(Math.round((cur.wind_speed_10m ?? 10) * 0.62)),
        winddir16Point: 'N',
        winddirDegree: '0',
        humidity: String(Math.round(cur.relative_humidity_2m ?? 60)),
        pressure: String(Math.round(cur.surface_pressure ?? 1013)),
        pressureInches: '30',
        cloudcover: String(Math.round(cur.cloud_cover ?? 50)),
        precipMM: '0.0',
        precipInches: '0.0',
        chanceofrain: '0',
        uvIndex: '1',
        visibility: '10',
        visibilityMiles: '6',
      })),
    });
  }

  return {
    current_condition: [
      {
        temp_C: String(tempC),
        temp_F: String(Math.round((tempC * 9) / 5 + 32)),
        FeelsLikeC: String(feelsC),
        FeelsLikeF: String(Math.round((feelsC * 9) / 5 + 32)),
        humidity: String(Math.round(cur.relative_humidity_2m ?? 60)),
        pressure: String(Math.round(cur.surface_pressure ?? 1013)),
        pressureInches: '30',
        visibility: '10',
        visibilityMiles: '6',
        windspeedKmph: String(Math.round(cur.wind_speed_10m ?? 10)),
        windspeedMiles: String(Math.round((cur.wind_speed_10m ?? 10) * 0.62)),
        winddir16Point: 'N',
        winddirDegree: '0',
        weatherCode: cond.code,
        weatherDesc: [{ value: cond.desc }],
        lang_ru: [{ value: cond.desc }],
        weatherIconUrl: [{ value: '' }],
        uvIndex: '1',
        cloudcover: String(Math.round(cur.cloud_cover ?? 50)),
        precipMM: '0.0',
        precipInches: '0.0',
        observation_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      },
    ],
    nearest_area: [
      {
        areaName: [{ value: geo.name }],
        country: [{ value: geo.country || 'Unknown' }],
        region: [{ value: geo.admin1 || geo.name }],
        latitude: String(geo.latitude),
        longitude: String(geo.longitude),
      },
    ],
    weather: weatherDays,
  };
}

// 1. Weather JSON Proxy Endpoint
app.get('/api/weather', async (req, res) => {
  const city = (req.query.city || 'Obninsk').trim();
  const lang = (req.query.lang || 'ru').trim();
  const cacheKey = `weather_${city.toLowerCase()}_${lang}`;

  const cached = getCached(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('Cache-Control', 'public, max-age=180');
    return res.json(cached);
  }

  try {
    const data = await fetchUpstream(`/${encodeURIComponent(city)}?format=j1&lang=${lang}`, 'json');
    setCached(cacheKey, data);
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', 'public, max-age=180');
    return res.json(data);
  } catch (err) {
    console.warn(`[Proxy] wttr.in/is failed for ${city}, trying Open-Meteo fallback on server:`, err.message);
    try {
      const data = await fetchOpenMeteoFallbackOnServer(city, lang);
      setCached(cacheKey, data);
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Source', 'Open-Meteo');
      res.setHeader('Cache-Control', 'public, max-age=180');
      return res.json(data);
    } catch (fbErr) {
      console.error(`[Proxy] All upstreams failed for ${city}:`, fbErr.message);
      return res.status(502).json({
        error: 'upstream_failed',
        message: `Failed to fetch weather: ${fbErr.message}`,
      });
    }
  }
});

// 2. Terminal Text Output Endpoint
app.get('/api/terminal', async (req, res) => {
  const city = (req.query.city || 'Obninsk').trim();
  const lang = (req.query.lang || 'ru').trim();
  const cacheKey = `terminal_${city.toLowerCase()}_${lang}`;

  const cached = getCached(cacheKey);
  if (cached) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(cached);
  }

  try {
    const text = await fetchUpstream(`/${encodeURIComponent(city)}?T&lang=${lang}`, 'text');
    setCached(cacheKey, text);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=180');
    return res.send(text);
  } catch (err) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(502).send(`wttr.in terminal output unavailable: ${err.message}`);
  }
});

// 3. Web HTML Report Endpoint
app.get('/api/web', async (req, res) => {
  const city = (req.query.city || 'Obninsk').trim();
  const lang = (req.query.lang || 'ru').trim();
  const cacheKey = `web_${city.toLowerCase()}_${lang}`;

  const cached = getCached(cacheKey);
  if (cached) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(cached);
  }

  try {
    const html = await fetchUpstream(`/${encodeURIComponent(city)}?lang=${lang}`, 'text');
    setCached(cacheKey, html);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=180');
    return res.send(html);
  } catch (err) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(502).send(`<p>wttr.in HTML report unavailable: ${err.message}</p>`);
  }
});

// 4. PNG Image Endpoint
app.get('/api/png', async (req, res) => {
  const city = (req.query.city || 'Obninsk').trim();
  const opts = (req.query.opts || '').trim();
  const cacheKey = `png_${city.toLowerCase()}_${opts}`;

  const cached = getCached(cacheKey);
  if (cached) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.send(cached);
  }

  try {
    const buffer = await fetchUpstream(`/${encodeURIComponent(city)}${opts}.png`, 'image');
    setCached(cacheKey, buffer);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.send(buffer);
  } catch (err) {
    return res.status(502).send('PNG generation failed');
  }
});

// 5. Healthcheck Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// 6. Static Assets (Angular SPA)
const staticDir = path.join(__dirname, 'dist', 'wttr', 'browser');
app.use(express.static(staticDir, { maxAge: '1d', etag: true }));

// 7. SPA Fallback routing (always serve index.html for Angular HTML5 pushState routes)
app.use((req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`wttr.hub server listening on port ${PORT}`);
});
