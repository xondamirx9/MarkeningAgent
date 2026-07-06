import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { Nav } from "@/components/Nav";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthed())) redirect("/login");
  return (
    <div className="flex min-h-screen">
      <Nav />
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
