import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface RevenuePoint { name: string; revenue: number; count?: number }

const demoData: RevenuePoint[] = [
  { name: "08/28", revenue: 500000 },
  { name: "07/29", revenue: 800000 },
  { name: "08/29", revenue: 1200000 },
  { name: "09/29", revenue: 900000 },
  { name: "10/29", revenue: 1500000 },
  { name: "11/29", revenue: 1800000 },
  { name: "12/29", revenue: 2200000 },
];

const currencyAxis = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
const currencyTooltip = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 });

const toValidNumber = (v: unknown) => {
  const n = Number((v as any));
  return Number.isFinite(n) ? n : 0;
};

const RevenueChart = ({ data }: { data?: RevenuePoint[] }) => {
  const rawData = (data && data.length ? data : demoData);
  // Sanitize data to avoid NaN in scales
  const chartData = rawData.map(d => ({ ...d, revenue: toValidNumber(d.revenue) }));

  // Friendly empty state checks
  const maxRevenue = Math.max(...chartData.map(d => d.revenue));

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-sm text-slate-500 border rounded-lg bg-white">
        No data to display yet.
      </div>
    );
  }

  const xTickCount = Math.min(8, chartData.length);
  const yMax = Math.max(1, Math.ceil((Number.isFinite(maxRevenue) ? maxRevenue : 0) * 1.1));

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 24, left: 12, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#9ca3af"
            fontSize={12}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b' }}
            interval="preserveStartEnd"
            tickCount={xTickCount}
            tickMargin={8}
          />
          <YAxis 
            stroke="#9ca3af"
            fontSize={12}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af' }}
            tickFormatter={(value) => currencyAxis.format(Number(value))}
            domain={[0, yMax]}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              fontSize: "14px",
            }}
            formatter={(value) => [currencyTooltip.format(toValidNumber(value)), 'Revenue']}
            labelStyle={{ color: '#374151' }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#14b8a6"
            strokeWidth={3}
            dot={{ r: 3, fill: '#14b8a6', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: '#14b8a6', strokeWidth: 2, stroke: '#ffffff' }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;