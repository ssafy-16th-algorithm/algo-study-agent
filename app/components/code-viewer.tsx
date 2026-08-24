'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReviewIssue } from '../lib/review';

const JAVA_KEYWORDS=new Set(['abstract','assert','boolean','break','byte','case','catch','char','class','const','continue','default','do','double','else','enum','extends','final','finally','float','for','if','implements','import','instanceof','int','interface','long','native','new','package','private','protected','public','record','return','sealed','short','static','strictfp','super','switch','synchronized','this','throw','throws','transient','try','var','void','volatile','while','yield','permits','non-sealed']);
const JAVA_LITERALS=new Set(['true','false','null']);
const JAVA_TYPES=new Set(['String','Object','Integer','Long','Double','Float','Boolean','Character','Byte','Short','Math','System','Arrays','Collections','List','ArrayList','LinkedList','Map','HashMap','Set','HashSet','Queue','Deque','ArrayDeque','PriorityQueue','Stack','StringBuilder','Scanner','BufferedReader','InputStreamReader','StringTokenizer','IOException']);
type CodeToken={text:string;kind?:'keyword'|'literal'|'type'|'string'|'number'|'comment'|'annotation'|'operator'};

function highlightJava(code:string) {
  let inBlockComment=false;
  return code.replace(/\r\n/g,'\n').split('\n').map((line)=>{
    const tokens:CodeToken[]=[];
    let index=0;
    const push=(text:string,kind?:CodeToken['kind'])=>tokens.push({text,kind});
    while(index<line.length) {
      if(inBlockComment) {
        const end=line.indexOf('*/',index);
        if(end<0) { push(line.slice(index),'comment'); break; }
        push(line.slice(index,end+2),'comment'); index=end+2; inBlockComment=false; continue;
      }
      if(line.startsWith('//',index)) { push(line.slice(index),'comment'); break; }
      if(line.startsWith('/*',index)) {
        const end=line.indexOf('*/',index+2);
        if(end<0) { push(line.slice(index),'comment'); inBlockComment=true; break; }
        push(line.slice(index,end+2),'comment'); index=end+2; continue;
      }
      const char=line[index];
      if(char==='"' || char==="'") {
        const quote=char; let end=index+1;
        while(end<line.length) {
          if(line[end]==='\\') { end+=2; continue; }
          const current=line[end++];
          if(current===quote) break;
        }
        push(line.slice(index,end),'string'); index=end; continue;
      }
      const rest=line.slice(index);
      const annotation=rest.match(/^@[A-Za-z_$][\w$]*/)?.[0];
      if(annotation) { push(annotation,'annotation'); index+=annotation.length; continue; }
      const number=rest.match(/^(?:0[xX][\dA-Fa-f_]+|0[bB][01_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d[\d_]*)?)[fFdDlL]?/)?.[0];
      if(number) { push(number,'number'); index+=number.length; continue; }
      const operator=rest.match(/^(?:->|::|>>>?=?|<<=?|==|!=|<=|>=|&&|\|\||\+\+|--|[+\-*%=&|^!<>?:~]=?)/)?.[0];
      if(operator) { push(operator,'operator'); index+=operator.length; continue; }
      const word=rest.match(/^[A-Za-z_$][\w$]*/)?.[0];
      if(word) {
        const kind=JAVA_KEYWORDS.has(word)?'keyword':JAVA_LITERALS.has(word)?'literal':JAVA_TYPES.has(word)||/^[A-Z]/.test(word)?'type':undefined;
        push(word,kind); index+=word.length; continue;
      }
      const plain=rest.match(/^[^A-Za-z_$@'"/\d]+/)?.[0] ?? char;
      push(plain); index+=plain.length;
    }
    return tokens;
  });
}

export default function CodeViewer({code,highlights,issues}:{code:string;highlights:number[];issues:ReviewIssue[]}) {
  const lines=useMemo(()=>highlightJava(code),[code]);
  const marked=useMemo(()=>new Set(highlights),[highlights]);
  const issuesByLine=useMemo(()=>{
    const grouped=new Map<number,ReviewIssue[]>();
    issues.forEach((issue)=>grouped.set(issue.line,[...(grouped.get(issue.line) ?? []),issue]));
    return grouped;
  },[issues]);
  const [activeLine,setActiveLine]=useState<number|null>(null);

  useEffect(()=>{
    if(activeLine===null) return;
    const closeOnOutside=(event:PointerEvent)=>{
      if(event.target instanceof Element && !event.target.closest('.lineReviewAnchor')) setActiveLine(null);
    };
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape') setActiveLine(null);};
    document.addEventListener('pointerdown',closeOnOutside);
    document.addEventListener('keydown',closeOnEscape);
    return ()=>{
      document.removeEventListener('pointerdown',closeOnOutside);
      document.removeEventListener('keydown',closeOnEscape);
    };
  },[activeLine]);

  return <pre className="wideCode" tabIndex={0} aria-label="전체 풀이 코드"><code>{lines.map((line,index)=>{
    const lineNumber=index+1;
    const lineIssues=issuesByLine.get(lineNumber) ?? [];
    const isOpen=activeLine===lineNumber;
    return <span className={`codeLine ${marked.has(lineNumber)?'reviewed':''} ${isOpen?'reviewOpen':''}`} key={index}>
      <span className="lineNumber">{lineNumber}</span><span className="lineText">{line.length?line.map((token,tokenIndex)=><span className={token.kind?`tok-${token.kind}`:undefined} key={tokenIndex}>{token.text}</span>):' '}</span>
      {lineIssues.length?<span className="lineReviewAnchor">
        <button className="lineReviewMark" type="button" aria-expanded={isOpen} aria-label={`${lineNumber}번 줄 리뷰 보기`} onClick={()=>setActiveLine(isOpen?null:lineNumber)}><span>✦</span> 리뷰</button>
        {isOpen?<span className="lineReviewBubble" role="note">{lineIssues.map((issue,issueIndex)=><span className="bubbleIssue" key={`${issue.title}-${issueIndex}`}>
          <span className="bubbleMeta"><em>{issue.kind}</em><small>LINE {issue.line}</small></span><strong>{issue.title}</strong><span>{issue.suggestion}</span>
        </span>)}</span>:null}
      </span>:null}
    </span>;
  })}</code></pre>;
}
