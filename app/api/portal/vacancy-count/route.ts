import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export async function GET() {
    try {
        // Count RQs that are currently in recruiting status
        const rqsRef = collection(db, 'rqs');
        const q = query(rqsRef, where('status', '==', 'recruiting'));
        const snapshot = await getDocs(q);

        // Sum up all vacantes
        let totalVacantes = 0;
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            totalVacantes += data.vacantes || 1;
        });

        return NextResponse.json({
            success: true,
            count: totalVacantes,
            rqCount: snapshot.size
        });

    } catch (error) {
        console.error('Error counting vacancies:', error);
        return NextResponse.json({ count: 0 }, { status: 200 });
    }
}
