"use client";

import * as React from "react";
import { useActionState, useMemo, useState } from "react";

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
  updateAgent,
  updateAgentRole,
} from "@/lib/actions/admin";
import { createClient } from "@/lib/supabase/client";
import type { FormState } from "@/lib/actions/types";

export type Member = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: "admin" | "agent";
};

const displayName = (m: Member) => m.fullName ?? m.email ?? "Unknown agent";

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
            Edit details and photo, reset passwords, change roles, or remove agents.
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

function Avatar({ url, name, size = 40 }: { url: string | null; name: string; size?: number }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary"
      style={{ width: size, height: size }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function AddAgentCard() {
  const [state, action, pending] = useActionState<FormState, FormData>(createAgent, {});

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
  const supabase = useMemo(() => createClient(), []);
  const [editState, editAction, editPending] = useActionState<FormState, FormData>(
    updateAgent,
    {},
  );
  const [pwState, pwAction, pwPending] = useActionState<FormState, FormData>(
    setAgentPassword,
    {},
  );
  const [avatarUrl, setAvatarUrl] = useState(member.avatarUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${member.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (error) {
      setUploadError(error.message);
    } else {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    }
    setUploading(false);
  }

  return (
    <div className="space-y-4 py-5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar url={avatarUrl || null} name={displayName(member)} />
          <div>
            <p className="font-medium text-foreground">
              {displayName(member)}
              {isSelf ? (
                <span className="ml-2 text-xs text-muted-foreground">(you)</span>
              ) : null}
            </p>
            <p className="text-sm text-muted-foreground">{member.email ?? "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={member.role === "admin" ? "teal" : "slate"}>{member.role}</Badge>
          {isSelf ? null : (
            <>
              <form action={updateAgentRole} className="flex items-center gap-1.5">
                <input type="hidden" name="user_id" value={member.id} />
                <Select name="role" defaultValue={member.role} className="h-8 w-auto text-xs">
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

      {/* Edit details + photo */}
      <form action={editAction} className="space-y-3 rounded-md border bg-muted/30 p-3">
        <input type="hidden" name="user_id" value={member.id} />
        <input type="hidden" name="avatar_url" value={avatarUrl} />
        <div className="flex items-center gap-3">
          <Avatar url={avatarUrl || null} name={displayName(member)} size={48} />
          <div className="space-y-1">
            <Label htmlFor={`photo-${member.id}`} className="text-xs text-muted-foreground">
              Photo
            </Label>
            <input
              id={`photo-${member.id}`}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="block w-full text-xs file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-background file:px-2.5 file:py-1 file:text-xs hover:file:bg-muted"
            />
            {uploading ? (
              <p className="text-xs text-muted-foreground">Uploading…</p>
            ) : null}
            {uploadError ? (
              <p className="text-xs text-destructive">{uploadError}</p>
            ) : null}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor={`name-${member.id}`} className="text-xs text-muted-foreground">
              Full name
            </Label>
            <Input
              id={`name-${member.id}`}
              name="full_name"
              defaultValue={member.fullName ?? ""}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`email-${member.id}`} className="text-xs text-muted-foreground">
              Email
            </Label>
            <Input
              id={`email-${member.id}`}
              name="email"
              type="email"
              defaultValue={member.email ?? ""}
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`phone-${member.id}`} className="text-xs text-muted-foreground">
              Phone
            </Label>
            <Input
              id={`phone-${member.id}`}
              name="phone"
              type="tel"
              defaultValue={member.phone ?? ""}
              className="h-8"
            />
          </div>
        </div>
        <Notice state={editState} />
        <Button type="submit" variant="secondary" size="sm" disabled={editPending || uploading}>
          {editPending ? "Saving…" : "Save details"}
        </Button>
      </form>

      {/* Reset password */}
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
