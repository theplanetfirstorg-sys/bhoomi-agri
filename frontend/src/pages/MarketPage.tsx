import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, Search, Loader2 } from 'lucide-react';
import api from '../api/client';
import { MarketPrice } from '../types';
import { format } from 'date-fns';

function usePrices(commodities?: string[]) {
  return useQuery({
    queryKey: ['market-prices', commodities],
    queryFn: () =>
      api.get<{ prices: MarketPrice[] }>('/market/prices', {
        params: commodities?.length ? { commodities: commodities.join(',') } : undefined,
      }).then((r) => r.data.prices),
  });
}

function TrendBadge({ current, prev }: { current: number | null; prev?: number | null }) {
  if (!current || !prev) return <Minus className="w-4 h-4 text-gray-400" />;
  const pct = ((current - prev) / prev) * 100;
  if (Math.abs(pct) < 2) return <Minus className="w-4 h-4 text-gray-400" />;
  return pct > 0
    ? <span className="flex items-center gap-0.5 text-xs text-red-600 font-medium"><TrendingUp className="w-3.5 h-3.5" />{pct.toFixed(0)}%</span>
    : <span className="flex items-center gap-0.5 text-xs text-leaf-600 font-medium"><TrendingDown className="w-3.5 h-3.5" />{Math.abs(pct).toFixed(0)}%</span>;
}

export default function MarketPage() {
  const [search, setSearch] = useState('');
  const { data: prices = [], isLoading } = usePrices();

  const filtered = prices.filter((p) =>
    !search || p.commodity.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Market Prices</h1>
        <p className="text-gray-500 text-sm mt-0.5">Sri Lanka vegetable & crop prices — CBSL data</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          className="input pl-10"
          placeholder="Search crops..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-leaf-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          {prices.length === 0 ? (
            <>
              <p className="text-gray-600 font-medium mb-1">No market data yet</p>
              <p className="text-gray-400 text-sm">CBSL price data will appear here once imported.</p>
            </>
          ) : (
            <p className="text-gray-500 text-sm">No results for "{search}".</p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Commodity</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Price (LKR/kg)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Min</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Max</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((price) => (
                <tr key={price.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-900">{price.commodity}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {price.avg_price_lkr != null ? `Rs ${price.avg_price_lkr.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">
                    {price.min_price_lkr != null ? `Rs ${price.min_price_lkr.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">
                    {price.max_price_lkr != null ? `Rs ${price.max_price_lkr.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs hidden md:table-cell">
                    {format(new Date(price.price_date), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <TrendBadge current={price.avg_price_lkr} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Source: Central Bank of Sri Lanka (CBSL) · Updated monthly
      </p>
    </div>
  );
}
