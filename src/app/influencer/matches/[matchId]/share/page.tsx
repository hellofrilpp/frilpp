import ShareKitClient from "./share-client";

export default async function ShareKitPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  return <ShareKitClient matchId={matchId} />;
}

