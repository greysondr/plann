import { Sidebar } from "@/components/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-start">
      <Sidebar />
      <main className="min-w-0 flex-1 px-8 py-7">{children}</main>
    </div>
  );
}
