import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  AlertCircle, 
  Briefcase, 
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Copy,
  Check,
  Download,
  Bookmark,
  Sun,
  Moon,
  Shield,
  Layers,
  Edit3,
  History,
  Users
} from 'lucide-react';

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [activeView, setActiveView] = useState('analyzer'); // 'analyzer' | 'multi-job' | 'rewriter' | 'history' | 'admin'

  // Auth State
  const [token, setToken] = useState(localStorage.getItem('resumex_token') || null);
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState(null);

  // System Health
  const [systemStatus, setSystemStatus] = useState(null);

  // Resume Analysis State
  const [file, setFile] = useState(null);
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState(null);
  const [analysisTab, setAnalysisTab] = useState('overview');
  const [interviewFilter, setInterviewFilter] = useState('All');
  const fileInputRef = useRef(null);

  // Section Rewriter State
  const [rewriterSection, setRewriterSection] = useState('summary');
  const [rewriterOriginal, setRewriterOriginal] = useState('');
  const [rewriterJD, setRewriterJD] = useState('');
  const [rewriterLoading, setRewriterLoading] = useState(false);
  const [rewriterResult, setRewriterResult] = useState(null);

  // Multi-Job State
  const [multiFile, setMultiFile] = useState(null);
  const [multiJobs, setMultiJobs] = useState([
    { title: 'Full Stack Engineer', company: 'Apex Cloud', description: 'Requires Python, Flask, React, and SQL with Docker.' },
    { title: 'Frontend Specialist', company: 'Nova UI', description: 'Requires React, TypeScript, Tailwind CSS, Next.js.' }
  ]);
  const [multiLoading, setMultiLoading] = useState(false);
  const [multiResult, setMultiResult] = useState(null);

  // History State
  const [historyList, setHistoryList] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historyLoading, setHistoryLoading] = useState(false);

  // Admin State
  const [adminStats, setAdminStats] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setSystemStatus(data))
      .catch((err) => console.log('Backend health note:', err));
  }, []);

  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Expired');
        })
        .then((data) => setUser(data.user))
        .catch(() => {
          localStorage.removeItem('resumex_token');
          setToken(null);
          setUser(null);
        });
    }
  }, [token]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auth failed');

      localStorage.setItem('resumex_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setShowAuthModal(false);
      setAuthForm({ name: '', email: '', password: '' });
      showToast(`Welcome, ${data.user.name}!`);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('resumex_token');
    setToken(null);
    setUser(null);
    setActiveView('analyzer');
    showToast('Logged out successfully.');
  };

  const handleFileSelect = (selected) => {
    if (!selected) return;
    const name = selected.name.toLowerCase();
    if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
      setErrorMsg('Supported formats are PDF (.pdf) and Word (.docx).');
      return;
    }
    setFile(selected);
    setErrorMsg(null);
  };

  const loadExampleRole = () => {
    setJobTitle('Full Stack AI Engineer');
    setCompanyName('TechForward Corp');
    setJobDescription(
`Role Overview:
TechForward is seeking a Full Stack Software Engineer to build intelligent web applications and AI-driven interfaces.

Key Responsibilities:
- Design, build, and deploy robust backend services using Python and Flask.
- Develop interactive, responsive web frontends using modern React.js.
- Optimize relational database queries in PostgreSQL / MySQL.
- Integrate Generative AI models (Gemini / LLMs) and architect real-time endpoints.
- Package and deploy applications using Docker and Kubernetes.

Requirements:
- Strong programming experience in Python, Flask, and React.
- Working knowledge of SQL, REST API architecture, and microservices.
- Experience with Git, testing frameworks, and containerization.`
    );
    setErrorMsg(null);
  };

  const handleAnalyzeSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!file) {
      setErrorMsg('Please upload a resume in PDF or DOCX format.');
      return;
    }
    if (!jobDescription || jobDescription.trim().length < 15) {
      setErrorMsg('Please provide a job description (at least 15 characters).');
      return;
    }

    setIsAnalyzing(true);
    setCurrentAnalysis(null);
    setAnalysisStage('Extracting document text (pypdf/OCR/docx)...');

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('job_description', jobDescription);
    if (jobTitle) formData.append('job_title', jobTitle);
    if (companyName) formData.append('company_name', companyName);

    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers,
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed.');

      setCurrentAnalysis(data.analysis);
      setCurrentAnalysisId(data.analysis_id);
      showToast('Resume analysis completed successfully!');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400 stroke-emerald-400';
    if (score >= 60) return 'text-amber-400 stroke-amber-400';
    return 'text-rose-400 stroke-rose-400';
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm flex items-center gap-2 ${
          toast.type === 'error' ? 'bg-rose-950/90 border-rose-700 text-rose-200' : 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Navbar */}
      <header className={`border-b sticky top-0 z-40 backdrop-blur-md ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveView('analyzer')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight">ResumeX Platform</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Gemini Flash
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Advanced AI Resume & Career Guidance System</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
            <button
              onClick={() => setActiveView('analyzer')}
              className={`px-3 py-1.5 rounded-lg transition ${activeView === 'analyzer' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
            >
              ATS Analyzer
            </button>
            <button
              onClick={() => setActiveView('multi-job')}
              className={`px-3 py-1.5 rounded-lg transition ${activeView === 'multi-job' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
            >
              Multi-Job Compare
            </button>
            <button
              onClick={() => setActiveView('rewriter')}
              className={`px-3 py-1.5 rounded-lg transition ${activeView === 'rewriter' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
            >
              Section Rewriter
            </button>
          </nav>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-amber-300"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {user ? (
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold">{user.name}</span>
                <button
                  onClick={handleLogout}
                  className="text-xs px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                className="text-xs px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-grow">
        
        {/* ATS Analyzer View */}
        {activeView === 'analyzer' && (
          <div>
            <div className="text-center max-w-3xl mx-auto mb-10">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Professional ATS Resume & Skill Gap Analysis
              </h2>
              <p className="mt-3 text-sm text-slate-400">
                Upload your resume in <strong>PDF</strong> or <strong>DOCX</strong> format to evaluate compatibility scores, detect missing skills with comprehensive study plans, and generate targeted interview questions.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
                <span>⚠️ {errorMsg}</span>
                <button onClick={() => setErrorMsg(null)}>✕</button>
              </div>
            )}

            <form onSubmit={handleAnalyzeSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-base">1. Upload Candidate Resume</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      PDF • DOCX • OCR
                    </span>
                  </div>

                  <div
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-8 text-center cursor-pointer transition"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => handleFileSelect(e.target.files?.[0])}
                      accept=".pdf,.docx"
                      className="hidden"
                    />
                    {file ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                        <span className="font-bold text-sm text-emerald-400 truncate max-w-xs">{file.name}</span>
                        <span className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <UploadCloud className="w-8 h-8 text-indigo-400 mb-2" />
                        <span className="font-semibold text-sm">Drag & drop resume PDF or DOCX</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400 flex justify-between">
                  <span>pypdf • Tesseract OCR • python-docx</span>
                  <span>Max: 16 MB</span>
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-base">2. Target Job Description</h3>
                    <button type="button" onClick={loadExampleRole} className="text-xs text-indigo-400 hover:underline">
                      Load Example Role
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input
                      type="text"
                      placeholder="Job Title"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                    <input
                      type="text"
                      placeholder="Company"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    />
                  </div>

                  <textarea
                    rows={5}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste job description requirements..."
                    className="w-full text-xs p-3 rounded-xl bg-slate-950 border border-slate-700 text-white resize-none"
                  />
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-500">{jobDescription.length} chars</span>
                  <button
                    type="submit"
                    disabled={isAnalyzing}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow transition disabled:opacity-50"
                  >
                    {isAnalyzing ? 'Analyzing with Gemini...' : 'Run Advanced Analysis →'}
                  </button>
                </div>
              </div>
            </form>

            {/* Results */}
            {currentAnalysis && (
              <div className="space-y-8">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{currentAnalysis.job_title} @ {currentAnalysis.company_name}</h3>
                    <p className="text-xs text-slate-400">{currentAnalysis.resume_filename}</p>
                  </div>
                  {currentAnalysisId && (
                    <a
                      href={`/api/report/${currentAnalysisId}/download${token ? `?token=${token}` : ''}`}
                      download
                      className="text-xs px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF Report</span>
                    </a>
                  )}
                </div>

                {/* Score Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center flex flex-col items-center justify-center">
                    <span className="text-xs uppercase font-bold text-slate-400 mb-2">Overall ATS Score</span>
                    <span className="text-4xl font-extrabold text-indigo-400">
                      {currentAnalysis.ats_breakdown?.overall_ats_score || currentAnalysis.match_score}%
                    </span>
                    <p className="text-xs text-slate-400 mt-2">
                      {currentAnalysis.ats_breakdown?.scoring_methodology_note}
                    </p>
                  </div>

                  <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                    <h4 className="font-bold text-base mb-2">ATS Dimension Breakdown</h4>
                    {[
                      { label: 'Job Description Matching', val: currentAnalysis.ats_breakdown?.jd_matching_score || 0 },
                      { label: 'Technical Skills Coverage', val: currentAnalysis.ats_breakdown?.technical_skills_score || 0 },
                      { label: 'Experience Relevance', val: currentAnalysis.ats_breakdown?.experience_relevance_score || 0 },
                      { label: 'Keyword Density', val: currentAnalysis.ats_breakdown?.keyword_optimization_score || 0 },
                    ].map((d, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span>{d.label}</span>
                          <span className="font-bold">{d.val}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${d.val}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skills */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h4 className="font-bold text-base mb-3 text-emerald-400">Matching Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {currentAnalysis.matching_skills?.map((s, idx) => (
                        <span key={idx} className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs">
                          ✓ {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h4 className="font-bold text-base mb-3 text-rose-400">Missing Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {currentAnalysis.missing_skills?.map((item, idx) => (
                        <span key={idx} className="px-3 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs">
                          ✕ {typeof item === 'object' ? item.name : item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>Generative AI-Based Resume and Job Description Analysis Platform • Powered by Google Gemini</p>
      </footer>
    </div>
  );
}
