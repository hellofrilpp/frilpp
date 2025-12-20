import OfferShareClient from "./share-client";

export default async function OfferSharePage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;
  return <OfferShareClient offerId={offerId} />;
}

