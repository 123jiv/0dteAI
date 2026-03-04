import Head from "next/head";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";

export default function RiskCenterPage() {
  const { addToast } = useToast();

  return (
    <>
      <Head>
        <title>Risk Center — Project Midori</title>
      </Head>
      <AppShell title="Risk Center">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Risk Guardrails</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max daily loss %</Label>
                    <Input type="number" placeholder="2" />
                  </div>
                  <div className="space-y-2">
                    <Label>Max trades per day</Label>
                    <Input type="number" placeholder="5" />
                  </div>
                  <div className="space-y-2">
                    <Label>Max position size %</Label>
                    <Input type="number" placeholder="5" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cooldown after loss</Label>
                    <Input type="text" placeholder="15 min" />
                  </div>
                </div>
                <Button
                  className="mt-4 w-full"
                  onClick={() => addToast("✓ Guardrails saved", "success")}
                >
                  Save Guardrails
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ATR Position Sizing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Account size ($)</Label>
                      <Input type="number" placeholder="25000" />
                    </div>
                    <div className="space-y-2">
                      <Label>Risk per trade %</Label>
                      <Input type="number" placeholder="1" />
                    </div>
                    <div className="space-y-2">
                      <Label>ATR (14)</Label>
                      <Input type="text" placeholder="2.50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Entry — Stop distance</Label>
                      <Input type="text" placeholder="0.50" />
                    </div>
                  </div>
                  <Button className="w-full">Calculate</Button>
                  <div className="rounded-lg border border-border bg-surface/50 p-4 font-mono text-sm text-text2">
                    Position size result appears here after calculation.
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session Cooldown System</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Session start equity</Label>
                    <Input type="number" placeholder="25000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Current equity</Label>
                    <Input type="number" placeholder="24750" />
                  </div>
                </div>
                <Button className="mt-4 w-full">Update</Button>
                <div className="mt-4 font-mono text-5xl font-bold text-green">
                  -1.0%
                </div>
                <p className="text-xs text-muted mt-1">Drawdown this session</p>
                <div className="mt-4 space-y-2">
                  {["Tier 0: No halt", "Tier 1: Reduce size", "Tier 2: 1 trade/hr", "Tier 3: Halt"].map(
                    (tier, i) => (
                      <div
                        key={tier}
                        className={`rounded-lg border px-3 py-2 text-sm ${
                          i === 0
                            ? "border-green-border bg-green-dim/30 text-green"
                            : "border-border text-muted"
                        }`}
                      >
                        {tier}
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <Card className="text-center">
              <CardHeader>
                <CardTitle>Account Health Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <div className="relative h-32 w-32">
                    <svg viewBox="0 0 36 36" className="h-32 w-32 -rotate-90">
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
                        strokeDashoffset="28.2"
                        fill="none"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-mono text-4xl font-bold text-green">72</span>
                      <span className="text-xs font-medium text-green">Healthy</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-left text-sm">
                  <div className="flex items-center justify-between text-green">
                    <span>Daily loss within limit</span>
                    <span>✅</span>
                  </div>
                  <div className="flex items-center justify-between text-green">
                    <span>Trade count OK</span>
                    <span>✅</span>
                  </div>
                  <div className="flex items-center justify-between text-red-400">
                    <span>Cooldown active</span>
                    <span>-0 pts</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Portfolio Stress Test</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text2">
                  Run stress test to see impact of a -5% / -10% move. Results appear here.
                </p>
                <Button variant="outline" className="mt-3 w-full">
                  Run stress test
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Max Drawdown Tracker</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Current drawdown</span>
                    <span className="font-mono text-text">-2.4%</span>
                  </div>
                  <Progress value={24} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppShell>
    </>
  );
}
