import Head from "next/head";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { SignalCard } from "@/components/signals/SignalCard";
import { EmptyState } from "@/components/EmptyState";
import { Sparkles } from "lucide-react";

export default function SignalsPage() {
  const hasSignals = true; // placeholder: wire to real data

  return (
    <>
      <Head>
        <title>Signals — Project Midori</title>
      </Head>
      <AppShell title="Signals">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Tabs defaultValue="0dte" className="w-auto">
              <TabsList>
                <TabsTrigger value="0dte">0DTE</TabsTrigger>
                <TabsTrigger value="swing">Swing</TabsTrigger>
                <TabsTrigger value="long">Long-Term</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <Select>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Regime" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All regimes</SelectItem>
                  <SelectItem value="trending">Trending</SelectItem>
                  <SelectItem value="range">Range</SelectItem>
                  <SelectItem value="vol">High vol</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="sm">
                Refresh
              </Button>
            </div>
          </div>

          {hasSignals ? (
            <div className="space-y-4">
              <SignalCard
                ticker="SPY"
                direction="bullish"
                mode="0DTE"
                conviction={78}
                strike="582"
                expiry="Today"
                entry="1.85"
                target="2.40"
                stop="1.50"
                regime="Trending"
                compatible={true}
                histProb="67%"
                reasoning="IV percentile low, support at 580, positive momentum. Risk: VIX spike."
              />
              <SignalCard
                ticker="QQQ"
                direction="bearish"
                mode="0DTE"
                conviction={62}
                strike="512"
                expiry="Today"
                entry="2.10"
                target="1.60"
                stop="2.50"
                regime="Range"
                compatible={false}
                histProb="54%"
                reasoning="Resistance at 514, overbought on RSI. Regime suggests caution on directionals."
              />
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="No signals yet"
              subtitle="Run analysis or wait for new setups. Signals appear here with conviction and regime tags."
              action={<Button variant="outline">View Analysis</Button>}
            />
          )}
        </div>
      </AppShell>
    </>
  );
}
