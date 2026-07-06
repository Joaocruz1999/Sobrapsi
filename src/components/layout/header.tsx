"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MAIN_NAV } from "@/lib/constants";
import { SITE_SHELL } from "@/lib/layout";
import { SiteLogo } from "@/components/layout/site-logo";
import { cn } from "@/lib/utils";

function isNavActive(pathname: string, href: string) {
  const path = href.split("#")[0];
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

function isDropdownActive(
  pathname: string,
  items: readonly { href: string }[]
) {
  return items.some((sub) => isNavActive(pathname, sub.href));
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const pathname = usePathname();

  const linkClass = (href: string, active?: boolean) =>
    cn(
      "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary",
      active ?? isNavActive(pathname, href) ? "text-primary" : "text-zinc-300"
    );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <div className={SITE_SHELL}>
        <div className="flex h-20 items-center justify-between">
        <SiteLogo href="/" imageClassName="h-11 w-auto sm:h-12" priority />

        <nav className="hidden items-center gap-1 lg:flex">
          {MAIN_NAV.map((item) => {
            if ("items" in item) {
              return (
                <div key={item.label} className="group relative">
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-primary",
                      isDropdownActive(pathname, item.items)
                        ? "text-primary"
                        : "text-zinc-300"
                    )}
                    aria-haspopup="menu"
                  >
                    {item.label}
                    <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
                  </button>
                  <div className="invisible absolute left-0 top-full z-50 min-w-[260px] pt-2 opacity-0 transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                    <div className="rounded-lg border border-white/10 bg-zinc-950 py-2 shadow-xl">
                      {item.items.map((sub) => (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={cn(
                            "block px-4 py-2.5 text-sm transition-colors hover:bg-white/5 hover:text-primary",
                            isNavActive(pathname, sub.href)
                              ? "text-primary"
                              : "text-zinc-300"
                          )}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="rounded-md p-2 text-white lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-black lg:hidden">
          <nav className={cn(SITE_SHELL, "flex flex-col gap-1 py-4")}>
            {MAIN_NAV.map((item) => {
              if ("items" in item) {
                const isExpanded = openDropdown === item.label;
                return (
                  <div key={item.label}>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenDropdown(isExpanded ? null : item.label)
                      }
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium",
                        isDropdownActive(pathname, item.items)
                          ? "bg-primary/10 text-primary"
                          : "text-zinc-300 hover:bg-white/5"
                      )}
                    >
                      {item.label}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </button>
                    {isExpanded && (
                      <div className="ml-3 flex flex-col gap-1 border-l border-white/10 pl-3">
                        {item.items.map((sub) => (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => {
                              setOpen(false);
                              setOpenDropdown(null);
                            }}
                            className={cn(
                              "rounded-md px-3 py-2 text-sm",
                              isNavActive(pathname, sub.href)
                                ? "text-primary"
                                : "text-zinc-400 hover:text-white"
                            )}
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2.5 text-sm font-medium",
                    isNavActive(pathname, item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-zinc-300 hover:bg-white/5"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
