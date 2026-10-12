import { Vehicle, Trip, MaintenanceRecord, FuelLog, Expense } from '@/types';

export interface FleetReportData {
  fuelEfficiencyKmPerL: number;
  fleetUtilizationPercent: number;
  totalFuelCost: number;
  totalMaintenanceCost: number;
  totalOtherExpenses: number;
  totalOperationalExpenses: number;
  totalRevenue: number;
  overallROI: number;
  vehicleReports: {
    vehicleId: string;
    regNumber: string;
    model: string;
    distanceKm: number;
    fuelLitres: number;
    fuelEfficiency: number;
    fuelCost: number;
    maintenanceCost: number;
    revenue: number;
    acquisitionCost: number;
    netProfit: number;
    roiPercent: number;
  }[];
}

export function computeFleetAnalytics(
  vehicles: Vehicle[],
  trips: Trip[],
  maintenance: MaintenanceRecord[],
  fuelLogs: FuelLog[],
  expenses: Expense[]
): FleetReportData {
  // 1. Total Distance and Fuel Consumed from completed trips
  const completedTrips = trips.filter((t) => t.status === 'Completed');
  const totalCompletedDistance = completedTrips.reduce((acc, t) => acc + (t.actual_distance_km || 0), 0);
  const totalTripFuelLitres = completedTrips.reduce((acc, t) => acc + (t.fuel_consumed_litres || 0), 0);

  // Fallback to fuel logs litres if trip fuel consumed is zero
  const totalLoggedLitres = fuelLogs.reduce((acc, f) => acc + f.litres, 0);
  const effectiveFuelLitres = totalTripFuelLitres > 0 ? totalTripFuelLitres : totalLoggedLitres;

  const fuelEfficiencyKmPerL =
    effectiveFuelLitres > 0 && totalCompletedDistance > 0
      ? Number((totalCompletedDistance / effectiveFuelLitres).toFixed(2))
      : 0;

  // 2. Fleet Utilization
  const nonRetiredVehicles = vehicles.filter((v) => v.status !== 'Retired');
  const vehiclesOnTrip = vehicles.filter((v) => v.status === 'On Trip').length;
  const fleetUtilizationPercent =
    nonRetiredVehicles.length > 0
      ? Number(((vehiclesOnTrip / nonRetiredVehicles.length) * 100).toFixed(1))
      : 0;

  // 3. Costs
  const totalFuelCost = Number(fuelLogs.reduce((acc, f) => acc + f.total_cost, 0).toFixed(2));
  const totalMaintenanceCost = Number(maintenance.reduce((acc, m) => acc + m.cost, 0).toFixed(2));

  // Non-maintenance operational expenses (avoid double-counting maintenance recorded in both tables)
  const otherExpenses = expenses.filter((e) => e.category !== 'Maintenance');
  const totalOtherExpenses = Number(otherExpenses.reduce((acc, e) => acc + e.amount, 0).toFixed(2));

  const totalOperationalExpenses = Number((totalFuelCost + totalMaintenanceCost + totalOtherExpenses).toFixed(2));

  // 4. Revenue
  const totalRevenue = Number(trips.reduce((acc, t) => acc + (t.revenue || 0), 0).toFixed(2));

  // 5. Total Acquisition Cost
  const totalAcquisitionCost = vehicles.reduce((acc, v) => acc + v.acquisition_cost, 0);

  // Overall Fleet ROI
  const netOperatingProfit = totalRevenue - totalOperationalExpenses;
  const overallROI =
    totalAcquisitionCost > 0
      ? Number(((netOperatingProfit / totalAcquisitionCost) * 100).toFixed(2))
      : 0;

  // 6. Vehicle-by-vehicle metrics
  const vehicleReports = vehicles.map((v) => {
    const vTrips = completedTrips.filter((t) => t.vehicle_id === v.id);
    const dist = vTrips.reduce((acc, t) => acc + (t.actual_distance_km || 0), 0);
    const tripFuel = vTrips.reduce((acc, t) => acc + (t.fuel_consumed_litres || 0), 0);
    const vLogs = fuelLogs.filter((f) => f.vehicle_id === v.id);
    const logLitres = vLogs.reduce((acc, f) => acc + f.litres, 0);
    const vFuelCost = vLogs.reduce((acc, f) => acc + f.total_cost, 0);

    const litres = tripFuel > 0 ? tripFuel : logLitres;
    const eff = litres > 0 && dist > 0 ? Number((dist / litres).toFixed(2)) : 0;

    const vMaint = maintenance
      .filter((m) => m.vehicle_id === v.id)
      .reduce((acc, m) => acc + m.cost, 0);

    const vRev = trips
      .filter((t) => t.vehicle_id === v.id)
      .reduce((acc, t) => acc + (t.revenue || 0), 0);

    const profit = vRev - (vFuelCost + vMaint);
    const roi = v.acquisition_cost > 0 ? Number(((profit / v.acquisition_cost) * 100).toFixed(2)) : 0;

    return {
      vehicleId: v.id,
      regNumber: v.reg_number,
      model: v.model,
      distanceKm: dist,
      fuelLitres: litres,
      fuelEfficiency: eff,
      fuelCost: Number(vFuelCost.toFixed(2)),
      maintenanceCost: Number(vMaint.toFixed(2)),
      revenue: Number(vRev.toFixed(2)),
      acquisitionCost: v.acquisition_cost,
      netProfit: Number(profit.toFixed(2)),
      roiPercent: roi,
    };
  });

  return {
    fuelEfficiencyKmPerL,
    fleetUtilizationPercent,
    totalFuelCost,
    totalMaintenanceCost,
    totalOtherExpenses,
    totalOperationalExpenses,
    totalRevenue,
    overallROI,
    vehicleReports,
  };
}

// RFC-4180 Compliant CSV Exporter
export function exportToCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  const escapeCell = (cell: string | number | null | undefined) => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.replace(/\.csv$/, '')}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
