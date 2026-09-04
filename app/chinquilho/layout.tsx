import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Chinquilho Finlandês",
};

export default function ChinquilhoLayout({ children }: { children: ReactNode }) {
  return children;
}
