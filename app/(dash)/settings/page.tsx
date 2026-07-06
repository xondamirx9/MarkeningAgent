import { getSettings } from "@/lib/db";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const settings = getSettings();
  const integrations = {
    telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID),
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    higgsfield: !!(process.env.HF_CREDENTIALS || (process.env.HF_API_KEY && process.env.HF_API_SECRET)),
  };
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Настройки</h1>
      <SettingsForm initial={settings} integrations={integrations} />
    </div>
  );
}
