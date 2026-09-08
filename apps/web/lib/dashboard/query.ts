import { z } from 'zod';

export const dashboardQuery = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  search: z.string().trim().max(200).default(''),
  tab: z.enum(['all', 'shared', 'draft', 'processing']).default('all'),
  sort: z.enum(['recent', 'oldest', 'title']).default('recent'),
});
export const DASHBOARD_PAGE_SIZE = 25;
export type DashboardTab = z.infer<typeof dashboardQuery>['tab'];
export type DashboardSort = z.infer<typeof dashboardQuery>['sort'];
export interface DashboardGuide {
  id: string;
  title: string;
  slug: string | null;
  status: 'draft' | 'processing' | 'ready' | 'error';
  visibility: string;
  stepsCount: number;
  createdAt: string;
}
export interface DashboardPage {
  tutorials: DashboardGuide[];
  counts: Record<DashboardTab, number>;
  total: number;
  page: number;
  pageSize: number;
}
