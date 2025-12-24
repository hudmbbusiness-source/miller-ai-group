'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle, Database, User, Shield, HardDrive, RefreshCw } from 'lucide-react'

interface VerificationResult {
  auth: {
    status: boolean
    userId: string | null
    email: string | null
  }
  owner: {
    status: boolean
    ownerId: string | null
    isOwner: boolean
  }
  tables: {
    name: string
    count: number
    status: boolean
  }[]
  storage: {
    status: boolean
    buckets: string[]
    error?: string
  }
  timestamp: string
}

export default function AdminVerifyPage() {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<VerificationResult | null>(null)

  const runVerification = async () => {
    setLoading(true)
    const supabase = createClient()

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()

    // Check owner
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: settings } = await (supabase.from('site_settings') as any)
      .select('owner_user_id')
      .single() as { data: { owner_user_id: string | null } | null }

    // Check tables
    const tables = [
      'profiles',
      'notes',
      'boards',
      'pins',
      'saved_links',
      'files_index',
      'z_project_items',
      'site_content',
      'site_settings',
      'resume_items',
      'projects',
      'project_links',
      'business_card_settings',
    ]

    const tableResults = await Promise.all(
      tables.map(async (table) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { count, error } = await (supabase.from(table) as any)
            .select('*', { count: 'exact', head: true })

          return {
            name: table,
            count: count || 0,
            status: !error,
          }
        } catch {
          return {
            name: table,
            count: 0,
            status: false,
          }
        }
      })
    )

    // Check storage
    let storageResult = { status: false, buckets: [] as string[], error: undefined as string | undefined }
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets()
      if (error) {
        storageResult = { status: false, buckets: [], error: error.message }
      } else {
        storageResult = { status: true, buckets: buckets.map(b => b.name), error: undefined }
      }
    } catch (e) {
      storageResult = { status: false, buckets: [], error: String(e) }
    }

    setResult({
      auth: {
        status: !!user,
        userId: user?.id || null,
        email: user?.email || null,
      },
      owner: {
        status: !!settings,
        ownerId: settings?.owner_user_id || null,
        isOwner: user?.id === settings?.owner_user_id,
      },
      tables: tableResults,
      storage: storageResult,
      timestamp: new Date().toISOString(),
    })

    setLoading(false)
  }

  useEffect(() => {
    runVerification()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!result) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to run verification</p>
      </div>
    )
  }

  const StatusBadge = ({ status }: { status: boolean }) => (
    <Badge variant={status ? 'default' : 'destructive'} className="gap-1">
      {status ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {status ? 'OK' : 'Error'}
    </Badge>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Verification</h1>
          <p className="text-muted-foreground mt-1">Admin-only system integrity check</p>
        </div>
        <Button onClick={runVerification} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Re-run
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Last checked: {new Date(result.timestamp).toLocaleString()}
      </p>

      {/* Auth Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5" />
              <CardTitle>Authentication</CardTitle>
            </div>
            <StatusBadge status={result.auth.status} />
          </div>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">User ID</dt>
              <dd className="font-mono">{result.auth.userId || 'Not authenticated'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{result.auth.email || 'N/A'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Owner Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <CardTitle>Owner Configuration</CardTitle>
            </div>
            <StatusBadge status={result.owner.status && result.owner.isOwner} />
          </div>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Owner Configured</dt>
              <dd>{result.owner.status ? 'Yes' : 'No'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Owner User ID</dt>
              <dd className="font-mono">{result.owner.ownerId || 'Not set'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Current User is Owner</dt>
              <dd>
                <Badge variant={result.owner.isOwner ? 'default' : 'secondary'}>
                  {result.owner.isOwner ? 'Yes' : 'No'}
                </Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Database Tables */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              <CardTitle>Database Tables</CardTitle>
            </div>
            <StatusBadge status={result.tables.every(t => t.status)} />
          </div>
          <CardDescription>
            Record counts per table
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {result.tables.map((table) => (
              <div
                key={table.name}
                className={`p-3 rounded-lg border ${
                  table.status ? 'bg-muted/30' : 'bg-destructive/10 border-destructive/20'
                }`}
              >
                <p className="font-mono text-sm">{table.name}</p>
                <p className="text-2xl font-bold">
                  {table.status ? table.count : 'Error'}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Storage */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              <CardTitle>Storage</CardTitle>
            </div>
            <StatusBadge status={result.storage.status} />
          </div>
        </CardHeader>
        <CardContent>
          {result.storage.status ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Available buckets:</p>
              <div className="flex flex-wrap gap-2">
                {result.storage.buckets.length > 0 ? (
                  result.storage.buckets.map((bucket) => (
                    <Badge key={bucket} variant="outline">{bucket}</Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No buckets found</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-destructive">{result.storage.error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
