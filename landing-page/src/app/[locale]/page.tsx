import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import Demo from '@/components/Demo';
import Analysis from '@/components/Analysis';
import Features from '@/components/Features';
import Workflow from '@/components/Workflow';
import Insight from '@/components/Insight';
import Pricing from '@/components/Pricing';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';

export default function LandingPage() {
  return (
    <>
      <Nav />
      <Hero />
      <div className="divider"></div>
      <Demo />
      <div className="divider"></div>
      <Analysis />
      <div className="divider"></div>
      <Features />
      <div className="divider"></div>
      <Workflow />
      <div className="divider"></div>
      <Insight />
      <div className="divider"></div>
      <Pricing />
      <div className="divider"></div>
      <CTA />
      <Footer />
    </>
  );
}
