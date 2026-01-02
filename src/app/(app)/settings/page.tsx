
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Manage your application settings." />

      <div className="space-y-8">
        {/* Account & Users */}
        <div>
          <Label className="text-base font-semibold mb-4 block">Account & Users</Label>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon name="UserCog" className="h-4 w-4" />
                  User Profile
                </CardTitle>
                <CardDescription className="text-xs">Your personal profile information</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/settings/profile">
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    View Profile
                    <Icon name="ChevronRight" className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon name="UsersRound" className="h-4 w-4" />
                  User Management
                </CardTitle>
                <CardDescription className="text-xs">Manage accounts, roles, and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/settings/users">
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    Manage Users
                    <Icon name="ChevronRight" className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Company Settings */}
        <div>
          <Label className="text-base font-semibold mb-4 block">Company Settings</Label>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon name="Settings" className="h-4 w-4" />
                  Company Information
                </CardTitle>
                <CardDescription className="text-xs">Company details for documents</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/settings/company">
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    Company Settings
                    <Icon name="ChevronRight" className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon name="Truck" className="h-4 w-4" />
                  Vendors
                </CardTitle>
                <CardDescription className="text-xs">Manage vendors and distributors</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/settings/vendors">
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    Manage Vendors
                    <Icon name="ChevronRight" className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Product & Inventory */}
        <div>
          <Label className="text-base font-semibold mb-4 block">Product & Inventory</Label>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon name="FolderTree" className="h-4 w-4" />
                  Subcategories
                </CardTitle>
                <CardDescription className="text-xs">Organize products with subcategories</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/settings/subcategories">
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    Manage Subcategories
                    <Icon name="ChevronRight" className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon name="Link" className="h-4 w-4" />
                  Chainlink Pricing
                </CardTitle>
                <CardDescription className="text-xs">Configure material pricing for estimates</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/settings/chainlink">
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    Chainlink Settings
                    <Icon name="ChevronRight" className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Customization */}
        <div>
          <Label className="text-base font-semibold mb-4 block">Customization</Label>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon name="LayoutDashboard" className="h-4 w-4" />
                  Dashboard
                </CardTitle>
                <CardDescription className="text-xs">Customize widgets and alert thresholds</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/settings/dashboard">
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    Dashboard Settings
                    <Icon name="ChevronRight" className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon name="Paintbrush" className="h-4 w-4" />
                  Appearance
                </CardTitle>
                <CardDescription className="text-xs">Customize the look and feel</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/settings/appearance">
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    Theme Settings
                    <Icon name="ChevronRight" className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
