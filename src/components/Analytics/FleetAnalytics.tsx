import React from "react";
import { Car, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface FleetAnalyticsProps {
  totalVehicles: number;
  available: number;
  rented: number;
  maintenance: number;
  lateReturns: number;
}

export function FleetAnalytics({
  totalVehicles,
  available,
  rented,
  maintenance,
  lateReturns,
}: FleetAnalyticsProps) {
  const utilizationRate = totalVehicles > 0 ? (rented / totalVehicles) * 100 : 0;
  const availabilityRate = totalVehicles > 0 ? (available / totalVehicles) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Fleet Analytics</h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-600 mb-1">
            <Car size={16} />
            <span className="text-sm font-medium">Total Vehicles</span>
          </div>
          <p className="text-2xl font-bold">{totalVehicles}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <CheckCircle size={16} />
            <span className="text-sm font-medium">Available</span>
          </div>
          <p className="text-2xl font-bold">{available}</p>
          <p className="text-xs text-slate-500">{availabilityRate.toFixed(1)}% of fleet</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Clock size={16} />
            <span className="text-sm font-medium">Rented</span>
          </div>
          <p className="text-2xl font-bold">{rented}</p>
          <p className="text-xs text-slate-500">{utilizationRate.toFixed(1)}% utilization</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-orange-600 mb-1">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">Maintenance</span>
          </div>
          <p className="text-2xl font-bold">{maintenance}</p>
        </div>
      </div>

      {lateReturns > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">Late Returns</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{lateReturns}</p>
          <p className="text-xs text-red-500">Requires immediate attention</p>
        </div>
      )}

      <div className="mt-4">
        <h4 className="text-sm font-medium text-slate-600 mb-2">Fleet Distribution</h4>
        <div className="flex gap-2 h-4 rounded-full overflow-hidden">
          <div
            className="bg-green-500 transition-all"
            style={{ width: `${availabilityRate}%` }}
            title={`Available: ${available}`}
          />
          <div
            className="bg-blue-500 transition-all"
            style={{ width: `${utilizationRate}%` }}
            title={`Rented: ${rented}`}
          />
          <div
            className="bg-orange-500 transition-all"
            style={{ width: `${(maintenance / totalVehicles) * 100}%` }}
            title={`Maintenance: ${maintenance}`}
          />
        </div>
        <div className="flex gap-4 mt-2 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded" />
            <span>Rented</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-orange-500 rounded" />
            <span>Maintenance</span>
          </div>
        </div>
      </div>
    </div>
  );
}
