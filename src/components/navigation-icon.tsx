export function NavigationIcon({ name }: { name: "feed" | "create" | "profile" }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {name === "feed" && <path d="m3 10 9-7 9 7v10H3V10Zm6 10v-7h6v7" />}
      {name === "create" && <path d="M12 4v16M4 12h16" />}
      {name === "profile" && (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
        </>
      )}
    </svg>
  );
}
