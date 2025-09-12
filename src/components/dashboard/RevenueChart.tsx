import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "08.28", revenue: 500000 },
  { name: "07.29", revenue: 800000 },
  { name: "08.29", revenue: 1200000 },
  { name: "09.29", revenue: 900000 },
  { name: "10.29", revenue: 1500000 },
  { name: "11.29", revenue: 1800000 },
  { name: "12.29", revenue: 2200000 },
  { name: "1.30", revenue: 2800000 },
  { name: "2.30", revenue: 2600000 },
  { name: "4.30", revenue: 3000000 },
  { name: "5.30", revenue: 2900000 },
];

const RevenueChart = () => {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#9ca3af"
            fontSize={12}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af' }}
          />
          <YAxis 
            stroke="#9ca3af"
            fontSize={12}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af' }}
            tickFormatter={(value) => `PHP ${(value / 1000000).toFixed(1)}M`}
            domain={[0, 3500000]}
            ticks={[0, 500000, 1000000, 1500000, 2000000, 2500000, 3000000]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
              fontSize: "14px",
            }}
            formatter={(value) => [`PHP ${(value as number / 1000000).toFixed(1)}M`, "Revenue"]}
            labelStyle={{ color: '#374151' }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#14b8a6"
            strokeWidth={3}
            dot={{ fill: '#14b8a6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#14b8a6', strokeWidth: 2, stroke: '#ffffff' }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;