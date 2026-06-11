/**
 * Public surface of the design-system primitives.
 *
 * Import sites should pull from this barrel rather than reaching into
 * sibling folders — keeps the primitive list discoverable and refactor-safe.
 */
export { Button } from './button/button';
export type { ButtonVariant, ButtonSize } from './button/button';
export { Input } from './input/input';
export { Card } from './card/card';
export { KpiCard } from './kpi-card/kpi-card';
export type { KpiCardData } from './kpi-card/kpi-card';
export { UserMenu } from './user-menu/user-menu';
export { EmptyState } from './empty-state/empty-state';
export { Icon } from './icon/icon';
export type { IconName } from './icons';
export { SidebarNav } from './sidebar-nav/sidebar-nav';
export type { NavItem, NavGroup } from './sidebar-nav/sidebar-nav';
export { Topbar } from './topbar/topbar';
export { LanguageSwitcher } from './language-switcher/language-switcher';
export { NotificationBell } from './notification-bell/notification-bell';
export { PageHeader } from './page-header/page-header';
export { StatusBadge } from './status-badge/status-badge';
export type { StatusVariant } from './status-badge/status-badge';
