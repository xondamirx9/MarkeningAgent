import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, getSettings } from "@/lib/db";
import { fmtNum, STATUS_LABELS, CHANNEL_LABELS } from "@/lib/format";
import { Cover, FORMAT_LABELS } from "@/components/Cover";
import { PostActions } from "@/components/PostActions";
import { PostEditor } from "@/components/PostEditor";

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = getPost(Number(id));
  if (!post) notFound();
  const settings = getSettings();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/queue" className="text-sm text-accent hover:underline">← К очереди</Link>
          <h1 className="mt-1 text-2xl font-semibold">Пост #{post.id}</h1>
          <p className="text-sm text-ink2">
            {STATUS_LABELS[post.status]} · {CHANNEL_LABELS[post.channel]}
          </p>
        </div>
        <PostActions id={post.id} status={post.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border bg-card p-5">
          <PostEditor post={post} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-4">
            <h2 className="mb-3 text-sm font-medium text-ink2">
              Превью обложки · {FORMAT_LABELS[post.cover_format]}
            </h2>
            <div className="flex justify-center">
              <Cover
                format={post.cover_format}
                title={post.title}
                destination={post.destination}
                price={post.price}
                badge={post.badge}
                brandName={settings.business.name}
                primary={settings.brand.primary}
                accent={settings.brand.accent}
                mediaUrl={post.media_path ? `/api/media/${post.media_path}` : null}
                width={260}
              />
            </div>
            <p className="mt-3 text-xs text-mut">
              Обложка собирается автоматически из бренд-настроек. Загрузите видео из Higgsfield —
              оно станет фоном.
            </p>
            <a
              href={`/api/posts/${post.id}/cover`}
              className="mt-3 inline-block rounded-lg border px-3 py-1.5 text-sm hover:bg-bg"
            >
              ⬇️ Скачать обложку PNG
            </a>
          </div>

          {post.status === "published" && (
            <div className="rounded-2xl border bg-card p-4">
              <h2 className="mb-2 text-sm font-medium text-ink2">Метрики поста</h2>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div><dt className="text-mut">Просмотры</dt><dd className="font-medium">{fmtNum(post.views)}</dd></div>
                <div><dt className="text-mut">Реакции</dt><dd className="font-medium">{fmtNum(post.likes)}</dd></div>
                <div><dt className="text-mut">Комментарии</dt><dd className="font-medium">{fmtNum(post.comments)}</dd></div>
                <div><dt className="text-mut">Репосты</dt><dd className="font-medium">{fmtNum(post.shares)}</dd></div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
