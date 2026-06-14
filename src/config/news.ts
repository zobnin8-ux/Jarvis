export interface NewsFeed {
  id: string;
  label: string;
  url: string;
  lang: "en" | "ru";
}

export const NEWS_FEEDS: NewsFeed[] = [
  {
    id: "bbc-world",
    label: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    lang: "en",
  },
  {
    id: "guardian-world",
    label: "The Guardian",
    url: "https://www.theguardian.com/world/rss",
    lang: "en",
  },
  {
    id: "ria",
    label: "РИА Новости",
    url: "https://ria.ru/export/rss2/archive/index.xml",
    lang: "ru",
  },
  {
    id: "rbc",
    label: "RBC",
    url: "https://rssexport.rbc.ru/rbcnews/news/30/full.rss",
    lang: "ru",
  },
];

export const NEWS_ROTATION_MS = 10_000;
