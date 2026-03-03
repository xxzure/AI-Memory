export interface Portrait {
  id: string;
  generated_at: number;
  profile: PortraitProfile;
  token_count: number | null;
}

export interface PortraitProfile {
  interests: string[];
  communication_style: string;
  technical_strengths: string[];
  patterns: string[];
  goals: string[];
  advice: string[];
  summary: string;
}
