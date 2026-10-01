import type { TeamMember } from '@/content/site';

export function Team({ members }: { members: TeamMember[] }) {
  if (members.length === 0) return null;
  return (
    <section aria-labelledby="team-title" className="mx-auto max-w-6xl px-4 py-16">
      <h2 id="team-title" className="text-2xl font-bold">Nuestro equipo</h2>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {members.map((member) => (
          <li key={member.name} className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- owner-supplied static asset */}
            <img src={member.photo.src} alt={member.photo.alt} className="mx-auto h-32 w-32 rounded-full object-cover" loading="lazy" />
            <p className="mt-3 font-medium">{member.name}</p>
            <p className="text-sm text-muted-foreground">{member.role}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
