export interface JobAnalysis {
  url: string;
  company: string;
  role_title: string;
  industry: string;
  seniority: string;
  required_skills: string[];
  nice_to_have: string[];
  keywords: string[];
  company_tone: string;
  role_focus: string;
}

export interface CvExperience {
  company: string;
  role: string;
  period: string;
  bullets: string[];
}

export interface CvContent {
  about: string;
  skills: string[];
  experience: CvExperience[];
  education: Array<{
    degree: string;
    institution: string;
    location: string;
    year: number;
  }>;
  languages: Array<{
    language: string;
    level: string;
  }>;
  referrals: Array<{
    name: string;
    title: string;
    company: string;
  }>;
  meta: {
    target_company: string;
    target_role: string;
  };
}
