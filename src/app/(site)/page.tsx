import { FeaturesGrid } from '@/components/home/FeaturesGrid';
import { HeroSection } from '@/components/home/HeroSection';
import { SignInPrompt } from '@/components/auth/SignInPrompt';
import { auth } from '@/lib/auth';
import { isPublicHomepageEnabled } from '@/lib/config/instance-mode';

export default async function Home() {
  if (!isPublicHomepageEnabled()) {
    return <SignInPrompt description="This is a private Skynest instance." />;
  }

  const session = await auth();

  return (
    <div className="space-y-16">
      <HeroSection signedIn={Boolean(session?.user)} />
      <FeaturesGrid />
    </div>
  );
}
