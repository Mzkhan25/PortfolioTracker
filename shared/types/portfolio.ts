export interface PortfolioOverview {
  totalValue: number;
  equity: number;
  availableCash: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  dailyChange: number;
  dailyChangePercent: number;
}

export interface Position {
  id: string;
  instrumentId: string;
  instrumentName: string;
  ticker: string;
  imageUrl: string | null;
  amount: number;
  units: number;
  openRate: number;
  currentRate: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  allocationPercent: number;
  openDate: string;
  leverage: number;
  isBuy: boolean;
  tags: TagSummary[];
}

export interface TagSummary {
  id: string;
  name: string;
  color: string | null;
}

export interface GroupedPosition {
  instrumentId: string;
  instrumentName: string;
  ticker: string;
  imageUrl: string | null;
  totalAmount: number;
  totalUnits: number;
  averageOpenRate: number;
  currentRate: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  allocationPercent: number;
  positionCount: number;
  positions: Position[];
  tags: TagSummary[];
}

export interface PortfolioSnapshot {
  id: string;
  userId: string;
  totalValue: number;
  equity: number;
  availableCash: number;
  unrealizedPnl: number;
  positions: Position[];
  fetchedAt: string;
  createdAt: string;
}

export interface TagPortfolioEntry {
  tagId: string | null;
  tagName: string;
  tagColor: string | null;
  totalValue: number;
  totalInvested: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  allocationPercent: number;
  positionCount: number;
}

export interface TagPortfolioBreakdown {
  items: TagPortfolioEntry[];
}
