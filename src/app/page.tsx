import Header from "@/components/Header";
import Map from "@/components/Map";
export default async function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="h-[calc(100vh-64px)]">
        <Map />
      </main>
    </div>
  );
}
