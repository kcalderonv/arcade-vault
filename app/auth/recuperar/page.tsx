import { Suspense } from 'react';
import { RecoverForm } from '@/components/recover-form';
export default function RecoverPage() {
    // useSearchParams (aviso de enlace fallido) exige un límite Suspense con cacheComponents.
    return (
        <Suspense fallback={<div className="av-auth-wrap" aria-busy="true" />}>
            <RecoverForm />
        </Suspense>
    );
}
