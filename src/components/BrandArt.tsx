import type { SVGProps } from "react";

export function BrandArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 114"
      className="brand-mark shrink-0"
      aria-hidden
      focusable={false}
      style={{ maxHeight: "inherit", maxWidth: "inherit" }}
      {...props}
    >
      <defs>
        <style>{`.\
          .bg{fill:#0b0714}\
          .jacket-light{fill:#9aa8c8}\
          .jacket-dark{fill:#1c2234}\
          .fur{fill:#eef3f7}\
          .skin{fill:#f3e6d8}\
          .hair-black{fill:#090a12}\
          .eye-lav{fill:#c3b0e6}\
          .outline{fill:none;stroke:#08060e;stroke-width:1.2;stroke-linejoin:round;stroke-linecap:round}\
          .hair-outline{fill:none;stroke:#040407;stroke-width:1.6;stroke-linejoin:round}\
        `}</style>
      </defs>

      <rect className="bg" width="200" height="114" rx="22" ry="18" />

      {/* distant snowy trees */}
      <g opacity="0.62">
        <path className="bg" d="M32 20 q8 -6 14 0 q10 -4 16 0 q6 -7 12 3 q9 -8 18 4 q12 -5 20 1 q10 -9 16 0 l0 6 -151 0 z" />
        <path
          fill="#eef3f8"
          opacity="0.85"
          d="M32 22 q10 -2 16 2 q10 -2 16 2 q10 -2 14 2 q12 -3 18 1 q12 -2 18 2 l0 2 -152 0 z"
          opacity={0.9}
        />
      </g>

      {/* back hair */}
      <g className="hair-black">
        <path d="M100 44 q-34 0 -44 16 q-8 11 -4 28 q-2 16 12 24 l66 4 q16 -4 20 -26 q6 -14 8 -30 q10 -12 12 -28 q2 -12 -2 -22 q-4 -6 -16 -6 z" />
        <path
          d="M100 44 q-30 -1 -38 16 q-6 16 -2 28 l0 0 q-2 6 2 10 l0 0 q-14 4 -16 24 q-2 8 6 12 l64 2 q-6 -18 0 -28 q-6 -10 -4 -24 z"
          opacity={0.92}
        />
      </g>

      {/* hood outer jacket */}
      <path
        className="jacket-dark"
        d="M100 30 q-46 2 -57 18 q-10 14 -6 26 q-4 12 14 20 l46 6 q17 0 30 -10 q10 -8 14 -20 q6 -12 2 -26 q6 -10 18 -14 q14 2 14 16 q0 16 -14 20 l-46 5 q-16 2 -20 -6 q-2 -8 4 -10 close"
      />
      <path
        className="jacket-light"
        d="M100 32 q-37 -2 -47 14 q-8 12 -2 22 l49 6 q17 0 29 -8 q9 -6 13 -14 q8 -12 4 -22 q-5 -12 -19 -16 q-15 0 -19 12 z"
      />

      {/* face */}
      <path
        className="skin"
        d="M100 31 q-27 2 -31 18 q-6 18 0 30 q7 14 27 16 q27 -4 35 -18 q7 -16 4 -31 q-3 -19 -28 -21 q-21 0 -26 16 z"
      />
      <path
        className="hair-black hair-outline"
        d="M100 26 q-32 2 -37 20 q-6 18 -4 28 q2 4 8 4 q10 0 20 -2 q12 -3 20 -10 q6 -6 8 -12 q-12 -4 -24 -2 q-6 1 -8 -1 z"
      />
      <path
        className="hair-black"
        d="M70 44 q-8 16 0 28 q1 6 4 10 q-8 8 -8 20 q-3 12 6 18 q6 4 14 2 q10 -2 14 -6 q8 -10 6 -22 q-2 -10 6 -20 q2 -2 5 0 q4 4 -2 10 q-4 10 -18 14 q-4 -2 0 -8 z"
        opacity={0.9}
      />

      {/* byakugan eyes */}
      <g>
        <ellipse className="eye-lav" cx="91" cy="52" rx="4.6" ry="4.4" />
        <ellipse fill="#090a13" cx="91" cy="52" rx="2.5" ry="2.6" />
        <ellipse fill="#9aa1cf" cx="91" cy="52" rx={1.1} ry={1.1} />
        <path className="outline" d="M86 52 q4 -3 10 0" strokeWidth={1.4} />

        <ellipse className="eye-lav" cx="112" cy="52" rx="4.6" ry="4.4" />
        <ellipse fill="#090a13" cx="112" cy="52" rx="2.5" ry="2.6" />
        <ellipse fill="#9aa1cf" cx="112" cy="52" rx={1.1} ry={1.1} />
        <path className="outline" d="M108 52 q4 -3 10 0" strokeWidth={1.4} />
      </g>

      {/* eyelashes + eyebrows */}
      <g className="outline" fill="#08060e">
        <path d="M82 46 q-3 -3 -7 -1 q-3 1 -4 3" />
        <path d="M88 53 q3 1 5 0 q2 -1 3 -2 q1 -1 2 0 q3 1 5 0 q2 -1 3 -2 q2 -1 2 0 q1 1 0 2" />
        <path d="M86 57 q4 0 7 -2 q3 -2 5 -2 q2 0 3 1" />
      </g>
      <g className="outline" fill="#08060e">
        <path d="M118 46 q3 -3 7 -1 q3 1 4 3" />
        <path d="M116 53 q-3 1 -5 0 q-2 -1 -3 -2 q-1 -1 -2 0 q-3 1 -5 0 q-2 -1 -3 -2 q-2 -1 -2 0 q-1 1 0 2" />
        <path d="M114 57 q-4 0 -7 -2 q-3 -2 -5 -2 q-2 0 -3 1" />
      </g>

      {/* nose + lips */}
      <path fill="#e6d2c0" d="M98 60 q3 2 4 5 q1 2 2 1 q2 -2 1 -5 q-1 -2 -2 -1 q-1 -2 -1 -1" />
      <g>
        <path className="outline" fill="#a94a6b" d="M94 68 q6 4 12 0 q-6 2 -12 0 z" />
        <path fill="#7d2a44" d="M95 69 q5 1 9 0" />
      </g>

      {/* central zipper */}
      <path
        className="zipper"
        d="M100 38 q0 2 -1 4 q-1 4 -1 7 q-1 7 -3 10 l-12 -2 q-3 4 -4 9 q-1 6 -2 11 q-1 5 2 9 q3 4 8 6 l12 -1 q2 7 4 13 q1 5 2 9 q1 6 0 11 q2 9 -6 13 l-14 -3 q-3 3 -6 8 q-2 4 0 9 q3 4 9 4 l14 -3 q4 4 8 7 q4 5 5 11 q1 6 -1 11 q-1 4 -3 7 q-2 3 -4 5"
      />

      {/* hood rim */}
      <g className="fur">
        <path
          d="M100 30 q-46 2 -57 18 q-10 14 -6 26 q-1 5 3 7 q8 -2 14 -6 q8 -6 16 -8 q14 -4 20 -2 q12 5 16 10 q6 8 6 20 q2 10 -4 14 q-4 2 -6 0 q-6 -6 -12 -12 q-6 -6 -16 -10 q-8 -4 -18 -3 q-10 1 -18 2 q-10 4 -16 6 q-9 3 -14 -1 q-4 -4 0 -8 q4 -8 6 -14 q2 -8 0 -16 q-2 -8 -6 -14 z"
        />
        <path d="M72 54 q6 -2 12 4 q-4 4 -8 4 q-6 0 -8 -3 q-2 -4 4 -5 z" />
        <path d="M128 54 q-6 -2 -12 4 q4 4 8 4 q6 0 8 -3 q2 -4 -4 -5 z" />
      </g>
    </svg>
  );
}
