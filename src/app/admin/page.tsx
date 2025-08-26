import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DynamicAdminDashboard from '@/components/DynamicAdminDashboard';

// Admin email - sadece bu email admin sayfasına erişebilir
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export default async function AdminPage() {
    const supabase = createClient();

    // Check if user is authenticated
    const { data: { session } } = await (await supabase).auth.getSession();

    if (!session) {
        redirect('/');
    }

    // Check if user is admin
    if (session.user.email !== ADMIN_EMAIL) {
        redirect('/');
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <DynamicAdminDashboard />
        </div>
    );
}
