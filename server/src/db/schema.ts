import { pgTable, uuid, varchar, text, timestamp, decimal, jsonb, unique } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  etoroUserId: varchar("etoro_user_id", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  avatarUrl: varchar("avatar_url", { length: 1024 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  jwtToken: text("jwt_token").notNull(),
  etoroApiKey: text("etoro_api_key").notNull(),
  etoroUserKey: text("etoro_user_key").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const portfolioSnapshots = pgTable("portfolio_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  totalValue: decimal("total_value", { precision: 18, scale: 2 }).notNull(),
  equity: decimal("equity", { precision: 18, scale: 2 }).notNull(),
  availableCash: decimal("available_cash", { precision: 18, scale: 2 }).notNull(),
  unrealizedPnl: decimal("unrealized_pnl", { precision: 18, scale: 2 }).notNull(),
  positionsJson: jsonb("positions_json").notNull(),
  fetchedAt: timestamp("fetched_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 7 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique("tags_user_name_unique").on(table.userId, table.name)]
);

export const positionTags = pgTable(
  "position_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    etoroPositionId: varchar("etoro_position_id", { length: 255 }).notNull(),
    tagId: uuid("tag_id")
      .references(() => tags.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("position_tags_position_tag_unique").on(table.etoroPositionId, table.tagId),
  ]
);
