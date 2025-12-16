import { createClient } from '@/utils/supabase/server'
import { PageHeader } from '@/components/page-header'

export default async function SupabaseTestPage() {
  const supabase = await createClient()

  // Test 1: Check auth (session missing is normal)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  const isSessionError = authError?.message === 'Auth session missing!'
  const hasAuthError = authError && !isSessionError

  // Test 2: Try to list tables (this will verify the connection works)
  let connectionTest = { success: false, message: '' }
  try {
    // This query will fail if the anon key is wrong or connection is broken
    const { error: queryError } = await supabase
      .from('_non_existent_table_test_')
      .select('*')
      .limit(1)

    // If we get a "relation does not exist" error, that means connection works!
    if (queryError?.message?.includes('relation') || queryError?.code === '42P01') {
      connectionTest = { success: true, message: 'Database connection verified!' }
    } else if (queryError) {
      connectionTest = { success: false, message: queryError.message }
    } else {
      connectionTest = { success: true, message: 'Connection successful!' }
    }
  } catch (e: any) {
    connectionTest = { success: false, message: e.message }
  }

  return (
    <>
      <PageHeader
        title="Supabase Connection Test"
        description="Testing Supabase database connection"
      />

      <div className="space-y-4">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-2">Database Connection</h3>
          {connectionTest.success ? (
            <div className="text-green-600">
              <p className="font-semibold">✅ {connectionTest.message}</p>
              <p className="text-sm mt-2 text-muted-foreground">Your Supabase client is properly configured and can communicate with the database.</p>
            </div>
          ) : (
            <div className="text-destructive">
              <p className="font-semibold">❌ Connection Failed</p>
              <p className="text-sm mt-2">{connectionTest.message}</p>
              <p className="text-sm mt-2">Check your NEXT_PUBLIC_SUPABASE_ANON_KEY in .env</p>
            </div>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-2">Authentication Status</h3>
          {hasAuthError ? (
            <div className="text-destructive">
              <p>❌ Error: {authError.message}</p>
            </div>
          ) : (
            <div>
              {user ? (
                <p className="text-green-600">✅ Logged in as User ID: {user.id}</p>
              ) : (
                <p className="text-muted-foreground">ℹ️ Not authenticated (no user logged in - this is normal)</p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-2">Configuration</h3>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Supabase URL:</span> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
            <p><span className="font-medium">Anon Key:</span> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***configured***' : '❌ NOT SET'}</p>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-2">How to Use Supabase</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">1. Create Tables in Supabase</h4>
              <p className="text-sm text-muted-foreground mb-2">Go to your <a href="https://supabase.com/dashboard/project/xtmreqzfmmqclqtussny" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Supabase Dashboard</a> and create tables under Table Editor.</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">2. Use in Client Components</h4>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
{`'use client'
import { createClient } from '@/utils/supabase/client'

export default function MyComponent() {
  const supabase = createClient()

  // Insert data
  const { data, error } = await supabase
    .from('your_table')
    .insert({ name: 'John' })

  // Query data
  const { data, error } = await supabase
    .from('your_table')
    .select('*')
}`}
              </pre>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">3. Use in Server Components</h4>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
{`import { createClient } from '@/utils/supabase/server'

export default async function MyPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('your_table')
    .select('*')

  return <div>{/* render data */}</div>
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
