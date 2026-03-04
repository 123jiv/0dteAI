import Head from "next/head";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { ChartCandlestick } from "lucide-react";

export default function BacktestPage() {
  const hasRun = false; // placeholder

  return (
    <>
      <Head>
        <title>Backtest — Project Midori</title>
      </Head>
      <AppShell title="Backtest">
        <div className="space-y-6">
          {hasRun ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Equity curve</CardTitle>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
                {["Return %", "Win rate", "Sharpe", "Max DD", "Trades", "Avg hold"].map(
                  (label, i) => (
                    <Card key={label} className="p-4">
                      <div className="text-[10px] uppercase tracking-widest text-muted">
                        {label}
                      </div>
                      <div className="mt-1 font-mono text-lg font-bold text-text">
                        —
                      </div>
                    </Card>
                  )
                )}
              </div>
              <Card className="border-l-4 border-l-yellow-400">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Backtest Quality Report</CardTitle>
                    <Badge variant="warning">Review</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="list-inside list-disc text-sm text-text2">
                    <li>Sample size warning</li>
                    <li>Overfitting risk</li>
                  </ul>
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState
              icon={ChartCandlestick}
              title="No backtest run yet"
              subtitle="Configure and run a backtest. Equity curve and quality report will appear here."
              action={<Button variant="outline">Run backtest</Button>}
            />
          )}
        </div>
      </AppShell>
    </>
  );
}
