import type { Metadata } from "next";
import "./entry.css";
export const metadata: Metadata = { title: "Profile Lab AI", description: "AI-guided portraits and a permissioned Brand Asset Gallery." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
