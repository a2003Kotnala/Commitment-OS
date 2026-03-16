"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CheckCircle2, Loader2, Mail, MessageSquare, Video } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const workspaceSchema = z.object({
  workspaceName: z.string().min(2, "Workspace name is required.")
});

const commitmentSchema = z.object({
  title: z.string().min(3, "Add a first commitment to finish onboarding."),
  description: z.string().max(500, "Keep the description under 500 characters.").optional()
});

type OnboardingFlowProps = {
  initialWorkspaceName: string;
  userDisplayName: string;
  initialPreferredSurface?: "slack" | "zoom" | "gmail";
  isRevisitMode: boolean;
};

const surfaces = [
  {
    id: "slack",
    title: "Slack",
    description: "Capture commitments from channel threads and direct asks.",
    icon: MessageSquare
  },
  {
    id: "zoom",
    title: "Zoom",
    description: "Process transcripts into accountable follow-through.",
    icon: Video
  },
  {
    id: "gmail",
    title: "Gmail",
    description: "Turn incoming email requests into tracked commitments.",
    icon: Mail
  }
] as const;

export function OnboardingFlow({
  initialWorkspaceName,
  userDisplayName,
  initialPreferredSurface,
  isRevisitMode
}: OnboardingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [preferredSurface, setPreferredSurface] = useState<"slack" | "zoom" | "gmail" | undefined>(
    initialPreferredSurface
  );
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const {
    register: registerWorkspace,
    handleSubmit: handleWorkspaceSubmit,
    formState: { errors: workspaceErrors, isSubmitting: isSavingWorkspace }
  } = useForm<z.infer<typeof workspaceSchema>>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      workspaceName: initialWorkspaceName
    }
  });
  const {
    register: registerCommitment,
    handleSubmit: handleCommitmentSubmit,
    formState: { errors: commitmentErrors, isSubmitting: isSavingCommitment }
  } = useForm<z.infer<typeof commitmentSchema>>({
    resolver: zodResolver(commitmentSchema),
    defaultValues: {
      title: "Create my AI commitment operating cadence",
      description: "Review inbox suggestions each morning and resolve ownership in under 15 minutes."
    }
  });

  const steps = useMemo(
    () =>
      isRevisitMode
        ? [
            { id: 1, title: "Workspace" },
            { id: 2, title: "Surface" }
          ]
        : [
            { id: 1, title: "Workspace" },
            { id: 2, title: "Surface" },
            { id: 3, title: "First commitment" }
          ],
    [isRevisitMode]
  );

  const saveWorkspace = handleWorkspaceSubmit(async (values) => {
    setError(undefined);
    setSuccess(undefined);

    const response = await fetch("/api/onboarding/workspace", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(result.error ?? "Unable to save workspace details.");
      return;
    }

    setSuccess("Workspace saved.");
    setStep(2);
    router.refresh();
  });

  const savePreferredSurface = async () => {
    setError(undefined);
    setSuccess(undefined);

    if (!preferredSurface) {
      setError("Choose the first capture surface you want to prioritize.");
      return;
    }

    const response = await fetch("/api/onboarding/integration-preference", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ preferredSurface })
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(result.error ?? "Unable to save your integration preference.");
      return;
    }

    if (isRevisitMode) {
      setSuccess("Preference saved. Your onboarding settings are updated.");
      router.refresh();
      return;
    }

    setSuccess("Preference saved. You can connect the integration later from Settings.");
    setStep(3);
    router.refresh();
  };

  const saveFirstCommitment = handleCommitmentSubmit(async (values) => {
    setError(undefined);
    setSuccess(undefined);

    const response = await fetch("/api/onboarding/commitment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(result.error ?? "Unable to create your first commitment.");
      return;
    }

    setSuccess("Onboarding complete. Opening your inbox...");
    router.replace("/inbox");
    router.refresh();
  });

  return (
    <div className="space-y-8">
      <Card className="border-slate-200">
        <CardContent className="flex flex-wrap items-center gap-3 p-6">
          {steps.map((item) => {
            const isComplete = item.id < step;
            const isActive = item.id === step;

            return (
              <div
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                  isActive
                    ? "border-primary bg-primary/5"
                    : isComplete
                      ? "border-success/25 bg-success/5"
                      : "border-slate-200 bg-white"
                }`}
                key={item.id}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    isComplete
                      ? "bg-success text-white"
                      : isActive
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isComplete ? <CheckCircle2 className="h-4 w-4" /> : item.id}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">
                    {item.id === 1
                      ? "Establish your tenant"
                      : item.id === 2
                        ? "Pick your first capture surface"
                        : "Seed the system with one tracked outcome"}
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-accent">
          {isRevisitMode ? "Edit onboarding" : "Onboarding"}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
          {userDisplayName ? `${userDisplayName}, let's wire the operating model.` : "Let's wire the operating model."}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-600">
          {isRevisitMode
            ? "Update your workspace setup and preferred capture surface without rerunning the first-run commitment wizard."
            : "The goal is to attach an owner, a workspace, and an initial piece of work so the inbox starts from a real commitment rather than an empty shell."}
        </p>
      </div>

      {step === 1 ? (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Name your workspace</CardTitle>
            <CardDescription>
              This becomes the top-level tenant boundary for data isolation, reporting, and future billing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={saveWorkspace}>
              <div className="space-y-2">
                <Label htmlFor="workspaceName">Workspace name</Label>
                <Input id="workspaceName" {...registerWorkspace("workspaceName")} />
                <FormMessage message={workspaceErrors.workspaceName?.message} />
              </div>
              <FormMessage message={error} />
              <FormMessage message={success} tone="success" />
              <Button disabled={isSavingWorkspace} type="submit">
                {isSavingWorkspace ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save and continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Connect your first capture surface</CardTitle>
            <CardDescription>
              {isRevisitMode
                ? "Adjust the capture surface your workspace should prioritize. This updates settings only and does not create any new commitments."
                : "OAuth landing pages arrive in later phases. For now, store which surface matters first so capture settings are ready."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              {surfaces.map((surface) => {
                const Icon = surface.icon;
                const selected = preferredSurface === surface.id;

                return (
                  <button
                    className={`rounded-3xl border p-5 text-left transition ${
                      selected ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"
                    }`}
                    key={surface.id}
                    onClick={() => setPreferredSurface(surface.id)}
                    type="button"
                  >
                    <Icon className={`h-6 w-6 ${selected ? "text-primary" : "text-slate-500"}`} />
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">{surface.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{surface.description}</p>
                  </button>
                );
              })}
            </div>
            <FormMessage message={error} />
            <FormMessage message={success} tone="success" />
            <div className="flex flex-wrap gap-3">
              <Button onClick={savePreferredSurface} type="button">
                {isRevisitMode ? "Save changes" : "Save preference"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              {isRevisitMode ? (
                <>
                  <Button onClick={() => router.replace("/inbox")} type="button" variant="ghost">
                    Return to inbox
                  </Button>
                  <Button
                    onClick={() => {
                      setError(undefined);
                      setSuccess(undefined);
                      setStep(3);
                    }}
                    type="button"
                    variant="outline"
                  >
                    Add another commitment
                  </Button>
                </>
              ) : (
                <Button onClick={() => setStep(3)} type="button" variant="ghost">
                  Skip for now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>{isRevisitMode ? "Add another commitment" : "Create your first commitment"}</CardTitle>
            <CardDescription>
              {isRevisitMode
                ? "This is optional during a revisit. Use it only if you want to seed another manual commitment."
                : "Seed the system with one real deliverable so the dashboard and inbox have authenticated data on first load."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={saveFirstCommitment}>
              <div className="space-y-2">
                <Label htmlFor="title">Commitment title</Label>
                <Input id="title" {...registerCommitment("title")} />
                <FormMessage message={commitmentErrors.title?.message} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Context</Label>
                <Textarea id="description" {...registerCommitment("description")} />
                <FormMessage message={commitmentErrors.description?.message} />
              </div>
              <FormMessage message={error} />
              <FormMessage message={success} tone="success" />
              <div className="flex flex-wrap gap-3">
                <Button disabled={isSavingCommitment} type="submit">
                  {isSavingCommitment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {isRevisitMode ? "Add commitment" : "Finish onboarding"}
                </Button>
                {isRevisitMode ? (
                  <Button onClick={() => setStep(2)} type="button" variant="ghost">
                    Back
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
