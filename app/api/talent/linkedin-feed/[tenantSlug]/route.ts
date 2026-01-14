/**
 * Liah Talent - LinkedIn XML Feed Generator
 * GET /api/talent/linkedin-feed/[tenantSlug]
 * 
 * Generates LinkedIn Job Wrapping compatible XML feed
 * Each tenant (holding) has its own unique feed URL
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Job {
    id: string;
    titulo: string;
    jd_content: string;
    departamento?: string;
    sede?: { ciudad?: string; direccion?: string };
    status: string;
    createdAt: any;
}

function escapeXml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function formatDate(timestamp: any): string {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date();
    return date.toISOString().split('T')[0];
}

export async function GET(
    req: NextRequest,
    { params }: { params: { tenantSlug: string } }
) {
    try {
        const { tenantSlug } = params;

        // Get holding by slug
        const holdingsRef = collection(db, 'holdings');
        const holdingQuery = query(holdingsRef, where('slug', '==', tenantSlug));
        const holdingSnap = await getDocs(holdingQuery);

        if (holdingSnap.empty) {
            return new NextResponse('Tenant not found', { status: 404 });
        }

        const holdingDoc = holdingSnap.docs[0];
        const holding = { id: holdingDoc.id, ...holdingDoc.data() } as any;

        // Get published jobs for this holding
        const jobsRef = collection(db, 'talent_jobs');
        const jobsQuery = query(
            jobsRef,
            where('holdingId', '==', holding.id),
            where('status', '==', 'published')
        );
        const jobsSnap = await getDocs(jobsQuery);

        const jobs: Job[] = jobsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Job));

        // Generate XML
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://talent.getliah.com';
        const now = new Date().toUTCString();

        const jobsXml = jobs.map(job => `
    <job>
      <title><![CDATA[${job.titulo}]]></title>
      <date>${formatDate(job.createdAt)}</date>
      <referencenumber>JOB-${holding.slug?.toUpperCase() || 'LIAH'}-${job.id.substring(0, 8).toUpperCase()}</referencenumber>
      <url>${baseUrl}/apply/${tenantSlug}/${job.id}</url>
      <company><![CDATA[${holding.nombre || 'Company'}]]></company>
      <city><![CDATA[${job.sede?.ciudad || 'Lima'}]]></city>
      <state><![CDATA[Lima]]></state>
      <country><![CDATA[PE]]></country>
      <description><![CDATA[${job.jd_content || ''}]]></description>
      <jobtype>Full-time</jobtype>
      <category><![CDATA[${job.departamento || 'General'}]]></category>
      <experience>Mid-Senior level</experience>
    </job>`).join('\n');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<source>
  <publisher>Liah Talent</publisher>
  <publisherurl>https://talent.getliah.com</publisherurl>
  <lastBuildDate>${now}</lastBuildDate>
  ${jobsXml}
</source>`;

        return new NextResponse(xml, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
            }
        });

    } catch (error) {
        console.error('[LinkedIn Feed] Error generating feed:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
