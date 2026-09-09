import { createClient } from '@/lib/supabase/server';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';
import { ExtensionAuthSync } from '@/components/ExtensionAuthSync';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return <div className="min-h-screen bg-[#faf8f3] text-stone-900">
    <ExtensionAuthSync />
    <DashboardTopBar userEmail={session?.user?.email || ''}/>
    <main>{children}</main>
  </div>;
}
