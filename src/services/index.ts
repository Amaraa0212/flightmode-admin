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
  countryOptions,
  referenceLookupService,
  type IataAirport,
  type CityOption,
} from './api/reference/airport.service'

// ─── Organisation ───
export { airlineService } from './api/organisation/airline.service'
export {
  agencyService,
  agencyContractService,
  agencyOptions,
  quotaAgencyOptions,
  agencyAccountService,
  type AgencyAccountRow,
  type AgencyAccountTransactionRow,
} from './api/organisation/agency.service'
export {
  userService,
  roleService,
  type RolePayload,
} from './api/organisation/user.service'
export { menuService, ipAccessService } from './api/organisation/access.service'

// ─── Fleet ───
export {
  aircraftService,
  aircraftOptions,
  parseSeatConfiguration,
} from './api/fleet/aircraft.service'
export {
  seatMapService,
  loadZoneService,
  seatProfileService,
} from './api/fleet/seat-map.service'

// ─── Operations ───
export {
  flightService,
  type FlightsBulkPayload,
  type FlightTemplate,
  flightSeriesService,
  allocationService,
  flightOptions,
  charterFlightOptions,
  type FlightSeriesPayload,
  type AllocationPayload,
} from './api/operations/flight.service'
export {
  allocationBoardService,
  type BoardAllocation,
  type DistributeRow,
  type FlightQuota,
} from './api/operations/allocation-board.service'
export {
  flightOpsService,
  flightPassengerService,
  type CalendarFlight,
  type FlightBoardRow,
  type PaxCounts,
  type Reconciliation,
  type ReconciliationResult,
} from './api/operations/flight-ops.service'

export {
  inventoryService,
  inventoryAllocationService,
  inventoryTemplateService,
  inventoryTemplateOptions,
} from './api/operations/inventory.service'

// ─── Rules & ancillary / inventory ───
export {
  seatPriceService,
  airlineSsrService,
  serviceTemplateService,
  flightProductService,
  bagTagService,
  type BagTagAirline,
  baggageOverrideService,
  baggageRuleOptions,
  seatPriceOptions,
} from './api/rules/rules.service'

// ─── Reports ───
export {
  reportService,
  type TrafficRow,
  type TrafficTotals,
  type SalesSummaryRow,
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
export {
  fareFamilyService,
  fareCombinationService,
  rbdService,
  fareClassService,
  fareEntryService,
  taxCodeService,
  fareTaxService,
  rbdModificationService,
  rbdOptions,
  fareClassOptions,
  taxCodeOptions,
} from './api/products/fare-setting.service'

// ─── System ───
export {
  activityLogService,
  announcementService,
  dashboardService,
  issueReportService,
  requiredNotificationService,
  ALL_AIRLINES,
  announcementFeedService,
  type FeedAnnouncement,
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
export * from './types/operations/inventory.types'
export * from './types/sales/booking.types'
export * from './types/products/product.types'
export * from './types/products/fare-setting.types'
export * from './types/system/system.types'

// ─── Agency portal ───
export {
  agencyPortalService,
  agencyHoldService,
  agencyAccountPortalService,
  agencyBookingService,
  type AgencyBooking,
  type AgencyBookingPax,
  type AgencyBookingSegment,
  type AgencyFlight,
  type AgencyFare,
  type AgencyHold,
  type AgencyAccount,
  type AccountTransaction,
  type AgencyQuota,
  type AgencyPassenger,
  type AgencyBookingPassenger,
  type AgencyBookingInfant,
  type AgencyPassengerDetail,
  type AgencyPassengerEdit,
  type AgencySsrOption,
  type AgencyReturnOption,
  type EticketOptions,
  type AgencyScheduleChanges,
  type AgencyRights,
  type AgencySeatMap,
  type AgencySeatPassenger,
} from './api/agency/agency-portal.service'
