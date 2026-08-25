import type {Metadata} from "next";
import Dashboard from "./dashboard";
import "./entry.css";

export const metadata:Metadata={title:"Designer · Profile Lab AI",description:"Profile Lab AI designer review and approved asset library."};
export default function DesignerPage(){return <Dashboard/>}
