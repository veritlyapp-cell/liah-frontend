import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

/**
 * Indeed XML Job Feed
 * @see https://developer.indeed.com/docs/xml-feeds
 * 
 * Indeed uses a simpler XML format than LinkedIn.
 * This feed can be submitted to Indeed's job aggregation service.
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
}

interface Holding {
    nombre: string;
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

        // Map contract types to Indeed job types
        const jobTypeMap: Record<string, string> = {
            'tiempo_completo': 'fulltime',
            'medio_tiempo': 'parttime',
            'temporal': 'contract',
            'practicas': 'internship',
            'freelance': 'contract'
        };

        // Build XML jobs
        const jobsXml = jobs.map(job => {
            const description = `${job.descripcion || ''}
            
${job.requisitos ? `Requisitos:\n${job.requisitos}` : ''}

${job.beneficios ? `Beneficios:\n${job.beneficios}` : ''}`.trim();

            // Format date for Indeed
            const postedDate = job.createdAt
                ? new Date(job.createdAt.seconds * 1000).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];

            // Build salary string
            let salaryStr = '';
            if (job.salarioMin) {
                salaryStr = `S/${job.salarioMin.toLocaleString()}`;
                if (job.salarioMax) {
                    salaryStr += ` - S/${job.salarioMax.toLocaleString()}`;
                }
                salaryStr += ' mensual';
            }

            return `
    <job>
        <title><![CDATA[${job.titulo}]]></title>
        <date><![CDATA[${postedDate}]]></date>
        <referencenumber><![CDATA[${job.id}]]></referencenumber>
        <url><![CDATA[${baseUrl}/careers/${job.id}]]></url>
        <company><![CDATA[${holding.nombre}]]></company>
        <city><![CDATA[Lima]]></city>
        <state><![CDATA[Lima]]></state>
        <country><![CDATA[PE]]></country>
        <description><![CDATA[${description}]]></description>
        <jobtype><![CDATA[${jobTypeMap[job.tipoContrato] || 'fulltime'}]]></jobtype>
        ${salaryStr ? `<salary><![CDATA[${salaryStr}]]></salary>` : ''}
        ${job.modalidad === 'remoto' ? '<remotetype>Fully Remote</remotetype>' : ''}
    </job>`;
        }).join('\n');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<source>
    <publisher>${escapeXml(holding.nombre)}</publisher>
    <publisherurl>${baseUrl}</publisherurl>
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
        console.error('Error generating Indeed feed:', error);
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
