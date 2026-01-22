# CryptoFeeCalc API (Cloudflare Workers)

## Обзор
- REST API для оценки комиссии TRON (TRX).
- Платформа: Cloudflare Workers, TypeScript.
- Интеграция: TRON Grid API через TronWeb.

## Ключевые файлы
- `src/worker.ts` — маршруты, CORS, rate limit, основная логика.
- `src/middleware/rateLimit.ts` — лимиты по минуте/часу через KV.
- `src/types.ts` — типы API и Env.
- `wrangler.jsonc` — окружения, vars, KV bindings.
- `package.json` — скрипты dev/deploy.

## Переменные и bindings
- Secret: `TRON_GRID_API_KEY` (через `wrangler secret put` для dev/prod).
- Vars: `TRON_GRID_ENDPOINT`, `RATE_LIMIT_PER_MINUTE`, `RATE_LIMIT_PER_HOUR`.
- KV binding: `RATE_LIMIT_KV`.
- Для прод‑деплоя использовать `wrangler deploy --env prod`, чтобы применялись `env.prod.vars`.

## Эндпоинты
- `GET /health` → `{ "status": "ok" }`
- `POST /api/estimate` → расчет комиссии

## Скрипты
- `npm run dev` — локальный сервер (wrangler dev).
- `npm run deploy:dev` / `npm run deploy:prod`.

## Важно
- В API репозитории есть хук синка типов на фронт (`scripts/sync-types.sh`),
  он обновляет `../CryptoFeeCalc.com/types/api.ts`.
