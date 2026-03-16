"use client";

import { create } from "zustand";

import type { CommitmentRecord } from "@/types";

type CommitmentPanelState = {
  selectedCommitment: CommitmentRecord | null;
  isOpen: boolean;
  openCommitment: (commitment: CommitmentRecord) => void;
  closeCommitment: () => void;
  updateSelectedCommitment: (updates: Partial<CommitmentRecord>) => void;
};

export const useCommitmentPanelStore = create<CommitmentPanelState>((set) => ({
  selectedCommitment: null,
  isOpen: false,
  openCommitment: (commitment) =>
    set({
      selectedCommitment: commitment,
      isOpen: true
    }),
  closeCommitment: () =>
    set({
      selectedCommitment: null,
      isOpen: false
    }),
  updateSelectedCommitment: (updates) =>
    set((state) => ({
      selectedCommitment: state.selectedCommitment
        ? {
            ...state.selectedCommitment,
            ...updates
          }
        : null
    }))
}));
