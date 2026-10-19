import Header from "@/components/common/Header";
import { MapLoader } from "@/features/map/components/MapLoader";
import { parseLngLat } from "@/features/map/lib/view";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const initialCenter = parseLngLat(first(params.lat), first(params.lng) ?? first(params.long));
  const pin = first(params.pin);
  const initialPinId = pin && /^[\w-]{1,64}$/.test(pin) ? pin : null;

  return (
    <div data-app-shell className="flex h-dvh flex-col overflow-clip bg-background">
      <Header />
      <main className="relative min-h-0 flex-1">
        <MapLoader initialCenter={initialCenter} initialPinId={initialPinId} />
      </main>
    </div>
  );
}
