import { initials } from "@/lib/format";

export function Avatar({ name, size = 36 }: { name: unknown; size?: number }) {
  const s = String(name ?? "");
  const hue = Math.abs(hashString(s)) % 360;
  return (
    <div
      className="inline-flex items-center justify-center rounded-full text-white font-semibold shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        backgroundColor: `hsl(${hue} 55% 45%)`,
      }}
      aria-hidden
    >
      {initials(s)}
    </div>
  );
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
