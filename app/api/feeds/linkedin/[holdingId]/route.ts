import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

/**
 * LinkedIn Job Wrapping XML Feed
 * @see https://learn.microsoft.com/en-us/linkedin/talent/job-postings/xml-feeds
 * 
 * Note: Requires LinkedIn partner approval to use.
 * This endpoint generates the XML feed in the correct format.
 */

interface Job {
    id: string;
    titulo: string;
    descripcion: string;
    requisitos?: string;
    beneficios?: string;
    tipoContrato: string;
    modalidad: string;
    salarioMin?: number;
    salarioMax?: number;
    holdingId: string;
    createdAt?: any;
    updatedAt?: any;
}

interface Holding {
    nombre: string;
    linkedinCompanyId?: string;
    recruiterEmail?: string;
}

export async function GET(
    request: NextRequest,
    { params }: { params: { holdingId: string } }
) {
    const holdingId = params.holdingId;
    const baseUrl = request.nextUrl.origin;

    try {
        // Fetch holding info
        const holdingDoc = await getDoc(doc(db, 'holdings', holdingId));
        if (!holdingDoc.exists()) {
            return new NextResponse('Holding not found', { status: 404 });
        }
        const holding = holdingDoc.data() as Holding;

        // Fetch published jobs for this holding
        const jobsRef = collection(db, 'talent_jobs');
        const jobsQuery = query(
            jobsRef,
            where('holdingId', '==', holdingId),
            where('status', '==', 'published')
        );
        const jobsSnap = await getDocs(jobsQuery);

        const jobs = jobsSnap.docs.map(d => ({
            id: d.id,
            ...d.data()
        })) as Job[];

        // Map modality to LinkedIn workplace types
        const workplaceTypeMap: Record<string, string> = {
            'remoto': 'remote',
            'presencial': 'on-site',
            'hibrido': 'hybrid'
        };

        // Map contract types to LinkedIn employment types
        const employmentTypeMap: Record<string, string> = {
            'tiempo_completo': 'full-time',
            'medio_tiempo': 'part-time',
            'temporal': 'contract',
            'practicas': 'internship',
            'freelance': 'contract'
        };

        // Build XML
        const jobsXml = jobs.map(job => {
            const description = `${job.descripcion || ''}
            
${job.requisitos ? `Requisitos:\n${job.requisitos}` : ''}

${job.beneficios ? `Beneficios:\n${job.beneficios}` : ''}

#LI-${workplaceTypeMap[job.modalidad] || 'onsite'}`.trim();

            // Format date for LinkedIn (ISO 8601)
            const postedDate = job.createdAt
                ? new Date(job.createdAt.seconds * 1000).toISOString()
                : new Date().toISOString();

            // Expiration 60 days from now
            const expireDate = new Date();
            expireDate.setDate(expireDate.getDate() + 60);

            return `
    <job>
        <partnerJobId>${escapeXml(job.id)}</partnerJobId>
        <company>${escapeXml(holding.nombre)}</company>
        ${holding.linkedinCompanyId ? `<companyId>${escapeXml(holding.linkedinCompanyId)}</companyId>` : ''}
        <title>${escapeXml(job.titulo)}</title>
        <description><![CDATA[${description}]]></description>
        <location>
            <city>Lima</city>
            <country>PE</country>
        </location>
        <workplaceTypes>${workplaceTypeMap[job.modalidad] || 'on-site'}</workplaceTypes>
        <employmentType>${employmentTypeMap[job.tipoContrato] || 'full-time'}</employmentType>
        <applyUrl>${baseUrl}/careers/${job.id}</applyUrl>
        <postedAt>${postedDate}</postedAt>
        <expireAt>${expireDate.toISOString()}</expireAt>
        ${job.salarioMin ? `<salary>
            <currencyCode>PEN</currencyCode>
            <minValue>${job.salarioMin}</minValue>
            ${job.salarioMax ? `<maxValue>${job.salarioMax}</maxValue>` : ''}
            <period>MONTHLY</period>
        </salary>` : ''}
        ${holding.recruiterEmail ? `<jobPosterEmail>${escapeXml(holding.recruiterEmail)}</jobPosterEmail>` : ''}
    </job>`;
        }).join('\n');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<source>
    <publisherUrl>${baseUrl}</publisherUrl>
    <publisher>${escapeXml(holding.nombre)}</publisher>
    <lastBuildDate>${new Date().toISOString()}</lastBuildDate>
    ${jobsXml}
</source>`;

        return new NextResponse(xml, {
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
            }
        });

    } catch (error) {
        console.error('Error generating LinkedIn feed:', error);
        return new NextResponse('Error generating feed', { status: 500 });
    }
}

function escapeXml(str: string): string {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
