import CreatorDetailClient from "./creator-detail-client";

export const dynamic = "force-dynamic";

type PageProps = { params: { creatorId: string } };

export default function CreatorDetailPage({ params }: PageProps) {
  return <CreatorDetailClient creatorId={params.creatorId} />;
}
