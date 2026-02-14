import Dexie, { type EntityTable } from "dexie";
import type { Restaurant, MenuItem } from "@/types";

const db = new Dexie("RestaurantWishlist") as Dexie & {
  restaurants: EntityTable<Restaurant, "id">;
  menuItems: EntityTable<MenuItem, "id">;
};

db.version(1).stores({
  restaurants: "id, [starRating+createdAt]",
  menuItems: "++id, restaurantId, normalizedName, [restaurantId+normalizedName]",
});

export { db };
