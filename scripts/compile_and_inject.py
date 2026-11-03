import os
import subprocess
import re

print("Starting compile and inject process...")

# JSX Snippets
multijob_jsx = '''
(() => {
  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="text-center max-w-3xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20 mb-3">
          <span>⚡</span> Multi-Job Fit Comparison & Opportunity Ranking
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Multi-Job Description Comparison
        </h2>
        <p className="mt-3 text-sm text-slate-400">
          Simultaneously evaluate your resume against 2 to 5 target job descriptions. The system computes qualification vectors, ranks roles by ATS compatibility, and identifies your highest-fit opening.
        </p>
      </div>

      <div className="max-w-4xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-500/30">
              📄
            </div>
            <div>
              <div className="text-sm font-bold text-slate-200">
                {multiFile ? multiFile.name : (file ? `Using uploaded resume: ${file.name}` : "No resume selected")}
              </div>
              <div className="text-xs text-slate-400">
                {multiFile || file ? "Resume loaded and ready for comparative scoring." : "Upload a PDF or DOCX resume to compare across all target roles."}
              </div>
            </div>
          </div>
          <div>
            <label className="cursor-pointer px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold inline-flex items-center gap-2 transition">
              <span>📁</span> {multiFile || file ? "Change Resume" : "Upload Resume (PDF/DOCX)"}
              <input
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setMultiFile(e.target.files[0]);
                    showToast("Resume uploaded for comparison: " + e.target.files[0].name);
                  }
                }}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-200">
              Target Job Openings ({multiJobs.length}/5)
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              Min 2, Max 5
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadMultiPreset}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
            >
              Load 3 Industry Roles
            </button>
            <button
              type="button"
              onClick={addMultiJobCard}
              disabled={multiJobs.length >= 5}
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition disabled:opacity-40"
            >
              + Add Role
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {multiJobs.map((job, idx) => (
            <div key={idx} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 relative shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 text-xs font-bold flex items-center justify-center border border-indigo-500/30">
                    #{idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-300">Job Opening #{idx + 1}</span>
                </div>
                {multiJobs.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeMultiJobCard(idx)}
                    className="text-rose-400 hover:text-rose-300 text-xs font-semibold px-2 py-0.5 rounded hover:bg-rose-500/10 transition"
                  >
                    ✕ Remove
                  </button>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Job Title</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Backend Engineer"
                  value={job.title}
                  onChange={(e) => updateMultiJobCard(idx, 'title', e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Cloud Corp"
                  value={job.company}
                  onChange={(e) => updateMultiJobCard(idx, 'company', e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Job Description & Requirements</label>
                <textarea
                  rows={4}
                  placeholder="Paste responsibilities, required qualifications, and technical competencies..."
                  value={job.description}
                  onChange={(e) => updateMultiJobCard(idx, 'description', e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 custom-scrollbar"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 text-center">
          <button
            type="button"
            onClick={handleMultiJobSubmit}
            disabled={multiLoading}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition disabled:opacity-50"
          >
            {multiLoading ? "Comparing Resume Across All Openings..." : "🚀 Compare Resume Against All Jobs (AI Ranking) →"}
          </button>
        </div>
      </div>

      {multiResult && (
        <div className="max-w-5xl mx-auto space-y-6 pt-6 border-t border-slate-800 animate-fadeIn">
          {multiResult.best_match && (
            <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 px-4 py-1.5 bg-gradient-to-l from-emerald-500 to-teal-600 text-slate-950 text-xs font-black uppercase tracking-wider rounded-bl-xl shadow-lg">
                👑 Best Fit Opportunity
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Top Recommendation</span>
                  <h3 className="text-2xl font-extrabold text-white mt-1">
                    {multiResult.best_match.job_title}
                  </h3>
                  <p className="text-xs font-semibold text-slate-300 mt-0.5">
                    {multiResult.best_match.company_name}
                  </p>
                  <p className="text-xs text-slate-300 mt-3 max-w-2xl leading-relaxed">
                    {multiResult.best_match.recommendation_reason}
                  </p>
                </div>
                <div className="text-center bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 min-w-[130px] shadow-lg">
                  <div className="text-4xl font-black text-emerald-400">
                    {multiResult.best_match.match_score}%
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 mt-1 uppercase">Match Synergy</div>
                </div>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-lg font-bold text-slate-200 mb-4">
              Comparative Role Breakdown ({multiResult.comparisons ? multiResult.comparisons.length : 0} Roles)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {multiResult.comparisons && multiResult.comparisons.map((c, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4 flex flex-col justify-between shadow-lg">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        Role #{c.job_index || idx + 1}
                      </span>
                      <span className={`text-base font-black ${c.match_score >= 80 ? 'text-emerald-400' : c.match_score >= 65 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {c.match_score}% Match
                      </span>
                    </div>
                    <h5 className="font-extrabold text-sm text-white line-clamp-1">{c.job_title}</h5>
                    <p className="text-xs text-slate-400 line-clamp-1">{c.company_name}</p>

                    <div className="w-full bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${c.match_score >= 80 ? 'bg-emerald-500' : c.match_score >= 65 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${c.match_score}%` }}
                      />
                    </div>

                    <p className="text-xs text-slate-300 mt-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                      {c.verdict}
                    </p>

                    <div className="mt-3">
                      <div className="text-[10px] font-bold uppercase text-emerald-400 mb-1.5 flex items-center gap-1">
                        <span>✓</span> Matching Skills ({c.matching_skills ? c.matching_skills.length : 0})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {c.matching_skills && c.matching_skills.slice(0, 6).map((s, sIdx) => (
                          <span key={sIdx} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="text-[10px] font-bold uppercase text-rose-400 mb-1.5 flex items-center gap-1">
                        <span>⚠</span> Missing Requirements ({c.missing_skills ? c.missing_skills.length : 0})
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {c.missing_skills && c.missing_skills.slice(0, 5).map((s, sIdx) => (
                          <span key={sIdx} className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 font-medium">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setJobTitle(c.job_title);
                      setCompanyName(c.company_name);
                      const matched = multiJobs.find(j => j.title === c.job_title);
                      if (matched) setJobDescription(matched.description);
                      setAnalysisMode('job_description');
                      setActiveView('analyzer');
                      showToast("Loaded " + c.job_title + " into Analyzer!");
                    }}
                    className="w-full mt-3 py-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-bold transition border border-slate-700"
                  >
                    Analyze Deeply in Single Mode →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
})()
'''

