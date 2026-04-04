export interface Tag {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  createdAt: string;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
}

export interface UpdateTagRequest {
  name?: string;
  color?: string;
}

export interface TagPositionRequest {
  etoroPositionId: string;
}

export interface TagAnalytics {
  tag: Tag;
  positionCount: number;
  totalValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
}
