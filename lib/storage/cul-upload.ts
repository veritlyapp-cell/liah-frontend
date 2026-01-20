import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a CUL file to Firebase Storage
 * @param file - The CUL file (PDF or Image)
 * @param holdingId - The holding ID for organization
 * @param jobId - The job ID this application is for
 * @param candidateEmail - Candidate's email for unique naming
 * @returns Promise with the download URL
 */
export async function uploadCUL(
    file: File,
    holdingId: string,
    jobId: string,
    candidateEmail: string
): Promise<{ url: string; path: string }> {
    if (!storage) {
        throw new Error('Firebase Storage not initialized');
    }

    // Clean email for filename
    const cleanEmail = candidateEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'pdf';

    // Path: culs/{holdingId}/{jobId}/{email}_{timestamp}.{ext}
    const path = `culs/${holdingId}/${jobId}/${cleanEmail}_${timestamp}.${extension}`;
    const storageRef = ref(storage, path);

    // Upload file
    await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
            originalName: file.name,
            candidateEmail,
            jobId,
            holdingId,
            documentType: 'CUL'
        }
    });

    // Get download URL
    const url = await getDownloadURL(storageRef);

    return { url, path };
}
