import { redirect } from "next/navigation";

// Cover letters are generated from the Generate page now — one job link, both documents,
// so the analysis and the motivation answers are shared instead of re-entered here.
export default function CoverLetterPage() {
  redirect("/cv");
}
