import { requireAuthenticatedUserProfile } from "@/lib/supabase/queries";
import { ProfileForm } from "@/components/settings/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const result = await requireAuthenticatedUserProfile();

  if (!result.authUser || !result.profile) {
    return <main className="p-6">Unable to load profile.</main>;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-6 py-8">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Profile</h1>
      <p className="text-sm text-slate-600">
        Update your name, timezone, and working hours.
      </p>

      <ProfileForm
        initial={{
          email: result.authUser.email ?? "",
          display_name: result.profile.display_name ?? "",
          timezone: result.profile.timezone ?? "UTC",
          work_hours_start: result.profile.work_hours_start ?? "09:00",
          work_hours_end: result.profile.work_hours_end ?? "18:00",
        }}
      />
    </main>
  );
}