// Office: PE13 1AU, Wisbech, Cambridgeshire
const OFFICE_LAT = 52.6646;
const OFFICE_LNG = 0.1601;
const DEFAULT_SURCHARGE_RADIUS_MILES = 3;
const DEFAULT_SURCHARGE_PER_MILE = 1;

// March, Cambridgeshire (PE15)
const MARCH_LAT = 52.5512;
const MARCH_LNG = 0.0882;
const MARCH_RADIUS_MILES = 3;

export type VehicleType = "car" | "mpv";

export interface SurchargeConfig {
  radiusMiles: number;
  perMile: number;
}

export const DEFAULT_SURCHARGE: SurchargeConfig = {
  radiusMiles: DEFAULT_SURCHARGE_RADIUS_MILES,
  perMile: DEFAULT_SURCHARGE_PER_MILE,
};

export const VEHICLES = {
  car: { label: "Car", passengers: 4, baseFare: 4 },
  mpv: { label: "MPV", passengers: 6, baseFare: 6 },
} as const;

const RATES = {
  car: { base: 4, baseMiles: 1, midRate: 2.0, midLimit: 30, highRate: 1.4 },
  mpv: { base: 6, baseMiles: 1, midRate: 2.3, midLimit: 30, highRate: 1.5 },
} as const;

const SUNDAY_RATES = {
  car: { minFare: 5, minMiles: 1.4, surchargePercent: 1.5 },
  mpv: { minFare: 7, minMiles: 1.4, surchargePercent: 1.5 },
} as const;

/**
 * Shine Cars fare calculator (Mon-Sat)
 * Car: £4 base (1mi), £2.00/mi (1-30mi), £1.40/mi (30+mi)
 * MPV: £6 base (1mi), £2.30/mi (1-30mi), £1.50/mi (30+mi)
 * Sunday/Bank Holiday: Car £5/MPV £7 min (1.4mi), then normal + 1.5%
 * Pickup surcharge: configurable per mile beyond configurable radius from office
 */
export function calculateFare(
  distanceMiles: number,
  pickupLat?: number,
  pickupLng?: number,
  vehicle: VehicleType = "car",
  isSunday = false,
  skipPickupSurcharge = false,
  surcharge: SurchargeConfig = DEFAULT_SURCHARGE,
): number {
  if (distanceMiles <= 0) return 0;

  const r = RATES[vehicle];
  let fare: number;

  if (isSunday) {
    const s = SUNDAY_RATES[vehicle];
    if (distanceMiles <= s.minMiles) {
      fare = s.minFare;
    } else {
      const normalFare = calcNormal(distanceMiles, r);
      fare = normalFare * (1 + s.surchargePercent / 100);
    }
  } else {
    fare = calcNormal(distanceMiles, r);
  }

  if (!skipPickupSurcharge && pickupLat !== undefined && pickupLng !== undefined) {
    const distFromOffice = haversineDistance(OFFICE_LAT, OFFICE_LNG, pickupLat, pickupLng);
    if (distFromOffice > surcharge.radiusMiles) {
      fare += (distFromOffice - surcharge.radiusMiles) * surcharge.perMile;
    }
  }

  return Math.round(fare * 100) / 100;
}

function calcNormal(dist: number, r: { base: number; baseMiles: number; midRate: number; midLimit: number; highRate: number }): number {
  if (dist <= r.baseMiles) return r.base;
  if (dist <= r.midLimit) return r.base + (dist - r.baseMiles) * r.midRate;
  const midCharge = (r.midLimit - r.baseMiles) * r.midRate;
  const highCharge = (dist - r.midLimit) * r.highRate;
  return r.base + midCharge + highCharge;
}

/** Check if a date is Sunday or bank holiday */
export function isSundayOrHoliday(dateStr: string): boolean {
  const d = parseDate(dateStr);
  if (!d) return false;
  if (d.getDay() === 0) return true;
  const key = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return UK_BANK_HOLIDAYS.has(key);
}

const UK_BANK_HOLIDAYS = new Set([
  "01-01", "03-29", "04-01", "05-06", "05-27",
  "08-25", "12-25", "12-26",
]);

function parseDate(s: string): Date | null {
  if (s.includes("/")) {
    const [d, m, y] = s.split("/");
    return new Date(+y, +m - 1, +d);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Check if pickup is outside the office radius */
export function isOutsideOfficeRadius(lat: number, lng: number, radiusMiles = DEFAULT_SURCHARGE_RADIUS_MILES): boolean {
  return haversineDistance(OFFICE_LAT, OFFICE_LNG, lat, lng) > radiusMiles;
}

/** Check if a location is in the March area */
export function isInMarchArea(lat: number, lng: number): boolean {
  return haversineDistance(MARCH_LAT, MARCH_LNG, lat, lng) <= MARCH_RADIUS_MILES;
}

export function pickupSurcharge(lat: number, lng: number, surcharge: SurchargeConfig = DEFAULT_SURCHARGE): number {
  const dist = haversineDistance(OFFICE_LAT, OFFICE_LNG, lat, lng);
  if (dist <= surcharge.radiusMiles) return 0;
  return Math.round((dist - surcharge.radiusMiles) * surcharge.perMile * 100) / 100;
}

export const SURCHARGE = DEFAULT_SURCHARGE_PER_MILE;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function metersToMiles(meters: number): number {
  return meters * 0.000621371;
}

/** Estimated fare range for meter bookings (±10%) */
export function calculateFareRange(
  distanceMiles: number,
  pickupLat?: number,
  pickupLng?: number,
  vehicle: VehicleType = "car",
  isSunday = false,
  skipPickupSurcharge = false,
  surcharge: SurchargeConfig = DEFAULT_SURCHARGE,
): { min: number; max: number } {
  const fare = calculateFare(distanceMiles, pickupLat, pickupLng, vehicle, isSunday, skipPickupSurcharge, surcharge);
  return {
    min: Math.round(fare * 100) / 100,
    max: Math.round(fare * 1.1 * 100) / 100,
  };
}
