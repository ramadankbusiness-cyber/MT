export function SectionHeading({
  eyebrow,
  title,
  lead,
  gradientLastWord = false,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  gradientLastWord?: boolean;
}) {
  const titleWords = title.split(" ");
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>
        {gradientLastWord
          ? <>{titleWords.slice(0, -1).join(" ")} <span className="gradient-text">{titleWords.at(-1)}</span></>
          : title}
      </h1>
      {lead && <p className="section-lead">{lead}</p>}
    </div>
  );
}
