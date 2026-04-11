import React from "react";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface RevenueChartProps {
  data: { period: string; revenue: number; cost: number }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalCost = data.reduce((sum, item) => sum + item.cost, 0);
  const profit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  const maxRevenue = Math.max(...data.map((d) => d.revenue));
  const chartHeight = 200;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Revenue Analytics</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm">
            <div className="w-3 h-3 bg-blue-500 rounded" />
            <span className="text-slate-600">Revenue</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span className="text-slate-600">Cost</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <DollarSign size={16} />
            <span className="text-sm font-medium">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold">{totalRevenue.toLocaleString()} TND</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <TrendingUp size={16} />
            <span className="text-sm font-medium">Profit</span>
          </div>
          <p className="text-2xl font-bold">{profit.toLocaleString()} TND</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <TrendingUp size={16} />
            <span className="text-sm font-medium">Margin</span>
          </div>
          <p className="text-2xl font-bold">{profitMargin.toFixed(1)}%</p>
        </div>
      </div>

      <div className="relative h-48 flex items-end gap-2">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-1 items-end h-40">
              <div
                className="flex-1 bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                style={{
                  height: `${(item.revenue / maxRevenue) * 100}%`,
                }}
                title={`Revenue: ${item.revenue} TND`}
              />
              <div
                className="flex-1 bg-red-500 rounded-t transition-all hover:bg-red-600"
                style={{
                  height: `${(item.cost / maxRevenue) * 100}%`,
                }}
                title={`Cost: ${item.cost} TND`}
              />
            </div>
            <span className="text-xs text-slate-500">{item.period}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
