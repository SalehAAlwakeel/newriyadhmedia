export default function PageHead({ eyebrow, title, sub, action }: { eyebrow: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <header className="ds-head">
      <div>
        <span className="eyebrow">[ {eyebrow} ]</span>
        <h1 className="ds-head__title">{title}</h1>
        {sub && <p className="ds-head__sub">{sub}</p>}
      </div>
      {action && <div className="ds-head__action">{action}</div>}
    </header>
  );
}
