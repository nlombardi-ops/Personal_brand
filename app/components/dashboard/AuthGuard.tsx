import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AuthGuard({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("dashboard_auth")?.value;

  if (token !== process.env.DASHBOARD_TOKEN) {
    redirect("/dashboard/login");
  }

  return <>{children}</>;
}
