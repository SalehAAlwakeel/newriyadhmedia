import PageHead from "../PageHead";
import Files from "./Files";

export const metadata = { title: "Files & Projects · New Riyadh Media" };

export default function FilesPage() {
  return (
    <div className="ds-page">
      <PageHead
        eyebrow="Create · Files & Projects"
        title="Everything you've made."
        sub="Projects, drafts, generated media and your weekly content folders — organised and searchable."
      />
      <Files />
    </div>
  );
}
