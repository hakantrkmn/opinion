import Header from "@/components/Header";
import Map from "@/components/Map";

export default async function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50/30 to-amber-100/50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 text-6xl transform rotate-12">
          📜
        </div>
        <div className="absolute top-40 right-20 text-4xl transform -rotate-12">
          ✒️
        </div>
        <div className="absolute bottom-32 left-1/4 text-5xl transform rotate-45">
          📖
        </div>
        <div className="absolute bottom-20 right-1/3 text-3xl transform -rotate-45">
          🖋️
        </div>
      </div>

      <Header />

      <main className="h-[calc(100vh-64px)] relative z-10">
        <Map />
      </main>
    </div>
  );
}
