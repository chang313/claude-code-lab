interface ExpansionEntry {
  triggers: string[];
  terms: string[];
}

const EXPANSIONS: ExpansionEntry[] = [
  {
    triggers: ["chicken", "치킨", "닭"],
    terms: ["치킨", "KFC", "BBQ치킨", "교촌치킨", "BHC"],
  },
  {
    triggers: ["pizza", "피자"],
    terms: ["피자", "도미노", "Pizza Hut", "파파존스"],
  },
  {
    triggers: ["coffee", "커피", "카페", "cafe"],
    terms: ["카페", "스타벅스", "이디야", "투썸플레이스"],
  },
  {
    triggers: ["burger", "버거", "햄버거"],
    terms: ["버거", "맥도날드", "버거킹", "롯데리아"],
  },
  {
    triggers: ["sushi", "초밥", "스시", "일식", "japanese"],
    terms: ["초밥", "스시", "일식", "회전초밥"],
  },
  {
    triggers: ["고기", "삼겹살", "갈비", "bbq", "korean bbq", "한우", "소고기"],
    terms: ["삼겹살", "고기", "갈비", "한우"],
  },
  {
    triggers: ["noodle", "면", "국수", "라멘", "ramen", "파스타", "pasta"],
    terms: ["국수", "라멘", "칼국수", "파스타"],
  },
  {
    triggers: ["chinese", "중식", "중국집", "짜장", "짬뽕"],
    terms: ["중국집", "중식", "짜장면", "짬뽕"],
  },
  {
    triggers: ["dessert", "디저트", "케이크", "cake", "베이커리", "bakery"],
    terms: ["디저트", "케이크", "베이커리", "마카롱"],
  },
  {
    triggers: ["beer", "맥주", "호프", "술집", "pub", "포차"],
    terms: ["맥주", "호프", "술집", "포차"],
  },
  {
    triggers: ["vietnamese", "베트남", "쌀국수", "pho"],
    terms: ["베트남", "쌀국수", "반미", "분짜"],
  },
  {
    triggers: ["brunch", "브런치", "팬케이크", "pancake", "waffle", "와플"],
    terms: ["브런치", "팬케이크", "와플", "토스트"],
  },
];

export function getExpandedTerms(query: string): string[] {
  const q = query.toLowerCase().trim();
  const match = EXPANSIONS.find((entry) =>
    entry.triggers.some((t) => t.toLowerCase() === q || q.includes(t.toLowerCase())),
  );
  if (!match) return [query];
  const terms = match.terms.includes(query) ? [...match.terms] : [query, ...match.terms];
  return terms.slice(0, 5);
}
