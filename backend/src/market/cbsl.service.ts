import { query, queryOne } from '../db/client';
import { MarketPrice } from '../types';

export async function getLatestPrices(commodities?: string[]): Promise<MarketPrice[]> {
  if (commodities && commodities.length > 0) {
    const placeholders = commodities.map((_, i) => `$${i + 1}`).join(', ');
    return query<MarketPrice>(
      `SELECT DISTINCT ON (commodity) *
       FROM market_prices
       WHERE commodity = ANY(ARRAY[${placeholders}])
       ORDER BY commodity, price_date DESC`,
      commodities
    );
  }

  return query<MarketPrice>(
    `SELECT DISTINCT ON (commodity) *
     FROM market_prices
     ORDER BY commodity, price_date DESC
     LIMIT 50`
  );
}

export async function getPriceTrend(
  commodity: string,
  months = 6
): Promise<MarketPrice[]> {
  return query<MarketPrice>(
    `SELECT * FROM market_prices
     WHERE commodity ILIKE $1
       AND price_date >= NOW() - INTERVAL '${months} months'
     ORDER BY price_date`,
    [commodity]
  );
}

export async function searchCommodity(term: string): Promise<string[]> {
  const rows = await query<{ commodity: string }>(
    `SELECT DISTINCT commodity FROM market_prices
     WHERE commodity ILIKE $1
     ORDER BY commodity
     LIMIT 20`,
    [`%${term}%`]
  );
  return rows.map((r) => r.commodity);
}

// Import CBSL price data — called by the scheduled importer
export async function importPriceRecord(data: {
  commodity: string;
  market: string;
  price_date: Date;
  avg_price_lkr: number;
  min_price_lkr?: number;
  max_price_lkr?: number;
  unit?: string;
}): Promise<void> {
  await query(
    `INSERT INTO market_prices (commodity, market, price_date, avg_price_lkr, min_price_lkr, max_price_lkr, unit, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'CBSL')
     ON CONFLICT (commodity, market, price_date) DO UPDATE
     SET avg_price_lkr = EXCLUDED.avg_price_lkr,
         min_price_lkr = EXCLUDED.min_price_lkr,
         max_price_lkr = EXCLUDED.max_price_lkr`,
    [
      data.commodity, data.market, data.price_date,
      data.avg_price_lkr, data.min_price_lkr ?? null,
      data.max_price_lkr ?? null, data.unit ?? 'kg',
    ]
  );
}
