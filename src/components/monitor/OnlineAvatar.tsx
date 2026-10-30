"use client";

export function OnlineAvatar({
  name,
  color,
  src,
  size = 24,
}: {
  name: string;
  color: string;
  src: string | null;
  size?: number;
}) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className="shrink-0 rounded-full border-2 object-cover"
      style={{ borderColor: color, width: size, height: size }}
    />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border-2 border-card text-[10px] font-bold text-white"
      style={{ background: color, width: size, height: size }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
