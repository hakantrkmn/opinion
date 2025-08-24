import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="text-xl font-semibold text-gray-900 hover:text-gray-700 transition-colors"
          >
            Opinion
          </Link>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-gray-600">{user.email}</span>
                <Link
                  href="/profile"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Profil
                </Link>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Çıkış Yap
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/auth"
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                Giriş Yap
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
