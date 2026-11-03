const {
  useState,
  useEffect,
  useRef
} = React;
function App() {
  const [isDark, setIsDark] = useState(true);

  // Navigation: 'analyzer' | 'multi-job' | 'rewriter' | 'history' | 'admin'
  const [activeView, setActiveView] = useState('analyzer');

  // Mode: 'job_description' (Mode A) | 'career_goal' (Mode B)
  const [analysisMode, setAnalysisMode] = useState('job_description');

  // Auth State
  const [token, setToken] = useState(localStorage.getItem('resumex_token') || null);
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [authError, setAuthError] = useState(null);

  // System & API Key State
  const [systemStatus, setSystemStatus] = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [keyModel, setKeyModel] = useState('gemini-2.5-flash');
  const [keyTesting, setKeyTesting] = useState(false);
  const [keyError, setKeyError] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Resume Analyzer State
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

  // Resume Extraction Preview State (Phase 3)
  const [extractionPreview, setExtractionPreview] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [showRawTextPreview, setShowRawTextPreview] = useState(false);

  // Section Rewriter State
  const [rewriterSection, setRewriterSection] = useState('summary');
  const [rewriterOriginal, setRewriterOriginal] = useState('');
  const [rewriterJD, setRewriterJD] = useState('');
  const [rewriterLoading, setRewriterLoading] = useState(false);
  const [rewriterResult, setRewriterResult] = useState(null);

  // Multi-Job State
  const [multiFile, setMultiFile] = useState(null);
  const [multiJobs, setMultiJobs] = useState([{
    title: 'Full Stack Engineer',
    company: 'Apex Cloud',
    description: 'Requires Python, Flask, React, and SQL with Docker experience.'
  }, {
    title: 'Frontend Specialist',
    company: 'Nova UI',
    description: 'Requires React, TypeScript, Tailwind CSS, Next.js, and GraphQL.'
  }]);
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

  // Toast feedback
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({
      message,
      type
    });
    setTimeout(() => setToast(null), 3500);
  };

  // Sync theme
  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');
  }, [isDark]);

  // Check health & model
  const refreshHealth = () => {
    fetch('/api/health').then(res => res.json()).then(data => {
      setSystemStatus(data);
      if (data.model) setKeyModel(data.model);
    }).catch(err => console.log('Health check note:', err));
  };
  useEffect(() => {
    refreshHealth();
  }, []);

  // Check user session
  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }).then(res => {
        if (res.ok) return res.json();
        throw new Error('Expired');
      }).then(data => setUser(data.user)).catch(() => {
        localStorage.removeItem('resumex_token');
        setToken(null);
        setUser(null);
      });
    }
  }, [token]);

  // Save API Key Handler (Phase 2)
  const handleSaveApiKey = async e => {
    e.preventDefault();
    setKeyError(null);
    if (!keyInput || keyInput.trim().length < 10) {
      setKeyError('Please paste a valid Gemini API key from Google AI Studio.');
      return;
    }
    setKeyTesting(true);
    try {
      const res = await fetch('/api/config/key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gemini_api_key: keyInput.trim(),
          model: keyModel
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to verify key');
      showToast(`Success! Gemini API Key verified with model '${data.active_model}'.`);
      setShowKeyModal(false);
      setKeyInput('');
      refreshHealth();
    } catch (err) {
      setKeyError(err.message);
    } finally {
      setKeyTesting(false);
    }
  };

  const handleEnableDemoMode = async () => {
    setKeyTesting(true);
    setKeyError(null);
    try {
      const res = await fetch('/api/config/demo-mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          enable: true
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to enable demo mode');
      showToast('Academic Demo Mode activated! Full ATS analysis is enabled offline.');
      setShowKeyModal(false);
      refreshHealth();
    } catch (err) {
      setKeyError(err.message);
    } finally {
      setKeyTesting(false);
    }
  };

  // File Upload & Automatic Preview Extraction (Phase 3)
  const handleFileSelect = async selected => {
    if (!selected) return;
    const name = selected.name.toLowerCase();
    if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
      setErrorMsg('Supported formats are PDF (.pdf) and Microsoft Word (.docx).');
      return;
    }
    setFile(selected);
    setErrorMsg(null);
    setExtracting(true);
    setExtractionPreview(null);
    const formData = new FormData();
    formData.append('resume', selected);
    try {
      const res = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');
      setExtractionPreview(data.parsed);
      showToast('Resume parsed successfully! Preview available below.');
    } catch (err) {
      console.warn('Preview note:', err);
    } finally {
      setExtracting(false);
    }
  };

  // Preset role loaders
  const loadExampleRole = () => {
    setAnalysisMode('job_description');
    setJobTitle('Full Stack AI Engineer');
    setCompanyName('TechForward Corp');
    setJobDescription(`Role Overview:
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
- Experience with Git, testing frameworks, and containerization.`);
    setErrorMsg(null);
  };
  const loadCareerGoalExample = goalText => {
    setAnalysisMode('career_goal');
    setJobDescription(goalText);
    setJobTitle(goalText.replace(/^(i\s+want\s+to\s+become\s+a\s+|i\s+want\s+to\s+become\s+an\s+)/i, ''));
    setCompanyName('Industry Track');
    setErrorMsg(null);
  };

  // Main Analysis Submit
  const handleAnalyzeSubmit = async e => {
    e.preventDefault();
    setErrorMsg(null);
    if (!file) {
      setErrorMsg('Please upload a resume in PDF or DOCX format.');
      return;
    }
    if (!jobDescription || jobDescription.trim().length < 5) {
      setErrorMsg('Please enter a target job description or career goal.');
      return;
    }
    setIsAnalyzing(true);
    setCurrentAnalysis(null);
    setAnalysisStage('Extracting document text & verifying structure...');
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('job_description', jobDescription);
    formData.append('analysis_mode', analysisMode);
    if (jobTitle) formData.append('job_title', jobTitle);
    if (companyName) formData.append('company_name', companyName);
    const timer1 = setTimeout(() => {
      setAnalysisStage(analysisMode === 'career_goal' ? 'Synthesizing 2026 industry benchmarks & target role progression...' : 'Computing weighted ATS score (Tech 40%, Exp 25%, Keywords 20%, Edu 15%)...');
    }, 1200);
    const timer2 = setTimeout(() => {
      setAnalysisStage('Mapping 4-way skill gaps, learning roadmap & interview questions...');
    }, 3000);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers,
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.can_switch_mode) {
          setErrorMsg(data.error);
          setIsAnalyzing(false);
          clearTimeout(timer1);
          clearTimeout(timer2);
          return;
        }
        throw new Error(data.error || 'Analysis failed.');
      }
      setCurrentAnalysis(data.analysis);
      setCurrentAnalysisId(data.analysis_id);
      showToast('Analysis completed successfully!');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsAnalyzing(false);
    }
  };
  const handleToggleBookmark = id => {
    if (!token) {
      showToast('Please log in to save and bookmark reports.', 'info');
      return;
    }
    fetch(`/api/history/${id}/toggle-save`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).then(res => res.json()).then(data => {
      if (data.success) {
        showToast(data.is_saved ? 'Report saved to your bookmarks!' : 'Report removed from saved.');
        if (activeView === 'history') fetchHistory(historyFilter);
      }
    });
  };
  const getScoreColor = score => {
    if (score >= 80) return 'text-emerald-400 stroke-emerald-400';
    if (score >= 60) return 'text-amber-400 stroke-amber-400';
    return 'text-rose-400 stroke-rose-400';
  };
  
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

  return /*#__PURE__*/React.createElement("div", {
    className: `min-h-screen flex flex-col ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`
  }, toast && /*#__PURE__*/React.createElement("div", {
    className: `fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm flex items-center gap-2 ${toast.type === 'error' ? 'bg-rose-950/90 border-rose-700 text-rose-200' : 'bg-emerald-950/90 border-emerald-700 text-emerald-200'}`
  }, /*#__PURE__*/React.createElement("span", null, toast.message)), systemStatus && !systemStatus.api_key_configured && !bannerDismissed && /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-amber-600/90 via-orange-600/90 to-amber-700/90 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 max-w-4xl mx-auto"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-base"
  }, "\u26A0\uFE0F"), /*#__PURE__*/React.createElement("span", null, "Google Gemini API Key is not configured. To enable real-time Generative AI resume analysis, add your key."), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowKeyModal(true),
    className: "ml-3 px-3 py-1 rounded bg-white text-slate-900 font-bold hover:bg-slate-100 transition shadow"
  }, "Configure API Key (1-Click)")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setBannerDismissed(true),
    className: "text-white/80 hover:text-white px-2 py-0.5 rounded hover:bg-white/10 text-sm font-bold ml-2",
    title: "Dismiss banner"
  }, "\u2715")), /*#__PURE__*/React.createElement("header", {
    className: `border-b sticky top-0 z-40 backdrop-blur-md ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-3 cursor-pointer",
    onClick: () => setActiveView('analyzer')
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-white font-extrabold text-lg"
  }, "RX")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-extrabold text-base tracking-tight"
  }, "ResumeX Platform"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
  }, systemStatus?.model || 'Gemini Flash')), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-400"
  }, "RAG-Enhanced Generative AI Resume & Job Description Analysis Platform"))), /*#__PURE__*/React.createElement("nav", {
    className: "hidden md:flex items-center space-x-1 text-sm font-medium"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setActiveView('analyzer'),
    className: `px-3 py-1.5 rounded-lg transition ${activeView === 'analyzer' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'}`
  }, "Resume & JD Analyzer"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setActiveView('multi-job'),
    className: `px-3 py-1.5 rounded-lg transition ${activeView === 'multi-job' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'}`
  }, "Multi-Job Compare"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setActiveView('rewriter'),
    className: `px-3 py-1.5 rounded-lg transition ${activeView === 'rewriter' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'}`
  }, "Section Rewriter"), /*#__PURE__*/React.createElement("button", {
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
  }, "My History")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowKeyModal(true),
    title: "Configure Gemini API Key",
    className: `text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition ${systemStatus?.api_key_configured ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' : 'border-amber-500/40 text-amber-300 hover:bg-amber-500/10'}`
  }, /*#__PURE__*/React.createElement("span", null, "\u2699\uFE0F"), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, systemStatus?.api_key_configured ? 'API Key Active' : 'Set API Key')), /*#__PURE__*/React.createElement("button", {
    onClick: () => setIsDark(!isDark),
    className: "p-2 rounded-xl border border-slate-700 bg-slate-800 text-amber-300"
  }, isDark ? '☀️' : '🌙'), user ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold"
  }, user.name), /*#__PURE__*/React.createElement("button", {
    onClick: handleLogout,
    className: "text-xs px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition"
  }, "Logout")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setAuthMode('login');
      setShowAuthModal(true);
    },
    className: "text-xs px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow"
  }, "Sign In")))), /*#__PURE__*/React.createElement("main", {
    className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-grow"
  }, activeView === 'analyzer' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-center max-w-3xl mx-auto mb-8"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl sm:text-4xl font-extrabold tracking-tight"
  }, "Generative AI Resume & Job Analysis Platform"), /*#__PURE__*/React.createElement("p", {
    className: "mt-3 text-sm text-slate-400"
  }, "Upload your resume in ", /*#__PURE__*/React.createElement("strong", null, "PDF"), " or ", /*#__PURE__*/React.createElement("strong", null, "DOCX"), " format to evaluate compatibility scores, detect missing skills with comprehensive study plans, and generate targeted interview questions.")), /*#__PURE__*/React.createElement("div", {
    className: "max-w-xl mx-auto mb-8 p-1.5 rounded-xl bg-slate-900 border border-slate-800 flex text-xs font-bold"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setAnalysisMode('job_description'),
    className: `flex-1 py-2 rounded-lg transition flex items-center justify-center gap-2 ${analysisMode === 'job_description' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`
  }, /*#__PURE__*/React.createElement("span", null, "\uD83C\uDFE2"), /*#__PURE__*/React.createElement("span", null, "Mode A: Specific Job Description")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAnalysisMode('career_goal'),
    className: `flex-1 py-2 rounded-lg transition flex items-center justify-center gap-2 ${analysisMode === 'career_goal' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`
  }, /*#__PURE__*/React.createElement("span", null, "\uD83C\uDFAF"), /*#__PURE__*/React.createElement("span", null, "Mode B: Career Goal & Role Readiness"))), errorMsg && /*#__PURE__*/React.createElement("div", {
    className: "mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start justify-between"
  }, /*#__PURE__*/React.createElement("span", null, "\u26A0\uFE0F ", errorMsg), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, errorMsg.includes('Mode B') && /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setAnalysisMode('career_goal');
      setErrorMsg(null);
    },
    className: "px-2.5 py-1 rounded bg-purple-600 text-white text-xs font-bold"
  }, "Switch to Mode B \u2192"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setErrorMsg(null)
  }, "\u2715"))), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleAnalyzeSubmit,
    className: "grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-900/70 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-base"
  }, "1. Upload Candidate Resume"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
  }, "PDF \u2022 DOCX \u2022 OCR")), /*#__PURE__*/React.createElement("div", {
    onClick: () => fileInputRef.current && fileInputRef.current.click(),
    className: "border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-8 text-center cursor-pointer transition"
  }, /*#__PURE__*/React.createElement("input", {
    type: "file",
    ref: fileInputRef,
    onChange: e => handleFileSelect(e.target.files?.[0]),
    accept: ".pdf,.docx",
    className: "hidden"
  }), file ? /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-3xl mb-1"
  }, "\uD83D\uDCC4"), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-sm text-emerald-400 truncate max-w-xs"
  }, file.name), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400 mt-1"
  }, (file.size / 1024).toFixed(1), " KB \u2022 Click to re-upload")) : /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-3xl mb-2 text-indigo-400"
  }, "\uD83D\uDCE4"), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-sm"
  }, "Drag & drop resume PDF or DOCX")))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400 flex justify-between"
  }, /*#__PURE__*/React.createElement("span", null, "Engine: ", /*#__PURE__*/React.createElement("strong", null, "pypdf + python-docx + Tesseract")), /*#__PURE__*/React.createElement("span", null, "Max size: ", /*#__PURE__*/React.createElement("strong", null, "16 MB")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-900/70 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-base"
  }, analysisMode === 'career_goal' ? '2. Target Career Goal' : '2. Target Job Description'), analysisMode === 'job_description' ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: loadExampleRole,
    className: "text-xs text-indigo-400 hover:underline"
  }, "Auto-fill Full Stack Example") : /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-purple-400 font-semibold"
  }, "Role Progression Guidance")), analysisMode === 'career_goal' && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5 mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-slate-400 font-medium"
  }, "Quick suggestions:"), ['AI / ML Engineer', 'Full Stack Developer', 'Cloud DevOps Specialist', 'Data Scientist'].map(goal => /*#__PURE__*/React.createElement("button", {
    key: goal,
    type: "button",
    onClick: () => loadCareerGoalExample(`I want to become a ${goal}`),
    className: "px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px] hover:bg-purple-500/20 transition"
  }, goal))), analysisMode === 'job_description' && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3 mb-3"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Job Title (Optional)",
    value: jobTitle,
    onChange: e => setJobTitle(e.target.value),
    className: "text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
  }), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Company (Optional)",
    value: companyName,
    onChange: e => setCompanyName(e.target.value),
    className: "text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white"
  })), /*#__PURE__*/React.createElement("textarea", {
    rows: analysisMode === 'career_goal' ? 4 : 5,
    value: jobDescription,
    onChange: e => setJobDescription(e.target.value),
    placeholder: analysisMode === 'career_goal' ? "Enter your target career goal or dream role (e.g., 'I want to become an AI Engineer specializing in LLMs and deep learning')..." : "Paste company job responsibilities, technical requirements, qualifications, and stack...",
    className: "w-full text-xs p-3 rounded-xl bg-slate-950 border border-slate-700 text-white resize-none"
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-500"
  }, jobDescription.length, " chars"), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: isAnalyzing,
    className: `px-6 py-2.5 rounded-xl text-white font-semibold text-sm shadow transition disabled:opacity-50 ${analysisMode === 'career_goal' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'}`
  }, isAnalyzing ? 'Analyzing with Gemini...' : analysisMode === 'career_goal' ? 'Analyze Career Readiness →' : 'Run Advanced ATS Analysis →')))), extracting && /*#__PURE__*/React.createElement("div", {
    className: "p-4 rounded-xl border border-indigo-500/30 bg-slate-900/60 text-xs text-indigo-300 flex items-center gap-2 mb-8 animate-pulse"
  }, /*#__PURE__*/React.createElement("span", null, "\u2699\uFE0F"), /*#__PURE__*/React.createElement("span", null, "Extracting candidate contact details and segmenting resume sections...")), extractionPreview && !extracting && /*#__PURE__*/React.createElement("div", {
    className: "p-5 mb-8 rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl space-y-4 animate-fade-in"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-base"
  }, "\uD83D\uDCCB"), /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-sm text-white"
  }, "Resume Document Extraction Preview"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold"
  }, extractionPreview.extraction_method)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowRawTextPreview(!showRawTextPreview),
    className: "text-xs text-indigo-400 hover:underline"
  }, showRawTextPreview ? 'Hide Raw Text' : 'View Raw Extracted Text')), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2 text-xs"
  }, extractionPreview.contact_info?.name && /*#__PURE__*/React.createElement("span", {
    className: "px-3 py-1 rounded-lg bg-slate-800 text-slate-200"
  }, "\uD83D\uDC64 ", /*#__PURE__*/React.createElement("strong", null, extractionPreview.contact_info.name)), extractionPreview.contact_info?.email && /*#__PURE__*/React.createElement("span", {
    className: "px-3 py-1 rounded-lg bg-slate-800 text-slate-200"
  }, "\u2709\uFE0F ", extractionPreview.contact_info.email), extractionPreview.contact_info?.phone && /*#__PURE__*/React.createElement("span", {
    className: "px-3 py-1 rounded-lg bg-slate-800 text-slate-200"
  }, "\uD83D\uDCDE ", extractionPreview.contact_info.phone), /*#__PURE__*/React.createElement("span", {
    className: "px-3 py-1 rounded-lg bg-slate-800 text-slate-400"
  }, "\uD83D\uDCCA ", extractionPreview.word_count, " words (", extractionPreview.character_count, " chars)")), extractionPreview.categorized_skills && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-xs"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", {
    className: "text-slate-400 block mb-1"
  }, "Languages:"), /*#__PURE__*/React.createElement("span", {
    className: "text-indigo-300"
  }, extractionPreview.categorized_skills.programming_languages?.join(', ') || 'None detected')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", {
    className: "text-slate-400 block mb-1"
  }, "Frameworks:"), /*#__PURE__*/React.createElement("span", {
    className: "text-indigo-300"
  }, extractionPreview.categorized_skills.frameworks_and_libraries?.join(', ') || 'None detected')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", {
    className: "text-slate-400 block mb-1"
  }, "Databases:"), /*#__PURE__*/React.createElement("span", {
    className: "text-indigo-300"
  }, extractionPreview.categorized_skills.databases?.join(', ') || 'None detected')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("strong", {
    className: "text-slate-400 block mb-1"
  }, "Tools & Cloud:"), /*#__PURE__*/React.createElement("span", {
    className: "text-indigo-300"
  }, extractionPreview.categorized_skills.cloud_and_tools?.join(', ') || 'None detected'))), showRawTextPreview && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 max-h-48 overflow-y-auto text-xs text-slate-300 font-mono custom-scrollbar"
  }, /*#__PURE__*/React.createElement("pre", {
    className: "whitespace-pre-wrap"
  }, extractionPreview.extracted_text))), isAnalyzing && /*#__PURE__*/React.createElement("div", {
    className: "p-8 rounded-2xl border border-indigo-500/30 bg-slate-900 text-center max-w-xl mx-auto my-8 shadow-2xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 mx-auto mb-3 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 animate-spin text-xl"
  }, "\u2699\uFE0F"), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-lg mb-1"
  }, "Evaluating Resume with Gemini Flash"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-indigo-400 font-medium animate-pulse"
  }, analysisStage)), currentAnalysis && !isAnalyzing && /*#__PURE__*/React.createElement("div", {
    className: "space-y-8 animate-fade-in"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
  }, currentAnalysis.analysis_mode === 'career_goal' ? 'Mode B: Career Readiness' : 'Mode A: ATS Evaluation'), /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold"
  }, currentAnalysis.job_title, " @ ", currentAnalysis.company_name)), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mt-0.5"
  }, "File: ", currentAnalysis.resume_filename)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, currentAnalysisId && /*#__PURE__*/React.createElement("button", {
    onClick: () => handleToggleBookmark(currentAnalysisId),
    className: "text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
  }, "\u2B50 Bookmark Report"), currentAnalysisId && /*#__PURE__*/React.createElement("a", {
    href: `/api/report/${currentAnalysisId}/download${token ? `?token=${token}` : ''}`,
    download: true,
    className: "text-xs px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 shadow"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCE5"), /*#__PURE__*/React.createElement("span", null, "Download PDF Report")))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-3 gap-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center flex flex-col items-center justify-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs uppercase font-bold text-slate-400 mb-2"
  }, currentAnalysis.analysis_mode === 'career_goal' ? 'Career Readiness Score' : 'Overall ATS Score'), /*#__PURE__*/React.createElement("div", {
    className: "relative w-36 h-36 flex items-center justify-center my-2"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-full h-full transform -rotate-90",
    viewBox: "0 0 36 36"
  }, /*#__PURE__*/React.createElement("path", {
    className: "text-slate-800",
    strokeWidth: "3.5",
    stroke: "currentColor",
    fill: "none",
    d: "M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
  }), /*#__PURE__*/React.createElement("path", {
    className: `${getScoreColor(currentAnalysis.match_score)} transition-all duration-1000 ease-out`,
    strokeDasharray: `${currentAnalysis.match_score}, 100`,
    strokeWidth: "3.5",
    strokeLinecap: "round",
    stroke: "currentColor",
    fill: "none",
    d: "M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
  })), /*#__PURE__*/React.createElement("div", {
    className: "absolute flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-3xl font-extrabold"
  }, currentAnalysis.match_score, "%"), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-slate-400"
  }, "Weighted Match"))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 max-w-xs mt-2"
  }, currentAnalysis.ats_breakdown?.scoring_methodology_note)), /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 flex flex-col justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-base"
  }, "Weighted Scoring Breakdown"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-indigo-400 font-mono"
  }, "Tech 40% + Exp 25% + Kw 20% + Edu 15%")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, [{
    label: 'Technical Skills Relevance (Weight: 40%)',
    val: currentAnalysis.ats_breakdown?.technical_skills_score || 0,
    color: 'bg-emerald-500'
  }, {
    label: 'Experience & Project Depth (Weight: 25%)',
    val: currentAnalysis.ats_breakdown?.experience_relevance_score || 0,
    color: 'bg-indigo-500'
  }, {
    label: 'Keyword Optimization (Weight: 20%)',
    val: currentAnalysis.ats_breakdown?.keyword_optimization_score || 0,
    color: 'bg-amber-500'
  }, {
    label: 'Education & Credentials (Weight: 15%)',
    val: currentAnalysis.ats_breakdown?.education_relevance_score || 0,
    color: 'bg-purple-500'
  }].map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-xs mb-1"
  }, /*#__PURE__*/React.createElement("span", null, d.label), /*#__PURE__*/React.createElement("span", {
    className: "font-bold"
  }, d.val, "%")), /*#__PURE__*/React.createElement("div", {
    className: "w-full h-2 rounded-full bg-slate-800 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: `h-full rounded-full transition-all duration-700 ${d.color}`,
    style: {
      width: `${d.val}%`
    }
  })))))), currentAnalysis.ats_breakdown?.formatting_feedback && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400"
  }, /*#__PURE__*/React.createElement("span", null, "Readability Index: ", /*#__PURE__*/React.createElement("strong", {
    className: "text-indigo-400"
  }, currentAnalysis.ats_breakdown.formatting_feedback.readability_score || 88, "/100")), /*#__PURE__*/React.createElement("span", null, "ATS Verdict: ", /*#__PURE__*/React.createElement("strong", {
    className: "text-emerald-400"
  }, currentAnalysis.ats_breakdown.formatting_feedback.ats_safety_verdict || 'High Pass Likelihood'))))), currentAnalysis.recommended_entry_roles?.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "p-6 rounded-2xl bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/30"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-base text-white mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDE80"), /*#__PURE__*/React.createElement("span", null, "Recommended Entry-Level & Stepping-Stone Roles")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-3 gap-3"
  }, currentAnalysis.recommended_entry_roles.map((r, ri) => /*#__PURE__*/React.createElement("div", {
    key: ri,
    className: "p-3 rounded-xl bg-slate-900/80 border border-purple-500/20 text-xs"
  }, /*#__PURE__*/React.createElement("strong", {
    className: "text-purple-300 block mb-1"
  }, r.role_title), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-300"
  }, r.description))))), /*#__PURE__*/React.createElement("div", {
    className: "flex border-b border-slate-800 space-x-6 text-sm font-semibold"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setAnalysisTab('overview'),
    className: `pb-3 border-b-2 transition ${analysisTab === 'overview' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'}`
  }, "Overview & Strengths"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAnalysisTab('skills'),
    className: `pb-3 border-b-2 transition ${analysisTab === 'skills' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'}`
  }, "Skills Matrix & Deep-Dive"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAnalysisTab('roadmap'),
    className: `pb-3 border-b-2 transition ${analysisTab === 'roadmap' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'}`
  }, "Personalized Roadmap (", currentAnalysis.learning_roadmap?.length || 0, ")"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAnalysisTab('interview'),
    className: `pb-3 border-b-2 transition ${analysisTab === 'interview' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'}`
  }, "Interview Preparation (", currentAnalysis.interview_questions?.length || 0, ")"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAnalysisTab('rag'),
    className: `pb-3 border-b-2 transition flex items-center gap-1.5 ${analysisTab === 'rag' ? 'border-indigo-500 text-indigo-400 font-bold' : 'border-transparent text-slate-400'}`
  }, /*#__PURE__*/React.createElement("span", null, "\uD83E\uDDE0"), " RAG Vector Explorer (", currentAnalysis.rag_metadata?.semantic_matches?.length || 0, ")")), analysisTab === 'overview' && /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-6 rounded-2xl bg-slate-900 border border-slate-800"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-base mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83C\uDFAF"), /*#__PURE__*/React.createElement("span", null, "Role Requirements Summary")), /*#__PURE__*/React.createElement("p", {
    className: "text-sm leading-relaxed text-slate-300"
  }, currentAnalysis.job_requirements_summary)), /*#__PURE__*/React.createElement("div", {
    className: "p-6 rounded-2xl bg-slate-900 border border-slate-800"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-base mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\u2728"), /*#__PURE__*/React.createElement("span", null, "Verified Candidate Strengths")), /*#__PURE__*/React.createElement("ul", {
    className: "space-y-2 text-xs text-slate-300"
  }, currentAnalysis.resume_strengths?.map((str, idx) => /*#__PURE__*/React.createElement("li", {
    key: idx,
    className: "flex items-start gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-400 font-bold"
  }, "\u2713"), /*#__PURE__*/React.createElement("span", null, str))))), /*#__PURE__*/React.createElement("div", {
    className: "md:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-base mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCA1"), /*#__PURE__*/React.createElement("span", null, "Actionable Resume Improvement Recommendations")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3"
  }, currentAnalysis.improvement_suggestions?.map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-start gap-2.5 text-slate-300"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 font-bold flex items-center justify-center flex-shrink-0"
  }, idx + 1), /*#__PURE__*/React.createElement("span", null, item)))))), analysisTab === 'skills' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-6 rounded-2xl bg-slate-900 border border-slate-800"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-base text-emerald-400"
  }, "Verified Matching Skills"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold"
  }, currentAnalysis.matching_skills?.length || 0)), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, currentAnalysis.matching_skills?.map((s, idx) => /*#__PURE__*/React.createElement("span", {
    key: idx,
    className: "px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-medium"
  }, "\u2713 ", s)))), /*#__PURE__*/React.createElement("div", {
    className: "p-6 rounded-2xl bg-slate-900 border border-slate-800"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-base text-amber-400"
  }, "Partially Matching / Adjacent Skills"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold"
  }, currentAnalysis.partially_matching_skills?.length || 0)), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, currentAnalysis.partially_matching_skills?.length > 0 ? currentAnalysis.partially_matching_skills.map((s, idx) => /*#__PURE__*/React.createElement("span", {
    key: idx,
    className: "px-3 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-medium"
  }, "~ ", s)) : /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, "No partial skills detected.")))), /*#__PURE__*/React.createElement("div", {
    className: "p-6 rounded-2xl bg-slate-900 border border-slate-800"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-base mb-4 text-rose-400"
  }, "Missing Skill Gaps & Deep-Dive Study Plans"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, currentAnalysis.missing_skills?.map((item, idx) => {
    const isRich = typeof item === 'object';
    const name = isRich ? item.name : item;
    const importance = isRich ? item.importance : 'Required for core responsibilities.';
    const topics = isRich ? item.recommended_topics : [];
    const projects = isRich ? item.suggested_projects : [];
    const levels = isRich ? item.learning_levels : null;
    return /*#__PURE__*/React.createElement("div", {
      key: idx,
      className: "p-4 rounded-xl bg-slate-950 border border-slate-800"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center justify-between mb-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-bold text-sm text-rose-400"
    }, "\u2715 ", name), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20"
    }, "Skill Gap")), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-slate-300 mb-3"
    }, importance), topics?.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "text-xs mb-2"
    }, /*#__PURE__*/React.createElement("strong", {
      className: "text-slate-400"
    }, "Recommended Topics to Study:"), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1.5 mt-1"
    }, topics.map((t, ti) => /*#__PURE__*/React.createElement("span", {
      key: ti,
      className: "px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]"
    }, t)))), projects?.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "text-xs mb-2"
    }, /*#__PURE__*/React.createElement("strong", {
      className: "text-slate-400"
    }, "Hands-on Mini Projects:"), /*#__PURE__*/React.createElement("ul", {
      className: "list-disc list-inside mt-0.5 space-y-0.5 text-slate-300"
    }, projects.map((p, pi) => /*#__PURE__*/React.createElement("li", {
      key: pi
    }, p)))), levels && /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-2 border-t border-slate-800 text-[11px]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "p-2 rounded bg-slate-900"
    }, /*#__PURE__*/React.createElement("strong", {
      className: "text-emerald-400 block mb-0.5"
    }, "Beginner:"), /*#__PURE__*/React.createElement("span", {
      className: "text-slate-400"
    }, levels.beginner)), /*#__PURE__*/React.createElement("div", {
      className: "p-2 rounded bg-slate-900"
    }, /*#__PURE__*/React.createElement("strong", {
      className: "text-amber-400 block mb-0.5"
    }, "Intermediate:"), /*#__PURE__*/React.createElement("span", {
      className: "text-slate-400"
    }, levels.intermediate)), /*#__PURE__*/React.createElement("div", {
      className: "p-2 rounded bg-slate-900"
    }, /*#__PURE__*/React.createElement("strong", {
      className: "text-indigo-400 block mb-0.5"
    }, "Advanced:"), /*#__PURE__*/React.createElement("span", {
      className: "text-slate-400"
    }, levels.advanced))));
  })))), analysisTab === 'roadmap' && /*#__PURE__*/React.createElement("div", {
    className: "p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-base mb-4 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDDFA\uFE0F"), /*#__PURE__*/React.createElement("span", null, "Personalized Career Learning Roadmap")), currentAnalysis.learning_roadmap?.map((step, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-8 h-8 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center flex-shrink-0 text-sm shadow"
  }, step.step || idx + 1), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h5", {
    className: "font-bold text-sm text-white mb-1"
  }, step.skill_name, ": ", /*#__PURE__*/React.createElement("span", {
    className: "font-normal text-slate-300"
  }, step.objective)), step.topics?.length > 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mb-1"
  }, /*#__PURE__*/React.createElement("strong", null, "Topics:"), " ", step.topics.join(', ')), step.mini_project && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-indigo-300 font-medium"
  }, /*#__PURE__*/React.createElement("strong", null, "Mini-Project:"), " ", step.mini_project))), /*#__PURE__*/React.createElement("span", {
    className: "text-xs px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold whitespace-nowrap self-start"
  }, "\u23F1\uFE0F ", step.estimated_duration || '1-2 weeks')))), analysisTab === 'interview' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between pb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400 font-medium"
  }, "Filter Difficulty:"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, ['All', 'Easy', 'Medium', 'Hard'].map(lvl => /*#__PURE__*/React.createElement("button", {
    key: lvl,
    onClick: () => setInterviewFilter(lvl),
    className: `text-xs px-3 py-1 rounded-lg transition ${interviewFilter === lvl ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 text-slate-400'}`
  }, lvl)))), currentAnalysis.interview_questions?.filter(q => interviewFilter === 'All' || q.difficulty === interviewFilter).map((q, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "p-6 rounded-2xl bg-slate-900 border border-slate-800"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
  }, q.category || 'Technical'), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300"
  }, q.difficulty || 'Medium')), /*#__PURE__*/React.createElement("h5", {
    className: "font-bold text-base text-white mb-3"
  }, q.question), q.suggested_answer && /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 mb-2"
  }, /*#__PURE__*/React.createElement("strong", {
    className: "text-indigo-400 block mb-1"
  }, "\uD83D\uDCA1 Answer Strategy:"), q.suggested_answer), q.follow_up_question && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 italic"
  }, /*#__PURE__*/React.createElement("strong", null, "Follow-up:"), " \"", q.follow_up_question, "\""))))))), analysisTab === 'rag' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-4 mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "text-lg font-bold text-white flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83E\uDDE0"), /*#__PURE__*/React.createElement("span", null, "Hybrid RAG Semantic Retrieval & Vector Space")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mt-1"
  }, "Powered by LangChain Recursive Character Text Chunking, Gemini text-embedding-004, and ChromaDB vector collections.")), /*#__PURE__*/React.createElement("div", {
    className: "text-right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-2xl font-black text-indigo-400"
  }, (currentAnalysis.rag_metadata?.average_semantic_match_percentage || 0), "%"), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400 font-bold uppercase tracking-wider"
  }, "Mean Semantic Overlap"))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-xl bg-slate-950/60 border border-slate-800"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400 font-bold uppercase"
  }, "Vector DB"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-emerald-400 truncate"
  }, currentAnalysis.rag_metadata?.vector_database || "ChromaDB v1.5.9")), /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-xl bg-slate-950/60 border border-slate-800"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400 font-bold uppercase"
  }, "Embedding Model"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-indigo-400 truncate"
  }, currentAnalysis.rag_metadata?.embedding_model || "text-embedding-004")), /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-xl bg-slate-950/60 border border-slate-800"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400 font-bold uppercase"
  }, "Resume Chunks"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-white"
  }, (currentAnalysis.rag_metadata?.total_resume_chunks || 0), " Indexed")), /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-xl bg-slate-950/60 border border-slate-800"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400 font-bold uppercase"
  }, "JD Requirements"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-white"
  }, (currentAnalysis.rag_metadata?.total_jd_chunks || 0), " Embedded")))), /*#__PURE__*/React.createElement("div", {
    className: "p-6 rounded-2xl bg-slate-900 border border-slate-800"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-base text-white mb-4 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCCA"), /*#__PURE__*/React.createElement("span", null, "Evidentiary Alignment Matrix (Semantic Retrieval Results)")), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400 font-normal"
  }, "Thresholds: \u226572% Direct Match | \u226552% Partial")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, (currentAnalysis.rag_metadata?.semantic_matches || []).map((m, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: `p-4 rounded-xl border transition ${m.match_tier === 'Direct Match' ? 'bg-emerald-500/5 border-emerald-500/20' : m.match_tier === 'Partial Match' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-rose-500/5 border-rose-500/20'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-2 mb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300"
  }, m.category), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-xs text-white"
  }, m.requirement_text)), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] font-bold px-2 py-0.5 rounded-full ${m.match_tier === 'Direct Match' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : m.match_tier === 'Partial Match' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`
  }, m.match_tier), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-mono font-bold text-slate-300"
  }, m.similarity_percentage, "%"))), /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs mt-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-slate-400 font-semibold mb-1 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDD0D Top Retrieved Resume Evidence (Section: ", m.best_matched_section || 'general', "):"), m.best_matched_chunk_id && /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-slate-500"
  }, m.best_matched_chunk_id)), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-300 italic"
  }, "\"", m.evidence_text, "\"")))))), (currentAnalysis.rag_metadata?.resume_chunks_catalog?.length > 0) && /*#__PURE__*/React.createElement("div", {
    className: "p-6 rounded-2xl bg-slate-900 border border-slate-800"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-base text-white mb-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDDC2\uFE0F"), /*#__PURE__*/React.createElement("span", null, "Indexed Resume Vector Chunks (LangChain Recursive Chunks)")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mb-4"
  }, "These semantically segmented chunks are embedded into ChromaDB to allow similarity retrieval against company job requirements."), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar"
  }, currentAnalysis.rag_metadata.resume_chunks_catalog.map((c, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between text-[10px] text-slate-400 mb-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-mono font-bold text-indigo-400"
  }, c.chunk_id), /*#__PURE__*/React.createElement("span", {
    className: "px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold uppercase"
  }, c.section), /*#__PURE__*/React.createElement("span", null, c.char_length, " chars")), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-300 leading-relaxed"
  }, c.text)))))),
  activeView === 'multi-job' && ((() => {
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-8 animate-fadeIn"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center max-w-3xl mx-auto mb-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20 mb-3"
  }, /*#__PURE__*/React.createElement("span", null, "\u26A1"), " Multi-Job Fit Comparison & Opportunity Ranking"), /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl sm:text-4xl font-extrabold tracking-tight"
  }, "Multi-Job Description Comparison"), /*#__PURE__*/React.createElement("p", {
    className: "mt-3 text-sm text-slate-400"
  }, "Simultaneously evaluate your resume against 2 to 5 target job descriptions. The system computes qualification vectors, ranks roles by ATS compatibility, and identifies your highest-fit opening.")), /*#__PURE__*/React.createElement("div", {
    className: "max-w-4xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col sm:flex-row items-center justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-500/30"
  }, "\uD83D\uDCC4"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-bold text-slate-200"
  }, multiFile ? multiFile.name : file ? `Using uploaded resume: ${file.name}` : "No resume selected"), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-400"
  }, multiFile || file ? "Resume loaded and ready for comparative scoring." : "Upload a PDF or DOCX resume to compare across all target roles."))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "cursor-pointer px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold inline-flex items-center gap-2 transition"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCC1"), " ", multiFile || file ? "Change Resume" : "Upload Resume (PDF/DOCX)", /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: ".pdf,.docx",
    className: "hidden",
    onChange: e => {
      if (e.target.files && e.target.files[0]) {
        setMultiFile(e.target.files[0]);
        showToast("Resume uploaded for comparison: " + e.target.files[0].name);
      }
    }
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "max-w-4xl mx-auto space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-base font-bold text-slate-200"
  }, "Target Job Openings (", multiJobs.length, "/5)"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400"
  }, "Min 2, Max 5")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: loadMultiPreset,
    className: "text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition"
  }, "Load 3 Industry Roles"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: addMultiJobCard,
    disabled: multiJobs.length >= 5,
    className: "text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition disabled:opacity-40"
  }, "+ Add Role"))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-4"
  }, multiJobs.map((job, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 relative shadow-md"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 text-xs font-bold flex items-center justify-center border border-indigo-500/30"
  }, "#", idx + 1), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-300"
  }, "Job Opening #", idx + 1)), multiJobs.length > 2 && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => removeMultiJobCard(idx),
    className: "text-rose-400 hover:text-rose-300 text-xs font-semibold px-2 py-0.5 rounded hover:bg-rose-500/10 transition"
  }, "\u2715 Remove")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] font-bold text-slate-400 mb-1"
  }, "Job Title"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "e.g. Senior Backend Engineer",
    value: job.title,
    onChange: e => updateMultiJobCard(idx, 'title', e.target.value),
    className: "w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] font-bold text-slate-400 mb-1"
  }, "Company Name"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "e.g. Acme Cloud Corp",
    value: job.company,
    onChange: e => updateMultiJobCard(idx, 'company', e.target.value),
    className: "w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] font-bold text-slate-400 mb-1"
  }, "Job Description & Requirements"), /*#__PURE__*/React.createElement("textarea", {
    rows: 4,
    placeholder: "Paste responsibilities, required qualifications, and technical competencies...",
    value: job.description,
    onChange: e => updateMultiJobCard(idx, 'description', e.target.value),
    className: "w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 custom-scrollbar"
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "pt-4 text-center"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleMultiJobSubmit,
    disabled: multiLoading,
    className: "px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition disabled:opacity-50"
  }, multiLoading ? "Comparing Resume Across All Openings..." : "🚀 Compare Resume Against All Jobs (AI Ranking) →"))), multiResult && /*#__PURE__*/React.createElement("div", {
    className: "max-w-5xl mx-auto space-y-6 pt-6 border-t border-slate-800 animate-fadeIn"
  }, multiResult.best_match && /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 p-6 shadow-2xl relative overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 right-0 px-4 py-1.5 bg-gradient-to-l from-emerald-500 to-teal-600 text-slate-950 text-xs font-black uppercase tracking-wider rounded-bl-xl shadow-lg"
  }, "\uD83D\uDC51 Best Fit Opportunity"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-emerald-400 uppercase tracking-wider"
  }, "Top Recommendation"), /*#__PURE__*/React.createElement("h3", {
    className: "text-2xl font-extrabold text-white mt-1"
  }, multiResult.best_match.job_title), /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-slate-300 mt-0.5"
  }, multiResult.best_match.company_name), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-300 mt-3 max-w-2xl leading-relaxed"
  }, multiResult.best_match.recommendation_reason)), /*#__PURE__*/React.createElement("div", {
    className: "text-center bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 min-w-[130px] shadow-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-4xl font-black text-emerald-400"
  }, multiResult.best_match.match_score, "%"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-bold text-slate-400 mt-1 uppercase"
  }, "Match Synergy")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "text-lg font-bold text-slate-200 mb-4"
  }, "Comparative Role Breakdown (", multiResult.comparisons ? multiResult.comparisons.length : 0, " Roles)"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
  }, multiResult.comparisons && multiResult.comparisons.map((c, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4 flex flex-col justify-between shadow-lg"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400"
  }, "Role #", c.job_index || idx + 1), /*#__PURE__*/React.createElement("span", {
    className: `text-base font-black ${c.match_score >= 80 ? 'text-emerald-400' : c.match_score >= 65 ? 'text-amber-400' : 'text-rose-400'}`
  }, c.match_score, "% Match")), /*#__PURE__*/React.createElement("h5", {
    className: "font-extrabold text-sm text-white line-clamp-1"
  }, c.job_title), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 line-clamp-1"
  }, c.company_name), /*#__PURE__*/React.createElement("div", {
    className: "w-full bg-slate-800 rounded-full h-2 mt-3 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: `h-full rounded-full ${c.match_score >= 80 ? 'bg-emerald-500' : c.match_score >= 65 ? 'bg-amber-500' : 'bg-rose-500'}`,
    style: {
      width: `${c.match_score}%`
    }
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-300 mt-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed"
  }, c.verdict), /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] font-bold uppercase text-emerald-400 mb-1.5 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", null, "\u2713"), " Matching Skills (", c.matching_skills ? c.matching_skills.length : 0, ")"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, c.matching_skills && c.matching_skills.slice(0, 6).map((s, sIdx) => /*#__PURE__*/React.createElement("span", {
    key: sIdx,
    className: "text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium"
  }, s)))), /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] font-bold uppercase text-rose-400 mb-1.5 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", null, "\u26A0"), " Missing Requirements (", c.missing_skills ? c.missing_skills.length : 0, ")"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1.5"
  }, c.missing_skills && c.missing_skills.slice(0, 5).map((s, sIdx) => /*#__PURE__*/React.createElement("span", {
    key: sIdx,
    className: "text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 font-medium"
  }, s))))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setJobTitle(c.job_title);
      setCompanyName(c.company_name);
      const matched = multiJobs.find(j => j.title === c.job_title);
      if (matched) setJobDescription(matched.description);
      setAnalysisMode('job_description');
      setActiveView('analyzer');
      showToast("Loaded " + c.job_title + " into Analyzer!");
    },
    className: "w-full mt-3 py-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-bold transition border border-slate-700"
  }, "Analyze Deeply in Single Mode \u2192")))))));
})()),
  activeView === 'rewriter' && ((() => {
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-8 animate-fadeIn max-w-4xl mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center max-w-3xl mx-auto mb-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-xs font-bold border border-violet-500/20 mb-3"
  }, /*#__PURE__*/React.createElement("span", null, "\u270D\uFE0F"), " Executive Resume Section Rewriter"), /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl sm:text-4xl font-extrabold tracking-tight"
  }, "AI Resume Section Rewriter"), /*#__PURE__*/React.createElement("p", {
    className: "mt-3 text-sm text-slate-400"
  }, "Transform passive statements into compelling, metrics-driven bullets using the Google XYZ formula (\"Accomplished X, as measured by Y, by doing Z\").")), /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-5"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-300 mb-2"
  }, "Target Resume Section"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-4 gap-2"
  }, [{
    id: 'summary',
    label: 'Professional Summary',
    icon: '📝'
  }, {
    id: 'experience',
    label: 'Work Experience',
    icon: '💼'
  }, {
    id: 'projects',
    label: 'Projects & Portfolio',
    icon: '🚀'
  }, {
    id: 'skills',
    label: 'Technical Skills',
    icon: '⚙️'
  }].map(sec => /*#__PURE__*/React.createElement("button", {
    key: sec.id,
    type: "button",
    onClick: () => setRewriterSection(sec.id),
    className: `p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${rewriterSection === sec.id ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300 shadow' : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-base"
  }, sec.icon), /*#__PURE__*/React.createElement("span", null, sec.label))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-slate-300"
  }, "Target Job Context / Keywords ", /*#__PURE__*/React.createElement("span", {
    className: "text-slate-500 font-normal"
  }, "(Optional)")), jobDescription && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setRewriterJD(jobDescription);
      showToast("Loaded job description context from Analyzer!");
    },
    className: "text-[11px] text-indigo-400 hover:underline"
  }, "Import from Analyzer (", jobTitle || 'Current JD', ")")), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "e.g. Senior Full Stack Engineer, Microservices, Python, React, Cloud",
    value: rewriterJD,
    onChange: e => setRewriterJD(e.target.value),
    className: "w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-xs font-bold text-slate-300"
  }, "Current Draft / Content ", /*#__PURE__*/React.createElement("span", {
    className: "text-rose-400"
  }, "*")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      if (rewriterSection === 'summary') {
        setRewriterOriginal("Software engineer with 2 years of experience developing web apps with Python and JavaScript. Looking for a new role at a growing company.");
      } else if (rewriterSection === 'experience') {
        setRewriterOriginal("- Worked on the backend of an e-commerce website using Python and Flask.\n- Fixed bugs in database queries and made the page load faster.\n- Helped team members with code reviews and wrote unit tests.");
      } else if (rewriterSection === 'projects') {
        setRewriterOriginal("- Built an AI resume analyzer tool using React and Flask that extracts text and gives scores.\n- Used SQLite database to save user reports and implemented JWT auth.");
      } else {
        setRewriterOriginal("Python, JavaScript, React, Flask, SQL, Docker, Git, REST APIs, HTML/CSS");
      }
      showToast("Sample draft loaded!");
    },
    className: "text-[11px] text-indigo-400 hover:underline"
  }, "Load Draft Sample")), /*#__PURE__*/React.createElement("textarea", {
    rows: 5,
    placeholder: "Paste your raw section draft or bullet points here...",
    value: rewriterOriginal,
    onChange: e => setRewriterOriginal(e.target.value),
    className: "w-full text-xs p-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 font-mono custom-scrollbar"
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center text-[11px] text-slate-500 mt-1"
  }, /*#__PURE__*/React.createElement("span", null, "Minimum 10 characters"), /*#__PURE__*/React.createElement("span", null, rewriterOriginal.length, " characters"))), /*#__PURE__*/React.createElement("div", {
    className: "text-center pt-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleRewriteSubmit,
    disabled: rewriterLoading || rewriterOriginal.trim().length < 10,
    className: "px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-lg transition disabled:opacity-40"
  }, rewriterLoading ? "Optimizing Section with Generative AI..." : "✨ Optimize Section with Generative AI →"))), rewriterResult && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6 pt-4 animate-fadeIn"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-slate-400 uppercase tracking-wider"
  }, "Before (Original Draft)"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400"
  }, "Raw Input")), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800/80"
  }, rewriterOriginal)), /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 to-slate-900 p-5 space-y-3 shadow-xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-emerald-400 uppercase tracking-wider"
  }, "After (AI-Optimized)"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleCopyText(rewriterResult.improved_text || rewriterResult.improved_bullet_points?.join('\n'), 'Rewritten Section'),
    className: "text-xs px-3 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 font-bold transition flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83D\uDCCB"), " Copy Improved Version")), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-100 font-sans leading-relaxed bg-slate-950 p-4 rounded-xl border border-emerald-500/30 shadow-inner"
  }, rewriterResult.improved_text))), rewriterResult.improved_bullet_points && rewriterResult.improved_bullet_points.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3 shadow-lg"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\uD83C\uDFAF"), " Ready-to-Paste Resume Bullets (Google XYZ Format)"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, rewriterResult.improved_bullet_points.map((b, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-2.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-400 font-bold text-xs mt-0.5"
  }, "\u2022"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-200 leading-relaxed"
  }, b)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleCopyText(b, `Bullet #${idx + 1}`),
    className: "text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 text-xs flex-shrink-0",
    title: "Copy bullet"
  }, "\uD83D\uDCCB"))))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-5"
  }, rewriterResult.key_changes_made && /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-2"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "text-xs font-bold text-indigo-400 uppercase tracking-wider"
  }, "Key Enhancements Applied"), /*#__PURE__*/React.createElement("ul", {
    className: "space-y-1.5 text-xs text-slate-300"
  }, rewriterResult.key_changes_made.map((c, idx) => /*#__PURE__*/React.createElement("li", {
    key: idx,
    className: "flex items-start gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-indigo-400"
  }, "\u2713"), " ", c)))), rewriterResult.ats_tips && /*#__PURE__*/React.createElement("div", {
    className: "rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-2"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "text-xs font-bold text-amber-400 uppercase tracking-wider"
  }, "ATS Optimization Tips"), /*#__PURE__*/React.createElement("ul", {
    className: "space-y-1.5 text-xs text-slate-300"
  }, rewriterResult.ats_tips.map((t, idx) => /*#__PURE__*/React.createElement("li", {
    key: idx,
    className: "flex items-start gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-amber-400"
  }, "\uD83D\uDCA1"), " ", t)))))));
})()),
  activeView === 'history' && ((() => {
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-8 animate-fadeIn max-w-5xl mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl sm:text-3xl font-extrabold text-white"
  }, "My Analysis History & Saved Reports"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mt-1"
  }, "Access your previous resume assessments, review ATS score progression, and download official PDF reports.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setHistoryFilter('all');
      fetchHistory('all');
    },
    className: `px-3 py-1.5 rounded-lg transition ${historyFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`
  }, "All Analyses"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setHistoryFilter('saved');
      fetchHistory('saved');
    },
    className: `px-3 py-1.5 rounded-lg transition ${historyFilter === 'saved' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`
  }, "Bookmarked \u2B50"))), historyLoading ? /*#__PURE__*/React.createElement("div", {
    className: "text-center py-16 text-slate-400 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "inline-block animate-spin text-2xl"
  }, "\u23F3"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs"
  }, "Loading historical records from database...")) : historyList.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "text-center py-16 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-4xl"
  }, "\uD83D\uDCC2"), /*#__PURE__*/React.createElement("h4", {
    className: "text-base font-bold text-slate-200"
  }, "No analyses found"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 max-w-md mx-auto"
  }, historyFilter === 'saved' ? "You haven't bookmarked any reports yet. Star an analysis to save it here." : "You haven't performed any analyses yet. Upload your resume in the Analyzer to get started."), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setActiveView('analyzer'),
    className: "px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
  }, "Go to Resume Analyzer \u2192")) : /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-4"
  }, historyList.map(item => /*#__PURE__*/React.createElement("div", {
    key: item.id,
    className: "rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-col justify-between space-y-4 shadow-lg hover:border-slate-700 transition"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-mono text-slate-500"
  }, new Date(item.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleToggleBookmark(item.id),
    className: "text-base text-amber-400 hover:scale-110 transition",
    title: item.is_saved ? "Remove bookmark" : "Bookmark this report"
  }, item.is_saved ? "★" : "☆")), /*#__PURE__*/React.createElement("h4", {
    className: "font-extrabold text-base text-white mt-1"
  }, item.job_title || 'Resume Analysis'), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, item.company_name || 'General Industry Track'), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-500 mt-1"
  }, "File: ", item.resume_filename)), /*#__PURE__*/React.createElement("div", {
    className: "pt-3 border-t border-slate-800/80 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-400"
  }, "ATS Score:"), /*#__PURE__*/React.createElement("span", {
    className: `text-lg font-black ${item.match_score >= 80 ? 'text-emerald-400' : item.match_score >= 60 ? 'text-amber-400' : 'text-rose-400'}`
  }, item.match_score, "%")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("a", {
    href: `/api/report/${item.id}/download`,
    target: "_blank",
    rel: "noreferrer",
    className: "px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-semibold transition"
  }, "PDF \u2B07"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleLoadHistoricalAnalysis(item.id),
    className: "px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-bold transition shadow"
  }, "View Report \u2192")))))));
})()),
  showAuthModal && ((() => {
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl relative space-y-4"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowAuthModal(false),
    className: "absolute top-4 right-4 text-slate-400 hover:text-white"
  }, "\u2715"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-extrabold mb-2 shadow-lg shadow-indigo-500/25"
  }, "RX"), /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-white"
  }, authMode === 'login' ? "Sign In to ResumeX" : "Create Student Account"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400"
  }, authMode === 'login' ? "Access your saved resume history and customized reports." : "Register for an academic evaluation account.")), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setAuthMode('login');
      setAuthError(null);
    },
    className: `py-2 rounded-lg transition ${authMode === 'login' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`
  }, "Sign In"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setAuthMode('register');
      setAuthError(null);
    },
    className: `py-2 rounded-lg transition ${authMode === 'register' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`
  }, "Create Account")), authError && /*#__PURE__*/React.createElement("div", {
    className: "p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs"
  }, "\u26A0\uFE0F ", authError), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleAuthSubmit,
    className: "space-y-3"
  }, authMode === 'register' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-300 mb-1"
  }, "Full Name"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    required: true,
    placeholder: "John Doe",
    value: authForm.name,
    onChange: e => setAuthForm({
      ...authForm,
      name: e.target.value
    }),
    className: "w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-300 mb-1"
  }, "Email Address"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    required: true,
    placeholder: "student@resumex.ai",
    value: authForm.email,
    onChange: e => setAuthForm({
      ...authForm,
      email: e.target.value
    }),
    className: "w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-300 mb-1"
  }, "Password"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    required: true,
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    value: authForm.password,
    onChange: e => setAuthForm({
      ...authForm,
      password: e.target.value
    }),
    className: "w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
  })), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition mt-2"
  }, authMode === 'login' ? "Sign In →" : "Create Account →")), /*#__PURE__*/React.createElement("div", {
    className: "pt-3 border-t border-slate-800 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-400 mb-2"
  }, "Academic Demo 1-Click Fill:"), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setAuthMode('login');
      setAuthForm({
        name: '',
        email: 'student@resumex.ai',
        password: 'Student@123'
      });
    },
    className: "text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700"
  }, "Student Demo"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setAuthMode('login');
      setAuthForm({
        name: '',
        email: 'admin@resumex.ai',
        password: 'Admin@123'
      });
    },
    className: "text-[11px] px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-violet-300 border border-slate-700"
  }, "Admin Demo")))));
})())
  , showKeyModal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl relative"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowKeyModal(false),
    className: "absolute top-4 right-4 text-slate-400 hover:text-white"
  }, "\u2715"), /*#__PURE__*/React.createElement("h3", {
    className: "font-bold text-lg text-white mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, "\u2699\uFE0F"), /*#__PURE__*/React.createElement("span", null, "Configure Google Gemini API Key")), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mb-4"
  }, "Your API key connects the backend directly to Google Gemini Flash. The key is verified live and saved to your secure local ", /*#__PURE__*/React.createElement("code", null, ".env"), " file."), keyError && /*#__PURE__*/React.createElement("div", {
    className: "p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs"
  }, "\u26A0\uFE0F ", keyError), /*#__PURE__*/React.createElement("form", {
    onSubmit: handleSaveApiKey,
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-300 mb-1"
  }, "Google Gemini API Key"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    required: true,
    placeholder: "AIzaSy...",
    value: keyInput,
    onChange: e => setKeyInput(e.target.value),
    className: "w-full text-xs p-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500 font-mono"
  }), /*#__PURE__*/React.createElement("a", {
    href: "https://aistudio.google.com/app/apikey",
    target: "_blank",
    rel: "noreferrer",
    className: "text-[11px] text-indigo-400 hover:underline inline-block mt-1"
  }, "Get your free Gemini API key from Google AI Studio \u2197")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-slate-300 mb-1"
  }, "Target Model Identifier"), /*#__PURE__*/React.createElement("select", {
    value: keyModel,
    onChange: e => setKeyModel(e.target.value),
    className: "w-full text-xs p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
  }, /*#__PURE__*/React.createElement("option", {
    value: "gemini-2.5-flash"
  }, "gemini-2.5-flash (Recommended & Verified)"), /*#__PURE__*/React.createElement("option", {
    value: "gemini-1.5-flash"
  }, "gemini-1.5-flash (Standard Fallback)"), /*#__PURE__*/React.createElement("option", {
    value: "gemini-2.0-flash"
  }, "gemini-2.0-flash (Fast Flash)"), /*#__PURE__*/React.createElement("option", {
    value: "gemini-3.8-flash"
  }, "gemini-3.8-flash (Configured Identifier)"))), /*#__PURE__*/React.createElement("div", {
    className: "pt-2 flex justify-end gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowKeyModal(false),
    className: "px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-400 hover:bg-slate-800"
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: keyTesting,
    className: "px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition disabled:opacity-50"
  }, keyTesting ? 'Verifying Key with Gemini...' : 'Verify & Save to .env →'))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 pt-4 border-t border-slate-800 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-400 mb-2"
  }, "Don't have an API key right now? You can run in Academic Offline Demo Mode for presentations and evaluation."), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleEnableDemoMode,
    className: "px-4 py-2 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/50 text-xs font-semibold transition"
  }, "\uD83C\uDF93 Enable Academic Demo Mode (No Key Needed)")))), /*#__PURE__*/React.createElement("footer", {
    className: "border-t border-slate-800 py-6 text-center text-xs text-slate-500 mt-16"
  }, /*#__PURE__*/React.createElement("p", null, "Generative AI-Based Resume and Job Description Analysis Platform \u2022 Powered by Google Gemini")));
}
ReactDOM.createRoot(document.getElementById('root')).render( /*#__PURE__*/React.createElement(App, null));