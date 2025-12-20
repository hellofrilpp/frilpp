import { Suspense } from "react";
import AcceptClient from "./accept-client";

export default function LegalAcceptPage() {
  return (
    <Suspense>
      <AcceptClient />
    </Suspense>
  );
}
