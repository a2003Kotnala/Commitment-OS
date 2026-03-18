"use client";

import type { Commitment } from "@/lib/hooks/useCommitments";
import type { ProjectOption } from "@/lib/hooks/useProjects";
import { CommitmentCard } from "./CommitmentCard";

type CommitmentListProps = {
  commitments: Commitment[];
  projects: ProjectOption[];
  selectedCommitmentId?: string | null;
  onSelect?: (commitment: Commitment) => void;
  onApprove?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onUpdate?: (input: {
    id: string;
    urgency_score?: number;
    importance_score?: number;
    due_date?: string | null;
    project_id?: string | null;
  }) => void;
  approvingId?: string | null;
  dismissingId?: string | null;
};

export function CommitmentList({
  commitments,
  projects,
  selectedCommitmentId,
  onSelect,
  onApprove,
  onDismiss,
  onUpdate,
  approvingId,
  dismissingId,
}: CommitmentListProps) {
  return (
    <div className="space-y-4">
      {commitments.map((commitment) => (
        <CommitmentCard
          key={commitment.id}
          commitment={commitment}
          projects={projects}
          selected={selectedCommitmentId === commitment.id}
          onSelect={onSelect}
          onApprove={onApprove}
          onDismiss={onDismiss}
          onUpdate={onUpdate}
          isApproving={approvingId === commitment.id}
          isDismissing={dismissingId === commitment.id}
        />
      ))}
    </div>
  );
}