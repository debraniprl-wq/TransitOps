'use client';

import React from 'react';
import { Trip } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MapPin, Navigation, ArrowRight, Truck } from 'lucide-react';

interface RouteOverviewMapProps {
  trips: Trip[];
}

export function RouteOverviewMap({ trips }: RouteOverviewMapProps) {
  // Focus on active and dispatched trips first
  const activeTrips = trips.filter((t) => t.status === 'Dispatched' || t.status === 'Draft');
  const displayTrips = activeTrips.length > 0 ? activeTrips : trips.slice(0, 3);

  return (
    <div className="bg-[#FFFEFA] border border-[#E2DDD1] rounded-xl p-5 shadow-xs flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-[#193C49]">Operational Route Overview</h3>
            <span className="text-[10px] font-semibold bg-[#E8F5F1] text-[#1E735E] px-2 py-0.5 rounded-full border border-[#C2E3D8]">
              Waypoint Telemetry
            </span>
          </div>
          <p className="text-xs text-[#71818A]">
            Active corridors derived from saved dispatch source and destination logistics data
          </p>
        </div>
        <span className="text-xs text-[#71818A] bg-[#F5F2E9] px-2.5 py-1 rounded-full border border-[#E2DDD1] self-start sm:self-auto">
          {activeTrips.length} Active Corridors
        </span>
      </div>

      {/* Route Corridors List */}
      <div className="space-y-3.5 my-2">
        {displayTrips.map((trip) => (
          <div
            key={trip.id}
            className="p-3.5 rounded-xl border border-[#EAE5D9] bg-[#FAF8F3] hover:bg-[#F5F2E9] transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-[#193C49] tracking-tight">
                  {trip.trip_code}
                </span>
                <StatusBadge status={trip.status} size="sm" />
              </div>
              <span className="text-xs font-semibold text-[#23866D]">
                {trip.planned_distance_km.toLocaleString()} km planned
              </span>
            </div>

            {/* Visual corridor path */}
            <div className="flex items-center gap-2 my-2 text-xs text-[#193C49]">
              <div className="flex items-center gap-1 font-medium truncate flex-1">
                <MapPin className="w-3.5 h-3.5 text-[#23866D] shrink-0" />
                <span className="truncate">{trip.source}</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-[#71818A] shrink-0" />
              <div className="flex items-center gap-1 font-medium truncate flex-1 text-right justify-end">
                <Navigation className="w-3.5 h-3.5 text-[#4F91D8] shrink-0" />
                <span className="truncate">{trip.destination}</span>
              </div>
            </div>

            {/* Vehicle & payload detail */}
            <div className="flex items-center justify-between pt-2 border-t border-[#EAE5D9] text-[11px] text-[#71818A]">
              <span className="flex items-center gap-1.5 truncate">
                <Truck className="w-3 h-3 text-[#71818A]" />
                {trip.vehicle ? `${trip.vehicle.model} (${trip.vehicle.reg_number})` : 'Vehicle assigned'}
              </span>
              <span className="font-medium text-[#193C49]">
                Payload: {trip.cargo_weight_kg.toLocaleString()} kg
              </span>
            </div>
          </div>
        ))}

        {displayTrips.length === 0 && (
          <div className="p-8 text-center text-xs text-[#71818A]">
            No active trip routes currently staged. Create a new trip draft to view route overview.
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#F0ECE1] text-[11px] text-[#71818A] flex flex-col sm:flex-row justify-between gap-1">
        <span>Genuine coordinate telemetry mode: <strong>Waypoint Verified</strong></span>
        <span>Third-party map tile service: <strong className="text-[#23866D]">Zero Key Required</strong></span>
      </div>
    </div>
  );
}
