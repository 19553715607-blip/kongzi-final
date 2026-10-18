// 中国元素纸质质感背景：内联 SVG（远山 / 水纹 / 祥云 / 学者线描），
// 极低透明度、pointer-events-none、无位图、无持续动画。以分区为单位铺底。
type Props = {
  /** 空格组合：mountains | waves | clouds | scholar，如 "mountains clouds" */
  variant?: string;
  className?: string;
};

export default function ChineseBackdrop({ variant = "mountains clouds", className = "" }: Props) {
  const want = (v: string) => variant.split(/\s+/).filter(Boolean).includes(v);
  return (
    <div aria-hidden="true" className={`chinese-backdrop ${className}`}>
      <svg
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMax slice"
        className="cb-svg"
        focusable="false"
      >
        {/* 祥云（顶部，简化卷云线描） */}
        {want("clouds") && (
          <g className="cb-clouds" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M120 128 c-18 0 -28 -14 -20 -28 c4 -9 14 -14 24 -12 c6 -16 26 -22 40 -12 c14 -10 34 -4 38 10 c18 -2 30 12 26 26 c14 4 16 22 2 28 l -104 0 c -12 0 -20 -6 -20 -12 z" />
            <path d="M820 96 c-14 0 -22 -11 -16 -22 c3 -7 11 -11 19 -9 c5 -12 20 -17 31 -9 c11 -8 26 -3 29 8 c14 -2 23 10 20 20 c10 3 12 17 1 21 l -82 0 c -10 0 -16 -5 -16 -9 z" />
            <path d="M520 70 c-10 0 -16 -8 -11 -16 c3 -5 8 -8 14 -7 c4 -9 16 -12 24 -6 c9 -6 21 -2 23 6 c10 -1 17 8 15 15 c8 2 9 13 1 16 l -64 0 c -8 0 -12 -4 -12 -8 z" />
          </g>
        )}

        {/* 层叠远山（淡墨，三层，opacity 由 CSS 控制） */}
        {want("mountains") && (
          <g className="cb-mountains" fill="currentColor">
            <path className="cb-m-back" d="M0 360 L180 288 L360 350 L540 272 L760 360 L980 292 L1200 352 V600 H0 Z" />
            <path className="cb-m-mid" d="M0 448 L220 372 L420 442 L640 360 L880 452 L1100 380 L1200 428 V600 H0 Z" />
            <path className="cb-m-front" d="M0 536 L260 466 L520 536 L820 456 L1080 538 L1200 508 V600 H0 Z" />
          </g>
        )}

        {/* 水纹 / 波纹（重复曲线线描） */}
        {want("waves") && (
          <g className="cb-waves" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M0 500 Q 60 486 120 500 T 240 500 T 360 500 T 480 500 T 600 500 T 720 500 T 840 500 T 960 500 T 1080 500 T 1200 500" />
            <path d="M0 528 Q 60 514 120 528 T 240 528 T 360 528 T 480 528 T 600 528 T 720 528 T 840 528 T 960 528 T 1080 528 T 1200 528" />
            <path d="M0 556 Q 60 542 120 556 T 240 556 T 360 556 T 480 556 T 600 556 T 720 556 T 840 556 T 960 556 T 1080 556 T 1200 556" />
          </g>
        )}

        {/* 学者线描（极简，右下，可选） */}
        {want("scholar") && (
          <g className="cb-scholar" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="1038" cy="418" r="15" />
            <path d="M1038 434 q-34 22 -40 78 l 80 0 q -6 -56 -40 -78 z" />
            <path d="M998 470 q 20 10 40 0 q 20 10 40 0" />
          </g>
        )}
      </svg>
    </div>
  );
}
