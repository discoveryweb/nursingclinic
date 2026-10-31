const STATUS_MAP: Record<string, { label: string; className: string; dot: string }> = {
  pending: {
    label: "در انتظار بررسی منشی",
    className: "bg-[#fff6e6] text-[#9c6919] border border-[#fde1b5]",
    dot: "bg-[#f59e0b]",
  },
  confirmed: {
    label: "تأیید شده و رزرو",
    className: "bg-[#ebf8f0] text-[#1b6b4a] border border-[#c5ecd3]",
    dot: "bg-[#10b981]",
  },
  cancelled: {
    label: "لغو شده",
    className: "bg-[#fff1f0] text-[#a03e35] border border-[#fcc8c2]",
    dot: "bg-[#ef4444]",
  },
  done: {
    label: "خدمت انجام شد",
    className: "bg-[#f0f4f2] text-[#4f705f] border border-[#dbe6df]",
    dot: "bg-[#6b7280]",
  },
};

export default function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_MAP[status] ?? {
    label: status,
    className: "bg-[#f3f6f4] text-[#557564] border border-[#e1ece5]",
    dot: "bg-[#9ca3af]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${meta.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      <span>{meta.label}</span>
    </span>
  );
}
