import Head from "next/head";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import SplineScene from "@/components/SplineScene";

const SPLINE_URL =
  "https://prod.spline.design/HqdfCmOueigtautT/scene.splinecode";

const KPI_DATA = [
  { ticker: "SPY", price: "582.34", change: 0.42, label: "S&P 500" },
  { ticker: "QQQ", price: "512.18", change: -0.12, label: "Nasdaq 100" },
  { ticker: "VIX", price: "14.2", change: -2.1, label: "Volatility" },
  { ticker: "F&G", price: "58", change: 0, label: "Fear & Greed" }
];

function MiniSparkline() {
  const points = Array.from({ length: 20 }, (_, i) => 12 + Math.sin(i * 0.4) * 6);
  const path = points.map((y, i) => `${(i / 19) * 60},${24 - y}`).join(" ");
  return (
    <svg width={60} height={24} className="opacity-80">
      <polyline
        fill="none"
        stroke="var(--green)"
        strokeWidth={1.5}
        points={path}
      />
    </svg>
  );
}

export default function DashboardPage() {
  return (
    <>
      <Head>
        <title>Dashboard — Project Midori</title>
      </Head>
      <AppShell title="Dashboard">
        <div className="grid grid-cols-12 gap-4">
          {/* Row 1 — KPI Strip */}
          <div className="col-span-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            {KPI_DATA.map((k) => (
              <Card key={k.ticker} className="p-4">
                <div className="text-[10px] font-medium uppercase tracking-widest text-muted">
                  {k.ticker}
                </div>
                <div className="mt-1 font-mono text-2xl font-bold text-text">
                  {k.price}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge
                    variant={
                      k.change > 0 ? "success" : k.change < 0 ? "danger" : "outline"
                    }
                  >
                    {k.change > 0 ? "+" : ""}
                    {k.change}%
                  </Badge>
                  <MiniSparkline />
                </div>
                <div className="mt-0.5 text-xs text-muted">{k.label}</div>
              </Card>
            ))}
          </div>

          {/* Row 2 — Chart + Right column */}
          <div className="col-span-12 grid gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-8 min-h-[350px]">
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle>Chart</CardTitle>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      defaultValue="SPY"
                      className="h-8 w-16 rounded-lg border border-border bg-surface px-2 text-xs font-mono"
                    />
                    <Button variant="ghost" size="sm">
                      Update
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
            <div className="lg:col-span-4 grid gap-4">
              <Card className="relative h-[280px] overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between w-full">
                    <CardTitle>Market Visualization</CardTitle>
                    <div className="flex items-center gap-2 rounded-full border border-green-border bg-green-dim px-2 py-0.5 text-[10px] font-medium text-green">
                      <span className="live-dot" />
                      <span>LIVE</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative h-[200px] p-0">
                  <SplineScene url={SPLINE_URL} className="absolute inset-0" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-bg/95" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between w-full">
                    <CardTitle className="text-sm">🌿 Midori&apos;s Daily Brief</CardTitle>
                    <Button variant="ghost" size="sm">
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                  <p className="mt-2 text-sm text-text2 leading-relaxed">
                    Loading today&apos;s brief…
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Row 3 — Setups + Events */}
          <div className="col-span-12 grid gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-8">
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle>Today&apos;s Setups</CardTitle>
                  <Link href="/signals">
                    <Button variant="ghost" size="sm">
                      View All Signals →
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-border bg-surface/50 px-3 py-2"
                    >
                      <Badge variant="success">Bullish</Badge>
                      <span className="font-mono text-sm">SPY</span>
                      <span className="text-xs text-text2 flex-1">
                        Brief description placeholder
                      </span>
                      <div className="h-1.5 w-16 rounded-full bg-border overflow-hidden">
                        <div className="h-full w-2/3 rounded-full bg-green" />
                      </div>
                      <Badge variant="outline">Regime</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <div className="lg:col-span-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">📅 Today&apos;s Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                  <p className="mt-2 text-xs text-muted">Economic events load here.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Macro (FRED)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted">CPI</span>
                      <span className="font-mono text-text">--</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Fed Funds</span>
                      <span className="font-mono text-text">--</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AppShell>
    </>
  );
}
