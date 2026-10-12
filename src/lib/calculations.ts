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

// RFC-4180 Compliant CSV Exporter with UTF-8 BOM for Windows & Excel
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

  // \uFEFF Byte Order Mark ensures Microsoft Excel and spreadsheet tools recognize UTF-8 encoding
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.replace(/\.csv$/, '')}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Print / PDF Report Generator for direct viewing or printing
export function exportToPrintOrPDF(title: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  if (typeof window === 'undefined') return;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 28px; color: #193C49; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #23866D; padding-bottom: 12px; }
          h1 { margin: 0; font-size: 20px; color: #193C49; font-weight: 700; }
          .meta { font-size: 11px; color: #71818A; margin-top: 4px; }
          .badge { background: #E8F5F1; color: #1E735E; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
          th { background: #F5F2E9; text-align: left; padding: 8px 10px; border: 1px solid #E2DDD1; font-weight: 600; color: #193C49; }
          td { padding: 8px 10px; border: 1px solid #E2DDD1; color: #2D3748; }
          tr:nth-child(even) { background: #FAF8F3; }
          @media print {
            body { padding: 12px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>TransitOps — ${title}</h1>
            <div class="meta">Exported: ${new Date().toLocaleString()} · Fleet Telemetry System</div>
          </div>
          <div class="badge">Official Report</div>
        </div>
        <table>
          <thead>
            <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? ''}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
}
