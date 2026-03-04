import Head from "next/head";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

export default function AcademyPage() {
  const paths = [
    { name: "0DTE basics", lessons: 5, done: 2 },
    { name: "Risk & sizing", lessons: 4, done: 0 },
    { name: "Regime & signals", lessons: 6, done: 1 }
  ];
  const lessons = [
    { id: "1", title: "What is 0DTE?", completed: true },
    { id: "2", title: "Why time decay matters", completed: true },
    { id: "3", title: "Entry and exit rules", completed: false },
    { id: "4", title: "Position sizing", completed: false }
  ];

  return (
    <>
      <Head>
        <title>Academy — Project Midori</title>
      </Head>
      <AppShell title="Academy">
        <div className="space-y-8">
          <Card className="overflow-hidden border-green-border bg-gradient-to-b from-green-glow/20 to-transparent">
            <CardContent className="p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-dim text-2xl">
                  🌿
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-text">
                    Midori Academy
                  </h2>
                  <p className="text-sm text-text2">
                    Learn 0DTE, risk, and regime — earn XP as you go.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <h3 className="font-display text-sm font-semibold text-muted mb-3">
              Learning paths
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {paths.map((p) => (
                <Card
                  key={p.name}
                  className="min-w-[200px] shrink-0 p-4 transition-all hover:border-border-hover"
                >
                  <CardTitle className="text-sm">{p.name}</CardTitle>
                  <p className="mt-1 text-xs text-muted">
                    {p.done}/{p.lessons} lessons
                  </p>
                  <Progress
                    value={(p.done / p.lessons) * 100}
                    className="mt-2 h-1.5"
                  />
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-muted mb-3">
              Lessons
            </h3>
            <div className="space-y-2">
              {lessons.map((l) => (
                <Card
                  key={l.id}
                  className="flex items-center justify-between p-4 transition-all hover:bg-surface-hover"
                >
                  <span className="text-sm text-text">{l.title}</span>
                  {l.completed ? (
                    <Badge variant="success" className="gap-1">
                      <Check className="h-3 w-3" />
                      Done
                    </Badge>
                  ) : (
                    <Button variant="ghost" size="sm">
                      Start
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    </>
  );
}
