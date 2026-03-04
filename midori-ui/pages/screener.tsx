import Head from "next/head";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/EmptyState";
import { Grid3X3 } from "lucide-react";

export default function ScreenerPage() {
  const hasResults = false; // placeholder

  return (
    <>
      <Head>
        <title>Screener — Project Midori</title>
      </Head>
      <AppShell title="Screener">
        <div className="space-y-6">
          <Tabs defaultValue="options">
            <TabsList>
              <TabsTrigger value="options">Options</TabsTrigger>
              <TabsTrigger value="stocks">Stocks</TabsTrigger>
              <TabsTrigger value="multi">Multi-asset</TabsTrigger>
              <TabsTrigger value="value">Value</TabsTrigger>
            </TabsList>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Input placeholder="Symbol" className="w-24" />
              <Input placeholder="Min volume" className="w-24" />
              <Button variant="ghost" size="sm">
                Apply
              </Button>
            </div>
            <TabsContent value="options" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Options results</CardTitle>
                </CardHeader>
                <CardContent>
                  {hasResults ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-[10px] uppercase tracking-widest text-muted">
                            <th className="pb-2 pr-4">Symbol</th>
                            <th className="pb-2 pr-4">Strike</th>
                            <th className="pb-2 pr-4">Bid</th>
                            <th className="pb-2 pr-4">Ask</th>
                            <th className="pb-2">ITM/OTM</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono text-text2">
                          <tr className="border-b border-border bg-green-glow/30">
                            <td className="py-2 pr-4">SPY</td>
                            <td className="py-2 pr-4">582</td>
                            <td className="py-2 pr-4">1.20</td>
                            <td className="py-2 pr-4">1.25</td>
                            <td className="py-2">ITM</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState
                      icon={Grid3X3}
                      title="No options results yet"
                      subtitle="Set filters and run the screener. Results will show here with ITM/OTM styling."
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="stocks" className="mt-4">
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    icon={Grid3X3}
                    title="No stock results yet"
                    subtitle="Run the stock screener with your criteria."
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="multi" className="mt-4">
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    icon={Grid3X3}
                    title="No multi-asset results"
                    subtitle="Run the multi-asset screener."
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="value" className="mt-4">
              <Card>
                <CardContent className="py-8">
                  <EmptyState
                    icon={Grid3X3}
                    title="No value screener results"
                    subtitle="Run the value screener."
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </AppShell>
    </>
  );
}
