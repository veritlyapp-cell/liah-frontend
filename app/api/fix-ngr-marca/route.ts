import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

export async function GET() {
    try {
        const marcasSnap = await getDocs(collection(db, 'marcas'));
        let summary = [];
        let ngrBrandsCount = 0;
        let updatedCount = 0;

        for (const d of marcasSnap.docs) {
            const data = d.data();
            const lowerName = String(data.nombre || '').toLowerCase();
            const lowerLabel = String(data.label || '').toLowerCase();
            const holdingId = String(data.holdingId || '').toLowerCase();

            summary.push({ id: d.id, name: data.nombre || data.label, holdingId: data.holdingId });

            if (holdingId === 'ngr') ngrBrandsCount++;

            // If it belongs to NGR but holdingId isn't correctly set, fix it
            if (
                holdingId !== 'ngr' &&
                (lowerName.includes('ngr') || lowerName.includes('bembos') || lowerName.includes('papa john') || lowerName.includes('popeyes') ||
                    lowerName.includes('chinawok') || lowerName.includes('dunkin') || lowerName.includes('don belisario'))
            ) {
                console.log(`Fixing Brand: ${data.nombre || data.label}`);
                await updateDoc(doc(db, 'marcas', d.id), { holdingId: 'ngr' });
                updatedCount++;
            }
        }

        const holdingsSnap = await getDocs(query(collection(db, 'holdings'), where('slug', '==', 'ngr')));
        let holdingUpdated = false;
        if (!holdingsSnap.empty) {
            const hId = holdingsSnap.docs[0].id;
            const hData = holdingsSnap.docs[0].data();
            const maxMarcas = hData.config?.maxBrands || hData.config?.maxMarcas || 1;
            if (maxMarcas < (ngrBrandsCount + updatedCount)) {
                await updateDoc(doc(db, 'holdings', hId), {
                    'config.maxBrands': Math.max(2, ngrBrandsCount + updatedCount),
                    'config.maxMarcas': Math.max(2, ngrBrandsCount + updatedCount),
                });
                holdingUpdated = true;
            }
        } else {
            const hdoc = await getDocs(query(collection(db, 'holdings'), where('__name__', '==', 'ngr')));
            if (!hdoc.empty) {
                const hData = hdoc.docs[0].data();
                const maxMarcas = hData.config?.maxBrands || hData.config?.maxMarcas || 1;
                if (maxMarcas < (ngrBrandsCount + updatedCount)) {
                    await updateDoc(doc(db, 'holdings', 'ngr'), {
                        'config.maxBrands': Math.max(2, ngrBrandsCount + updatedCount),
                        'config.maxMarcas': Math.max(2, ngrBrandsCount + updatedCount),
                    });
                    holdingUpdated = true;
                }
            }
        }

        return NextResponse.json({
            success: true,
            updatedCount,
            previousNgrCount: ngrBrandsCount,
            holdingUpdated,
            allBrands: summary
        });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
