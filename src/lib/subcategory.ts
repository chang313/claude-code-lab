import type { Restaurant, SubcategoryGroup } from "@/types";

const DEFAULT_SUBCATEGORY = "기타";
const SEPARATOR = " > ";

export function extractSubcategory(category: string): string {
  if (!category) return DEFAULT_SUBCATEGORY;
  const segments = category.split(SEPARATOR);
  const last = segments[segments.length - 1].trim();
  return last || DEFAULT_SUBCATEGORY;
}

export function groupBySubcategory(
  restaurants: Restaurant[],
): SubcategoryGroup[] {
  if (restaurants.length === 0) return [];

  const map = new Map<string, Restaurant[]>();
  for (const restaurant of restaurants) {
    const sub = extractSubcategory(restaurant.category);
    const list = map.get(sub);
    if (list) {
      list.push(restaurant);
    } else {
      map.set(sub, [restaurant]);
    }
  }

  const sortRestaurants = (a: Restaurant, b: Restaurant): number => {
    if (b.starRating !== a.starRating) return b.starRating - a.starRating;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  };

  const groups: SubcategoryGroup[] = Array.from(map.entries()).map(
    ([subcategory, items]) => {
      items.sort(sortRestaurants);
      return { subcategory, restaurants: items, count: items.length };
    },
  );

  groups.sort((a, b) => {
    if (a.subcategory === DEFAULT_SUBCATEGORY) return 1;
    if (b.subcategory === DEFAULT_SUBCATEGORY) return -1;
    return a.subcategory.localeCompare(b.subcategory);
  });

  return groups;
}
