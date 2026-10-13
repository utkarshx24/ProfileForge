import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, Award, BookOpen, Check, ChevronDown, CircleAlert, CircleHelp, Clipboard, Code2, FileText, LoaderCircle, Moon, PlayCircle, RefreshCw, Sparkles, Sun, Target, WandSparkles, X } from 'lucide-react';

const STORE_KEY = 'profile-optimiser-state-v1';
const sampleProfile = `Headline: Software Engineer | Building reliable APIs and backend systems\n\nAbout: Backend engineer focused on building dependable services and making systems easier to operate. I enjoy working with product and design teams to turn ambiguous problems into clear, maintainable software.\n\nExperience:\nSoftware Engineer, Northstar Labs (2022-present)\n- Built REST APIs in Node.js and TypeScript for a B2B workflow product.\n- Worked with product managers to scope and ship customer-facing features.\n- Added automated tests and improved service monitoring.\n\nJunior Developer, Brightside Studio (2020-2022)\n- Developed internal tools using JavaScript and PostgreSQL.\n- Helped maintain CI pipelines and reviewed pull requests.\n\nSkills: JavaScript, TypeScript, Node.js, Express, REST APIs, PostgreSQL, Git, Docker, automated testing, CI/CD`;

const emptyState = { profileText: '', targetRole: '', company: '', jobDescription: '', fullName: '', skills: '', summary: '' };
const sections = [
  ['headline', 'Headline'], ['about', 'About'], ['experience', 'Experience & impact'], ['skills', 'Skills & keywords'],
];

function ScoreRing({ score }) {
  return <div className="score-ring" style={{ '--score': `${score * 3.6}deg` }}><div className="score-ring-inner"><span className="sr-only">Overall profile score</span><strong>{score}</strong><span>/ 100</span></div></div>;
}

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); }
  }
  return <button className="copy-button" onClick={copy}>{copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? 'Copied!' : label}</button>;
}

function SectionScores({ scores }) {
  return <div className="section-scores">{sections.map(([key, label]) => <div className="section-score" key={key}><div className="section-label"><span>{label}</span><b>{scores[key]}</b></div><div className="bar"><i style={{ width: `${scores[key]}%` }} /></div></div>)}</div>;
}

function RewriteCard({ label, text, icon: Icon, copyLabel }) {
  return <article className="rewrite-card"><div className="rewrite-heading"><div className="rewrite-label"><Icon size={16} /><span>{label}</span></div><CopyButton text={text} label={copyLabel} /></div><p>{text}</p></article>;
}

function toAnalysisProfile(input) {
  return [
    input.fullName && `Name: ${input.fullName}`,
    input.summary && `LinkedIn bio / summary: ${input.summary}`,
    input.profileText && `Experience and additional profile context:\n${input.profileText}`,
    input.skills && `Skills: ${input.skills}`,
  ].filter(Boolean).join('\n\n');
}

function profileSkills(profileText, gaps) {
  const explicit = profileText.match(/\bskills?\s*:\s*([^\n]+)/i)?.[1];
  const mentionedGaps = gaps.filter(gap => profileText.toLowerCase().includes(gap.skill.toLowerCase())).map(gap => gap.skill);
  const candidateSkills = explicit ? explicit.split(/[,;|•]/).map(skill => skill.trim()).filter(Boolean) : mentionedGaps;
  const missing = gaps.filter(gap => !profileText.toLowerCase().includes(gap.skill.toLowerCase()));
  const present = [...new Set(candidateSkills.filter(skill => !missing.some(gap => gap.skill.toLowerCase() === skill.toLowerCase())))].slice(0, 10);
  return { present, missing };
}

function radarPoints(scores, scale = 1) {
  const values = [scores.headline, scores.about, scores.experience, scores.skills];
  return values.map((value, index) => {
    const angle = (-Math.PI / 2) + index * (Math.PI / 2);
    const radius = 66 * (value / 100) * scale;
    return `${90 + Math.cos(angle) * radius},${82 + Math.sin(angle) * radius}`;
  }).join(' ');
}

