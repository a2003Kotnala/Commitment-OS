import { slugify } from "@/lib/utils";

export function generateUniqueWorkspaceSlug(workspaceName: string) {
  const baseSlug = slugify(workspaceName) || "workspace";
  const suffix = Date.now().toString(36);

  return `${baseSlug}-${suffix}`;
}
