import Head from "next/head";
import SplineScene from "@/components/SplineScene";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SPLINE_URL =
  "https://prod.spline.design/HqdfCmOueigtautT/scene.splinecode";

export default function LoginPage() {
  return (
    <>
      <Head>
        <title>Login — Project Midori</title>
      </Head>
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg">
        <SplineScene
          url={SPLINE_URL}
          className="pointer-events-none fixed inset-0 z-0 opacity-60 blur-[3px]"
        />
        <div className="fixed inset-0 z-0 bg-[rgba(8,12,10,0.7)]" />
        <div className="relative z-10 w-full max-w-sm rounded-2xl border border-green-border bg-[rgba(13,20,16,0.9)] p-8 shadow-[0_40px_80px_rgba(0,0,0,0.5),0_0_60px_rgba(0,230,118,0.06)] backdrop-blur-2xl">
          <div className="mb-6 flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-green-dim text-xl">
              🌿
            </div>
            <div className="text-center">
              <div className="font-display text-lg font-semibold">
                Project Midori
              </div>
              <div className="text-xs text-muted">
                Smarter, Safer Trading
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-text2">App Password</label>
              <Input type="password" placeholder="Enter password" />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-border bg-bg3 accent-green"
                />
                <span>Remember me</span>
              </label>
            </div>
            <Button className="mt-2 w-full" size="lg">
              Login
            </Button>
            <p className="pt-2 text-center text-[10px] text-muted">
              Educational only — not financial advice.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