function profileCriteria(profileText, targetRole) {
  const text = profileText.toLowerCase();
  const firstLines = profileText.split(/\n/).filter(Boolean).slice(0, 3).join(' ').toLowerCase();
  const rows = [
    { criterion: 'Metrics & business impact', expectation: 'Specific outcomes, scale, or measurable results', covered: /\b\d+(?:[,.]\d+)?\s*(%|percent|k|m|million|billion|users|customers|requests|ms|seconds|hours|days)\b/i.test(profileText) },
    { criterion: 'System architecture', expectation: 'Architecture, scalability, reliability, or system design evidence', covered: /architect|scalab|microservice|distributed|high availability|caching|system design|reliab/i.test(text) },
    { criterion: 'Impactful action verbs', expectation: 'Clear ownership and specific actions in experience', covered: /\b(led|built|designed|architected|engineered|launched|improved|optimized|delivered|reduced|increased|automated|scaled)\b/i.test(text) },
    { criterion: 'Target role specificity', expectation: 'Target role is easy to find near the start of the profile', covered: Boolean(targetRole && firstLines.includes(targetRole.toLowerCase())) },
  ];
  return rows.map(row => ({ ...row, status: row.covered ? 'Present' : 'Could be clearer' }));
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('profileforge-theme');
      if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    } catch {}
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [form, setForm] = useState(emptyState);
  const [result, setResult] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [revisionText, setRevisionText] = useState('');
  const [hasRescored, setHasRescored] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('profileforge-theme', theme); } catch {}
  }, [theme]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (saved) { setForm({ ...emptyState, ...saved.form }); setResult(saved.result || null); setBaseline(saved.baseline || null); setRevisionText(saved.revisionText || ''); setHasRescored(Boolean(saved.hasRescored)); }
    } catch { localStorage.removeItem(STORE_KEY); }
  }, []);

  useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify({ form, result, baseline, revisionText, hasRescored })); }, [form, result, baseline, revisionText, hasRescored]);
  useEffect(() => {
    if (!loading) { setProgress(0); return undefined; }
    const phases = [20, 44, 67, 86]; let phase = 0;
    const timer = window.setInterval(() => { setProgress(phases[Math.min(phase++, phases.length - 1)]); }, 1250);
    return () => window.clearInterval(timer);
  }, [loading]);

  function update(key, value) { setForm(current => ({ ...current, [key]: value })); }
  async function analyze(input = form, { saveBaseline = false } = {}) {
    setLoading(true); setError('');
    try {
      const headers = { 'Content-Type': 'application/json' };
      const response = await fetch('/api/analyze', { method: 'POST', headers, body: JSON.stringify({ ...input, profileText: toAnalysisProfile(input) || input.profileText }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'We could not complete the analysis. Please try again.');
      setResult(data);
      if (saveBaseline) {
        setBaseline(data);
        setRevisionText(`${toAnalysisProfile(input) || input.profileText}\n\nHeadline: ${data.rewrite.headline}\n\nAbout: ${data.rewrite.about}`);
        setHasRescored(false);
      } else setHasRescored(true);
    } catch (err) { setError(err instanceof TypeError ? 'Could not reach ProfileForge. Check that both the web and API servers are running.' : (err.message || 'Something went wrong. Please try again.')); }
    finally { setLoading(false); }
  }
  function rescoreRewrite() {
    if (!result || !revisionText.trim()) return;
    analyze({ ...form, fullName: '', skills: '', summary: '', profileText: revisionText });
  }
  function loadSample() { setForm({ ...emptyState, profileText: sampleProfile, targetRole: 'Backend Engineer', fullName: 'Rahul Sharma', skills: 'JavaScript, TypeScript, Node.js, Express, REST APIs, PostgreSQL, Git, Docker, automated testing, CI/CD', summary: 'Backend engineer focused on building dependable services and making systems easier to operate. I enjoy working with product and design teams to turn ambiguous problems into clear, maintainable software.' }); setError(''); }

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top" aria-label="ProfileForge home"><img className="brand-logo" src="/profileforge-logo.png" alt="" /><span>ProfileForge</span></a><nav className="topbar-right" aria-label="Main navigation"><a href="#how-it-works">How it works</a><span className="private-label"><span /> Private workspace</span><button className="theme-toggle" type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} aria-pressed={theme === 'dark'} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button></nav></header>
    <main id="top">
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><Sparkles size={13} /> A BETTER WAY TO TELL YOUR WORK STORY</div><h1>Your next move<br /><span>starts with your story.</span></h1><p>Shape a LinkedIn profile around the work you want to do. Get thoughtful feedback, role-specific skill ideas, and edits grounded in your real experience.</p><div className="hero-note"><CircleHelp size={14} /> Your profile stays in this browser. Nothing is published to LinkedIn.</div></div><div className="hero-aside"><div className="aside-mark"><WandSparkles size={20} /></div><p>Good profiles make it easy to see what you do, how you do it, and where you want to go.</p><span>YOUR EXPERIENCE, CLEARLY TOLD</span></div></section>
      <section className="steps-strip" id="how-it-works" aria-label="How ProfileForge works"><div className="step-item"><span>01</span><div><b>Bring your profile</b><small>Paste your current LinkedIn text</small></div></div><div className="step-connector" /><div className="step-item"><span>02</span><div><b>Choose a direction</b><small>Add a role and job description</small></div></div><div className="step-connector" /><div className="step-item"><span>03</span><div><b>Make it yours</b><small>Review, refine, and re-score</small></div></div></section>
      <div className="workspace">
        <section className="panel form-panel">
          <div className="panel-title-row"><div><div className="step-label">YOUR STARTING POINT</div><h2>Build your profile brief</h2><p className="panel-intro">A little context helps us make useful, specific suggestions.</p></div><button className="sample-button" onClick={loadSample}><WandSparkles size={15} /> Try a sample</button></div>
          <label className="field-label" htmlFor="fullName">Your full name <span className="optional">OPTIONAL</span></label>
          <input id="fullName" value={form.fullName || ''} onChange={e => update('fullName', e.target.value)} placeholder="e.g. Rahul Sharma" maxLength={120} />
          <div className="form-row">
            <div><label className="field-label" htmlFor="targetRole">Target role <span className="required">*</span></label><input id="targetRole" value={form.targetRole} onChange={e => update('targetRole', e.target.value)} placeholder="e.g. Software Engineer" maxLength={120} /></div>
            <div><label className="field-label" htmlFor="company">Target company <span className="optional">OPTIONAL</span></label><input id="company" value={form.company} onChange={e => update('company', e.target.value)} placeholder="Where you're hoping to work" maxLength={120} /></div>
          </div>
          <label className="field-label" htmlFor="skills">Current skills <span className="optional">OPTIONAL</span></label>
          <input id="skills" value={form.skills || ''} onChange={e => update('skills', e.target.value)} placeholder="React, TypeScript, system design..." maxLength={2000} />
          <label className="field-label" htmlFor="summary">Current LinkedIn bio / summary <span className="optional">OPTIONAL</span></label>
          <textarea id="summary" className="summary-textarea" value={form.summary || ''} onChange={e => update('summary', e.target.value)} placeholder="Paste your current LinkedIn About section or summary..." maxLength={5000} />
          <label className="field-label" htmlFor="profileText">Experience and additional profile context <span className="optional">OPTIONAL</span><span className="label-hint">Roles, achievements, projects, and metrics</span></label>
          <textarea id="profileText" className="profile-textarea" value={form.profileText} onChange={e => update('profileText', e.target.value)} placeholder={'Role, company, dates, accomplishments, projects, and measurable impact...'} maxLength={12000} />
          <div className="char-count">{form.profileText.length.toLocaleString()} / 12,000</div>
          <details className="optional-details"><summary>Have a job description? <span>Optional, but useful <ChevronDown size={14} /></span></summary><textarea value={form.jobDescription} onChange={e => update('jobDescription', e.target.value)} placeholder="Paste the job description here..." maxLength={8000} /></details>
          <button className="primary-button" onClick={() => analyze(form, { saveBaseline: true })} disabled={loading || !(form.profileText.trim() || form.summary.trim() || form.skills.trim()) || !form.targetRole.trim()}>{loading ? <><LoaderCircle className="spin" size={17} /> Reviewing your profile...</> : <>Review my profile <ArrowRight size={17} /></>}</button>
          {loading && <div className="progress-wrap" aria-live="polite"><div className="progress-caption"><span>Finding your strongest story</span><span>{progress}%</span></div><div className="progress-track"><i style={{ width: `${progress}%` }} /></div><p>Comparing your profile to the role you want. Usually takes a few seconds.</p></div>}
          {error && <div className="error-box"><CircleHelp size={17} /><span>{error}</span></div>}
        </section>

        <section className="results-column">
          {!result ? <div className="empty-results panel"><div className="empty-icon"><Target size={22} /></div><div className="step-label">YOUR PROFILE REVIEW</div><h2>A clearer story is within reach.</h2><p>Your review will show what is already strong, where your profile could be clearer, and which skills connect to your next role.</p><div className="empty-features"><span><Check size={14} /> A score with section-by-section context</span><span><Check size={14} /> Skill ideas based on your target role</span><span><Check size={14} /> Rewrites that stay true to your experience</span></div><div className="empty-bottom"><span>Your review will appear here</span><span className="ready-dot" /></div></div> : <div className="results-content">
            <div className="results-title"><div><div className="step-label">YOUR PROFILE REVIEW</div><h2>A thoughtful place to start.</h2></div><button className="icon-button" title="Run analysis again" onClick={() => analyze()} disabled={loading}><RefreshCw size={16} /></button></div>
            <section className="panel score-panel"><div className="score-overview"><ScoreRing score={result.overallScore} /><div className="score-copy"><div className="score-kicker">OVERALL MATCH SCORE</div><h3>{result.overallScore >= 75 ? 'Strong foundation' : result.overallScore >= 50 ? 'Room to sharpen' : 'A fresh start'}</h3><p>For <strong>{form.targetRole || 'your target role'}</strong>{form.company ? ` at ${form.company}` : ''}</p></div></div><SectionScores scores={result.sectionScores} /></section>
            <section className="panel analysis-panel">
              <div className="subheading"><span className="icon-chip blue"><Target size={15} /></span><div><h3>Skills radar analysis</h3><p>Profile evidence across the four review areas.</p></div></div>
              <div className="analysis-grid">
                <div className="radar-wrap" role="img" aria-label={`Profile section scores: headline ${result.sectionScores.headline}, about ${result.sectionScores.about}, experience ${result.sectionScores.experience}, skills ${result.sectionScores.skills}`}>
                  <svg className="radar-chart" viewBox="0 0 180 164" aria-hidden="true">
                    {[25, 50, 75, 100].map(level => <polygon key={level} points={radarPoints({ headline: level, about: level, experience: level, skills: level })} />)}
                    <line x1="90" y1="82" x2="90" y2="16" /><line x1="90" y1="82" x2="156" y2="82" /><line x1="90" y1="82" x2="90" y2="148" /><line x1="90" y1="82" x2="24" y2="82" />
                    <polygon className="radar-value" points={radarPoints(result.sectionScores)} />
                    {['Headline', 'About', 'Experience', 'Skills'].map((label, index) => {
                      const angle = (-Math.PI / 2) + index * (Math.PI / 2);
                      return <text key={label} x={90 + Math.cos(angle) * 78} y={82 + Math.sin(angle) * 78 + (index === 0 ? -2 : index === 2 ? 10 : 4)} textAnchor="middle">{label}</text>;
                    })}
                  </svg>
                </div>
                <div className="skill-analysis">
                  {(() => {
                    const skillData = profileSkills([form.skills, form.summary, form.profileText].filter(Boolean).join('\n'), result.gaps);
                    return <>
                      <div className="skill-group"><h4><Check size={14} /> Skills in your profile</h4><div className="skill-chips">{skillData.present.length ? skillData.present.map((skill, index) => <span className="skill-chip present" key={`${skill}-${index}`}>{skill}</span>) : <span className="skill-empty">No explicit skills list found in the profile text.</span>}</div></div>
                      <div className="skill-group"><h4><X size={14} /> Areas to investigate</h4><div className="skill-chips">{skillData.missing.map((gap, index) => <span className="skill-chip missing" key={`${gap.skill}-${index}`}>{gap.skill}</span>)}</div></div>
                    </>;
                  })()}
                </div>
              </div>
            </section>
            <section className="panel criteria-panel"><div className="subheading"><span className="icon-chip blue"><Award size={15} /></span><div><h3>Role criteria vs. your profile</h3><p>Evidence checks based on the text you shared.</p></div></div><div className="criteria-table-wrap"><table className="criteria-table"><thead><tr><th>Criteria</th><th>What the role review looks for</th><th>Your profile</th><th>Status</th></tr></thead><tbody>{profileCriteria(toAnalysisProfile(form), form.targetRole).map(row => <tr key={row.criterion}><th scope="row">{row.criterion}</th><td>{row.expectation}</td><td>{row.covered ? 'Evidence found in the provided text' : 'No clear evidence found yet'}</td><td><span className={`criteria-status ${row.covered ? 'covered' : 'attention'}`}>{row.covered ? <Check size={12} /> : <CircleAlert size={12} />}{row.status}</span></td></tr>)}</tbody></table></div></section>
            {result.strengths.length > 0 && <section className="panel strengths-panel"><div className="subheading"><span className="icon-chip green"><Check size={15} /></span><div><h3>What's already working</h3><p>Build on these strengths.</p></div></div><ul className="strength-list">{result.strengths.map((item, index) => <li key={index}><span>{String(index + 1).padStart(2, '0')}</span>{item}</li>)}</ul></section>}
            <section className="panel gaps-panel"><div className="subheading"><span className="icon-chip amber"><Target size={15} /></span><div><h3>Skills to bring into focus</h3><p>Potential gaps based on your target role and job description.</p></div></div><div className="gap-list">{result.gaps.map((gap, index) => <article className="gap-card" key={`${gap.skill}-${index}`}><div className="gap-top"><span className={`priority ${gap.priority}`}>{gap.priority}</span><a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(gap.searchQuery)}`} target="_blank" rel="noreferrer">Learn <ArrowUpRight size={13} /></a></div><h4>{gap.skill}</h4><p>{gap.why}</p><div className="search-query">SEARCH: {gap.searchQuery}</div></article>)}</div><p className="confidence-note"><CircleHelp size={14} /> {result.confidenceNotes}</p></section>
            <section className="panel learning-panel"><div className="subheading"><span className="icon-chip blue"><BookOpen size={15} /></span><div><h3>Recommended video learning hub</h3><p>Open a focused tutorial search for each skill area.</p></div></div><div className="learning-grid">{result.gaps.map((gap, index) => <article className="learning-card" key={`learn-${gap.skill}-${index}`}><span className="priority">{gap.priority} priority</span><h4>{gap.skill}</h4><p>{gap.why}</p><a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(gap.searchQuery)}`} target="_blank" rel="noreferrer"><PlayCircle size={15} /> Watch tutorials on YouTube <ArrowUpRight size={13} /></a></article>)}</div></section>
            <section className="panel rewrites-panel"><div className="subheading"><span className="icon-chip violet"><WandSparkles size={15} /></span><div><h3>LinkedIn-ready optimized content</h3><p>Copy and personalize these drafts before adding them to your profile.</p></div></div><RewriteCard label="Optimized headline" text={result.rewrite.headline} icon={Code2} copyLabel="Copy headline" /><RewriteCard label="STAR-method About bio" text={result.rewrite.about} icon={FileText} copyLabel="Copy bio" />{result.questionsForUser.length > 0 && <div className="questions-box"><h4>A few details could make this stronger</h4><ul>{result.questionsForUser.map((question, index) => <li key={index}>{question}</li>)}</ul></div>}</section>
            <section className="panel compare-panel"><div className="subheading"><span className="icon-chip blue"><RefreshCw size={15} /></span><div><h3>Try the improved version</h3><p>Edit this profile text, then re-score it against your target role.</p></div></div><label className="revision-label" htmlFor="revisionText">YOUR UPDATED PROFILE</label><textarea id="revisionText" className="revision-textarea" value={revisionText} onChange={e => setRevisionText(e.target.value)} maxLength={12000} /><div className="compare-flow"><div className="compare-score"><span>BEFORE</span><b>{baseline?.overallScore ?? result.overallScore}</b></div><ArrowRight size={16} /><div className="compare-score after"><span>AFTER</span><b>{hasRescored ? result.overallScore : '—'}</b></div><button onClick={rescoreRewrite} disabled={loading || !revisionText.trim()}><RefreshCw size={14} /> Re-score my profile</button></div>{hasRescored && <div className="compare-sections">{sections.map(([key,label]) => <span key={key}>{label}: {baseline.sectionScores[key]} <ArrowRight size={12} /> {result.sectionScores[key]}</span>)}</div>}</section>
            <section className="panel video-prep-panel p-4 sm:p-5">
              <div className="subheading"><span className="icon-chip blue"><PlayCircle size={15} /></span><div><h3>Recommended video: Resume prep</h3><p>Learn how to make your resume stand out to hiring teams.</p></div></div>
              <iframe
                src="https://www.youtube.com/embed/IW472-d_8bs"
                title="Here's the Biggest Mistake Found on Resumes! - Jeff Su"
                className="w-full rounded-lg border-0"
                style={{ aspectRatio: '16 / 9' }}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </section>
          </div>}
        </section>
      </div>
    </main>
    <footer><span className="footer-brand">ProfileForge</span><span>Built to help you show up as yourself.</span><span className="footer-privacy"><span /> Your profile stays on this device</span></footer>
  </div>;
}
