"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  className?: string;
  label: string;
  pendingLabel: string;
};

export function SubmitButton({ className, label, pendingLabel }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button className={className} disabled={pending} type="submit">
      {pending ? pendingLabel : label}
    </button>
  );
}
