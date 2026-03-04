import Head from "next/head";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export default function ConfidencePage() {
  return (
    <>
      <Head>
        <title>Confidence — Project Midori</title>
      </Head>
      <AppShell title="Confidence">
        <div className="space-y-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Ticker</Label>
              <Input placeholder="SPY" className="w-32" />
            </div>
            <Button>Refresh</Button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Direction", value: 72, desc: "Bullish bias" },
              { label: "Magnitude", value: 58, desc: "Moderate move" },
              { label: "Timing", value: 65, desc: "Intraday" }
            ].map((item) => (
              <Card key={item.label} className="p-5">
                <div className="flex justify-center">
                  <div className="relative h-24 w-24">
                    <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        stroke="var(--border)"
                        strokeWidth="3"
                        fill="none"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        stroke="var(--green)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray="94.2"
                        strokeDashoffset={94.2 - (94.2 * item.value) / 100}
                        fill="none"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-mono text-2xl font-bold text-text">
                        {item.value}%
                      </span>
                    </div>
                  </div>
                </div>
                <CardTitle className="mt-2 text-sm">{item.label}</CardTitle>
                <p className="mt-0.5 text-xs text-muted">{item.desc}</p>
                <p className="mt-2 text-[10px] text-muted">Last updated: —</p>
              </Card>
            ))}
          </div>
        </div>
      </AppShell>
    </>
  );
}
