"use client";

import { useState } from "react";

export default function ImportGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <span className="text-sm font-medium text-gray-700">
          네이버 지도 공유 링크 만드는 법
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
              1
            </span>
            <p className="text-sm text-gray-600">
              네이버 지도 앱을 열고 하단의{" "}
              <strong className="text-gray-800">MY</strong> 탭에서{" "}
              <strong className="text-gray-800">저장</strong>을 선택하세요.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
              2
            </span>
            <p className="text-sm text-gray-600">
              가져올 폴더를 선택한 뒤, 오른쪽 상단{" "}
              <strong className="text-gray-800">···</strong> 메뉴에서{" "}
              <strong className="text-gray-800">공개 설정</strong>을 켜세요.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
              3
            </span>
            <p className="text-sm text-gray-600">
              같은 메뉴에서{" "}
              <strong className="text-gray-800">공유</strong>를 선택하고{" "}
              <strong className="text-gray-800">링크 복사</strong>를 누르세요.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
              4
            </span>
            <p className="text-sm text-gray-600">
              복사한 링크를 아래 입력창에 붙여넣고{" "}
              <strong className="text-gray-800">가져오기</strong>를 누르세요.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
