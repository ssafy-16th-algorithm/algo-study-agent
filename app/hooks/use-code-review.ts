'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Review } from '../lib/review';
import type { StudyProblem, StudySolution } from '../lib/study';

type ReviewStatus='idle'|'loading'|'ready'|'error';
const memoryCache=new Map<string,Review>();
const pendingRequests=new Map<string,Promise<Review>>();
const STORAGE_PREFIX='algorithm-review:v13:';

function shortHash(value:string) {
  let hash=2166136261;
  for (let index=0;index<value.length;index++) hash=Math.imul(hash^value.charCodeAt(index),16777619);
  return (hash>>>0).toString(36);
}

function readStored(key:string) {
  try {
    const value=window.localStorage.getItem(STORAGE_PREFIX+key);
    return value?JSON.parse(value) as Review:null;
  } catch { return null; }
}

function store(key:string,review:Review) {
  try { window.localStorage.setItem(STORAGE_PREFIX+key,JSON.stringify(review)); }
  catch { /* 메모리 캐시는 계속 사용한다. */ }
}

async function fetchReview(problem:StudyProblem,solution:StudySolution,refresh=false) {
  const response=await fetch('/api/review',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      problem:{title:problem.title,externalUrl:problem.externalUrl},
      member:solution.member.name,
      language:solution.language,
      code:solution.code,
      refresh,
    }),
  });
  const responseText=await response.text();
  let body:{review?:Review;error?:string}={};
  if(responseText) {
    try { body=JSON.parse(responseText) as {review?:Review;error?:string}; }
    catch { body={error:`코드 리뷰 서버가 올바르지 않은 응답을 반환했습니다. (${response.status})`}; }
  }
  if (!response.ok || !body.review) throw new Error(body.error || 'AI 리뷰 생성에 실패했습니다.');
  return body.review;
}

export function useCodeReview(problem:StudyProblem|null,solution:StudySolution|null) {
  const key=problem && solution?.code ? shortHash(`${problem.id}:${solution.member.id}:${solution.code}`) : '';
  const [review,setReview]=useState<Review|null>(null);
  const [status,setStatus]=useState<ReviewStatus>('idle');
  const [error,setError]=useState('');

  useEffect(()=>{
    const frame=requestAnimationFrame(()=>{
      const cached=key ? memoryCache.get(key) ?? readStored(key) : null;
      setReview(cached);
      setStatus(cached?'ready':'idle');
      setError('');
    });
    return ()=>cancelAnimationFrame(frame);
  },[key]);

  const request=useCallback(async (refresh=false)=>{
    if (!problem || !solution?.code || !key) return;
    setStatus('loading');
    setError('');
    if (refresh) setReview(null);
    try {
      const cached=refresh ? null : memoryCache.get(key) ?? readStored(key);
      if (cached) { setReview(cached); setStatus('ready'); return; }
      let pending=pendingRequests.get(key);
      if (!pending) {
        pending=fetchReview(problem,solution,refresh).then((result)=>{
          memoryCache.set(key,result); store(key,result); return result;
        }).finally(()=>pendingRequests.delete(key));
        pendingRequests.set(key,pending);
      }
      setReview(await pending);
      setStatus('ready');
    } catch (reason) {
      setStatus('error');
      setError(reason instanceof Error?reason.message:'AI 리뷰 생성에 실패했습니다.');
    }
  },[key,problem,solution]);

  return {review,status,error,request};
}
