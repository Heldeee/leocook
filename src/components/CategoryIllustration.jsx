export default function CategoryIllustration({ category }) {
  return <svg viewBox="0 0 240 150" width="100%" height="100%" aria-hidden="true" focusable="false" style={{ maxWidth: 245 }}>
    <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="120" cy="124" rx="72" ry="7" stroke="none" fill="currentColor" opacity=".08" />
      {category === 'airfryer' ? <>
        <path d="M66 77Q120 49 174 77L164 117Q120 134 76 117Z" fill="#FFFAEE" />
        <ellipse cx="120" cy="77" rx="54" ry="18" fill="#D9AE69" />
        <path d="M79 99Q120 114 162 99M90 82l10 4m16-14 10 4m15 8 10-4" />
        <path d="M110 33q-8 8 0 15m20-22q-8 8 0 15" opacity=".6" />
      </> : category === 'compotes' ? <>
        <path d="M48 83q6 40 42 38q31-2 37-38Z" fill="#FFF5E4" /><ellipse cx="87" cy="83" rx="39" ry="10" fill="#E6B271" />
        <path d="M88 68l29-36m-24 32 29-29" />
        <path d="M145 51q-19-6-24 20q-5 26 18 38q12 6 20-2q11 9 23 0q20-17 12-39q-8-22-27-16" fill="#D78064" />
        <path d="M156 53q-2-14 6-21m-4 9q21-20 30-7q-5 17-30 7" fill="#87A07B" />
      </> : category === 'patisseries' ? <>
        <circle cx="92" cy="85" r="35" fill="#DDB67B" /><circle cx="92" cy="85" r="26" strokeDasharray="2 11" />
        <path d="m77 71 6 3-3 7-5-2Zm21 13 7 2-2 7-6-2Zm-17 12 5 3-3 6-6-3Z" fill="currentColor" />
        <path d="M138 75h55l-8 42h-38Z" fill="#FFF5E4" /><path d="m154 84 3 25m10-25v28m10-28-3 25" opacity=".55" />
        <path d="M136 76q-8-16 8-22q-2-17 18-17q18-9 26 13q21 0 17 22q-20 10-69 4Z" fill="#DDB67B" />
      </> : category === 'salades' ? <>
        <path d="M58 83q5 44 62 44q57 0 62-44Z" fill="#FFF9ED" /><ellipse cx="120" cy="83" rx="62" ry="18" fill="#9DB58A" />
        <path d="M80 75q-26-37 0-41q30-2 15 41m18-3q-11-46 15-44q21 10 9 46m17 4q-4-34 21-29q18 13-12 35" fill="#94B28A" />
        <circle cx="95" cy="80" r="12" fill="#D8876D" /><circle cx="140" cy="88" r="12" fill="#D8876D" /><path d="m112 90 13-4 5 10-15 4Z" fill="#FFF7E0" />
      </> : <>
        <ellipse cx="120" cy="87" rx="67" ry="37" fill="#FFF9ED" /><ellipse cx="120" cy="87" rx="49" ry="25" />
        <path d="M84 88q19-32 41-7q-10 24-41 7m40 7q20-33 33-12q8 24-33 12" fill="#94B28A" />
        <circle cx="123" cy="69" r="8" fill="#D8876D" /><path d="M201 50v73m-11-73v22q10 12 20 0V50M39 50v73m-6-73v29h13V50" />
      </>}
      <path d="m40 30 3 4m144-6 4 3m-160 71 4 1m181 7 4-1" opacity=".4" />
    </g>
  </svg>
}
