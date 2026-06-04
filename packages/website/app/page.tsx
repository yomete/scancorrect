'use client';

import { useState } from 'react';
import { Nav, Hero, AppWindow } from '../components/technical/Sections';
import { MetadataReveal } from '../components/technical/MetadataReveal';
import { SpecFeatures, HowItWorks, DownloadFooter } from '../components/technical/Lower';

export default function Home() {
  const [picked, setPicked] = useState<string | null>(null);

  const pick = (id: string) => {
    setPicked(id);
    setTimeout(() => setPicked(null), 1600);
  };

  const toDownload = () => {
    const el = document.getElementById('download');
    if (el) window.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
  };

  return (
    <div className="technical-site">
      <Nav onDownload={toDownload} />
      <Hero onDownload={toDownload} picked={picked} onPick={pick} />
      <MetadataReveal />
      <AppWindow />
      <SpecFeatures />
      <HowItWorks />
      <DownloadFooter picked={picked} onPick={pick} />
    </div>
  );
}
