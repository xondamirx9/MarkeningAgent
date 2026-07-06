# Настройка Instagram Graph API (публикация)

Автопубликация в Instagram возможна **только** через Instagram Graph API и требует
подготовки на стороне Meta. Пока она не выполнена, платформа работает в полуручном
режиме: текст для IG готов в карточке поста, выкладываете вручную.

## Предусловия

1. **Instagram Business или Creator аккаунт** (Настройки Instagram → Аккаунт →
   Переключиться на профессиональный аккаунт).
2. **Facebook Page**, привязанная к этому Instagram-аккаунту
   (Meta Business Suite → Настройки → Связанные аккаунты).
3. **Приложение Meta for Developers**: <https://developers.facebook.com> → My Apps →
   Create App → тип «Business».

## Получение токена

1. В приложении добавьте продукты **Facebook Login for Business** и **Instagram Graph API**.
2. В Graph API Explorer запросите права: `instagram_basic`,
   `instagram_content_publish`, `pages_read_engagement`, `business_management`.
3. Получите **Page Access Token** своей страницы и обменяйте на долгоживущий
   (60 дней) через `GET /oauth/access_token?grant_type=fb_exchange_token&…`.
4. Узнайте ID бизнес-аккаунта: `GET /{page-id}?fields=instagram_business_account`.

Итого для интеграции понадобятся: `IG_ACCESS_TOKEN`, `IG_BUSINESS_ACCOUNT_ID`.

## Как работает публикация (для будущей интеграции)

```
POST /{ig-user-id}/media          — создать контейнер (image_url/video_url + caption)
GET  /{container-id}?fields=status_code   — дождаться FINISHED (для видео/Reels)
POST /{ig-user-id}/media_publish  — опубликовать контейнер
```

Ограничения Meta: **до 50 публикаций через API в сутки** на аккаунт; медиа должно быть
доступно по публичному HTTPS-URL (то есть платформе нужен публичный домен);
Reels — MP4/MOV, 9:16, до 15 минут; ревью приложения (App Review) обязательно для
работы вне режима разработки.

## Почему это не включено по умолчанию

Без публичного домена, Business-аккаунта и пройденного App Review интеграция не
заработает — честнее полуручной режим, чем «мёртвая» кнопка. Когда всё из списка выше
готово, добавление реальной публикации — небольшая доработка `lib/publish.ts`
(эндпоинты выше) — напишите агенту, он её сделает.
