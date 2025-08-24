import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100 border-b border-amber-200/50 shadow-sm relative z-20 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            href="/"
            className="text-2xl font-bold text-amber-900 hover:text-amber-700 transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
          >
            <span className="text-2xl">📜</span>
            <span className="font-serif">Opinion</span>
          </Link>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="hidden md:flex items-center space-x-2 bg-amber-100/70 backdrop-blur-sm rounded-full px-3 py-1.5 border border-amber-200/50">
                  <div className="w-6 h-6 bg-amber-200/70 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-amber-800">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-amber-900 font-medium">
                    {user.email}
                  </span>
                </div>
                <Link
                  href="/profile"
                  className="text-sm text-amber-800 hover:text-amber-600 transition-colors font-medium hover:bg-amber-100/50 px-3 py-1.5 rounded-lg"
                >
                  👤 Profil
                </Link>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="bg-amber-200/70 hover:bg-amber-300/70 text-amber-900 transition-all duration-200 px-4 py-1.5 rounded-lg font-medium border border-amber-300/50 hover:border-amber-400/50 hover:shadow-sm"
                  >
                    🚪 Çıkış
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/auth"
                className="bg-gradient-to-r from-amber-600 to-yellow-600 text-white hover:from-amber-700 hover:to-yellow-700 transition-all duration-200 px-5 py-2 rounded-lg font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
              >
                🔑 Giriş Yap
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
