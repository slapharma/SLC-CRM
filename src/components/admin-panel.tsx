"use client";

import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  createAgent,
  removeAgent,
  setAgentPassword,
  updateAgentRole,
} from "@/lib/actions/admin";
import type { FormState } from "@/lib/actions/types";

export type Member = {
  id: string;
  name: string;
  email: string | null;
  role: "admin" | "agent";
};

export function AdminPanel({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  return (
    <div className="space-y-4">
      <AddAgentCard />

      <Card>
        <CardHeader>
          <CardTitle>Team ({members.length})</CardTitle>
          <CardDescription>
            Manage roles, reset passwords, or remove agents.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {members.map((m) => (
            <MemberRow key={m.id} member={m} isSelf={m.id === currentUserId} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Notice({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
        {state.message}
      </p>
    );
  return null;
}

function AddAgentCard() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createAgent,
    {},
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add agent</CardTitle>
        <CardDescription>
          Creates a login for your agency. They can sign in immediately.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" name="full_name" placeholder="Jane Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">
                Email<span className="text-destructive"> *</span>
              </Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                Password<span className="text-destructive"> *</span>
              </Label>
              <Input id="password" name="password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select id="role" name="role" defaultValue="agent">
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
          </div>
          <Notice state={state} />
          <Button type="submit" disabled={pending}>
            {pending ? "Adding…" : "Add agent"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MemberRow({ member, isSelf }: { member: Member; isSelf: boolean }) {
  const [pwState, pwAction, pwPending] = useActionState<FormState, FormData>(
    setAgentPassword,
    {},
  );

  return (
    <div className="space-y-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">
            {member.name}
            {isSelf ? (
              <span className="ml-2 text-xs text-muted-foreground">(you)</span>
            ) : null}
          </p>
          <p className="text-sm text-muted-foreground">{member.email ?? "—"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={member.role === "admin" ? "teal" : "slate"}>
            {member.role}
          </Badge>
          {/* Role change + remove are blocked by RLS for non-admins; hidden for self to avoid lock-out. */}
          {isSelf ? null : (
            <>
              <form action={updateAgentRole} className="flex items-center gap-1.5">
                <input type="hidden" name="user_id" value={member.id} />
                <Select
                  name="role"
                  defaultValue={member.role}
                  className="h-8 w-auto text-xs"
                >
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </Select>
                <Button type="submit" variant="secondary" size="sm">
                  Save
                </Button>
              </form>
              <form action={removeAgent}>
                <input type="hidden" name="user_id" value={member.id} />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                >
                  Remove
                </Button>
              </form>
            </>
          )}
        </div>
      </div>

      <form action={pwAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="user_id" value={member.id} />
        <div className="space-y-1">
          <Label htmlFor={`pw-${member.id}`} className="text-xs text-muted-foreground">
            New password
          </Label>
          <Input
            id={`pw-${member.id}`}
            name="password"
            className="h-8 w-48"
            placeholder="Set a new password"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm" disabled={pwPending}>
          {pwPending ? "Saving…" : "Set password"}
        </Button>
        <div className="w-full">
          <Notice state={pwState} />
        </div>
      </form>
    </div>
  );
}
