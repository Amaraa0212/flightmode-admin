import {
  Armchair,
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpenText,
  Building2,
  CalendarClock,
  ClipboardList,
  FileText,
  Gauge,
  Handshake,
  LayoutDashboard,
  Luggage,
  Map,
  PackageOpen,
  Plane,
  PlaneTakeoff,
  Scale,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  Tags,
  Ticket,
  TowerControl,
  Users,
} from 'lucide-react'
import type { AuthUser } from '@/services/types/shared/auth.types'
import { type NavGroup, type SidebarData } from '../types'

/** Menu follows the legacy flightmodev2 admin (components/side.blade.php) */
export const sidebarData: SidebarData = {
  user: { name: 'Admin', email: 'admin@flightmode.mn', avatar: '' },
  teams: [],
  navGroups: [
    {
      title: 'General',
      items: [{ title: 'Dashboard', url: '/', permission: 'dashboard.view', icon: LayoutDashboard }],
    },
    {
      title: 'Aircraft management',
      items: [
        { title: 'Fleets', url: '/fleet/aircraft', permission: 'aircraft.manage', icon: Plane },
        { title: 'Seatmap', url: '/fleet/seat-maps', permission: 'aircraft.manage', icon: Armchair },
      ],
    },
    {
      title: 'Flight',
      items: [
        {
          title: 'Flight schedule',
          icon: CalendarClock,
          items: [
            { title: 'Single flight', url: '/operations/flights', permission: 'flights.view' },
            {
              title: 'Frequency-based flight',
              url: '/operations/flight-series', permission: 'flights.manage',
            },
            { title: 'Assign quota to agency', url: '/operations/allocations', permission: 'allocations.manage' },
          ],
        },
        { title: 'Flight load', url: '/operations/flight-load', permission: 'flights.view', icon: Gauge },
      ],
    },
    {
      title: 'DCS',
      items: [
        {
          title: 'Flight manager',
          url: '/dcs/flight-manager', permission: 'flights.operate',
          icon: TowerControl,
        },
        { title: 'Seat block', url: '/dcs/seat-block', permission: 'seat_blocks.manage', icon: Map },
        { title: 'Manifest', url: '/dcs/manifest', permission: 'reports.view', icon: ClipboardList },
        {
          title: 'Бүртгэлийн түүх',
          url: '/dcs/activity-log', permission: 'activity_logs.view',
          icon: BookOpenText,
        },
      ],
    },
    {
      title: 'Airport',
      items: [
        { title: 'Company', url: '/company/airlines', permission: 'airlines.manage', icon: Building2 },
        { title: 'Airports', url: '/company/airports', permission: 'reference.manage', icon: PlaneTakeoff },
        { title: 'Agencies', url: '/company/agencies', permission: 'agencies.manage', icon: Handshake },
        {
          title: 'Agents permission',
          url: '/company/agency-access', permission: 'airlines.manage',
          icon: BadgeCheck,
        },
      ],
    },
    {
      title: 'Rules and ancillary',
      items: [
        {
          title: 'Rules',
          icon: SlidersHorizontal,
          items: [
            { title: 'Check-in hierarchy', url: '/rules/checkin-hierarchy', permission: 'products.manage' },
            { title: 'Baggage rules', url: '/rules/baggage-rules', permission: 'products.manage' },
            { title: 'Seat rules', url: '/rules/seat-rules', permission: 'products.manage' },
            { title: 'SSR', url: '/rules/ssr', permission: 'products.manage' },
            { title: 'Template', url: '/rules/templates', permission: 'products.manage' },
            { title: 'Pag tag position', url: '/rules/bag-tag', permission: 'products.manage' },
          ],
        },
        {
          title: 'Shop items',
          url: '/rules/flight-products', permission: 'products.manage',
          icon: PackageOpen,
        },
      ],
    },
    {
      title: 'Inventory',
      items: [
        { title: 'Fare and pricing', url: '/inventory/fares', permission: 'fares.manage', icon: Tags },
        { title: 'Modification', url: '/inventory/bookings', permission: 'bookings.view', icon: Ticket },
        {
          title: 'Override baggage allowance',
          url: '/inventory/baggage-overrides', permission: 'products.manage',
          icon: Luggage,
        },
        {
          title: 'Conditions of carriage',
          url: '/inventory/carriage', permission: 'products.manage',
          icon: Scale,
        },
      ],
    },
    {
      title: 'Reports',
      items: [
        {
          title: 'Reports',
          icon: BarChart3,
          items: [
            { title: 'Traffic & PAX summary', url: '/reports/traffic', permission: 'reports.view' },
            { title: 'PNL report', url: '/reports/pnl', permission: 'reports.view' },
            { title: 'Fare info', url: '/reports/fare-info', permission: 'reports.view' },
            { title: 'Sales report', url: '/reports/sales', permission: 'reports.view' },
            { title: 'Station report', url: '/reports/station', permission: 'reports.view' },
          ],
        },
        { title: 'PAX search', url: '/reports/pax-search', permission: 'reports.view', icon: Search },
      ],
    },
    {
      title: 'Requests & access',
      items: [
        {
          title: 'Requests from agencies',
          url: '/requests/charter', permission: 'charters.view',
          icon: Tag,
        },
        { title: 'Users', url: '/access/users', permission: 'users.manage', icon: Users },
        { title: 'Roles', url: '/access/roles', permission: 'roles.manage', icon: ShieldCheck },
      ],
    },
    {
      title: 'System',
      items: [
        { title: 'Notifications', url: '/system/notifications', permission: 'announcements.manage', icon: Bell },
        { title: 'Terms & condition', url: '/system/terms', permission: 'reference.manage', icon: FileText },
      ],
    },
  ],
}

/** Menu entries the user's permissions allow; groups and sub-menus without any are dropped */
export function visibleNavGroups(user: AuthUser | null): NavGroup[] {
  const allowed = (permission?: string) =>
    !permission || (!!user && (user.is_system_admin || user.permissions.includes(permission)))

  return sidebarData.navGroups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) =>
          item.items ? { ...item, items: item.items.filter((sub) => allowed(sub.permission)) } : item
        )
        .filter((item) => (item.items ? item.items.length > 0 : allowed(item.permission))),
    }))
    .filter((group) => group.items.length > 0)
}

/** Any back-office screen at all (agency and gate-only logins use their own apps) */
export function hasBackOfficeAccess(user: AuthUser) {
  return visibleNavGroups(user).length > 0
}

/** URL of the first menu entry the user may open */
export function firstAllowedUrl(user: AuthUser | null): string | undefined {
  const first = visibleNavGroups(user)[0]?.items[0]
  if (!first) return undefined
  return String(first.items ? first.items[0].url : first.url)
}
