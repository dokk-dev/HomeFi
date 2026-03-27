import { PillarCard } from "./PillarCard";
import type { Pillar } from "@/lib/types";

interface PillarGridProps {
  pillars: Pillar[];
}

export function PillarGrid({ pillars }: PillarGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {pillars.map((pillar) => (
        <PillarCard key={pillar.id} pillar={pillar} />
      ))}
    </div>
  );
}
