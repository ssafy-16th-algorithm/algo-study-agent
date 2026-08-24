import type { ReactNode } from 'react';

function inline(text:string):ReactNode[] {
  const parts=text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g);
  return parts.filter(Boolean).map((part,index)=>{
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2,-2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1,-1)}</code>;
    const link=part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link) return <a href={link[2]} target="_blank" rel="noreferrer" key={index}>{link[1]} ↗</a>;
    return part;
  });
}

export default function MarkdownNote({content,empty}:{content:string;empty:string}) {
  if (!content.trim()) return <p className="noteEmpty">{empty}</p>;
  const lines=content.replace(/\r\n/g,'\n').split('\n');
  const blocks:ReactNode[]=[];
  for (let index=0;index<lines.length;) {
    const line=lines[index].trim();
    if (!line) { index++; continue; }
    if (/^[-*]\s+/.test(line)) {
      const items:string[]=[];
      while(index<lines.length) {
        const item=lines[index].trim().match(/^[-*]\s+(.+)$/);
        if (!item) break;
        items.push(item[1]); index++;
      }
      blocks.push(<ul key={`ul-${index}`}>{items.map((item,itemIndex)=><li key={itemIndex}>{inline(item)}</li>)}</ul>);
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      const items:string[]=[];
      while(index<lines.length) {
        const item=lines[index].trim().match(/^\d+[.)]\s+(.+)$/);
        if (!item) break;
        items.push(item[1]); index++;
      }
      blocks.push(<ol key={`ol-${index}`}>{items.map((item,itemIndex)=><li key={itemIndex}>{inline(item)}</li>)}</ol>);
      continue;
    }
    const heading=line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) { blocks.push(<h3 key={`h-${index}`}>{inline(heading[2])}</h3>); index++; continue; }
    blocks.push(<p key={`p-${index}`}>{inline(line)}</p>); index++;
  }
  return <div className="markdownNote">{blocks}</div>;
}
