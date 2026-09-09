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
    const ordered=/^\d+[.)]\s+/.test(line);
    if (ordered || /^[-*]\s+/.test(line)) {
      const pattern=ordered?/^\d+[.)]\s+(.+)$/:/^[-*]\s+(.+)$/;
      const start=ordered?Number(line.match(/^\d+/)![0]):1;
      const items:string[]=[];
      while(index<lines.length) {
        const item=lines[index].trim().match(pattern);
        if (!item) break;
        const itemLines=[item[1]];
        index++;
        while (index<lines.length) {
          const next=lines[index].trim();
          if (/^(?:[-*]|\d+[.)])\s+/.test(next) || /^#{1,3}\s+/.test(next)) break;
          // A plain blank line ends a list; indented blanks belong to the item.
          if (!next && !/^[ \t]+$/.test(lines[index])) break;
          itemLines.push(next);
          index++;
        }
        items.push(itemLines.join('\n'));
      }
      const children=items.map((item,itemIndex)=><li key={itemIndex}>{inline(item)}</li>);
      blocks.push(ordered?<ol start={start} key={`ol-${index}`}>{children}</ol>:<ul key={`ul-${index}`}>{children}</ul>);
      continue;
    }
    const heading=line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) { blocks.push(<h3 key={`h-${index}`}>{inline(heading[2])}</h3>); index++; continue; }
    blocks.push(<p key={`p-${index}`}>{inline(line)}</p>); index++;
  }
  return <div className="markdownNote">{blocks}</div>;
}
