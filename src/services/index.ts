/**
 * Services barrel — organized by area.
 * API холболт хийгдээгүй: бүх service mock/db.ts дээр ажиллана.
 */

// ─── Shared ───
export { authService } from './api/shared/auth.service'

// ─── Reference ───
export {
  airportService,
  airportOptions,
  airlineOptions,
} from './api/reference/airport.service'

// ─── Organisation ───
export { airlineService } from './api/organisation/airline.service'
export {
  agencyService,
  agencyContractService,
  agencyOptions,
} from './api/organisation/agency.service'
export {
  userService,
  roleService,
  type RolePayload,
} from './api/organisation/user.service'

// ─── Fleet ───
export { aircraftService, aircraftOptions } from './api/fleet/aircraft.service'
export {
  seatMapService,
  loadZoneService,
  seatProfileService,
} from './api/fleet/seat-map.service'

// ─── Operations ───
export {
  flightService,
  flightSeriesService,
  allocationService,
  flightOptions,
  type FlightSeriesPayload,
  type AllocationPayload,
} from './api/operations/flight.service'
export {
  flightOpsService,
  flightPassengerService,
  type FlightBoardRow,
} from './api/operations/flight-ops.service'

// ─── Rules & ancillary / inventory ───
export {
  seatPriceService,
  airlineSsrService,
  serviceTemplateService,
  flightProductService,
  bagTagLayoutService,
  baggageOverrideService,
  baggageRuleOptions,
  seatPriceOptions,
} from './api/rules/rules.service'

// ─── Reports ───
export {
  reportService,
  type TrafficRow,
  type StationRow,
  type SalesRow,
} from './api/reports/report.service'

// ─── Sales ───
export {
  bookingService,
  charterRequestService,
} from './api/sales/booking.service'

// ─── Products ───
export { fareService, baggageRuleService } from './api/products/product.service'

// ─── System ───
export {
  activityLogService,
  announcementService,
  dashboardService,
  requiredNotificationService,
  policyDocumentService,
  carriageService,
} from './api/system/system.service'

// ─── Types ───
export * from './types/shared/common.types'
export * from './types/shared/auth.types'
export * from './types/reference/reference.types'
export * from './types/organisation/organisation.types'
export * from './types/fleet/aircraft.types'
export * from './types/operations/flight.types'
export * from './types/sales/booking.types'
export * from './types/products/product.types'
export * from './types/system/system.types'
