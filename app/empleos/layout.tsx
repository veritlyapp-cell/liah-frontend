import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'NGR - Trabaja con Nosotros',
    description: 'Explorá oportunidades laborales en las marcas de NGR como Bembos, Don Belisario, Popeyes, Papa John\'s, Dunkin\' y China Wok. Postulate hoy mismo.',
    keywords: 'trabajo en NGR, empleos Bembos, vacantes Papa John\'s, oportunidades Popeyes, trabajar en Don Belisario, empleos gastronomía Perú',
    authors: [{ name: 'NGR' }],
    openGraph: {
        title: 'Trabaja en NGR - Postulate a nuestras vacantes',
        description: 'Sumate a una de las 6 marcas líderes en gastronomía: Bembos, Papa John\'s, Popeyes y más.',
        type: 'website',
    },
    robots: 'index, follow',
};

export default function EmpleosLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
