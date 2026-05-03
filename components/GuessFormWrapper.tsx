"use client";

import { useRouter } from "next/navigation";
import GuessForm from "./GuessForm";

export default function GuessFormWrapper({ availableDates }: { availableDates: string[] }) {
  const router = useRouter();
  return (
    <GuessForm
      availableDates={availableDates}
      onSuccess={() => router.refresh()}
    />
  );
}
