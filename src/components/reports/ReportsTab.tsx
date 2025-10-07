import React, { useMemo, useState } from 'react';
import { Calendar, ChevronDown, Download, RefreshCcw, Search, SlidersHorizontal } from 'lucide-react';

// Types for local state (stub; wire to backend later)
interface ReportRow {
  brand: string;
  itemsSold: number;
  grossSales: number;
  itemsRefunded: number;
  refunds: number;
  netSales: number;
  cogs?: number;
  grossProfit?: number;
  margin?: number; // percentage 0..1
  taxes?: number;
}

type SubTab = 'brand' | 'category' | 'item' | 'payment';

const sampleData: ReportRow[] = [
  { brand: '3M', itemsSold: 120, grossSales: 320000, itemsRefunded: 4, refunds: 6000, netSales: 314000, cogs: 210000, grossProfit: 104000, margin: 0.331, taxes: 28000 },
  { brand: 'GC', itemsSold: 85, grossSales: 210000, itemsRefunded: 2, refunds: 2500, netSales: 207500, cogs: 145000, grossProfit: 62500, margin: 0.300, taxes: 18500 },
  { brand: 'Coltene', itemsSold: 64, grossSales: 155000, itemsRefunded: 1, refunds: 1500, netSales: 153500, cogs: 98000, grossProfit: 55500, margin: 0.358, taxes: 14200 },
];

const formatCurrency = (n: number) => `₱${(n || 0).toLocaleString()}`;
const formatPct = (p?: number) => p == null ? '-' : `${Math.round(p * 100)}%`;

const ReportsTab: React.FC = () => {
  const [active, setActive] = useState<SubTab>('brand');
  const [dateRange, setDateRange] = useState<string>('last_30');
  const [query, setQuery] = useState('');
  const [displayed, setDisplayed] = useState<Record<string, boolean>>({
    brand: true,
    itemsSold: true,
    grossSales: true,
    itemsRefunded: true,
    refunds: true,
    netSales: true,
    cogs: true,
    grossProfit: true,
    margin: true,
    taxes: true,
  });

  const data = useMemo(() => {
    const rows = sampleData.filter(r => !query || r.brand.toLowerCase().includes(query.toLowerCase()));
    return rows;
  }, [query]);

  const exportCsv = () => {
    const cols = Object.entries(displayed).filter(([, v]) => v).map(([k]) => k);
    const header = cols.join(',');
    const body = data.map(r => cols.map(c => {
      const v = (r as any)[c];
      return typeof v === 'number' ? v : String(v ?? '');
    }).join(',')).join('\n');
    const csv = header + '\n' + body;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports-${active}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
    
      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'brand', label: 'Sales by Brand' },
          { id: 'category', label: 'Sales by Category' },
          { id: 'item', label: 'Sales by Item' },
          { id: 'payment', label: 'Sales by Payment Type' },
        ].map(t => (
          <button
            key={t.id}
            className={`px-3 py-1.5 text-sm font-medium rounded ${active === t.id ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'text-gray-600 hover:bg-gray-50 border border-transparent'}`}
            onClick={() => setActive(t.id as SubTab)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="last_7">Last 7 days</option>
            <option value="last_30">Last 30 days</option>
            <option value="this_month">This month</option>
            <option value="last_month">Last month</option>
            <option value="ytd">Year to date</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brand"
            className="text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            onClick={() => setDisplayed((d) => ({ ...d }))}
            title="Displayed fields"
          >
            <SlidersHorizontal className="w-4 h-4" /> Displayed Fields
          </button>
          <button
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            onClick={() => exportCsv()}
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Data grid */}
      <div className="overflow-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold text-gray-600">
              {displayed.brand && <th className="px-3 py-2">Brand</th>}
              {displayed.itemsSold && <th className="px-3 py-2">Items Sold</th>}
              {displayed.grossSales && <th className="px-3 py-2">Gross Sales</th>}
              {displayed.itemsRefunded && <th className="px-3 py-2">Items Refunded</th>}
              {displayed.refunds && <th className="px-3 py-2">Refunds</th>}
              {displayed.netSales && <th className="px-3 py-2">Net Sales</th>}
              {displayed.cogs && <th className="px-3 py-2">Cost of Goods</th>}
              {displayed.grossProfit && <th className="px-3 py-2">Gross Profit</th>}
              {displayed.margin && <th className="px-3 py-2">Margin</th>}
              {displayed.taxes && <th className="px-3 py-2">Taxes</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((r, idx) => (
              <tr key={r.brand} className={idx % 2 ? 'bg-white' : 'bg-gray-50'}>
                {displayed.brand && <td className="px-3 py-2 font-medium text-gray-900">{r.brand}</td>}
                {displayed.itemsSold && <td className="px-3 py-2">{r.itemsSold.toLocaleString()}</td>}
                {displayed.grossSales && <td className="px-3 py-2">{formatCurrency(r.grossSales)}</td>}
                {displayed.itemsRefunded && <td className="px-3 py-2">{r.itemsRefunded.toLocaleString()}</td>}
                {displayed.refunds && <td className="px-3 py-2">{formatCurrency(r.refunds)}</td>}
                {displayed.netSales && <td className="px-3 py-2 font-semibold text-teal-700">{formatCurrency(r.netSales)}</td>}
                {displayed.cogs && <td className="px-3 py-2">{formatCurrency(r.cogs || 0)}</td>}
                {displayed.grossProfit && <td className="px-3 py-2">{formatCurrency(r.grossProfit || 0)}</td>}
                {displayed.margin && <td className="px-3 py-2">{formatPct(r.margin)}</td>}
                {displayed.taxes && <td className="px-3 py-2">{formatCurrency(r.taxes || 0)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals footer */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div><div className="text-xs text-gray-500">Gross Sales</div><div className="font-semibold">{formatCurrency(sampleData.reduce((s, r) => s + r.grossSales, 0))}</div></div>
          <div><div className="text-xs text-gray-500">Refunds</div><div className="font-semibold">{formatCurrency(sampleData.reduce((s, r) => s + r.refunds, 0))}</div></div>
          <div><div className="text-xs text-gray-500">Net Sales</div><div className="font-semibold text-teal-700">{formatCurrency(sampleData.reduce((s, r) => s + r.netSales, 0))}</div></div>
          <div><div className="text-xs text-gray-500">Gross Profit</div><div className="font-semibold">{formatCurrency(sampleData.reduce((s, r) => s + (r.grossProfit || 0), 0))}</div></div>
          <div><div className="text-xs text-gray-500">Taxes</div><div className="font-semibold">{formatCurrency(sampleData.reduce((s, r) => s + (r.taxes || 0), 0))}</div></div>
        </div>
      </div>
    </div>
  );
};

export default ReportsTab;
