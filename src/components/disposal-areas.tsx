"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addDisposalArea,
  deleteDisposalArea,
} from "@/lib/actions/disposal-areas";
import type { FormState } from "@/lib/actions/types";

export type AreaRow = {
  id: string;
  name: string;
  size_sqft: number | null;
  size_sqm: number | null;
  rent_pa: number | null;
  availability: string | null;
};

const num = (v: number | null) => (v != null ? Number(v).toLocaleString("en-GB") : "—");
const money = (v: number | null) =>
  v != null ? `£${Number(v).toLocaleString("en-GB")}` : "—";

export function DisposalAreas({
  disposalId,
  areas,
}: {
  disposalId: string;
  areas: AreaRow[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<FormState, FormData>(
    addDisposalArea,
    {},
  );
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.message) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="space-y-4">
      {areas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No area schedule yet — add floors / units below.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Floor / unit</th>
                <th className="py-2 pr-3 text-right font-medium">Sq ft</th>
                <th className="py-2 pr-3 text-right font-medium">Sq m</th>
                <th className="py-2 pr-3 text-right font-medium">Rent pa</th>
                <th className="py-2 pr-3 font-medium">Availability</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {areas.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium text-foreground">{a.name}</td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums text-muted-foreground">
                    {num(a.size_sqft)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums text-muted-foreground">
                    {num(a.size_sqm)}
                  </td>
                  <td className="py-2 pr-3 text-right font-mono tabular-nums text-muted-foreground">
                    {money(a.rent_pa)}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {a.availability ?? "—"}
                  </td>
                  <td className="py-2 text-right">
                    <form action={deleteDisposalArea}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="disposal_id" value={disposalId} />
                      <button
                        type="submit"
                        aria-label={`Delete ${a.name}`}
                        onClick={(e) => {
                          if (!window.confirm(`Delete the “${a.name}” area row?`))
                            e.preventDefault();
                        }}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        ref={formRef}
        action={action}
        className="grid items-end gap-2 sm:grid-cols-2 lg:grid-cols-6"
      >
        <input type="hidden" name="disposal_id" value={disposalId} />
        <Input name="name" placeholder="Floor / unit *" aria-label="Floor or unit name" required />
        <Input name="size_sqft" type="number" inputMode="numeric" placeholder="Sq ft" aria-label="Size sq ft" />
        <Input name="size_sqm" type="number" inputMode="numeric" placeholder="Sq m" aria-label="Size sq m" />
        <Input name="rent_pa" type="number" inputMode="numeric" placeholder="Rent pa" aria-label="Rent per annum" />
        <Input name="availability" placeholder="Availability" aria-label="Availability" />
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          <Plus />
          {pending ? "Adding…" : "Add"}
        </Button>
        {state.error ? (
          <p className="text-xs text-destructive lg:col-span-6">{state.error}</p>
        ) : null}
      </form>
    </div>
  );
}
