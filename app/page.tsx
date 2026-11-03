import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import {
  Activity,
  Features,
  FinalCta,
  GamesPreview,
  Pricing,
  Stats,
} from "@/components/home/sections";

export const metadata: Metadata = { title: "Arcade Vault" };

export default function Home() {
  return (
    <div className="home fade-in">
      <Hero />
      <Features />
      <GamesPreview />
      <Stats />
      <Activity />
      <Pricing />
      <FinalCta />
    </div>
  );
}
