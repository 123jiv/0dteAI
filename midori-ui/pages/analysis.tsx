import Head from "next/head";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { EmptyState } from "@/components/EmptyState";
import { BrainCircuit } from "lucide-react";

export default function AnalysisPage() {
  const hasResult = false; // placeholder

  return (
    <>
      <Head>
        <title>Analysis — Project Midori</title>
      </Head>
      <AppShell title="Analysis">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>Scenario / Ticker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Ticker</Label>
                <Input placeholder="SPY" />
              </div>
              <div className="space-y-2">
                <Label>Scenario (optional)</Label>
                <Input placeholder="Bull case, base case, bear case" />
              </div>
              <Button className="w-full">Run analysis</Button>
            </CardContent>
          </Card>
          <div className="lg:col-span-7">
            {hasResult ? (
              <Card>
                <CardHeader>
                  <CardTitle>Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text2">Structured result card with scenario outcomes.</p>
                  <Accordion type="single" collapsible className="mt-4">
                    <AccordionItem value="how">
                      <AccordionTrigger className="text-[10px] uppercase tracking-widest text-muted">
                        How Midori decided this
                      </AccordionTrigger>
                      <AccordionContent>
                        Reasoning and data sources appear here.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            ) : (
              <EmptyState
                icon={BrainCircuit}
                title="No analysis run yet"
                subtitle="Enter a ticker and optional scenario, then run analysis. Midori will return scenarios and reasoning."
                action={<Button variant="outline">Run analysis</Button>}
              />
            )}
          </div>
        </div>
      </AppShell>
    </>
  );
}
