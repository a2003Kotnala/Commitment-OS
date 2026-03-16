"use client";

import type { Commitment } from "@/lib/hooks/useCommitments";
import { CommitmentCard } from "./CommitmentCard";

type CommitmentListProps = {
  commitments: Commitment[];
  selectedCommitmentId?: string | null;
  onSelect?: (commitment: Commitment) => void;
  onApprove?: (id: string) => void;
  onDismiss?: (id: string) => void;
  approvingId?: string | null;
  dismissingId?: string | null;
};

export function CommitmentList({
  commitments,
  selectedCommitmentId,
  onSelect,
  onApprove,
  onDismiss,
  approvingId,
  dismissingId,
}: CommitmentListProps) {
  return (
    <div className="space-y-4">
      {commitments.map((commitment) => (
        <CommitmentCard
          key={commitment.id}
          commitment={commitment}
          selected={selectedCommitmentId === commitment.id}
          onSelect={onSelect}
          onApprove={onApprove}
          onDismiss={onDismiss}
          isApproving={approvingId === commitment.id}
          isDismissing={dismissingId === commitment.id}
        />
      ))}
    </div>
  );
}