"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { subscribe, setCache, subscribeToCache } from "./invalidate";

export function useSupabaseQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  deps: unknown[] = [],
): { data: T | undefined; isLoading: boolean } {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;
  const hasDataRef = useRef(false);

  const execute = useCallback(async () => {
    if (!hasDataRef.current) setIsLoading(true);
    try {
      const result = await queryFnRef.current();
      setData(result);
      setCache(key, result);
      hasDataRef.current = true;
    } finally {
      setIsLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    execute();
  }, [execute]);

  useEffect(() => {
    return subscribe(key, execute);
  }, [key, execute]);

  useEffect(() => {
    return subscribeToCache(key, (value) => {
      setData(value as T);
    });
  }, [key]);

  return { data, isLoading };
}
