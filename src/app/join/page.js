import { Suspense } from "react";

import JoinSessionClient from "@/components/JoinSessionClient";

export default function JoinPage() {
    return (
        <Suspense fallback={null}>
            <JoinSessionClient />
        </Suspense>
    );
}