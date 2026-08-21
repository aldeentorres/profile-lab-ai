import type { Metadata } from "next";
import "./globals.css";
import "./iq-theme.css";
import "./app-ui.css";
import "./studio-camera.css";
import "./camera-pro.css";
import "./camera-v2.css";
import "./studio-session.css";
import "./polish.css";
import "./device-portability.css";
import "./studio-enhance.css";
import "./brand-assets.css";
export const metadata: Metadata = { title: "PhotoStudio+ · IQI", description: "AI-guided portraits and a permissioned Brand Asset Gallery." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
