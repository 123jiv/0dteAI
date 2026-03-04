import Head from "next/head";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, FileText, Activity } from "lucide-react";

export default function MethodologyPage() {
  const sources = [
    { name: "Polygon", desc: "Options & equity data" },
    { name: "Alpaca", desc: "Market data" },
    { name: "FRED", desc: "Macro indicators" },
    { name: "Alternative.me", desc: "Fear & Greed" }
  ];

  return (
    <>
      <Head>
        <title>Methodology — Project Midori</title>
      </Head>
      <AppShell title="Methodology">
        <div className="space-y-8">
          <section>
            <h2 className="font-display text-lg font-bold text-text border-l-4 border-green pl-3">
              How we build signals
            </h2>
            <p className="mt-3 text-sm text-text2 leading-relaxed max-w-2xl">
              Midori uses regime detection, volatility context, and backtested
              rules to suggest 0DTE setups. All assumptions and data sources are
              documented here. No black boxes.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-text border-l-4 border-green pl-3">
              Data sources
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {sources.map((s) => (
                <Card key={s.name} className="p-4 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-muted">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{s.name}</CardTitle>
                    <p className="text-xs text-muted">{s.desc}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-text border-l-4 border-green pl-3">
              Activity log
            </h2>
            <Card className="mt-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Recent activity</CardTitle>
                  <Button variant="ghost" size="sm">
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[10px] uppercase tracking-widest text-muted">
                        <th className="pb-2 pr-4">Time</th>
                        <th className="pb-2 pr-4">Event</th>
                        <th className="pb-2">Details</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-text2">
                      <tr className="border-b border-border">
                        <td className="py-2 pr-4">—</td>
                        <td className="py-2 pr-4">—</td>
                        <td className="py-2">—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </AppShell>
    </>
  );
}
