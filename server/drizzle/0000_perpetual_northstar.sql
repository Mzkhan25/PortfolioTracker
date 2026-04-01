CREATE TABLE "portfolio_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_value" numeric(18, 2) NOT NULL,
	"equity" numeric(18, 2) NOT NULL,
	"available_cash" numeric(18, 2) NOT NULL,
	"unrealized_pnl" numeric(18, 2) NOT NULL,
	"positions_json" jsonb NOT NULL,
	"fetched_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "position_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"etoro_position_id" varchar(255) NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "position_tags_position_tag_unique" UNIQUE("etoro_position_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"jwt_token" text NOT NULL,
	"etoro_api_key" text NOT NULL,
	"etoro_user_key" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(7),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_user_name_unique" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"etoro_user_id" varchar(255) NOT NULL,
	"username" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"avatar_url" varchar(1024),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_etoro_user_id_unique" UNIQUE("etoro_user_id")
);
--> statement-breakpoint
ALTER TABLE "portfolio_snapshots" ADD CONSTRAINT "portfolio_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_tags" ADD CONSTRAINT "position_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_tags" ADD CONSTRAINT "position_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;