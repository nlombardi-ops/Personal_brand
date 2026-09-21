import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CvSidebar from "@/app/components/cv/CvSidebar";

export default async function CvLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("dashboard_auth")?.value;

  if (token !== process.env.DASHBOARD_TOKEN) {
    redirect("/dashboard/login");
  }

  return (
    <div className="flex min-h-screen bg-stone-50">
      <CvSidebar />
      {/* Offsets are breakpoint-scoped: the fixed 224px sidebar only exists
          from md up (md:ml-56); below md the fixed 56px mobile top bar takes
          its place (pt-14). Change this together with CvSidebar's two modes.
          min-w-0 lets flex children shrink instead of the widest content
          setting the page's min-content width. */}
      <main className="flex-1 min-w-0 pt-14 md:ml-56 md:pt-0">{children}</main>
    </div>
  );
}
