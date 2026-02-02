'use client';

/**
 * Script to clean candidate data for reingreso
 * Run this from the browser console on the LIAH dashboard
 * 
 * Usage: Copy and paste into browser console, then call:
 * cleanCandidateForReingreso('45329311')
 */

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';

export async function cleanCandidateForReingreso(dni: string) {
    console.log(`[CleanReingreso] Searching for candidate with DNI: ${dni}`);

    const candidatesRef = collection(db, 'candidates');
    const q = query(candidatesRef, where('dni', '==', dni));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        console.error(`[CleanReingreso] No candidate found with DNI: ${dni}`);
        return { success: false, error: 'Candidate not found' };
    }

    const candidateDoc = snapshot.docs[0];
    const candidateData = candidateDoc.data();

    console.log(`[CleanReingreso] Found candidate: ${candidateData.nombre} ${candidateData.apellidoPaterno}`);
    console.log(`[CleanReingreso] Current selectionStatus: ${candidateData.selectionStatus}`);
    console.log(`[CleanReingreso] Current selectedForRQ: ${candidateData.selectedForRQ}`);
    console.log(`[CleanReingreso] Assignments:`, candidateData.assignments);

    // Mark all active assignments as 'released'
    const updatedAssignments = (candidateData.assignments || []).map((a: any) => ({
        ...a,
        status: (a.status === 'assigned' || a.status === 'confirmed') ? 'released' : a.status
    }));

    // Update the candidate document
    const candidateRef = doc(db, 'candidates', candidateDoc.id);
    await updateDoc(candidateRef, {
        assignments: updatedAssignments,
        selectionStatus: null,
        selectedForRQ: null,
        updatedAt: Timestamp.now()
    });

    console.log(`[CleanReingreso] ✅ Candidate cleaned successfully!`);
    console.log(`[CleanReingreso] - selectionStatus: null`);
    console.log(`[CleanReingreso] - selectedForRQ: null`);
    console.log(`[CleanReingreso] - Assignments marked as released`);

    return {
        success: true,
        candidateId: candidateDoc.id,
        nombre: `${candidateData.nombre} ${candidateData.apellidoPaterno}`
    };
}

// Export for use in API route or direct import
export default cleanCandidateForReingreso;
