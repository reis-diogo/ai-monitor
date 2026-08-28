export function ChevronIcon({ size = 10, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      className={`shrink-0 ${className}`}
    >
      <path
        d="M2.5 4.5L6 8L9.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CloseIcon({ size = 10, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      className={`shrink-0 ${className}`}
    >
      <path
        d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PullRequestIcon({
  size = 11,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={`shrink-0 ${className}`}
    >
      <circle cx="4" cy="3.3" r="1.6" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="4" cy="12.7" r="1.6" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="12" cy="8.7" r="1.6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 4.9V11.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path
        d="M4 5.3C4 7.5 5.8 8.7 9 8.7H10.4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function ExternalLinkIcon({
  size = 11,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={`shrink-0 ${className}`}
    >
      <path
        d="M6.5 3.5H3.8C3.36 3.5 3 3.86 3 4.3v8C3 12.74 3.36 13.1 3.8 13.1h8c.44 0 .8-.36.8-.8V9.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 2.5H13.5V6.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.2 2.8L7.5 8.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RefreshIcon({ size = 11, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={`shrink-0 ${className}`}
    >
      <path
        d="M13.5 8A5.5 5.5 0 1 1 11.8 4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M12 1.8V4.5H9.3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
