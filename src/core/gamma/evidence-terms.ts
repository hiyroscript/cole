import { normalize } from "../text";
import { rewriteQuery } from "./query";

// Small grammatical normalization, shared by queries and evidence. This is not
// a table of question aliases. Unknown content words remain requirements.
const framing = new Set(
  "a an the my i me you your is are am do does did can could would should may might please to of in on for how what which why it this that with have has had using tell about explain describe define mean means meaning please would like know understand exactly actually give overview introduction basics simple terms beginner briefly when happens happen somebody someone such really so much very there be been being its and or by from as at into through than then me any some".split(
    " ",
  ),
);
export function evidenceTerms(text: string): string[] {
  const canonical = rewriteQuery(text)
    .replace(/\b(?:log(?:ging|ged)?[ -]?out|sign(?:ing|ed)? out)\b/gi, "logout")
    .replace(/\b(?:clear(?:ing|ed)?|delet(?:e|ing|ed))\b/gi, "delete");
  const words = normalize(canonical).replace(/-/g, " ").split(/\s+/);
  return [
    ...new Set(
      words
        .filter((w) => w && !framing.has(w))
        .map((word) => {
          if (word.length <= 4) return word;
          if (/ies$/.test(word) && word !== "cookies")
            return word.slice(0, -3) + "y";
          let stem = word.replace(/(?:ing|ed)$/, "");
          if (stem !== word && /([b-df-hj-np-tv-z])\1$/.test(stem))
            stem = stem.slice(0, -1);
          else if (stem === word && /sses$/.test(stem))
            stem = stem.slice(0, -2);
          else if (
            stem === word &&
            /s$/.test(stem) &&
            !/(ss|us|is)$/.test(stem)
          )
            stem = stem.slice(0, -1);
          return stem.length > 4 ? stem.replace(/e$/, "") : stem;
        }),
    ),
  ];
}
