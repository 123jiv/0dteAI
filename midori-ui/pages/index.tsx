import Head from "next/head";
import Link from "next/link";
import SplineScene from "@/components/SplineScene";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Shield, BrainCircuit, Sparkles, BarChart3, Gauge, FileText } from "lucide-react";

const SPLINE_URL =
  "https://prod.spline.design/HqdfCmOueigtautT/scene.splinecode";

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>Project Midori — Smarter, Safer Trading</title>
      </Head>
      <div className="relative min-h-screen overflow-hidden bg-bg text-white">
        <div className="bg-grid" />
        <div className="bg-glow" />

        <SplineScene
          url={SPLINE_URL}
          className="pointer-events-auto absolute inset-0 z-0 opacity-85"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-72 bg-gradient-to-b from-transparent to-bg" />

        <header className="fixed inset-x-0 top-0 z-20 border-b border-border bg-[rgba(8,12,10,0.78)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-green-dim">
                <span className="text-lg">🌿</span>
              </div>
              <div className="flex flex-col">
                <span className="font-display text-sm font-semibold tracking-tight">
                  Project Midori
                </span>
                <span className="text-[11px] font-normal text-muted">
                  Smarter, Safer Trading
                </span>
              </div>
            </div>
            <nav className="hidden items-center gap-6 text-xs text-muted md:flex">
              <a href="#features" className="hover:text-text2">
                Features
              </a>
              <a href="#pricing" className="hover:text-text2">
                Pricing
              </a>
              <a href="#methodology" className="hover:text-text2">
                Methodology
              </a>
              <a href="#community" className="hover:text-text2">
                Community
              </a>
            </nav>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm">Start Free Trial</Button>
              </Link>
            </div>
          </div>
        </header>

        <main className="relative z-10 mx-auto flex max-w-6xl flex-col px-6 pt-28 pb-24">
          <section className="mt-10 max-w-3xl space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-green-border bg-green-dim px-4 py-1.5 text-[11px] text-green">
              <span>✨ New</span>
              <span className="text-text2">
                Risk-first AI trading coach
              </span>
            </div>
            <div>
              <h1 className="font-display text-[clamp(3rem,8vw,4.8rem)] font-extrabold leading-[0.9] tracking-[-0.04em]">
                Trade smarter.
                <br />
                <span className="text-green">Stay in the game.</span>
              </h1>
            </div>
            <p className="max-w-xl text-lg font-light leading-relaxed text-text2">
              Project Midori is the only 0DTE platform built around
              protecting you from yourself. AI coaching, live risk
              guardrails, and radical transparency — in one tool.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Button size="lg">Start Free Trial</Button>
              <Button variant="ghost" size="lg">
                Watch Demo →
              </Button>
            </div>
            <div className="mt-10 text-[11px] uppercase tracking-[0.16em] text-muted">
              Trusted by traders at
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-text2">
              {["Goldman", "Citadel", "Two Sigma", "Jane Street", "Renaissance"].map(
                (name) => (
                  <span
                    key={name}
                    className="rounded-full bg-surface/70 px-3 py-1 text-[11px]"
                  >
                    {name}
                  </span>
                )
              )}
            </div>
          </section>

          <section id="features" className="mt-24 scroll-mt-20">
            <h2 className="font-display text-[2.5rem] font-extrabold tracking-tight text-white">
              Everything you need.
            </h2>
            <p className="mt-2 text-center text-muted max-w-2xl mx-auto">
              Risk-first design, AI coaching, and full transparency — built for 0DTE traders.
            </p>
            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-[auto_auto_auto]">
              <Card className="md:col-span-2 border-l-4 border-l-green p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-border-hover hover:bg-surface-hover">
                <Shield className="h-8 w-8 text-green mb-3" />
                <CardTitle className="font-display text-lg">Risk-First by Design</CardTitle>
                <CardContent className="mt-2 text-text2 text-sm leading-relaxed">
                  Daily guardrails, session cooldown, and Account Health score keep you from overtrading.
                  <ul className="mt-3 space-y-1 text-xs text-muted">
                    <li>• Max daily loss limits</li>
                    <li>• ATR-based position sizing</li>
                    <li>• Tiered cooldown on drawdown</li>
                  </ul>
                </CardContent>
                <div className="mt-4 h-12 w-12 rounded-full border-2 border-green/40 border-t-green" />
              </Card>
              <Card className="md:row-span-2 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-border-hover hover:bg-surface-hover">
                <BrainCircuit className="h-8 w-8 text-green mb-3" />
                <CardTitle className="font-display text-lg">Midori Thinks With You</CardTitle>
                <CardContent className="mt-2 text-text2 text-sm leading-relaxed">
                  AI coaching that explains signals, regime context, and risk in plain language.
                </CardContent>
                <div className="mt-4 rounded-lg border border-border bg-bg3 p-3 text-xs text-muted h-24" />
              </Card>
              <Card className="p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-border-hover hover:bg-surface-hover">
                <Sparkles className="h-6 w-6 text-green mb-2" />
                <CardTitle className="font-display text-base">Signals + Regime Tags</CardTitle>
                <CardContent className="mt-1 text-text2 text-xs">0DTE setups with conviction and regime compatibility.</CardContent>
              </Card>
              <Card className="p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-border-hover hover:bg-surface-hover">
                <BarChart3 className="h-6 w-6 text-green mb-2" />
                <CardTitle className="font-display text-base">Backtest Quality Reports</CardTitle>
                <CardContent className="mt-1 text-text2 text-xs">Quality metrics and warnings before you trade.</CardContent>
              </Card>
              <Card className="p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-border-hover hover:bg-surface-hover">
                <Gauge className="h-6 w-6 text-green mb-2" />
                <CardTitle className="font-display text-base">Session Cooldown</CardTitle>
                <CardContent className="mt-1 text-text2 text-xs">Automatic tiered halt when drawdown hits thresholds.</CardContent>
              </Card>
              <Card className="p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-border-hover hover:bg-surface-hover">
                <FileText className="h-6 w-6 text-green mb-2" />
                <CardTitle className="font-display text-base">Radical Transparency</CardTitle>
                <CardContent className="mt-1 text-text2 text-xs">Methodology, data sources, and activity log in one place.</CardContent>
              </Card>
            </div>
          </section>

          <section id="pricing" className="mt-24 scroll-mt-20">
            <h2 className="font-display text-[2.5rem] font-extrabold tracking-tight text-white">
              Simple pricing.
            </h2>
            <p className="mt-2 text-center text-muted max-w-xl mx-auto">
              Start free. Upgrade when you need real-time data and full guardrails.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3 text-sm text-muted">
              <span>Monthly</span>
              <Switch defaultChecked={false} />
              <span>Annual (Save 20%)</span>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3 max-w-4xl mx-auto">
              <Card className="p-6 flex flex-col">
                <CardTitle className="font-display text-lg">Free</CardTitle>
                <p className="mt-1 font-mono text-2xl font-bold text-text">$0</p>
                <CardContent className="mt-3 text-sm text-text2 flex-1">
                  Limited backtests, delayed data, paper trading only.
                </CardContent>
                <Link href="/login"><Button variant="ghost" className="mt-4 w-full">Get Started</Button></Link>
              </Card>
              <Card className="p-6 flex flex-col border-green-border shadow-[0_0_40px_rgba(0,230,118,0.1)] relative">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full border border-green-border bg-green-dim px-3 py-0.5 text-[10px] font-medium uppercase text-green">
                  Most popular
                </div>
                <CardTitle className="font-display text-lg">Pro</CardTitle>
                <p className="mt-1 font-mono text-2xl font-bold text-text">$49<span className="text-sm font-normal text-muted">/mo</span></p>
                <CardContent className="mt-3 text-sm text-text2 flex-1">
                  Full features, real-time ATR sizing, AI coaching, cooldown system, regime tags, priority support.
                </CardContent>
                <Link href="/login"><Button className="mt-4 w-full">Start Free Trial</Button></Link>
              </Card>
              <Card className="p-6 flex flex-col">
                <CardTitle className="font-display text-lg">Firm</CardTitle>
                <p className="mt-1 font-mono text-2xl font-bold text-text">$199<span className="text-sm font-normal text-muted">/mo</span></p>
                <CardContent className="mt-3 text-sm text-text2 flex-1">
                  Everything in Pro + team seats, API access, white-label option, dedicated support.
                </CardContent>
                <Link href="/login"><Button variant="ghost" className="mt-4 w-full">Contact Us</Button></Link>
              </Card>
            </div>
          </section>

          <section className="mt-24 relative overflow-hidden rounded-2xl border border-green-border bg-bg3/80 p-10 text-center">
            <div className="absolute inset-0 opacity-30 pointer-events-none">
              <SplineScene url={SPLINE_URL} className="absolute inset-0" />
            </div>
            <div className="relative z-10">
              <h2 className="font-display text-2xl font-bold text-white">
                Stop letting emotions trade your account.
              </h2>
              <p className="mt-2 text-text2 text-sm max-w-md mx-auto">
                Guardrails, AI coaching, and transparency — in one tool.
              </p>
              <Link href="/login"><Button size="lg" className="mt-6">Start Free Trial</Button></Link>
            </div>
          </section>

          <footer className="mt-24 border-t border-border pt-12 pb-8">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌿</span>
                  <span className="font-display text-sm font-semibold">Project Midori</span>
                </div>
                <p className="mt-1 text-[11px] text-muted">Smarter, Safer Trading</p>
              </div>
              <div>
                <h4 className="text-[10px] font-medium uppercase tracking-widest text-muted mb-3">Product</h4>
                <ul className="space-y-2 text-sm text-text2">
                  <li><a href="#features" className="hover:text-green">Features</a></li>
                  <li><a href="#pricing" className="hover:text-green">Pricing</a></li>
                  <li><a href="#" className="hover:text-green">Methodology</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[10px] font-medium uppercase tracking-widest text-muted mb-3">Resources</h4>
                <ul className="space-y-2 text-sm text-text2">
                  <li><a href="#" className="hover:text-green">Docs</a></li>
                  <li><a href="#" className="hover:text-green">Community</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[10px] font-medium uppercase tracking-widest text-muted mb-3">Legal</h4>
                <ul className="space-y-2 text-sm text-text2">
                  <li><a href="#" className="hover:text-green">Privacy</a></li>
                  <li><a href="#" className="hover:text-green">Terms</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-muted">Educational only. Not financial advice.</p>
              <div className="flex gap-4 text-muted">
                <a href="#" className="text-xs hover:text-green">Twitter/X</a>
                <a href="#" className="text-xs hover:text-green">Discord</a>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}

