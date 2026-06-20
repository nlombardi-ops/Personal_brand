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
      <main className="ml-56 flex-1 min-w-0">{children}</main>
    </div>
  );
}
