/**
 * Rate limit em memória para o formulário de login.
 *
 * O sistema tem uma única senha, então sem limite de tentativas um atacante
 * pode simplesmente testar senhas até acertar. O estado é por instância do
 * processo (suficiente para o deploy single-instance no Railway) e é perdido
 * num restart — o que é aceitável para essa finalidade.
 */

type Bucket = { hits: number[] }

const buckets = new Map<string, Bucket>()

/** Evita que o Map cresça indefinidamente com chaves antigas. */
const MAX_TRACKED_KEYS = 5_000

export type RateLimitResult = {
  allowed: boolean
  /** Quantos segundos esperar antes da próxima tentativa. */
  retryAfterSeconds: number
  /** Tentativas restantes dentro da janela atual. */
  remaining: number
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const cutoff = now - windowMs

  if (buckets.size > MAX_TRACKED_KEYS) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.hits.every((hit) => hit <= cutoff)) buckets.delete(bucketKey)
    }
  }

  const bucket = buckets.get(key) ?? { hits: [] }
  bucket.hits = bucket.hits.filter((hit) => hit > cutoff)

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket)
    const oldest = bucket.hits[0]
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
      remaining: 0,
    }
  }

  bucket.hits.push(now)
  buckets.set(key, bucket)

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: limit - bucket.hits.length,
  }
}

/** Zera o contador — chamado após um login bem-sucedido. */
export function resetRateLimit(key: string): void {
  buckets.delete(key)
}
