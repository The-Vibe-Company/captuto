import { createClient } from '@/lib/supabase/server';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { ExtensionAuthSync } from '@/components/ExtensionAuthSync';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return <div className="flex min-h-screen bg-[#fafaf9] text-stone-900">
    <ExtensionAuthSync />
    <DashboardSidebar userEmail={session?.user?.email || ''}/>
    <div className="flex min-w-0 flex-1 flex-col">{children}</div>
  </div>;
}
