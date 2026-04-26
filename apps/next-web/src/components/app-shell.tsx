import Link from "next/link";

const links = [
  { href: "/", label: "Search" },
  { href: "/market", label: "Market" },
  { href: "/incidents", label: "Incidents" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-[#f7f1e5]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#17212b] text-sm font-bold text-white">
              AI
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#8d2f02]">AISEC</p>
              <p className="text-sm font-semibold text-[#17212b]">Threat correlation workspace</p>
            </div>
          </Link>
          <nav className="flex items-center gap-2 rounded-full border border-black/10 bg-white/60 p-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-[#36424d] transition hover:bg-[#17212b] hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
