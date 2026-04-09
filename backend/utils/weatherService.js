const axios = require("axios");

// ── Mock weather (last resort when APIs fail) ───────────────────────────────

const MOCK_WEATHER = {
  chandigarh:  { temperature: 38, condition: "heatwave", humidity: 35, description: "Clear sky, extreme heat", windSpeed: 12 },
  delhi:       { temperature: 41, condition: "heatwave", humidity: 28, description: "Scorching heat, dry winds", windSpeed: 15 },
  mumbai:      { temperature: 33, condition: "humid",    humidity: 82, description: "Partly cloudy, humid", windSpeed: 18 },
  pune:        { temperature: 34, condition: "warm",     humidity: 55, description: "Warm and pleasant", windSpeed: 10 },
  jaipur:      { temperature: 42, condition: "heatwave", humidity: 20, description: "Desert heat, very dry", windSpeed: 14 },
  bangalore:   { temperature: 28, condition: "pleasant", humidity: 65, description: "Mild and pleasant", windSpeed: 8 },
  kolkata:     { temperature: 35, condition: "humid",    humidity: 78, description: "Hot and humid", windSpeed: 11 },
  hyderabad:   { temperature: 36, condition: "warm",     humidity: 50, description: "Warm with scattered clouds", windSpeed: 9 },
  lucknow:     { temperature: 39, condition: "heatwave", humidity: 32, description: "Hot and dry", windSpeed: 13 },
  chennai:     { temperature: 34, condition: "humid",    humidity: 75, description: "Hot and humid", windSpeed: 16 },
  ahmedabad:   { temperature: 40, condition: "heatwave", humidity: 25, description: "Extreme heat", windSpeed: 11 },
  patna:       { temperature: 37, condition: "warm",     humidity: 55, description: "Warm with haze", windSpeed: 7 },
  bhopal:      { temperature: 38, condition: "heatwave", humidity: 30, description: "Hot and dry", windSpeed: 10 },
  indore:      { temperature: 37, condition: "warm",     humidity: 35, description: "Warm, clear sky", windSpeed: 9 },
  amritsar:    { temperature: 39, condition: "heatwave", humidity: 30, description: "Dry heat", windSpeed: 14 },
  rajpura:     { temperature: 38, condition: "heatwave", humidity: 33, description: "Hot and dry winds", windSpeed: 13 },
  pinjore:     { temperature: 36, condition: "warm",     humidity: 40, description: "Warm, foothill breeze", windSpeed: 8 },
};

const SEASON_OVERRIDE = {
  Jun: "rainy", Jul: "rainy", Aug: "rainy", Sep: "rainy",
  Dec: "cold", Jan: "cold", Feb: "cold",
  Mar: "warm", Apr: "heatwave", May: "heatwave",
  Oct: "pleasant", Nov: "pleasant",
};

/**
 * Prefer actual temperature/humidity; month is only a soft hint.
 */
function classifyCondition(temp, humidity, month) {
  const seasonHint = SEASON_OVERRIDE[month];

  if (humidity > 80) return "rainy";
  if (temp >= 40) return "heatwave";
  if (temp >= 35) return "warm";
  if (temp <= 15) return "cold";
  if (temp <= 22 && (seasonHint === "cold" || month === "Dec" || month === "Jan" || month === "Feb")) {
    return "cold";
  }
  if (temp < 30) return "pleasant";
  if (temp < 35) {
    return seasonHint === "heatwave" || seasonHint === "warm" ? "warm" : "pleasant";
  }

  if (seasonHint === "rainy") return "rainy";
  return seasonHint || "pleasant";
}

function wmoDescription(code) {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  if (code <= 99) return "Thunderstorm";
  return "Variable";
}

