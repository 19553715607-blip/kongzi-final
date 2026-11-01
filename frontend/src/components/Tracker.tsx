"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track } from "@/lib/track";

export default function Tracker() {
  const path = usePathname();
  useEffect(() => {
    track(path);
  }, [path]);
  return null;
}
