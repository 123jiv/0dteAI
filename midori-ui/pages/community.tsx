import Head from "next/head";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageCircle, Users, BookOpen } from "lucide-react";

export default function CommunityPage() {
  const comingSoonFeatures = [
    { icon: MessageCircle, title: "Discord", desc: "Join the Midori Discord for live chat and support." },
    { icon: Users, title: "Traders circle", desc: "Share anonymized stats and learn from others." },
    { icon: BookOpen, title: "Weekly recap", desc: "Email digest of your week and top insights." }
  ];

  return (
    <>
      <Head>
        <title>Community — Project Midori</title>
      </Head>
      <AppShell title="Community">
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {comingSoonFeatures.map((f) => (
              <Card
                key={f.title}
                className="relative overflow-hidden p-6 opacity-90"
              >
                <div className="absolute inset-0 bg-bg/60 backdrop-blur-sm" />
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface text-muted">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="mt-3 text-sm">{f.title}</CardTitle>
                  <p className="mt-1 text-xs text-text2">{f.desc}</p>
                  <Badge variant="outline" className="mt-3">
                    Coming soon
                  </Badge>
                </div>
              </Card>
            ))}
          </div>

          <Card className="max-w-md mx-auto p-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4" />
                Get notified
              </CardTitle>
              <p className="text-xs text-muted">
                We&apos;ll email you when community features launch.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="community-email">Email</Label>
                <Input id="community-email" type="email" placeholder="you@example.com" />
              </div>
              <Button className="mt-4 w-full">Notify me</Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    </>
  );
}