rewriter_jsx = '''
(() => {
  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-xs font-bold border border-violet-500/20 mb-3">
          <span>✍️</span> Executive Resume Section Rewriter
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          AI Resume Section Rewriter
        </h2>
        <p className="mt-3 text-sm text-slate-400">
          Transform passive statements into compelling, metrics-driven bullets using the Google XYZ formula ("Accomplished X, as measured by Y, by doing Z").
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-2">Target Resume Section</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'summary', label: 'Professional Summary', icon: '📝' },
              { id: 'experience', label: 'Work Experience', icon: '💼' },
              { id: 'projects', label: 'Projects & Portfolio', icon: '🚀' },
              { id: 'skills', label: 'Technical Skills', icon: '⚙️' }
            ].map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setRewriterSection(sec.id)}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${rewriterSection === sec.id ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300 shadow' : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'}`}
              >
                <span className="text-base">{sec.icon}</span>
                <span>{sec.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-300">
              Target Job Context / Keywords <span className="text-slate-500 font-normal">(Optional)</span>
            </label>
            {jobDescription && (
              <button
                type="button"
                onClick={() => {
                  setRewriterJD(jobDescription);
                  showToast("Loaded job description context from Analyzer!");
                }}
                className="text-[11px] text-indigo-400 hover:underline"
              >
                Import from Analyzer ({jobTitle || 'Current JD'})
              </button>
            )}
          </div>
          <input
            type="text"
            placeholder="e.g. Senior Full Stack Engineer, Microservices, Python, React, Cloud"
            value={rewriterJD}
            onChange={(e) => setRewriterJD(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-300">
              Current Draft / Content <span className="text-rose-400">*</span>
            </label>
            <button
              type="button"
              onClick={() => {
                if (rewriterSection === 'summary') {
                  setRewriterOriginal("Software engineer with 2 years of experience developing web apps with Python and JavaScript. Looking for a new role at a growing company.");
                } else if (rewriterSection === 'experience') {
                  setRewriterOriginal("- Worked on the backend of an e-commerce website using Python and Flask.\\n- Fixed bugs in database queries and made the page load faster.\\n- Helped team members with code reviews and wrote unit tests.");
                } else if (rewriterSection === 'projects') {
                  setRewriterOriginal("- Built an AI resume analyzer tool using React and Flask that extracts text and gives scores.\\n- Used SQLite database to save user reports and implemented JWT auth.");
                } else {
                  setRewriterOriginal("Python, JavaScript, React, Flask, SQL, Docker, Git, REST APIs, HTML/CSS");
                }
                showToast("Sample draft loaded!");
              }}
              className="text-[11px] text-indigo-400 hover:underline"
            >
              Load Draft Sample
            </button>
          </div>
          <textarea
            rows={5}
            placeholder="Paste your raw section draft or bullet points here..."
            value={rewriterOriginal}
            onChange={(e) => setRewriterOriginal(e.target.value)}
            className="w-full text-xs p-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 font-mono custom-scrollbar"
          />
          <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
            <span>Minimum 10 characters</span>
            <span>{rewriterOriginal.length} characters</span>
          </div>
        </div>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={handleRewriteSubmit}
            disabled={rewriterLoading || rewriterOriginal.trim().length < 10}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-lg transition disabled:opacity-40"
          >
            {rewriterLoading ? "Optimizing Section with Generative AI..." : "✨ Optimize Section with Generative AI →"}
          </button>
        </div>
      </div>

      {rewriterResult && (
        <div className="space-y-6 pt-4 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Before (Original Draft)</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">Raw Input</span>
              </div>
              <div className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                {rewriterOriginal}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 to-slate-900 p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">After (AI-Optimized)</span>
                <button
                  type="button"
                  onClick={() => handleCopyText(rewriterResult.improved_text || rewriterResult.improved_bullet_points?.join('\\n'), 'Rewritten Section')}
                  className="text-xs px-3 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 font-bold transition flex items-center gap-1.5"
                >
                  <span>📋</span> Copy Improved Version
                </button>
              </div>
              <div className="text-xs text-slate-100 font-sans leading-relaxed bg-slate-950 p-4 rounded-xl border border-emerald-500/30 shadow-inner">
                {rewriterResult.improved_text}
              </div>
            </div>
          </div>

          {rewriterResult.improved_bullet_points && rewriterResult.improved_bullet_points.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3 shadow-lg">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <span>🎯</span> Ready-to-Paste Resume Bullets (Google XYZ Format)
              </h4>
              <div className="space-y-2">
                {rewriterResult.improved_bullet_points.map((b, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition">
                    <div className="flex items-start gap-2.5">
                      <span className="text-emerald-400 font-bold text-xs mt-0.5">•</span>
                      <p className="text-xs text-slate-200 leading-relaxed">{b}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(b, `Bullet #${idx + 1}`)}
                      className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 text-xs flex-shrink-0"
                      title="Copy bullet"
                    >
                      📋
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {rewriterResult.key_changes_made && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-2">
                <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Key Enhancements Applied</h5>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {rewriterResult.key_changes_made.map((c, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-indigo-400">✓</span> {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {rewriterResult.ats_tips && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-2">
                <h5 className="text-xs font-bold text-amber-400 uppercase tracking-wider">ATS Optimization Tips</h5>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {rewriterResult.ats_tips.map((t, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400">💡</span> {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
})()
'''

