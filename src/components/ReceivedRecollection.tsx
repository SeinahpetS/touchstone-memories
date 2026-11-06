export default function ReceivedRecollection({ name, note }: { name?: string | null; note?: string | null }) {
  if (!name || !note) return null;
  return <div className="space-y-2">
    <p className="received-note-heading">{name} remembered</p>
    <p className="text-base text-foreground leading-relaxed">{note}</p>
  </div>;
}