import type { Review } from '@/content/site';

export function Reviews({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;
  return (
    <section aria-labelledby="reviews-title" className="bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 id="reviews-title" className="text-2xl font-bold">Lo que dicen nuestros clientes</h2>
        <ul className="mt-8 grid gap-6 md:grid-cols-3">
          {reviews.map((review) => (
            <li key={`${review.author}-${review.quote}`} className="rounded-lg border bg-background p-5">
              <p aria-label={`${review.rating} de 5 estrellas`} className="text-amber-500">
                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
              </p>
              <blockquote className="mt-3 text-sm">{review.quote}</blockquote>
              <p className="mt-3 text-sm font-medium">{review.author}</p>
              <p className="text-xs text-muted-foreground">{review.role}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
