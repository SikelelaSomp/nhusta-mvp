import SceneRunner from '@/components/scenes/SceneRunner';

export default async function ExplorePage({
  params,
}: {
  params: Promise<{ topic: string }> | { topic: string };
}) {
  const { topic } = await params;
  return <SceneRunner topic={topic} />;
}