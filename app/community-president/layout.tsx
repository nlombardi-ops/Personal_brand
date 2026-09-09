import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CommunitySidebar from "@/app/components/community/CommunitySidebar";

export const metadata: Metadata = { title: "Presidente — Comunidad" };

export default async function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = (await cookies()).get("dashboard_auth")?.value;

  // Three-part fail-closed guard. The middle clause is the hardening the
  // app/cv/layout.tsx analog lacks: with the env token unset, `undefined !==
  // undefined` is false and the surface would load for a logged-out visitor
  // (RESEARCH Pitfall 1). redirect() throws — never call it inside try/catch.
  if (
    !token ||
    !process.env.DASHBOARD_TOKEN ||
    token !== process.env.DASHBOARD_TOKEN
  ) {
    redirect("/dashboard/login");
  }

  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <CommunitySidebar />
      <main className="flex-1 min-w-0 md:ml-60">{children}</main>
    </div>
  );
}
