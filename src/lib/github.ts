export interface ContributionDay {
  date: string;
  contributionCount: number;
}

export interface ContributionWeek {
  contributionDays: ContributionDay[];
}

export interface ContributionCalendar {
  totalContributions: number;
  weeks: ContributionWeek[];
}

export interface LanguageStat {
  name: string;
  size: number;
  color: string | null;
  percent: number;
}

export interface LanguageStats {
  languages: LanguageStat[];
  totalSize: number;
  reposAnalyzed: number;
}
