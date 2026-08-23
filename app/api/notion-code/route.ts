import { NextResponse } from 'next/server';
import { notionSolutionUrls } from '../../data/notion-solutions';

type NotionRichText = { plain_text?:string };
type NotionBlock = {
  id:string;
  type:string;
  has_children?:boolean;
  code?:{ rich_text?:NotionRichText[] };
};

const allowedPageIds = new Set(
  Object.values(notionSolutionUrls)
    .map((url)=>url?.match(/[0-9a-f]{32}/i)?.[0]?.toLowerCase())
    .filter((id):id is string=>Boolean(id)),
);

async function readChildren(blockId:string,token:string,depth=0):Promise<string|null> {
  if (depth > 4) return null;
  let cursor:string|undefined;

  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${blockId}/children`);
    url.searchParams.set('page_size','100');
    if (cursor) url.searchParams.set('start_cursor',cursor);

    const response = await fetch(url,{
      cache:'no-store',
      headers:{
        'Authorization':`Bearer ${token}`,
        'Notion-Version':'2022-06-28',
      },
    });
    if (!response.ok) throw new Error(`Notion sync failed: ${response.status}`);

    const data = await response.json() as {
      results?:NotionBlock[];
      has_more?:boolean;
      next_cursor?:string|null;
    };

    for (const block of data.results ?? []) {
      if (block.type === 'code') {
        const code = (block.code?.rich_text ?? []).map((item)=>item.plain_text ?? '').join('').trim();
        if (code) return code;
      }
      if (block.has_children) {
        const nested = await readChildren(block.id,token,depth+1);
        if (nested) return nested;
      }
    }

    cursor = data.has_more && data.next_cursor ? data.next_cursor : undefined;
  } while (cursor);

  return null;
}

export async function GET(request:Request) {
  const token = process.env.NOTION_TOKEN;
  if (!token) return NextResponse.json({error:'Notion sync is not configured'},{status:503});

  const pageId = new URL(request.url).searchParams.get('pageId')?.replace(/-/g,'').toLowerCase();
  if (!pageId || !allowedPageIds.has(pageId)) {
    return NextResponse.json({error:'Unknown solution page'},{status:404});
  }

  try {
    const code = await readChildren(pageId,token);
    if (!code) return NextResponse.json({error:'No code block found'},{status:404});
    return NextResponse.json({code},{headers:{'Cache-Control':'public, max-age=60, stale-while-revalidate=300'}});
  } catch (error) {
    console.error('Notion code sync failed',error);
    return NextResponse.json({error:'Notion sync failed'},{status:502});
  }
}

