"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const profileSchema = z.object({
  display_name: z.string().trim().min(2, "Name must be at least 2 characters."),
  timezone: z.string().trim().min(1),
  work_hours_start: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM (e.g., 09:00)."),
  work_hours_end: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM (e.g., 18:00)."),
});

type ProfileValues = z.infer<typeof profileSchema>;

type ProfileFormProps = {
  initial: ProfileValues & { email: string };
};

export function ProfileForm({ initial }: ProfileFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: initial.display_name,
      timezone: initial.timezone,
      work_hours_start: initial.work_hours_start,
      work_hours_end: initial.work_hours_end,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSuccess(null);

    const res = await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

    if (!res.ok || !json?.ok) {
      setServerError(json?.error ?? "Failed to update profile.");
      return;
    }

    setSuccess("Profile updated.");
  });

  return (
    <Card className="border-slate-200">
      <CardContent className="space-y-6 p-6">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={initial.email} disabled />
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="display_name">Display name</Label>
            <Input id="display_name" {...register("display_name")} />
            <FormMessage message={errors.display_name?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input id="timezone" placeholder="UTC" {...register("timezone")} />
            <FormMessage message={errors.timezone?.message} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="work_hours_start">Work start</Label>
              <Input id="work_hours_start" placeholder="09:00" {...register("work_hours_start")} />
              <FormMessage message={errors.work_hours_start?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="work_hours_end">Work end</Label>
              <Input id="work_hours_end" placeholder="18:00" {...register("work_hours_end")} />
              <FormMessage message={errors.work_hours_end?.message} />
            </div>
          </div>

          <FormMessage message={serverError ?? undefined} />
          <FormMessage message={success ?? undefined} tone="success" />

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}