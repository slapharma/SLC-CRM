"use client";

import * as React from "react";
import { useActionState, useMemo, useState } from "react";
import { ChevronDown, Plug } from "lucide-react";

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
  saveAgencySettings,
  setAgentPassword,
  updateAgent,
  updateAgentRole,
} from "@/lib/actions/admin";
import { createClient } from "@/lib/supabase/client";
import type { FormState } from "@/lib/actions/types";
import { cn } from "@/lib/utils";

export type Member = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  linkedinUrl: string | null;
  xUrl: string | null;
  role: "admin" | "agent" | "manager";
};

const displayName = (m: Member) => m.fullName ?? m.email ?? "Unknown agent";

export function AdminPanel({
  members,
  currentUserId,
  hasOpenRouterKey,
  openRouterModel,
}: {
  members: Member[];
  currentUserId: string;
  hasOpenRouterKey: boolean;
  openRouterModel: string;
}) {
  return (
    <div className="space-y-4">
      <AddAgentCard />

      <Card>
        <CardHeader>
          <CardTitle>Team ({members.length})</CardTitle>
          <CardDescription>
            Click a member to edit details, reset their password, change role or
            connect their accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {members.map((m) => (
            <MemberRow key={m.id} member={m} isSelf={m.id === currentUserId} />
          ))}
        </CardContent>
      </Card>

      <AgencySettingsCard hasKey={hasOpenRouterKey} model={openRouterModel} />
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
                <option value="manager">Manager</option>
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

// Stubbed account connections — UI only for now (wired up later).
const CONNECT_APPS = [
  "Gmail",
  "Outlook",
  "Instagram",
  "TikTok",
  "Facebook",
  "WhatsApp",
] as const;

function Connections() {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Connections</p>
      <div className="flex flex-wrap gap-2">
        {CONNECT_APPS.map((app) => (
          <button
            key={app}
            type="button"
            disabled
            title="Coming soon"
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs text-muted-foreground opacity-70"
          >
            <Plug className="h-3.5 w-3.5" />
            {app}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Connect email &amp; social accounts here — wiring coming soon.
      </p>
    </div>
  );
}

function MemberRow({ member, isSelf }: { member: Member; isSelf: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
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

  const roleTone =
    member.role === "admin" ? "teal" : member.role === "manager" ? "violet" : "slate";

  return (
    <div className="py-2 first:pt-0 last:pb-0">
      {/* Collapsed header — click to expand */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex min-w-0 items-center gap-3">
          <Avatar url={avatarUrl || null} name={displayName(member)} />
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">
              {displayName(member)}
              {isSelf ? (
                <span className="ml-2 text-xs text-muted-foreground">(you)</span>
              ) : null}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {member.email ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={roleTone}>{member.role}</Badge>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </div>
      </button>

      {open ? (
        <div className="space-y-4 px-1 pb-4 pt-2">
          {/* Role + remove (non-self only) */}
          {isSelf ? null : (
            <div className="flex flex-wrap items-center gap-2">
              <form action={updateAgentRole} className="flex items-center gap-1.5">
                <input type="hidden" name="user_id" value={member.id} />
                <Select
                  name="role"
                  defaultValue={member.role}
                  className="h-8 w-auto text-xs"
                >
                  <option value="agent">Agent</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </Select>
                <Button type="submit" variant="secondary" size="sm">
                  Save role
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
            </div>
          )}

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
              <div className="space-y-1">
                <Label htmlFor={`linkedin-${member.id}`} className="text-xs text-muted-foreground">
                  LinkedIn URL
                </Label>
                <Input
                  id={`linkedin-${member.id}`}
                  name="linkedin_url"
                  type="url"
                  placeholder="https://linkedin.com/in/…"
                  defaultValue={member.linkedinUrl ?? ""}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`x-${member.id}`} className="text-xs text-muted-foreground">
                  X / Twitter URL
                </Label>
                <Input
                  id={`x-${member.id}`}
                  name="x_url"
                  type="url"
                  placeholder="https://x.com/…"
                  defaultValue={member.xUrl ?? ""}
                  className="h-8"
                />
              </div>
            </div>
            <Notice state={editState} />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={editPending || uploading}
            >
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

          <Connections />
        </div>
      ) : null}
    </div>
  );
}

function AgencySettingsCard({ hasKey, model }: { hasKey: boolean; model: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveAgencySettings,
    {},
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI — Company Deep Dive</CardTitle>
        <CardDescription>
          Add an OpenRouter API key to enable AI company research reports. Get a
          key at openrouter.ai/keys.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="openrouter_api_key">OpenRouter API key</Label>
              <Input
                id="openrouter_api_key"
                name="openrouter_api_key"
                type="password"
                autoComplete="off"
                placeholder={hasKey ? "•••••• saved — leave blank to keep" : "sk-or-…"}
              />
              <p className="text-xs text-muted-foreground">
                {hasKey
                  ? "A key is saved. Enter a new one to replace it."
                  : "No key yet — Deep Dive is disabled until one is added."}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="openrouter_model">Model</Label>
              <Select id="openrouter_model" name="openrouter_model" defaultValue={model}>
                <option value="perplexity/sonar">Perplexity Sonar (web search)</option>
                <option value="perplexity/sonar-pro">Perplexity Sonar Pro (web search)</option>
                <option value="openai/gpt-4o-search-preview">OpenAI GPT-4o Search</option>
                <option value="anthropic/claude-3.7-sonnet:online">
                  Claude 3.7 Sonnet (online)
                </option>
              </Select>
              <p className="text-xs text-muted-foreground">
                Web-search models research the company live.
              </p>
            </div>
          </div>
          <Notice state={state} />
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save AI settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
