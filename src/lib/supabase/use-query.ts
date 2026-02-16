"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { subscribe } from "./invalidate";

export function useSupabaseQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  deps: unknown[] = [],
): { data: T | undefined; isLoading: boolean } {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  const execute = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await queryFnRef.current();
      setData(result);
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

  return { data, isLoading };
}
