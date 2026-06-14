import React from "react";

export function KpiCard({
  title,
  value,
  description,
  trend,
  trendUpIsGood,
}: {
  title: string;
  value: React.ReactNode;
  description?: string;
  trend?: string;
  trendUpIsGood?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-black/10 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-[#08766f]">
        {title}
      </h3>
      <div className="mt-3 flex items-baseline gap-3">
        <span className="text-3xl font-bold tracking-tight text-[#171717]">
          {value}
        </span>
        {trend && (
          <span
            className={`text-sm font-medium ${
              trend.startsWith("+")
                ? trendUpIsGood
                  ? "text-emerald-600"
                  : "text-red-600"
                : trendUpIsGood
                  ? "text-red-600"
                  : "text-emerald-600"
            }`}
          >
            {trend}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-2 text-sm leading-relaxed text-[#43514f]">
          {description}
        </p>
      )}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 mt-12 border-b border-black/10 pb-4">
      <h2 className="text-xl font-semibold tracking-tight text-[#171717]">
        {title}
      </h2>
      <p className="mt-1 text-sm text-[#43514f]">{description}</p>
    </div>
  );
}

export function AlertCard({
  title,
  count,
  isCritical,
}: {
  title: string;
  count: number;
  isCritical: boolean;
}) {
  if (count === 0) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-black/5 bg-emerald-50 p-4">
        <span className="text-sm font-medium text-emerald-800">{title}</span>
        <span className="text-sm font-semibold text-emerald-700">0</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-4 ${
        isCritical
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      <span className="text-sm font-medium">{title}</span>
      <span className="text-sm font-semibold">{count}</span>
    </div>
  );
}
