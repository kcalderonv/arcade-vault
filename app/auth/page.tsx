import { Suspense } from 'react';
import { AuthForm } from '@/components/auth-form';
export default function AuthPage() {
    // useSearchParams (parámetro `next`) exige un límite Suspense con cacheComponents.
    return (
        <Suspense fallback={<div className="av-auth-wrap" aria-busy="true" />}>
            <AuthForm />
        </Suspense>
    );
}
