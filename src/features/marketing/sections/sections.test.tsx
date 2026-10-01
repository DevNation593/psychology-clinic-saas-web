import { act, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { site } from '@/content/site';
import { resetConsent, writeConsent } from '../consent/consent';
import { CaseStudies } from './case-studies';
import { FaqSection } from './faq';
import { Hero } from './hero';
import { LocationSection } from './location';
import { Plans, formatPlanPrice } from './plans';
import { Reviews } from './reviews';
import { Team } from './team';

beforeEach(() => act(() => resetConsent()));

describe('Hero', () => {
  it('shows the headline with the demo and WhatsApp calls to action', () => {
    render(<Hero hero={site.hero} contact={{ whatsappNumber: '593991234567', email: '', responseTime: 'En 24 horas.' }} />);
    expect(screen.getByRole('heading', { level: 1, name: site.hero.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Solicitar demo' })).toHaveAttribute('href', '/contacto');
    expect(screen.getByRole('link', { name: 'Escribir por WhatsApp' }).getAttribute('href')).toContain('wa.me/593991234567');
    expect(screen.getByText('En 24 horas.')).toBeInTheDocument();
  });

  it('omits WhatsApp without a number', () => {
    render(<Hero hero={site.hero} contact={{ whatsappNumber: '', email: '', responseTime: '' }} />);
    expect(screen.queryByRole('link', { name: 'Escribir por WhatsApp' })).not.toBeInTheDocument();
  });
});

describe('Plans', () => {
  it('formats prices', () => {
    expect(formatPlanPrice(site.plans[0])).toBe('Gratis');
    expect(formatPlanPrice(site.plans[1])).toBe('$29');
    expect(formatPlanPrice(site.plans[5])).toBe('A medida');
  });

  it('lists every plan with its limits and extra-seat price', () => {
    render(<Plans plans={site.plans} />);
    const card = screen.getByRole('article', { name: 'Clínica Básica' });
    expect(within(card).getByText('$99')).toBeInTheDocument();
    expect(within(card).getByText('3 usuarios incluidos')).toBeInTheDocument();
    expect(within(card).getByText('$15 por usuario adicional')).toBeInTheDocument();
    expect(within(card).getByText('Hasta 150 pacientes activos')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(6);
  });

  it('labels each instance with its own heading when rendered twice', () => {
    render(
      <>
        <Plans plans={site.plans.slice(0, 1)} heading="Para profesionales independientes" />
        <Plans plans={site.plans.slice(3, 4)} heading="Para clínicas y equipos" />
      </>,
    );
    expect(screen.getByRole('region', { name: 'Para profesionales independientes' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Para clínicas y equipos' })).toBeInTheDocument();
  });
});

describe('FaqSection', () => {
  it('renders each question with its answer', () => {
    render(<FaqSection faq={site.faq} />);
    expect(screen.getAllByRole('group')).toHaveLength(5);
    expect(screen.getByText(site.faq[0].answer)).toBeInTheDocument();
  });
});

describe('sections that need real content', () => {
  it('render nothing while empty', () => {
    const { container } = render(
      <><Reviews reviews={[]} /><CaseStudies items={[]} /><Team members={[]} /><LocationSection location={null} /></>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('render reviews, cases and team once content exists', () => {
    render(
      <>
        <Reviews reviews={[{ author: 'Ana Vega', role: 'Psicóloga', quote: 'Ordenó mi agenda.', rating: 5 }]} />
        <CaseStudies items={[{ clinic: 'Centro Vida', challenge: 'Agenda en papel', result: 'Menos ausencias' }]} />
        <Team members={[{ name: 'Luis Paz', role: 'Soporte', photo: { src: '/team/luis.jpg', alt: 'Retrato de Luis Paz' } }]} />
      </>,
    );
    expect(screen.getByText('Ordenó mi agenda.')).toBeInTheDocument();
    expect(screen.getByLabelText('5 de 5 estrellas')).toBeInTheDocument();
    expect(screen.getByText('Menos ausencias')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Retrato de Luis Paz' })).toBeInTheDocument();
  });
});

describe('LocationSection', () => {
  const location = { address: 'Av. Amazonas 100', city: 'Quito', country: 'Ecuador', latitude: -0.18, longitude: -78.47, directions: 'Frente al parque.' };

  it('shows the address and a maps link without loading the embed before consent', () => {
    render(<LocationSection location={location} />);
    expect(screen.getByText(/Av. Amazonas 100/)).toBeInTheDocument();
    expect(screen.getByText('Frente al parque.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver en Google Maps' }).getAttribute('href')).toContain('-0.18,-78.47');
    expect(screen.queryByTitle('Mapa de ubicación')).not.toBeInTheDocument();
  });

  it('embeds the map after consent', () => {
    act(() => writeConsent('accepted'));
    render(<LocationSection location={location} />);
    expect(screen.getByTitle('Mapa de ubicación')).toBeInTheDocument();
  });
});
