import repository from "@/lib/services/repository";
import { TransparencyContent, type TransparencyStats } from "@/components/transparency/TransparencyContent";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Public Transparency | AICTE Sentinel",
  description:
    "Statutory disclosure of AICTE grievance disposal: volumes, disposal rate, average resolution time, regional office performance and citizens' verdict on redressal quality. No sign-in required.",
};

export default function TransparencyPage() {
  const s = repository.getPublicTransparencyStats();
  return <TransparencyContent stats={s as TransparencyStats} />;
}
