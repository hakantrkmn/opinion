"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import type { AdminAnalytics } from "@/features/admin/components/types";
import { formatNumber } from "@/features/admin/components/utils";

type Day = AdminAnalytics["daily"][number];

const dayLabel = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" });
const weekday = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" });

function niceMax(n: number) {
  if (n <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(n));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= n) ?? 10;
  return step * pow;
}

function compact(n: number) {
  return n >= 1000 ? `${Math.round(n / 100) / 10}K` : String(n);
}

/**
 * Daily activity (new pins + comments) as a single-series column chart:
 * one hue, no legend (the title names it), hover/focus tooltip with the
 * breakdown, and a screen-reader table with every value.
 */
export function ActivityChart({ daily }: { daily: Day[] }) {
  const [active, setActive] = useState<number | null>(null);
  const totals = daily.map((d) => d.pins + d.comments);
  const max = niceMax(Math.max(1, ...totals));
  const ticks = [max, max / 2, 0];
  const peak = totals.indexOf(Math.max(...totals));
  const shown = active ?? null;

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative flex h-44 gap-2">
        {/* Y axis */}
        <div aria-hidden className="flex w-8 shrink-0 flex-col justify-between pb-6 text-right text-[11px] tabular-nums text-muted-foreground">
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">
              {compact(t)}
            </span>
          ))}
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col">
          {/* Gridlines */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
            {ticks.map((t) => (
              <div key={t} className="h-px bg-border" />
            ))}
          </div>

          {/* Columns */}
          {/* Pointer-only hover; keyboard / screen readers get the table below. */}
          <div
            aria-hidden
            className="relative flex flex-1 items-end"
            onPointerLeave={() => setActive(null)}
          >
            {daily.map((d, i) => {
              const total = totals[i];
              const pct = (total / max) * 100;
              const isActive = shown === i;
              return (
                <div
                  key={d.date}
                  onPointerEnter={() => setActive(i)}
                  className="relative flex h-full flex-1 items-end justify-center px-px"
                >
                  <span
                    className={cn(
                      "block w-full max-w-6 rounded-t-[4px] bg-primary transition-opacity duration-150",
                      shown !== null && !isActive && "opacity-40"
                    )}
                    style={{ height: total > 0 ? `max(2px, ${pct}%)` : "0px" }}
                  />
                  {i === peak && shown === null && total > 0 ? (
                    <span
                      aria-hidden
                      className="absolute left-1/2 -translate-x-1/2 -translate-y-1 text-[11px] font-medium tabular-nums text-foreground"
                      style={{ bottom: `${pct}%` }}
                    >
                      {formatNumber(total)}
                    </span>
                  ) : null}
                </div>
              );
            })}

            {shown !== null ? (
              <Tooltip day={daily[shown]} index={shown} count={daily.length} />
            ) : null}
          </div>

          {/* X axis */}
          <div aria-hidden className="flex h-6 items-end">
            {daily.map((d, i) => (
              <span
                key={d.date}
                className={cn(
                  "flex-1 text-center text-[11px] tabular-nums text-muted-foreground",
                  // Thin the labels on narrow screens: every other day.
                  i % 2 === 1 && i !== daily.length - 1 && "max-sm:invisible"
                )}
              >
                {new Date(d.date).getUTCDate()}
              </span>
            ))}
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>New pins and comments per day</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Pins</th>
            <th scope="col">Comments</th>
            <th scope="col">New members</th>
          </tr>
        </thead>
        <tbody>
          {daily.map((d) => (
            <tr key={d.date}>
              <th scope="row">{dayLabel.format(new Date(d.date))}</th>
              <td>{d.pins}</td>
              <td>{d.comments}</td>
              <td>{d.users}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function Tooltip({ day, index, count }: { day: Day; index: number; count: number }) {
  const center = ((index + 0.5) / count) * 100;
  const date = new Date(day.date);
  return (
    <div
      role="presentation"
      className="pointer-events-none absolute top-0 z-10 w-40 rounded-xl border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg"
      style={{
        left: `clamp(0px, calc(${center}% - 5rem), calc(100% - 10rem))`,
      }}
    >
      <p className="mb-1.5 font-medium">
        {weekday.format(date)}, {dayLabel.format(date)}
      </p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 tabular-nums">
        <dt className="text-muted-foreground">Pins</dt>
        <dd className="text-right">{formatNumber(day.pins)}</dd>
        <dt className="text-muted-foreground">Comments</dt>
        <dd className="text-right">{formatNumber(day.comments)}</dd>
        <dt className="text-muted-foreground">New members</dt>
        <dd className="text-right">{formatNumber(day.users)}</dd>
      </dl>
    </div>
  );
}
