import { getSettings } from "@/lib/db";
import { TemplatePlayground } from "@/components/TemplatePlayground";

export const dynamic = "force-dynamic";

export default function TemplatesPage() {
  const settings = getSettings();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Визуальные шаблоны</h1>
        <p className="text-sm text-ink2">
          Единый стиль обложек для видео и постов. Меняйте переменные и смотрите результат вживую —
          цвета берутся из бренд-настроек. Фон заменяется видео из Higgsfield при загрузке к посту.
        </p>
      </div>
      <TemplatePlayground settings={settings} />
    </div>
  );
}