history_jsx = '''
(() => {
  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            My Analysis History & Saved Reports
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Access your previous resume assessments, review ATS score progression, and download official PDF reports.
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setHistoryFilter('all'); fetchHistory('all'); }}
            className={`px-3 py-1.5 rounded-lg transition ${historyFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            All Analyses
          </button>
          <button
            type="button"
            onClick={() => { setHistoryFilter('saved'); fetchHistory('saved'); }}
            className={`px-3 py-1.5 rounded-lg transition ${historyFilter === 'saved' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Bookmarked ⭐
          </button>
        </div>
      </div>

      {historyLoading ? (
        <div className="text-center py-16 text-slate-400 space-y-3">
          <div className="inline-block animate-spin text-2xl">⏳</div>
          <p className="text-xs">Loading historical records from database...</p>
        </div>
      ) : historyList.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 space-y-4">
          <div className="text-4xl">📂</div>
          <h4 className="text-base font-bold text-slate-200">No analyses found</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {historyFilter === 'saved' ? "You haven't bookmarked any reports yet. Star an analysis to save it here." : "You haven't performed any analyses yet. Upload your resume in the Analyzer to get started."}
          </p>
          <button
            type="button"
            onClick={() => setActiveView('analyzer')}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
          >
            Go to Resume Analyzer →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {historyList.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-col justify-between space-y-4 shadow-lg hover:border-slate-700 transition">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleBookmark(item.id)}
                    className="text-base text-amber-400 hover:scale-110 transition"
                    title={item.is_saved ? "Remove bookmark" : "Bookmark this report"}
                  >
                    {item.is_saved ? "★" : "☆"}
                  </button>
                </div>
                <h4 className="font-extrabold text-base text-white mt-1">
                  {item.job_title || 'Resume Analysis'}
                </h4>
                <p className="text-xs text-slate-400">{item.company_name || 'General Industry Track'}</p>
                <p className="text-[11px] text-slate-500 mt-1">File: {item.resume_filename}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">ATS Score:</span>
                  <span className={`text-lg font-black ${item.match_score >= 80 ? 'text-emerald-400' : item.match_score >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {item.match_score}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/report/${item.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-semibold transition"
                  >
                    PDF ⬇
                  </a>
                  <button
                    type="button"
                    onClick={() => handleLoadHistoricalAnalysis(item.id)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-bold transition shadow"
                  >
                    View Report →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
})()
'''

