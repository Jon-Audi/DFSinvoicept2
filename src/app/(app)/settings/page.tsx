
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Icon, type IconName } from '@/components/icons';
import { cn } from '@/lib/utils';

interface SettingsCardProps {
  icon: IconName;
  title: string;
  description: string;
  href: string;
  iconColor?: string;
}

function SettingsCard({ icon, title, description, href, iconColor = 'text-primary' }: SettingsCardProps) {
  return (
    <Link href={href} className="group">
      <div className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:bg-accent/30 hover:border-primary/40 transition-all duration-200 h-full shadow-sm hover:shadow-md">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/15 transition-colors", iconColor)}>
          <Icon name={icon} className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
        <Icon name="ChevronRight" className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary/70 shrink-0 mt-0.5 transition-all group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-0.5">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Manage your application preferences and configuration." />

      <div className="space-y-8">
        <SettingsSection title="Account & Users">
          <SettingsCard
            icon="UserCog"
            title="User Profile"
            description="Update your name, photo, password, and notification preferences"
            href="/settings/profile"
          />
          <SettingsCard
            icon="UsersRound"
            title="User Management"
            description="Manage employee accounts, roles, permissions, and password resets"
            href="/settings/users"
          />
        </SettingsSection>

        <SettingsSection title="Company">
          <SettingsCard
            icon="Settings"
            title="Company Information"
            description="Business details shown on invoices, orders, and estimates"
            href="/settings/company"
          />
          <SettingsCard
            icon="Truck"
            title="Vendors"
            description="Manage supplier and distributor contacts"
            href="/settings/vendors"
          />
        </SettingsSection>

        <SettingsSection title="Products & Inventory">
          <SettingsCard
            icon="FolderTree"
            title="Subcategories"
            description="Organize your product catalog with subcategory labels"
            href="/settings/subcategories"
          />
          <SettingsCard
            icon="Link"
            title="Chainlink Pricing"
            description="Configure material pricing formulas for fence estimates"
            href="/settings/chainlink"
          />
        </SettingsSection>

        <SettingsSection title="Customization">
          <SettingsCard
            icon="LayoutDashboard"
            title="Dashboard"
            description="Choose which widgets and alerts appear on your dashboard"
            href="/settings/dashboard"
          />
          <SettingsCard
            icon="Paintbrush"
            title="Appearance"
            description="Switch between light and dark mode and customize the theme"
            href="/settings/appearance"
          />
        </SettingsSection>
      </div>
    </>
  );
}
