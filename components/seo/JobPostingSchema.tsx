'use client';

import Script from 'next/script';

interface JobPostingSchemaProps {
    job: {
        id: string;
        titulo: string;
        descripcion: string;
        requisitos?: string;
        beneficios?: string;
        tipoContrato: string;
        modalidad: string;
        salarioMin?: number;
        salarioMax?: number;
        mostrarSalario: boolean;
        vacantes: number;
        holdingId: string;
        createdAt?: any;
    };
    companyName: string;
    companyLogo?: string;
    location?: string;
}

/**
 * Google Jobs structured data component
 * @see https://developers.google.com/search/docs/appearance/structured-data/job-posting
 */
export default function JobPostingSchema({ job, companyName, companyLogo, location }: JobPostingSchemaProps) {
    // Map contract types to Google's employment types
    const employmentTypeMap: Record<string, string> = {
        'tiempo_completo': 'FULL_TIME',
        'medio_tiempo': 'PART_TIME',
        'temporal': 'TEMPORARY',
        'practicas': 'INTERN',
        'freelance': 'CONTRACTOR'
    };

    // Map modality to job location type
    const jobLocationTypeMap: Record<string, string> = {
        'remoto': 'TELECOMMUTE',
        'presencial': '',
        'hibrido': ''
    };

    // Create publication date from createdAt or use current date
    const datePosted = job.createdAt
        ? new Date(job.createdAt.seconds * 1000).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

    // Valid until 60 days from posting
    const validThrough = new Date();
    validThrough.setDate(validThrough.getDate() + 60);

    const schema = {
        "@context": "https://schema.org/",
        "@type": "JobPosting",
        "title": job.titulo,
        "description": `${job.descripcion}\n\n${job.requisitos ? `Requisitos:\n${job.requisitos}` : ''}\n\n${job.beneficios ? `Beneficios:\n${job.beneficios}` : ''}`,
        "datePosted": datePosted,
        "validThrough": validThrough.toISOString().split('T')[0],
        "employmentType": employmentTypeMap[job.tipoContrato] || 'FULL_TIME',
        "hiringOrganization": {
            "@type": "Organization",
            "name": companyName,
            ...(companyLogo && { "logo": companyLogo })
        },
        "jobLocation": {
            "@type": "Place",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": location || "Lima",
                "addressCountry": "PE"
            }
        },
        // Handle remote work
        ...(job.modalidad === 'remoto' && {
            "jobLocationType": "TELECOMMUTE"
        }),
        // Add salary if shown
        ...(job.mostrarSalario && job.salarioMin && {
            "baseSalary": {
                "@type": "MonetaryAmount",
                "currency": "PEN",
                "value": {
                    "@type": "QuantitativeValue",
                    ...(job.salarioMax ? {
                        "minValue": job.salarioMin,
                        "maxValue": job.salarioMax,
                        "unitText": "MONTH"
                    } : {
                        "value": job.salarioMin,
                        "unitText": "MONTH"
                    })
                }
            }
        }),
        "directApply": true,
        "identifier": {
            "@type": "PropertyValue",
            "name": companyName,
            "value": job.id
        }
    };

    return (
        <Script
            id="job-posting-schema"
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
}
