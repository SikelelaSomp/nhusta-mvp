'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { scenes } from './registry';

export default function SceneRunner({ topic }: { topic: string }) {
  const router = useRouter();
  const Scene = scenes[topic];

  if (!Scene) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <p className="text-lg font-medium">The Explore simulation for this topic is coming soon.</p>
        <Link href={`/topics/${topic}`} className="mt-4 inline-block underline">
          Back to the topic
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Scene onComplete={() => router.push(`/topics/${topic}`)} />
    </div>
  );
}