import { pgTable, varchar, timestamp, jsonb, integer, boolean, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * 实验历史记录表
 * 保存用户在图像处理平台上的每一次操作记录
 */
export const experimentHistory = pgTable(
  "experiment_history",
  {
    // 主键
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    
    // 原图名称
    original_name: varchar("original_name", { length: 255 }),
    
    // 处理操作名称 (如: 灰度化, 高斯模糊, 边缘检测等)
    operation_name: varchar("operation_name", { length: 100 }).notNull(),
    
    // 处理参数 (JSON 格式)
    parameters: jsonb("parameters"),
    
    // 处理后图片地址
    processed_image_url: varchar("processed_image_url", { length: 1024 }),
    
    // 操作时间
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    
    // 图片宽度
    image_width: integer("image_width"),
    
    // 图片高度
    image_height: integer("image_height"),
    
    // 是否使用选区
    has_selection: boolean("has_selection").default(false),
    
    // 选区范围 (JSON 格式: { x, y, width, height })
    selection_bounds: jsonb("selection_bounds"),
  },
  (table) => [
    // 按创建时间排序的索引（常用查询）
    index("experiment_history_created_at_idx").on(table.created_at),
    // 按操作名称过滤的索引
    index("experiment_history_operation_name_idx").on(table.operation_name),
  ]
);

// 类型导出
export type ExperimentHistory = typeof experimentHistory.$inferSelect;
export type InsertExperimentHistory = typeof experimentHistory.$inferInsert;
