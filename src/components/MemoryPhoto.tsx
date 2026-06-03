import { useDisplayPhotoUrl } from "@/lib/photoUrl";
import { CSSProperties } from "react";

interface Props {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  style?: CSSProperties;
}

/** <img> wrapper that resolves stored memory-photos URLs to signed URLs. */
export default function MemoryPhoto({ src, alt, className, style }: Props) {
  const resolved = useDisplayPhotoUrl(src);
  if (!resolved) return null;
  return <img src={resolved} alt={alt} className={className} style={style} loading="lazy" />;
}
