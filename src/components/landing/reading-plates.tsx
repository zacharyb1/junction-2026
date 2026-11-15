import Image from "next/image";
import p0 from "../../../assets/plates/paper.png";
import p1 from "../../../assets/plates/wordmark-ink.png";
import p2 from "../../../assets/plates/headline-highlight.png";
import p3 from "../../../assets/plates/intro-ink.png";
import p4 from "../../../assets/plates/sample-circle.png";
import p5 from "../../../assets/plates/case-underline.png";
import p6 from "../../../assets/plates/plan-highlight.png";
import p7 from "../../../assets/plates/proof-bracket.png";
import p8 from "../../../assets/plates/bracket-underline.png";
import p9 from "../../../assets/plates/plan-arrow.png";
import p10 from "../../../assets/plates/publisher-highlight.png";
import p11 from "../../../assets/plates/source-highlight.png";
import p12 from "../../../assets/plates/source-arrow.png";
import p13 from "../../../assets/plates/divider.png";
import p14 from "../../../assets/plates/next-underline.png";

const plates = {
  "paper": p0,
  "wordmark-ink": p1,
  "headline-highlight": p2,
  "intro-ink": p3,
  "sample-circle": p4,
  "case-underline": p5,
  "plan-highlight": p6,
  "proof-bracket": p7,
  "bracket-underline": p8,
  "plan-arrow": p9,
  "publisher-highlight": p10,
  "source-highlight": p11,
  "source-arrow": p12,
  "divider": p13,
  "next-underline": p14
};
export type PlateName = keyof typeof plates;
export const readingPaper = plates.paper;

/** Decorative ink only: all words and controls are real HTML. */
export function ReadingPlate({ name, className = "" }: { name: PlateName; className?: string }) {
  return <span aria-hidden="true" className={`reading-plate r-${name} ${className}`}><Image src={plates[name]} alt="" fill sizes="(max-width: 767px) 70vw, 600px" /></span>;
}
