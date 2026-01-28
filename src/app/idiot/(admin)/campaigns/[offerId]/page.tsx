import CampaignDetailClient from "./campaign-detail-client";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ offerId: string }> };

export default async function CampaignDetailPage({ params }: PageProps) {
  const { offerId } = await params;
  return <CampaignDetailClient offerId={offerId} />;
}
