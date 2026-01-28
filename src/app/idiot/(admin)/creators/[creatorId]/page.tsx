import CreatorDetailClient from "./creator-detail-client";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ creatorId: string }> };

export default async function CreatorDetailPage({ params }: PageProps) {
  const { creatorId } = await params;
  return <CreatorDetailClient creatorId={creatorId} />;
}