async function fetchOpenMeteo(location) {
  const city = (location || "Chandigarh").trim();
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&countryCode=IN`;
  const { data: geo } = await axios.get(geoUrl, { timeout: 8000 });
  if (!geo.results?.length) return null;

  const { latitude, longitude, name } = geo.results[0];
  const fcUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m` +
    `&timezone=Asia%2FKolkata`;

  const { data: fc } = await axios.get(fcUrl, { timeout: 8000 });
  const cur = fc.current;
  if (!cur) return null;

  const temp = Math.round(cur.temperature_2m);
  const humidity = cur.relative_humidity_2m;
  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "short" });

  return {
    temperature: temp,
    condition: classifyCondition(temp, humidity, month),
    humidity,
    description: wmoDescription(cur.weather_code),
    windSpeed: Math.round(cur.wind_speed_10m || 0),
    feelsLike: temp,
    source: "open_meteo",
    city: name || city,
    fetchedAt: now.toISOString(),
  };
}

async function fetchOpenWeather(city, apiKey, month, now) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},IN&units=metric&appid=${apiKey}`;
  const { data } = await axios.get(url, { timeout: 8000 });

  const temp = Math.round(data.main.temp);
  const humidity = data.main.humidity;
  const condition = classifyCondition(temp, humidity, month);

  return {
    temperature: temp,
    condition,
    humidity,
    description: data.weather?.[0]?.description || "N/A",
    windSpeed: Math.round(data.wind?.speed || 0),
    feelsLike: Math.round(data.main?.feels_like || temp),
    source: "openweather_api",
    city: data.name || city,
    fetchedAt: now.toISOString(),
  };
}

/**
 * 1) OpenWeather when OPENWEATHER_API_KEY is set (primary)
 * 2) Open-Meteo if OpenWeather fails or key missing
 * 3) Static mock
 */
async function fetchWeather(location) {
  const city = (location || "chandigarh").trim();
  const apiKey = (process.env.OPENWEATHER_API_KEY || "").trim();
  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "short" });

  if (apiKey) {
    try {
      return await fetchOpenWeather(city, apiKey, month, now);
    } catch (err) {
      const status = err.response?.status;
      const apiMsg = err.response?.data?.message;
      const hint =
        status === 401 || status === 403
          ? `OpenWeather auth failed${apiMsg ? `: ${apiMsg}` : ""} — check https://home.openweathermap.org/api_keys (new keys can take up to ~2h to activate)`
          : err.message;
      console.warn(`[WeatherService] OpenWeather failed for "${city}" (${hint})`);
    }
  }

  try {
    const om = await fetchOpenMeteo(city);
    if (om) {
      if (apiKey) {
        console.log(`[WeatherService] Using Open-Meteo for "${city}" (OpenWeather unavailable)`);
      }
      return om;
    }
  } catch (err) {
    console.warn(`[WeatherService] Open-Meteo failed for "${city}": ${err.message}`);
  }

  const key = city.toLowerCase().replace(/[^a-z]/g, "");
  const mock = MOCK_WEATHER[key] || generateSeasonalMock(month);

  return {
    ...mock,
    condition: classifyCondition(mock.temperature, mock.humidity, month),
    source: "mock_fallback",
    city,
    fetchedAt: now.toISOString(),
  };
}

function generateSeasonalMock(month) {
  const season = SEASON_OVERRIDE[month] || "pleasant";
  const bases = {
    heatwave:  { temperature: 40, humidity: 30, description: "Hot and dry", windSpeed: 12 },
    warm:      { temperature: 34, humidity: 45, description: "Warm and clear", windSpeed: 9 },
    rainy:     { temperature: 28, humidity: 85, description: "Monsoon rains likely", windSpeed: 20 },
    cold:      { temperature: 14, humidity: 60, description: "Chilly morning fog", windSpeed: 6 },
    pleasant:  { temperature: 26, humidity: 55, description: "Mild and pleasant", windSpeed: 8 },
    humid:     { temperature: 32, humidity: 78, description: "Hot and humid", windSpeed: 14 },
  };
  return bases[season] || bases.pleasant;
}

module.exports = { fetchWeather };
