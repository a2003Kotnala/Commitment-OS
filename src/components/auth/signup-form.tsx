"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/env";

const signupSchema = z.object({
  displayName: z.string().min(2, "Enter your name."),
  email: z.string().email("Enter a valid work email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  workspaceName: z.string().min(2, "Enter a workspace name.")
});

type SignupValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      workspaceName: ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(undefined);
    setSuccessMessage(undefined);

    if (!hasSupabaseEnv()) {
      setFormError(
        "Set Supabase environment variables, including SUPABASE_SERVICE_ROLE_KEY, before signing up."
      );
      return;
    }

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setFormError(result.error ?? "Unable to create your account.");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password
    });

    if (error) {
      setFormError(
        "Your account was created, but automatic sign-in failed. Use the login page once Supabase email confirmation is configured."
      );
      return;
    }

    setSuccessMessage("Workspace created. Redirecting to onboarding...");
    router.replace("/onboarding");
    router.refresh();
  });

  return (
    <Card className="border-slate-200">
      <CardContent className="space-y-6 p-6">
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="displayName">Your name</Label>
            <Input id="displayName" placeholder="Alex Morgan" {...register("displayName")} />
            <FormMessage message={errors.displayName?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workspaceName">Workspace name</Label>
            <Input id="workspaceName" placeholder="Northstar Revenue Team" {...register("workspaceName")} />
            <FormMessage message={errors.workspaceName?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" placeholder="alex@company.com" type="email" {...register("email")} />
            <FormMessage message={errors.email?.message} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link className="text-sm text-accent hover:underline" href="/login">
                Already have an account?
              </Link>
            </div>
            <Input id="password" type="password" {...register("password")} />
            <FormMessage message={errors.password?.message} />
          </div>
          <FormMessage message={formError} />
          <FormMessage message={successMessage} tone="success" />
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create workspace
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
