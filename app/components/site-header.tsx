'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function SiteHeader() {
  const [theme,setTheme] = useState<'light'|'dark'>('light');

  useEffect(()=>{
    const frame=requestAnimationFrame(()=>setTheme(document.documentElement.dataset.theme==='dark'?'dark':'light'));
    return ()=>cancelAnimationFrame(frame);
  },[]);

  const toggleTheme=()=>{
    const next=theme==='dark'?'light':'dark';
    document.documentElement.dataset.theme=next;
    localStorage.setItem('algostudy-theme',next);
    setTheme(next);
  };

  return <header className="topbar">
    <Link className="brand" href="/" aria-label="SSAFY ALGO 홈"><Image src="/ssafy-algo-logo.png" width={166} height={55} priority alt="SSAFY ALGO"/></Link>
    <nav className="nav" aria-label="주요 메뉴"><Link href="/">문제</Link><a href="https://app.notion.com/p/3c5a717ec99e80e3b24df528768d2ce1" target="_blank" rel="noreferrer">Notion ↗</a></nav>
    <div className="headerActions">
      <button className="utilityButton" type="button" onClick={toggleTheme}>{theme==='dark'?'☀︎ 라이트':'◐ 다크'}</button>
      <a className="primaryButton" href="https://github.com/ssafy-16th-algorithm" target="_blank" rel="noreferrer">GitHub ↗</a>
    </div>
  </header>;
}

