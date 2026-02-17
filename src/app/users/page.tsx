"use client";

import { useState } from "react";
import { useSearchUsers } from "@/db/profile-hooks";
import UserSearchBar from "@/components/UserSearchBar";
import UserCard from "@/components/UserCard";

export default function UsersPage() {
  const [query, setQuery] = useState("");
  const { results, isLoading } = useSearchUsers(query);

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <h1 className="text-2xl font-bold mb-4">사람 찾기</h1>

      <UserSearchBar value={query} onChange={setQuery} isLoading={isLoading} />

      <div className="mt-4 space-y-2">
        {isLoading && query.length >= 2 && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                <div className="h-4 w-24 bg-gray-200 rounded" />
              </div>
            ))}
          </>
        )}

        {query.length >= 2 && !isLoading && results.length === 0 && (
          <p className="text-center text-gray-400 py-8">
            검색 결과가 없습니다
          </p>
        )}

        {!isLoading && results.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
}
