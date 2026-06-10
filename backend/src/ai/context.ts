import { query, queryOne } from '../db/client';
import { User, Farm, Plot, Crop, AlertItem } from '../types';

interface WeatherData {
  temp_c: number;
  description: string;
  humidity: number;
  wind_kmh: number;
  forecast: Array<{ date: string; min_c: number; max_c: number; description: string }>;
}

interface FarmContext {
  farmer: { name: string; location: string; farmingType: string };
  farms: Array<{
    name: string;
    region: string | null;
    totalArea: string;
    plots: Array<{
      name: string;
      area: string;
      sunExposure: string | null;
      irrigation: string | null;
      currentCrops: Array<{
        crop: string;
        variety: string | null;
        plantingDate: string | null;
        daysSincePlanting: number | null;
        expectedHarvest: string | null;
        daysToHarvest: number | null;
        status: string;
        goal: string;
      }>;
    }>;
  }>;
  weather: WeatherData | null;
  pendingAlerts: Array<{ title: string; body: string | null; type: string; dueAt: string }>;
  sensorData: null; // v1: always null; v2 will populate this
}

export async function buildFarmContext(userId: string, farmId?: string): Promise<FarmContext> {
  const user = await queryOne<User>(
    'SELECT name, role FROM users WHERE id = $1',
    [userId]
  );

  const farms = await query<Farm & { plots?: Plot[] }>(
    `SELECT * FROM farms WHERE user_id = $1 AND is_active = TRUE ORDER BY created_at`,
    [userId]
  );

  const farmData = await Promise.all(
    farms.map(async (farm) => {
      const plots = await query<Plot>(
        'SELECT * FROM plots WHERE farm_id = $1 AND is_active = TRUE ORDER BY created_at',
        [farm.id]
      );

      const plotData = await Promise.all(
        plots.map(async (plot) => {
          const crops = await query<Crop>(
            `SELECT * FROM crops WHERE plot_id = $1 AND status = 'active' ORDER BY planting_date DESC`,
            [plot.id]
          );

          const now = new Date();
          return {
            name: plot.name,
            area: plot.area ? `${plot.area} ${plot.area_unit}` : 'unknown size',
            sunExposure: plot.sun_exposure,
            irrigation: plot.irrigation_method,
            currentCrops: crops.map((crop) => {
              const plantDate = crop.planting_date ? new Date(crop.planting_date) : null;
              const harvestDate = crop.expected_harvest_date ? new Date(crop.expected_harvest_date) : null;
              return {
                crop: crop.crop_type,
                variety: crop.variety,
                plantingDate: plantDate?.toISOString().split('T')[0] ?? null,
                daysSincePlanting: plantDate
                  ? Math.floor((now.getTime() - plantDate.getTime()) / 86400000)
                  : null,
                expectedHarvest: harvestDate?.toISOString().split('T')[0] ?? null,
                daysToHarvest: harvestDate
                  ? Math.floor((harvestDate.getTime() - now.getTime()) / 86400000)
                  : null,
                status: crop.status,
                goal: crop.goal,
              };
            }),
          };
        })
      );

      return {
        name: farm.name,
        region: farm.region,
        totalArea: farm.total_area ? `${farm.total_area} ${farm.area_unit}` : 'unknown',
        plots: plotData,
      };
    })
  );

  const pendingAlerts = await query<{ title: string; body: string | null; type: string; due_at: Date }>(
    `SELECT title, body, type, due_at FROM alerts
     WHERE user_id = $1 AND status = 'pending' AND due_at <= NOW() + INTERVAL '24 hours'
     ORDER BY due_at`,
    [userId]
  );

  const primaryFarm = farms[0];
  const weather = primaryFarm?.latitude && primaryFarm?.longitude
    ? await fetchWeather(primaryFarm.latitude, primaryFarm.longitude)
    : null;

  return {
    farmer: {
      name: user?.name ?? 'Farmer',
      location: primaryFarm?.region ?? 'Sri Lanka',
      farmingType: primaryFarm?.farming_type ?? 'home_garden',
    },
    farms: farmData,
    weather,
    pendingAlerts: pendingAlerts.map((a) => ({
      title: a.title,
      body: a.body,
      type: a.type,
      dueAt: new Date(a.due_at).toISOString(),
    })),
    sensorData: null,
  };
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  if (!apiKey) return null;

  try {
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&cnt=7`),
    ]);

    const current = await currentRes.json() as {
      main: { temp: number; humidity: number };
      weather: Array<{ description: string }>;
      wind: { speed: number };
    };
    const forecast = await forecastRes.json() as {
      list: Array<{
        dt_txt: string;
        main: { temp_min: number; temp_max: number };
        weather: Array<{ description: string }>;
      }>;
    };

    return {
      temp_c: Math.round(current.main.temp),
      description: current.weather[0]?.description ?? '',
      humidity: current.main.humidity,
      wind_kmh: Math.round(current.wind.speed * 3.6),
      forecast: forecast.list.slice(0, 7).map((d) => ({
        date: d.dt_txt.split(' ')[0],
        min_c: Math.round(d.main.temp_min),
        max_c: Math.round(d.main.temp_max),
        description: d.weather[0]?.description ?? '',
      })),
    };
  } catch {
    return null;
  }
}

export function buildSystemPrompt(context: FarmContext): string {
  const farmsText = context.farms.map((farm) => {
    const plotsText = farm.plots.map((plot) => {
      const cropsText = plot.currentCrops.length > 0
        ? plot.currentCrops.map((c) => {
            const cropLine = `${c.crop}${c.variety ? ` (${c.variety})` : ''}`;
            const daysLine = c.daysSincePlanting != null ? `${c.daysSincePlanting} days since planting` : '';
            const harvestLine = c.daysToHarvest != null
              ? c.daysToHarvest > 0 ? `${c.daysToHarvest} days to harvest` : 'HARVEST READY'
              : '';
            return `    • ${cropLine} | ${daysLine} | ${harvestLine} | Goal: ${c.goal}`.replace(/\|\s*\|/g, '|').replace(/\s+\|$/, '');
          }).join('\n')
        : '    (no active crops)';

      return `  Plot: ${plot.name} | ${plot.area}${plot.sunExposure ? ` | ${plot.sunExposure}` : ''}${plot.irrigation ? ` | irrigation: ${plot.irrigation}` : ''}\nCrops:\n${cropsText}`;
    }).join('\n');

    return `Farm: ${farm.name}${farm.region ? ` (${farm.region})` : ''} | Total area: ${farm.totalArea}\n${plotsText}`;
  }).join('\n\n');

  const weatherText = context.weather
    ? `Current: ${context.weather.temp_c}°C, ${context.weather.description}, Humidity: ${context.weather.humidity}%, Wind: ${context.weather.wind_kmh} km/h
7-day forecast: ${context.weather.forecast.map((d) => `${d.date}: ${d.min_c}-${d.max_c}°C, ${d.description}`).join(' | ')}`
    : 'Weather data unavailable';

  const alertsText = context.pendingAlerts.length > 0
    ? context.pendingAlerts.map((a) => `• [${a.type.toUpperCase()}] ${a.title}: ${a.body ?? ''}`).join('\n')
    : 'No pending alerts';

  return `You are Bhoomi, an expert AI agricultural advisor for Sri Lankan farmers. You are knowledgeable in agronomy, plant pathology, soil science, and agricultural economics with deep expertise in Sri Lankan farming conditions, crops, seasons (Maha/Yala), and markets.

## Farmer Profile
Name: ${context.farmer.name}
Location: ${context.farmer.location}, Sri Lanka
Farming type: ${context.farmer.farmingType}

## Farm Data (live)
${farmsText}

## Weather — ${context.farmer.location}
${weatherText}

## Pending Alerts
${alertsText}

## IoT Sensor Data
Not yet connected (v2 feature)

## Instructions
- Address the farmer by name when appropriate
- Always consider current growth stages and weather when giving advice
- Use local Sri Lankan crop names, seasons (Maha: Oct-Mar, Yala: Apr-Sep), and market context
- When a photo is attached, diagnose visually before responding to text
- When a PDF soil report is attached, extract NPK and pH values and interpret against the current crop's needs
- Adjust language complexity to match the farmer's — plain language for simple questions, technical depth for technical questions
- For disease/pest diagnosis, always give: identification, severity, immediate action, treatment plan, prevention
- For market questions, provide LKR/kg price trends and whether now is a good time to plant/sell
- Keep responses concise on mobile (assume mobile unless asked for detailed report)
- Never recommend products unavailable in Sri Lanka`;
}
