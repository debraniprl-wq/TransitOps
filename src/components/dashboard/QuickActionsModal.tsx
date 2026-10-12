'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { DataProvider } from '@/lib/data-provider';
import { useToast } from '@/components/ui/Toast';
import { Vehicle, Driver, VehicleType, VehicleRegion, DriverLicenseCategory } from '@/types';

export type QuickActionType = 'add_vehicle' | 'add_driver' | 'create_trip' | 'log_fuel' | null;

interface QuickActionsModalProps {
  action: QuickActionType;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuickActionsModal({ action, onClose, onSuccess }: QuickActionsModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // Form states: Vehicle
  const [vReg, setVReg] = useState('');
  const [vModel, setVModel] = useState('');
  const [vType, setVType] = useState<VehicleType>('Truck');
  const [vCapacity, setVCapacity] = useState('');
  const [vOdometer, setVOdometer] = useState('');
  const [vCost, setVCost] = useState('');
  const [vRegion, setVRegion] = useState<VehicleRegion>('Central');

  // Form states: Driver
  const [dName, setDName] = useState('');
  const [dLicense, setDLicense] = useState('');
  const [dCategory, setDCategory] = useState<DriverLicenseCategory>('Class A - Heavy Articulated');
  const [dExpiry, setDExpiry] = useState('');
  const [dContact, setDContact] = useState('');
  const [dSafety, setDSafety] = useState('95');

  // Form states: Trip
  const [tSource, setTSource] = useState('');
  const [tDest, setTDest] = useState('');
  const [tDist, setTDist] = useState('');
  const [tCargo, setTCargo] = useState('');
  const [tVehicleId, setTVehicleId] = useState('');
  const [tDriverId, setTDriverId] = useState('');
  const [tDeparture, setTDeparture] = useState('');
  const [tNotes, setTNotes] = useState('');

  // Form states: Fuel
  const [fVehicleId, setFVehicleId] = useState('');
  const [fDate, setFDate] = useState('');
  const [fLitres, setFLitres] = useState('');
  const [fPrice, setFPrice] = useState('1.25');
  const [fOdo, setFOdo] = useState('');
  const [fNotes, setFNotes] = useState('');

  useEffect(() => {
    setFDate(new Date().toISOString().split('T')[0]);
    if (action) {
      DataProvider.getVehicles().then(setVehicles);
      DataProvider.getDrivers().then(setDrivers);
    }
  }, [action]);

  // Selected vehicle info for cargo capacity hint
  const selectedVehicleForTrip = vehicles.find((v) => v.id === tVehicleId);

  // Submit Handler: Add Vehicle
  const handleSubmitVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await DataProvider.createVehicle({
      reg_number: vReg,
      model: vModel,
      type: vType,
      max_capacity_kg: Number(vCapacity),
      odometer_km: Number(vOdometer) || 0,
      acquisition_cost: Number(vCost) || 0,
      region: vRegion,
      status: 'Available',
    });
    setLoading(false);

    if (res.success) {
      showToast(`Vehicle ${res.data?.reg_number} enrolled successfully`, 'success');
      onSuccess();
      onClose();
    } else {
      showToast(res.error || 'Failed to add vehicle', 'error');
    }
  };

  // Submit Handler: Add Driver
  const handleSubmitDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await DataProvider.createDriver({
      name: dName,
      license_number: dLicense,
      license_category: dCategory,
      license_expiry: dExpiry,
      contact_number: dContact,
      safety_score: Number(dSafety),
      status: 'Available',
    });
    setLoading(false);

