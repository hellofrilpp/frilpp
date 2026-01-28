import CampaignDetailClient from "./campaign-detail-client";

export const dynamic = "force-dynamic";

type PageProps = { params: { offerId: string } };

export default function CampaignDetailPage({ params }: PageProps) {
  return <CampaignDetailClient offerId={params.offerId} />;
}
