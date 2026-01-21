import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

interface PnLChartProps {
  data: Array<{ date: string; pnl: number }>;
}

export function PnLChart({ data }: PnLChartProps) {
  const isPositive = data.length > 0 && data[data.length - 1].pnl >= data[0].pnl;

  return (
    <div className="glass-card p-4 h-[300px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Performance PnL</h3>
        <div className="flex items-center gap-2">
          <button className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">7D</button>
          <button className="text-xs px-2 py-1 rounded text-muted-foreground hover:bg-secondary">30D</button>
          <button className="text-xs px-2 py-1 rounded text-muted-foreground hover:bg-secondary">ALL</button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <defs>
            <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={isPositive ? "hsl(145 80% 50%)" : "hsl(0 75% 55%)"}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={isPositive ? "hsl(145 80% 50%)" : "hsl(0 75% 55%)"}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }}
            tickFormatter={(value) => `${value} SOL`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(220 18% 10%)",
              border: "1px solid hsl(220 15% 18%)",
              borderRadius: "8px",
              padding: "8px 12px",
            }}
            labelStyle={{ color: "hsl(210 20% 95%)", fontWeight: 500 }}
            itemStyle={{ color: isPositive ? "hsl(145 80% 50%)" : "hsl(0 75% 55%)" }}
          />
          <Area
            type="monotone"
            dataKey="pnl"
            stroke={isPositive ? "hsl(145 80% 50%)" : "hsl(0 75% 55%)"}
            strokeWidth={2}
            fill="url(#pnlGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
