"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function GenesisEntry(){
 const path=usePathname();
 return <Link className={"genesisPortal "+(path.startsWith("/genesis")?"selected":"")} href={path.startsWith("/genesis")?"/":"/genesis"} aria-label={path.startsWith("/genesis")?"Volver a LINK WORLD":"Entrar a la dimensión Génesis"}>
 <span className="embryoIcon" aria-hidden="true">◉</span><span>{path.startsWith("/genesis")?"LINK WORLD":"GÉNESIS"}<small>{path.startsWith("/genesis")?"Regresar al micelio":"Dimensión embrionaria"}</small></span>
 </Link>;
}