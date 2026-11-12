/**
 * 品牌字标：隶书「孔」的矢量遮罩，颜色跟随 currentColor。
 * 与页头 .seal-brand 同一份 public/brand/kong.svg，不依赖本机字体。
 */
export default function BrandGlyph({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`brand-glyph ${className}`.trim()} />;
}
