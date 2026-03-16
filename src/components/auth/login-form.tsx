"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { env, hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().email("Enter a valid work email."),
  password: z.string().min(8, "Password must be at least 8 characters.")
});

type LoginValues = z.infer<typeof loginSchema>;

type LoginFormProps = {
  initialError?: string;
};

export function LoginForm({ initialError }: LoginFormProps) {
  const router = useRouter();
  const [isGooglePending, startGoogleTransition] = useTransition();
  const [formError, setFormError] = useState<string | undefined>(initialError);
  const [successMessage, setSuccessMessage] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(undefined);
    setSuccessMessage(undefined);

    if (!hasSupabaseEnv()) {
      setFormError("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before signing in.");
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword(values);

    if (error) {
      setFormError(error.message);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("workspace_id,onboarding_completed")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      setFormError("Signed in, but I could not load your profile. Check your database migration.");
      return;
    }

    const nextPath =
      profile?.workspace_id && profile.onboarding_completed ? "/inbox" : "/onboarding";

    setSuccessMessage("Signed in. Redirecting...");
    router.replace(nextPath);
    router.refresh();
  });

  const handleGoogleSignIn = () => {
    setFormError(undefined);

    if (!hasSupabaseEnv()) {
      setFormError("Set your Supabase environment variables before using Google OAuth.");
      return;
    }

    startGoogleTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${env.NEXT_PUBLIC_APP_URL}/callback`
        }
      });

      if (error) {
        setFormError(error.message);
      }
    });
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="space-y-6 p-6">
        <Button className="w-full" onClick={handleGoogleSignIn} type="button" variant="outline">
          {isGooglePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400">or sign in with email</span>
          </div>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" placeholder="founder@company.com" type="email" {...register("email")} />
            <FormMessage message={errors.email?.message} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link className="text-sm text-accent hover:underline" href="/signup">
                Need an account?
              </Link>
            </div>
            <Input id="password" type="password" {...register("password")} />
            <FormMessage message={errors.password?.message} />
          </div>
          <FormMessage message={formError} />
          <FormMessage message={successMessage} tone="success" />
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
