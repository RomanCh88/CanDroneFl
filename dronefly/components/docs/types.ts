export type DocsPart = 'basics' | 'members' | 'reference';

export interface Chapter {
  id: string;
  part: DocsPart;
  title: string;
  /** Shown under the title in the table of contents. */
  blurb: string;
  members?: boolean;
  body: React.ReactNode;
}