authmodal_jsx = '''
(() => {
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl relative space-y-4">
        <button
          type="button"
          onClick={() => setShowAuthModal(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          ✕
        </button>

        <div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-extrabold mb-2 shadow-lg shadow-indigo-500/25">
            RX
          </div>
          <h3 className="text-xl font-bold text-white">
            {authMode === 'login' ? "Sign In to ResumeX" : "Create Student Account"}
          </h3>
          <p className="text-xs text-slate-400">
            {authMode === 'login' ? "Access your saved resume history and customized reports." : "Register for an academic evaluation account."}
          </p>
        </div>

        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setAuthMode('login'); setAuthError(null); }}
            className={`py-2 rounded-lg transition ${authMode === 'login' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('register'); setAuthError(null); }}
            className={`py-2 rounded-lg transition ${authMode === 'register' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Create Account
          </button>
        </div>

        {authError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            ⚠️ {authError}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-3">
          {authMode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="John Doe"
                value={authForm.name}
                onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="student@resumex.ai"
              value={authForm.email}
              onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              className="w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition mt-2"
          >
            {authMode === 'login' ? "Sign In →" : "Create Account →"}
          </button>
        </form>

        <div className="pt-3 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400 mb-2">Academic Demo 1-Click Fill:</p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthForm({ name: '', email: 'student@resumex.ai', password: 'Student@123' });
              }}
              className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700"
            >
              Student Demo
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthForm({ name: '', email: 'admin@resumex.ai', password: 'Admin@123' });
              }}
              className="text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-violet-300 border border-slate-700"
            >
              Admin Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
})()
'''

