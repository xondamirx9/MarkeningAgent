import { listOffers } from "@/lib/db";
import { OffersManager } from "@/components/OffersManager";

export const dynamic = "force-dynamic";

export default function OffersPage() {
  const offers = listOffers();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Туры</h1>
        <p className="text-sm text-ink2">
          Каталог актуальных предложений. «Сгенерировать план на неделю» строит посты из активных
          туров: реальные направления, цены и детали попадают в тексты и на обложки.
          Горящие туры автоматически получают рубрику «🔥 Горящие туры».
        </p>
      </div>
      <OffersManager initial={offers} />
    </div>
  );
}
