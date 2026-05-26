"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  href?: string;
  label?: string;
}

export default function BackButton({ href, label }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 p-2 -ml-2 text-slate-400 hover:text-slate-700 transition-colors rounded-xl active:scale-95"
      aria-label="Go back"
    >
      <ArrowLeft size={20} strokeWidth={2} />
      {label && (
        <span className="text-sm font-semibold text-slate-600">{label}</span>
      )}
    </button>
  );
}