# Helper to compile JSX with babel via Node.js
def compile_jsx(name, jsx_code):
    temp_input = f"scripts/temp_{name}.jsx".replace("\\\\", "/")
    temp_output = f"scripts/temp_{name}.js".replace("\\\\", "/")
    with open(temp_input, "w", encoding="utf-8") as f:
        f.write(jsx_code)
    
    node_script = f"""
const fs = require('fs');
const path = require('path');
const babel = require(path.join(__dirname, '..', 'static', 'js', 'babel.min.js'));
const src = fs.readFileSync('{temp_input}', 'utf8');
const res = babel.transform(src, {{ presets: ['react'], compact: false }});
fs.writeFileSync('{temp_output}', res.code, 'utf8');
"""
    with open("scripts/temp_compiler.js", "w", encoding="utf-8") as f:
        f.write(node_script)
    
    ret = subprocess.run(["node", "scripts/temp_compiler.js"], capture_output=True, text=True)
    if ret.returncode != 0:
        print(f"Error compiling {name}:", ret.stderr)
        raise RuntimeError(f"Babel failed for {name}")
    
    with open(temp_output, "r", encoding="utf-8") as f:
        code = f.read()
    
    # Cleanup
    for p in [temp_input, temp_output, "scripts/temp_compiler.js"]:
        if os.path.exists(p):
            os.remove(p)
    return code.strip().rstrip(';').strip()

print("Compiling JSX components...")
multijob_code = compile_jsx("multijob", multijob_jsx)
rewriter_code = compile_jsx("rewriter", rewriter_jsx)
history_code = compile_jsx("history", history_jsx)
authmodal_code = compile_jsx("authmodal", authmodal_jsx)
print("All JSX compiled successfully!")

# Define JS handlers to inject into App()
handlers_code = '''
  // Handlers for Auth, Rewriter, Multi-Job, and History
  const handleCopyText = (text, label = 'Content') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      localStorage.setItem('resumex_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setShowAuthModal(false);
      setAuthForm({ name: '', email: '', password: '' });
      showToast(authMode === 'register' ? 'Account registered successfully!' : `Welcome back, ${data.user.name}!`);
      if (activeView === 'history') fetchHistory('all');
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('resumex_token');
    setToken(null);
    setUser(null);
    if (activeView === 'history') setActiveView('analyzer');
    showToast('Logged out successfully.', 'info');
  };

  const handleRewriteSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!rewriterOriginal || rewriterOriginal.trim().length < 10) {
      showToast('Please provide at least 10 characters for section content.', 'error');
      return;
    }
    setRewriterLoading(true);
    setRewriterResult(null);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/improve-section', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          section_name: rewriterSection,
          current_text: rewriterOriginal,
          job_description: rewriterJD
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Section optimization failed');
      setRewriterResult(data.result);
      showToast('Section optimized successfully!');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setRewriterLoading(false);
    }
  };

  const loadMultiPreset = () => {
    setMultiJobs([
      {
        title: 'Full Stack AI Engineer',
        company: 'TechForward Solutions',
        description: 'Requires Python, Flask, React, SQL, Gemini LLM integration, Docker containerization, and REST API development.'
      },
      {
        title: 'Frontend Application Specialist',
        company: 'Nova Interactive',
        description: 'Requires modern React.js, Tailwind CSS, TypeScript, component architecture, state management, and UX design.'
      },
      {
        title: 'Backend Systems & Cloud Engineer',
        company: 'Apex Cloud Systems',
        description: 'Requires Python, microservices, PostgreSQL, Docker, Kubernetes, CI/CD pipelines, and high-concurrency API performance.'
      }
    ]);
    showToast('Loaded 3 target industry openings for comparison.');
  };

  const addMultiJobCard = () => {
    if (multiJobs.length >= 5) {
      showToast('Maximum 5 job descriptions allowed for comparison.', 'info');
      return;
    }
    setMultiJobs([...multiJobs, { title: '', company: '', description: '' }]);
  };

  const removeMultiJobCard = (index) => {
    if (multiJobs.length <= 2) {
      showToast('At least 2 jobs are required for comparison.', 'info');
      return;
    }
    const updated = multiJobs.filter((_, idx) => idx !== index);
    setMultiJobs(updated);
  };

  const updateMultiJobCard = (index, field, value) => {
    const updated = [...multiJobs];
    updated[index][field] = value;
    setMultiJobs(updated);
  };

  const handleMultiJobSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const targetFile = multiFile || file;
    if (!targetFile && (!extractionPreview || !extractionPreview.extracted_text)) {
      showToast('Please upload a resume in PDF or DOCX format to compare.', 'error');
      return;
    }
    const validJobs = multiJobs.filter(j => j.title.trim() && j.description.trim());
    if (validJobs.length < 2) {
      showToast('Please provide titles and descriptions for at least 2 openings.', 'error');
      return;
    }
    setMultiLoading(true);
    setMultiResult(null);
    try {
      const formData = new FormData();
      if (targetFile) {
        formData.append('resume', targetFile);
      } else if (extractionPreview?.extracted_text) {
        formData.append('resume_text', extractionPreview.extracted_text);
      }
      formData.append('jobs_json', JSON.stringify(validJobs));

      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/compare-jobs', {
        method: 'POST',
        headers,
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Multi-job comparison failed');
      setMultiResult(data.result);
      showToast('Multi-job analysis completed! Best match identified below.');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setMultiLoading(false);
    }
  };

  const fetchHistory = async (filter = 'all') => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/history?filter=${filter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setHistoryList(data.analyses || []);
      }
    } catch (err) {
      console.warn('History fetch error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleLoadHistoricalAnalysis = async (id) => {
    try {
      const res = await fetch(`/api/history/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to retrieve analysis');
      setCurrentAnalysis(data);
      setCurrentAnalysisId(id);
      setActiveView('analyzer');
      showToast('Historical analysis loaded successfully!');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
'''

