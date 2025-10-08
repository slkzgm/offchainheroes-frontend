import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const repeated = (count: number) => Array.from({ length: count }, (_, index) => index)

interface BotDashboardSkeletonProps {
  label: string
}

export function BotDashboardSkeleton({ label }: BotDashboardSkeletonProps) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="space-y-8" aria-hidden="true">
        <div className="grid gap-6 xl:grid-cols-[1.6fr,1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                <Skeleton className="h-4 w-40" />
              </CardTitle>
              <CardDescription>
                <Skeleton className="mt-2 h-3 w-56" />
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="space-y-3 rounded-lg border border-border/60 bg-background/60 p-4">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-44" />
                <Skeleton className="h-3 w-52" />
              </div>
              <Skeleton className="h-3 w-56" />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  <Skeleton className="h-4 w-36" />
                </CardTitle>
                <CardDescription>
                  <Skeleton className="mt-2 h-3 w-60" />
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {repeated(4).map((item) => (
                  <div key={item} className="rounded-lg border border-border/60 bg-background/50 p-3">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="mt-2 h-5 w-24" />
                    <Skeleton className="mt-2 h-3 w-40" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  <Skeleton className="h-4 w-32" />
                </CardTitle>
                <CardDescription>
                  <Skeleton className="mt-2 h-3 w-56" />
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {repeated(3).map((item) => (
                  <div key={item} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-12 rounded-full" />
                  </div>
                ))}
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>

            <Card className="border border-sky-500/25">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[3fr,2fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                <Skeleton className="h-4 w-36" />
              </CardTitle>
              <CardDescription>
                <Skeleton className="mt-2 h-3 w-64" />
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {repeated(4).map((item) => (
                  <div key={item} className="rounded-xl border border-border/50 bg-background/60 p-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="mt-3 h-6 w-24" />
                    <Skeleton className="mt-2 h-3 w-28" />
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-border/50 bg-background/60 p-4">
                <Skeleton className="h-24 w-full" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                <Skeleton className="h-4 w-40" />
              </CardTitle>
              <CardDescription>
                <Skeleton className="mt-2 h-3 w-48" />
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {repeated(4).map((item) => (
                <div key={item} className="space-y-2 rounded-lg border border-border/60 p-3">
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="h-3 w-44" />
                  <Skeleton className="h-3 w-48" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              <Skeleton className="h-4 w-40" />
            </CardTitle>
            <CardDescription>
              <Skeleton className="mt-2 h-3 w-64" />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {repeated(5).map((item) => (
              <div key={item} className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/60">
                <div className="grid gap-3 p-3 sm:grid-cols-[160px,1fr]">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
