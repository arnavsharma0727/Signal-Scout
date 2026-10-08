export type ReviewedNewsOperator = {
  key: string;
  label: string;
  referenceUrl: string;
};

export type ReviewedCompanyOperator = {
  key: string;
  label: string;
  referenceUrl: string;
};

export type ReviewedSurveyOperator = {
  key: string;
  label: string;
  referenceUrl: string;
};

const REVIEWED_NEWS_HOSTS: ReadonlyArray<{
  host: string;
  operator: ReviewedNewsOperator;
}> = [
  {
    host: "apnews.com",
    operator: {
      key: "associated-press",
      label: "Associated Press",
      referenceUrl: "https://www.ap.org/about/",
    },
  },
  {
    host: "theguardian.com",
    operator: {
      key: "guardian-news-media",
      label: "The Guardian",
      referenceUrl: "https://www.theguardian.com/about",
    },
  },
  {
    host: "reuters.com",
    operator: {
      key: "reuters",
      label: "Reuters",
      referenceUrl: "https://www.thomsonreuters.com/en/products-services/news-media",
    },
  },
  {
    host: "abc.net.au",
    operator: {
      key: "abc-news-australia",
      label: "ABC News Australia",
      referenceUrl: "https://about.abc.net.au/",
    },
  },
  {
    host: "smartcompany.com.au",
    operator: {
      key: "smartcompany",
      label: "SmartCompany",
      referenceUrl: "https://www.smartcompany.com.au/about/",
    },
  },
];

const REVIEWED_COMPANY_HOSTS: ReadonlyArray<{
  host: string;
  operator: ReviewedCompanyOperator;
}> = [
  {
    host: "firmus.co",
    operator: {
      key: "firmus",
      label: "Firmus",
      referenceUrl: "https://firmus.co/about",
    },
  },
];

const REVIEWED_SURVEY_HOSTS: ReadonlyArray<{
  host: string;
  operator: ReviewedSurveyOperator;
}> = [
  {
    host: "verasight.io",
    operator: {
      key: "verasight",
      label: "Verasight",
      referenceUrl: "https://www.verasight.io/methodology",
    },
  },
];

/**
 * Resolve a publisher only from the actual HTTPS article URL, never an index's
 * claimed domain, display title, or a redirect/syndication URL. This is a
 * small reviewed allowlist, not a general publisher ownership database.
 */
export function reviewedNewsOperatorForUrl(value: string): ReviewedNewsOperator | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const host = url.hostname.toLocaleLowerCase().replace(/^www\./, "");
  const entry = REVIEWED_NEWS_HOSTS.find(({ host: root }) => host === root || host.endsWith(`.${root}`));
  return entry?.operator ?? null;
}

/** Resolve explicitly allowlisted issuer links separately from independent news. */
export function reviewedCompanyOperatorForUrl(value: string): ReviewedCompanyOperator | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname.toLocaleLowerCase().replace(/^www\./, "");
  return REVIEWED_COMPANY_HOSTS.find(({ host: root }) => host === root || host.endsWith(`.${root}`))?.operator ?? null;
}

export function reviewedSurveyOperatorForUrl(value: string): ReviewedSurveyOperator | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname.toLocaleLowerCase().replace(/^www\./, "");
  return REVIEWED_SURVEY_HOSTS.find(({ host: root }) => host === root || host.endsWith(`.${root}`))?.operator ?? null;
}

/** Only article paths on reviewed source operators can be added as link-only citations. */
export function reviewedLinkSourceForUrl(value: string):
  | { provider: "newslink"; key: string; label: string }
  | { provider: "companylink"; key: string; label: string }
  | { provider: "surveylink"; key: string; label: string }
  | null {
  const news = reviewedNewsOperatorForUrl(value);
  if (news) return { provider: "newslink", key: news.key, label: news.label };
  const company = reviewedCompanyOperatorForUrl(value);
  if (company) return { provider: "companylink", key: company.key, label: company.label };
  const survey = reviewedSurveyOperatorForUrl(value);
  if (survey) return { provider: "surveylink", key: survey.key, label: survey.label };
  return null;
}