# Read current bundle.js
with open("static/js/bundle.js", "r", encoding="utf-8") as f:
    bundle_code = f.read()

# 1. Inject Handlers before `return /*#__PURE__*/React.createElement("div", {`
marker_return = 'return /*#__PURE__*/React.createElement("div", {'
if marker_return not in bundle_code:
    raise RuntimeError("Could not find return marker in bundle.js")

bundle_code = bundle_code.replace(marker_return, handlers_code + "\n  " + marker_return, 1)
print("Injected handlers into App component.")

# 2. Update navbar to make "My History" button accessible to all and wire handleLogout
old_user_nav = """user && /*#__PURE__*/React.createElement(\"button\", {
    onClick: () => setActiveView('history'),
    className: `px-3 py-1.5 rounded-lg transition ${activeView === 'history' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'}`
  }, \"My History\")"""

new_user_nav = """/*#__PURE__*/React.createElement(\"button\", {
    onClick: () => {
      if (!token) {
        setShowAuthModal(true);
        showToast('Please sign in to access saved analyses and reports.', 'info');
      } else {
        setActiveView('history');
        fetchHistory(historyFilter);
      }
    },
    className: `px-3 py-1.5 rounded-lg transition ${activeView === 'history' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'}`
  }, \"My History\")"""

if old_user_nav in bundle_code:
    bundle_code = bundle_code.replace(old_user_nav, new_user_nav, 1)
    print("Updated My History navbar button.")

# 3. Inject new views into <main>
# We find: `, showKeyModal && /*#__PURE__*/React.createElement("div", {`
# Before showKeyModal, inside the main/container element:
# In bundle.js:
# `c.text)))))), showKeyModal &&`
# That marks the end of activeView === 'analyzer' and the children of <main>!
marker_main_end = ', showKeyModal && /*#__PURE__*/React.createElement("div", {'
if marker_main_end not in bundle_code:
    raise RuntimeError("Could not find showKeyModal marker in bundle.js")

views_and_modal_injection = f""",
  activeView === 'multi-job' && ({multijob_code}),
  activeView === 'rewriter' && ({rewriter_code}),
  activeView === 'history' && ({history_code}),
  showAuthModal && ({authmodal_code})
  {marker_main_end}"""

bundle_code = bundle_code.replace(marker_main_end, views_and_modal_injection, 1)
print("Injected MultiJob, Rewriter, History views and AuthModal into render tree.")

# Write updated bundle.js
with open("static/js/bundle.js", "w", encoding="utf-8") as f:
    f.write(bundle_code)

print("Saved updated static/js/bundle.js")

# Validate with node -c
ret = subprocess.run(["node", "-c", "static/js/bundle.js"], capture_output=True, text=True)
if ret.returncode != 0:
    print("SYNTAX ERROR in bundle.js:", ret.stderr)
    raise RuntimeError("Syntax check failed on bundle.js")

print("SUCCESS: node -c passed! bundle.js syntax is 100% valid.")
