"use client";

import dynamic from "next/dynamic";
import React from "react";

const LazySpline = dynamic(() => import("@splinetool/react-spline"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full skeleton rounded-xl bg-surface/40" />
  )
});

type SplineSceneProps = {
  url: string;
  className?: string;
};

export default function SplineScene({ url, className }: SplineSceneProps) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%"
      }}
    >
      <LazySpline scene={url} />
    </div>
  );
}