    if (res.success) {
      showToast(`Driver ${res.data?.name} registered successfully`, 'success');
      onSuccess();
      onClose();
    } else {
      showToast(res.error || 'Failed to register driver', 'error');
    }
  };

  // Submit Handler: Create Trip
  const handleSubmitTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await DataProvider.createTrip({
      source: tSource,
      destination: tDest,
      planned_distance_km: Number(tDist),
      cargo_weight_kg: Number(tCargo),
      vehicle_id: tVehicleId,
      driver_id: tDriverId,
      planned_departure: tDeparture,
      notes: tNotes,
    });
    setLoading(false);

    if (res.success) {
      showToast(`Trip ${res.data?.trip_code} created as Draft`, 'success');
      onSuccess();
      onClose();
    } else {
      showToast(res.error || 'Failed to create trip', 'error');
    }
  };

  // Submit Handler: Log Fuel
  const handleSubmitFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await DataProvider.createFuelLog({
      vehicle_id: fVehicleId,
      date: fDate,
      litres: Number(fLitres),
      price_per_litre: Number(fPrice),
      odometer_reading: Number(fOdo),
      notes: fNotes,
    });
    setLoading(false);

    if (res.success) {
      showToast(`Logged ${res.data?.litres}L fuel ($${res.data?.total_cost}) successfully`, 'success');
      onSuccess();
      onClose();
    } else {
      showToast(res.error || 'Failed to log fuel', 'error');
    }
  };

  if (!action) return null;

  return (
    <>
      {/* ADD VEHICLE MODAL */}
      {action === 'add_vehicle' && (
        <Modal isOpen={true} onClose={onClose} title="Enrol New Vehicle" subtitle="Add asset to operational fleet" maxWidth="lg">
          <form onSubmit={handleSubmitVehicle} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Registration Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FL-9920-IL"
                  value={vReg}
                  onChange={(e) => setVReg(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Vehicle Model / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scania R500 V8"
                  value={vModel}
                  onChange={(e) => setVModel(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">Vehicle Type</label>
                <select
                  value={vType}
                  onChange={(e) => setVType(e.target.value as VehicleType)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                >
                  <option value="Truck">Truck</option>
                  <option value="Van">Van</option>
                  <option value="Bus">Bus</option>
                  <option value="Trailer">Trailer</option>
                  <option value="Electric">Electric</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Max Capacity (kg) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="25000"
                  value={vCapacity}
                  onChange={(e) => setVCapacity(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">Operating Region</label>
                <select
                  value={vRegion}
                  onChange={(e) => setVRegion(e.target.value as VehicleRegion)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                >
                  <option value="North">North</option>
                  <option value="South">South</option>
                  <option value="East">East</option>
                  <option value="West">West</option>
                  <option value="Central">Central</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Current Odometer (km)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={vOdometer}
                  onChange={(e) => setVOdometer(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Acquisition Cost ($)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="150000"
                  value={vCost}
                  onChange={(e) => setVCost(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#EAE5D9] flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#71818A] hover:bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-medium bg-[#23866D] hover:bg-[#1D735D] text-white rounded-lg shadow-xs"
              >
                {loading ? 'Saving...' : 'Save Vehicle'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ADD DRIVER MODAL */}
      {action === 'add_driver' && (
        <Modal isOpen={true} onClose={onClose} title="Register Driver" subtitle="Enter commercial driver credentials" maxWidth="lg">
          <form onSubmit={handleSubmitDriver} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arthur Pendelton"
                  value={dName}
                  onChange={(e) => setDName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  License Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DL-882910-US"
                  value={dLicense}
                  onChange={(e) => setDLicense(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">License Category</label>
                <select
                  value={dCategory}
                  onChange={(e) => setDCategory(e.target.value as DriverLicenseCategory)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                >
                  <option value="Class A - Heavy Articulated">Class A - Heavy Articulated</option>
                  <option value="Class B - Heavy Rigid">Class B - Heavy Rigid</option>
                  <option value="Class C - Commercial Van">Class C - Commercial Van</option>
                  <option value="Class D - Multi-Passenger">Class D - Multi-Passenger</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  License Expiry Date *
                </label>
                <input
                  type="date"
                  required
                  value={dExpiry}
                  onChange={(e) => setDExpiry(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Contact Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+1 (555) 000-0000"
                  value={dContact}
                  onChange={(e) => setDContact(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Initial Safety Score (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={dSafety}
                  onChange={(e) => setDSafety(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[#EAE5D9] flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#71818A] hover:bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-medium bg-[#23866D] hover:bg-[#1D735D] text-white rounded-lg shadow-xs"
              >
                {loading ? 'Registering...' : 'Register Driver'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CREATE TRIP MODAL */}
      {action === 'create_trip' && (
        <Modal isOpen={true} onClose={onClose} title="Create Dispatch Trip" subtitle="Assign route, payload, and operational resources" maxWidth="xl">
          <form onSubmit={handleSubmitTrip} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">Source / Origin *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dallas Freight Hub, TX"
                  value={tSource}
                  onChange={(e) => setTSource(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">Destination *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chicago Distribution Yard, IL"
                  value={tDest}
                  onChange={(e) => setTDest(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Planned Distance (km) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="1480"
                  value={tDist}
                  onChange={(e) => setTDist(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Cargo Weight (kg) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="18000"
                  value={tCargo}
                  onChange={(e) => setTCargo(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Planned Departure *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={tDeparture}
                  onChange={(e) => setTDeparture(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Eligible Vehicle *
                </label>
                <select
                  required
                  value={tVehicleId}
                  onChange={(e) => setTVehicleId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                >
                  <option value="">-- Select Available Vehicle --</option>
                  {vehicles
                    .filter((v) => v.status === 'Available')
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.reg_number} - {v.model} (Max {v.max_capacity_kg.toLocaleString()} kg)
                      </option>
                    ))}
                </select>
                {selectedVehicleForTrip && (
                  <p className="text-[11px] text-[#23866D] mt-1">
                    Max payload capacity: {selectedVehicleForTrip.max_capacity_kg.toLocaleString()} kg
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Eligible Driver *
                </label>
                <select
                  required
                  value={tDriverId}
                  onChange={(e) => setTDriverId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                >
                  <option value="">-- Select Available Driver --</option>
                  {drivers
                    .filter(
                      (d) =>
                        d.status === 'Available' &&
                        new Date(d.license_expiry) >= new Date()
                    )
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.license_category}) - Safety: {d.safety_score}%
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#193C49] mb-1">Operational Notes</label>
              <textarea
                rows={2}
                placeholder="Cargo handling requirements, customer PO number, route details..."
                value={tNotes}
                onChange={(e) => setTNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
              />
            </div>

            <div className="pt-4 border-t border-[#EAE5D9] flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#71818A] hover:bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-medium bg-[#23866D] hover:bg-[#1D735D] text-white rounded-lg shadow-xs"
              >
                {loading ? 'Creating...' : 'Create Draft Trip'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* LOG FUEL MODAL */}
      {action === 'log_fuel' && (
        <Modal isOpen={true} onClose={onClose} title="Log Fuel Fill" subtitle="Record fuel volume, price, and odometer" maxWidth="md">
          <form onSubmit={handleSubmitFuel} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#193C49] mb-1">Vehicle *</label>
              <select
                required
                value={fVehicleId}
                onChange={(e) => {
                  setFVehicleId(e.target.value);
                  const selected = vehicles.find((v) => v.id === e.target.value);
                  if (selected) setFOdo(String(selected.odometer_km));
                }}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
              >
                <option value="">-- Select Vehicle --</option>
                {vehicles
                  .filter((v) => v.status !== 'Retired')
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.reg_number} - {v.model} ({v.odometer_km.toLocaleString()} km)
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={fDate}
                  onChange={(e) => setFDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">Litres *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  placeholder="250"
                  value={fLitres}
                  onChange={(e) => setFLitres(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Price / Litre ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={fPrice}
                  onChange={(e) => setFPrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#193C49] mb-1">
                  Odometer Reading (km) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={fOdo}
                  onChange={(e) => setFOdo(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
                />
              </div>
            </div>

            {fLitres && fPrice && (
              <div className="p-2.5 rounded-lg bg-[#FAF8F3] border border-[#EAE5D9] flex justify-between text-xs font-medium text-[#193C49]">
                <span>Calculated Total Cost:</span>
                <span className="font-bold text-[#23866D]">
                  ${(Number(fLitres) * Number(fPrice)).toFixed(2)}
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#193C49] mb-1">Notes / Station</label>
              <input
                type="text"
                placeholder="Station location or receipt number"
                value={fNotes}
                onChange={(e) => setFNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F3] border border-[#E2DDD1] rounded-lg text-[#193C49] focus:outline-none focus:border-[#23866D]"
              />
            </div>

            <div className="pt-4 border-t border-[#EAE5D9] flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#71818A] hover:bg-stone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-medium bg-[#23866D] hover:bg-[#1D735D] text-white rounded-lg shadow-xs"
              >
                {loading ? 'Recording...' : 'Record Fuel Fill'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
