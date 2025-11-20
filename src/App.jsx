import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Calendar, Download, ChevronLeft, Settings, 
  Search, FileText, Trash2, Layout, CheckCircle2, 
  Github, Loader2, X, RefreshCw, Eye, PenLine, 
  ExternalLink, UploadCloud, FileDiff, AlertCircle,
  GitPullRequestArrow, Menu
} from 'lucide-react';

// --- Utilities ---

const generateId = () => Math.random().toString(36).substr(2, 9);

const getLocalISOString = () => {
  const date = new Date();
  const pad = (num) => (num < 10 ? '0' + num : num);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const offset = -date.getTimezoneOffset();
  const offsetSign = offset >= 0 ? '+' : '-';
  const offsetHours = pad(Math.floor(Math.abs(offset) / 60));
  const offsetMinutes = pad(Math.abs(offset) % 60);
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
};

const formatDateReadable = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; 
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const createFrontmatter = (title, date, lastmod) => {
  return `---\ntitle: ${title}\ndate: ${date}\nlastmod: ${lastmod}\n---\n\n`;
};

const upsertFrontmatterField = (content, field, value) => {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontmatterRegex);

  if (match) {
    const frontmatterBlock = match[1];
    const fieldRegex = new RegExp(`^${field}:.*$`, 'm');
    let newFrontmatterBlock;
    
    if (fieldRegex.test(frontmatterBlock)) {
      newFrontmatterBlock = frontmatterBlock.replace(fieldRegex, `${field}: ${value}`);
    } else {
      newFrontmatterBlock = `${frontmatterBlock}\n${field}: ${value}`;
    }
    
    return content.replace(frontmatterRegex, `---\n${newFrontmatterBlock}\n---`);
  } else {
    return `---\n${field}: ${value}\n---\n\n${content}`;
  }
};

const parseFrontmatter = (content) => {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (match) {
        const frontmatter = match[1];
        const titleMatch = frontmatter.match(/title:\s*(.*)/);
        const dateMatch = frontmatter.match(/date:\s*(.*)/);
        return {
            title: titleMatch ? titleMatch[1].trim() : null,
            date: dateMatch ? dateMatch[1].trim() : null
        };
    }
    return { title: null, date: null };
};

const downloadMarkdown = (filename, content) => {
  const now = getLocalISOString();
  const finalContent = upsertFrontmatterField(content, 'lastmod', now);
  const element = document.createElement('a');
  const file = new Blob([finalContent], { type: 'text/markdown' });
  element.href = URL.createObjectURL(file);
  element.download = `${filename.replace(/\s+/g, '_') || 'untitled'}.md`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

const decodeBase64 = (str) => {
    try {
        return decodeURIComponent(escape(window.atob(str)));
    } catch (e) {
        return window.atob(str);
    }
};

const encodeBase64 = (str) => {
    try {
        return window.btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        return window.btoa(str);
    }
};

const getNoteFilename = (note) => {
    if (note.filename) return note.filename;
    return (note.title || 'untitled').trim().replace(/[^a-z0-9-_ ]/gi, '').replace(/\s+/g, '_') + '.md';
};

// --- Markdown Preview Component ---
const MarkdownPreview = ({ content }) => {
  const cleanContent = content.replace(/^---\n[\s\S]*?\n---\n/, '');
  const renderLine = (line, index) => {
    if (line.startsWith('# ')) return <h1 key={index} className="text-3xl font-bold mb-4 mt-6 text-gray-900 anim-slide-up">{line.slice(2)}</h1>;
    if (line.startsWith('## ')) return <h2 key={index} className="text-2xl font-bold mb-3 mt-5 text-gray-800 anim-slide-up">{line.slice(3)}</h2>;
    if (line.startsWith('### ')) return <h3 key={index} className="text-xl font-bold mb-2 mt-4 text-gray-800 anim-slide-up">{line.slice(4)}</h3>;
    if (line.startsWith('- ')) return <li key={index} className="ml-4 list-disc text-gray-700 mb-1 pl-1 anim-fade">{formatText(line.slice(2))}</li>;
    if (line.startsWith('- [ ] ')) return (
      <div key={index} className="flex items-start gap-3 mb-2 text-gray-700 anim-fade">
        <div className="mt-1 w-4 h-4 rounded border border-gray-300 bg-white shrink-0" />
        <span>{formatText(line.slice(6))}</span>
      </div>
    );
    if (line.startsWith('- [x] ')) return (
      <div key={index} className="flex items-start gap-3 mb-2 text-gray-400 line-through decoration-gray-400 anim-fade">
         <div className="mt-1 w-4 h-4 rounded border border-blue-500 bg-blue-500 shrink-0 flex items-center justify-center">
            <CheckCircle2 size={10} className="text-white" />
         </div>
         <span>{formatText(line.slice(6))}</span>
      </div>
    );
    if (line.trim() === '') return <br key={index} />;
    return <p key={index} className="mb-2 leading-relaxed text-gray-700 anim-fade">{formatText(line)}</p>;
  };
  const formatText = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
      if (part.startsWith('*') && part.endsWith('*')) return <em key={i} className="italic">{part.slice(1, -1)}</em>;
      const linkMatch = part.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) return <a key={i} href={linkMatch[2]} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">{linkMatch[1]}<ExternalLink size={10}/></a>;
      return part;
    });
  };
  return <div className="prose prose-gray max-w-none pb-10">{cleanContent.split('\n').map((line, i) => renderLine(line, i))}</div>;
};

// --- Modals ---

const CommitModal = ({ isOpen, onClose, dirtyNotes, onPush, isPushing, pushProgress, error }) => {
    const [message, setMessage] = useState('');
    const defaultMessage = useMemo(() => {
        const count = dirtyNotes.length;
        if (count === 0) return "No changes";
        if (count === 1) return `Update ${dirtyNotes[0].title || 'note'}`;
        return `Update ${count} notes`;
    }, [dirtyNotes]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 anim-fade">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden anim-pop" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <UploadCloud size={20} className="text-blue-500"/>
                        Push Changes
                    </h3>
                    <button onClick={onClose} disabled={isPushing} className="p-1 hover:bg-gray-200 rounded-full text-gray-400 transition-colors disabled:opacity-50"><X size={20}/></button>
                </div>
                
                <div className="p-6 space-y-6">
                    {dirtyNotes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <CheckCircle2 size={48} className="mx-auto mb-3 text-green-400" />
                            <p>Everything is up to date!</p>
                        </div>
                    ) : (
                        <>
                            <div className="max-h-48 overflow-y-auto bg-gray-50 rounded-xl border border-gray-100 p-3 space-y-2">
                                {dirtyNotes.map(note => (
                                    <div key={note.id} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-gray-700 font-medium">
                                            <FileDiff size={14} className="text-blue-500"/>
                                            <span className="truncate max-w-[200px]">{note.filename || note.title || 'Untitled'}</span>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${note.sha ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                            {note.sha ? 'MODIFIED' : 'NEW'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Commit Message</label>
                                <input 
                                    type="text" 
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder={defaultMessage}
                                    disabled={isPushing}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                        </>
                    )}
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 anim-pop flex items-start gap-2">
                            <AlertCircle size={16} className="shrink-0 mt-0.5"/>
                            <span>{error}</span>
                        </div>
                    )}
                    <div className="space-y-3">
                         {dirtyNotes.length > 0 && (
                             <button 
                                onClick={() => onPush(message || defaultMessage)}
                                disabled={isPushing}
                                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95"
                            >
                                {isPushing ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin"/>
                                        <span>Pushing {pushProgress.current}/{pushProgress.total}...</span>
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud size={18}/>
                                        <span>Push {dirtyNotes.length} Changes</span>
                                    </>
                                )}
                            </button>
                         )}
                         {isPushing && pushProgress.total > 0 && (
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div 
                                    className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${(pushProgress.current / pushProgress.total) * 100}%` }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SettingsModal = ({ isOpen, onClose, config, onSave, onFetch, isLoading, progress, error }) => {
    const [localConfig, setLocalConfig] = useState(config);
    useEffect(() => { if (isOpen) setLocalConfig(config); }, [isOpen, config]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 anim-fade">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden anim-pop" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-700">GitHub Configuration</h3>
                    <button onClick={onClose} disabled={isLoading} className="p-1 hover:bg-gray-200 rounded-full text-gray-400 transition-colors disabled:opacity-50 hover:rotate-90 duration-200"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="anim-slide-up delay-100">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Owner / Organization</label>
                        <input type="text" value={localConfig.owner} onChange={(e) => setLocalConfig({...localConfig, owner: e.target.value})} placeholder="e.g. facebook" disabled={isLoading} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                    </div>
                    <div className="flex gap-4 anim-slide-up delay-200">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Repository</label>
                            <input type="text" value={localConfig.repo} onChange={(e) => setLocalConfig({...localConfig, repo: e.target.value})} placeholder="e.g. react" disabled={isLoading} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Folder Path</label>
                            <input type="text" value={localConfig.path || ''} onChange={(e) => setLocalConfig({...localConfig, path: e.target.value})} placeholder="docs" disabled={isLoading} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                        </div>
                    </div>
                    <div className="anim-slide-up delay-300">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Personal Access Token</label>
                        <input type="password" value={localConfig.token} onChange={(e) => setLocalConfig({...localConfig, token: e.target.value})} placeholder="ghp_..." disabled={isLoading} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                        <p className="text-[10px] text-gray-400 mt-1">Requires <b>Contents</b> (Read/Write) permissions.</p>
                    </div>
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 anim-pop flex items-start gap-2">
                            <AlertCircle size={16} className="shrink-0 mt-0.5"/>
                            <span>{error}</span>
                        </div>
                    )}
                    <div className="pt-2 space-y-3 anim-slide-up delay-300">
                        <div className="flex gap-3">
                            <button onClick={() => onSave(localConfig)} disabled={isLoading} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors active:scale-95">Save Config</button>
                            <button onClick={() => onFetch(localConfig)} disabled={isLoading || !localConfig.owner || !localConfig.repo} className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm active:scale-95">
                                {isLoading ? <><Loader2 size={16} className="animate-spin"/><span>{progress.total > 0 ? `${progress.current}/${progress.total}` : 'Cloning...'}</span></> : <><GitPullRequestArrow size={16}/><span>Clone / Sync</span></>}
                            </button>
                        </div>
                        {isLoading && progress.total > 0 && <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden"><div className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${(progress.current / progress.total) * 100}%` }} /></div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const NoteItem = ({ note, isActive, onClick, onDelete }) => {
  const contentPreview = note.content.replace(/---[\s\S]*?---/, '').trim();
  return (
    <div onClick={() => onClick(note)} className={`group relative p-4 mb-2 rounded-xl cursor-pointer transition-all duration-200 border transform ${isActive ? 'bg-blue-500 text-white shadow-md border-blue-500 scale-[1.02]' : 'bg-white hover:bg-gray-50 text-gray-900 border-gray-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:scale-[1.01]'}`}>
      <div className="flex justify-between items-start mb-1">
        <div className={`text-sm font-medium line-clamp-2 leading-snug pr-6 ${isActive ? 'text-white' : 'text-gray-800'}`}>{contentPreview || "No content..."}</div>
        {note.dirty && <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-blue-500'}`} title="Unsaved changes" />}
      </div>
      <div className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>{formatDateReadable(note.updatedAt)}</div>
      <button onClick={(e) => { e.stopPropagation(); onDelete(note.id); }} className={`absolute right-2 bottom-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 ${isActive ? 'text-blue-100 hover:bg-blue-600' : 'text-gray-400 hover:text-red-500 hover:bg-gray-100'}`}><Trash2 size={14} /></button>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, count, isActive, onClick, isMobile }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-3 py-2 mb-1 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-gray-200/60 text-gray-900 scale-105 origin-left' : 'text-gray-600 hover:bg-gray-100 hover:pl-4'}`}>
    <div className="flex items-center gap-3"><Icon size={18} className={isActive ? 'text-gray-900' : 'text-gray-500'} /><span>{label}</span></div>
    {count !== undefined && <span className="text-xs font-bold text-gray-400">{count}</span>}
  </button>
);

// --- Main Application ---

export default function App() {
  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [isPreview, setIsPreview] = useState(false);
  
  // GitHub State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommitOpen, setIsCommitOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  
  const [fetchProgress, setFetchProgress] = useState({ current: 0, total: 0 });
  const [pushProgress, setPushProgress] = useState({ current: 0, total: 0 });
  
  const [fetchError, setFetchError] = useState(null);
  const [pushError, setPushError] = useState(null);
  const [githubConfig, setGithubConfig] = useState({ owner: '', repo: '', path: '', token: '' });

  // Initial Load
  useEffect(() => {
    const savedNotes = localStorage.getItem('things3-md-notes');
    const savedConfig = localStorage.getItem('things3-gh-config');
    if (savedConfig) setGithubConfig(JSON.parse(savedConfig));
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    } else {
      // Demo data
      const now = getLocalISOString();
      setNotes([{ 
          id: '1', title: 'Welcome', content: createFrontmatter('Welcome', now, now) + '# Welcome\n\nStart writing...', 
          updatedAt: now, dirty: false, sha: null, filename: 'Welcome.md'
      }]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('things3-md-notes', JSON.stringify(notes));
  }, [notes]);

  const activeNote = notes.find(n => n.id === activeNoteId);
  const dirtyNotes = notes.filter(n => n.dirty);

  // GitHub Actions (Sync/Clone)
  const handleSaveConfig = (config) => {
      setGithubConfig(config);
      localStorage.setItem('things3-gh-config', JSON.stringify(config));
      setFetchError(null); 
  };

  const fetchFromGithub = async (configToUse) => {
    setIsFetching(true);
    setFetchError(null);
    setFetchProgress({ current: 0, total: 0 });
    const config = configToUse || githubConfig;
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (config.token) headers['Authorization'] = `token ${config.token}`;

    try {
        let url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents`;
        if (config.path) url += `/${config.path.replace(/^\/+|\/+$/g, '')}`;

        const listResponse = await fetch(url, { headers });
        if (!listResponse.ok) throw new Error(`Error ${listResponse.status}: ${listResponse.statusText}`);
        
        const files = await listResponse.json();
        if (!Array.isArray(files)) throw new Error('Path is not a directory.');

        const mdFiles = files.filter(f => f.name.endsWith('.md') && f.type === 'file');
        if (mdFiles.length === 0) throw new Error('No markdown files found.');

        setFetchProgress({ current: 0, total: mdFiles.length });

        const fetchedNotes = [];
        for (const file of mdFiles) {
            const contentResponse = await fetch(file.url, { headers });
            if(contentResponse.ok) {
                const fileData = await contentResponse.json();
                const rawContent = decodeBase64(fileData.content);
                const hasFrontmatter = rawContent.trim().startsWith('---');
                const now = getLocalISOString();
                const title = file.name.replace('.md', '');
                let finalContent = rawContent;
                let displayDate = now;

                if (hasFrontmatter) {
                     const parsed = parseFrontmatter(rawContent);
                     if (parsed.date) displayDate = parsed.date;
                } else {
                     finalContent = createFrontmatter(title, now, now) + rawContent;
                }
                const parsedForTitle = parseFrontmatter(finalContent);
                
                fetchedNotes.push({
                    id: generateId(),
                    title: parsedForTitle.title || title,
                    content: finalContent,
                    updatedAt: displayDate,
                    sha: fileData.sha,
                    filename: file.name,
                    dirty: false
                });
            }
            setFetchProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }

        setNotes(currentNotes => {
            const mergedNotes = [...currentNotes];
            fetchedNotes.forEach(fetchedNote => {
                const existingIndex = mergedNotes.findIndex(n => getNoteFilename(n) === fetchedNote.filename);
                if (existingIndex !== -1) {
                    mergedNotes[existingIndex] = { ...fetchedNote, id: mergedNotes[existingIndex].id };
                } else {
                    mergedNotes.push(fetchedNote);
                }
            });
            return mergedNotes;
        });

        setIsSettingsOpen(false);
    } catch (err) {
        setFetchError(err.message === 'Failed to fetch' ? "Network error." : err.message);
    } finally {
        setIsFetching(false);
    }
  };

  // GitHub Actions (Push)
  const pushToGithub = async (message) => {
      setIsPushing(true);
      setPushError(null);
      setPushProgress({ current: 0, total: dirtyNotes.length });
      
      const config = githubConfig;
      const headers = { 
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
      };
      if (config.token) headers['Authorization'] = `token ${config.token}`;

      try {
          const updatedNotes = [...notes];
          let successCount = 0;

          for (const note of dirtyNotes) {
              let filename = getNoteFilename(note);
              let path = config.path ? `${config.path.replace(/^\/+|\/+$/g, '')}/${filename}` : filename;
              let url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;

              const body = {
                  message: message,
                  content: encodeBase64(note.content),
                  ...(note.sha && { sha: note.sha })
              };

              const response = await fetch(url, {
                  method: 'PUT',
                  headers: headers,
                  body: JSON.stringify(body)
              });

              if (!response.ok) throw new Error(`Failed to push ${filename}`);

              const data = await response.json();
              const noteIndex = updatedNotes.findIndex(n => n.id === note.id);
              if (noteIndex !== -1) {
                  updatedNotes[noteIndex] = {
                      ...updatedNotes[noteIndex],
                      sha: data.content.sha,
                      filename: filename,
                      dirty: false
                  };
              }
              successCount++;
              setPushProgress(prev => ({ ...prev, current: successCount }));
          }
          setNotes(updatedNotes);
          setIsCommitOpen(false);
      } catch (err) {
          setPushError(err.message);
      } finally {
          setIsPushing(false);
      }
  };

  // Note Actions
  const handleCreateNote = () => {
    const now = getLocalISOString();
    const newNote = {
      id: generateId(),
      title: '',
      content: createFrontmatter('', now, now),
      updatedAt: now,
      dirty: true,
      sha: null,
      filename: null 
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setIsPreview(false);
  };

  const handleUpdateNote = (id, updates) => {
    const now = getLocalISOString();
    setNotes(notes.map(n => {
      if (n.id !== id) return n;
      let updatedContent = updates.content !== undefined ? updates.content : n.content;
      if (updates.title !== undefined) updatedContent = upsertFrontmatterField(updatedContent, 'title', updates.title);
      if (updates.content !== undefined || updates.title !== undefined) updatedContent = upsertFrontmatterField(updatedContent, 'lastmod', now);
      return { ...n, ...updates, content: updatedContent, updatedAt: now, dirty: true };
    }));
  };

  const handleDeleteNote = (id) => {
    setNotes(notes.filter(n => n.id !== id));
    if (activeNoteId === id) setActiveNoteId(null);
  };

  return (
    <div className="flex h-screen w-full bg-gray-50 font-sans selection:bg-blue-200 text-gray-900 overflow-hidden">
      
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} config={githubConfig} onSave={handleSaveConfig} onFetch={fetchFromGithub} isLoading={isFetching} progress={fetchProgress} error={fetchError} />
      <CommitModal isOpen={isCommitOpen} onClose={() => setIsCommitOpen(false)} dirtyNotes={dirtyNotes} onPush={pushToGithub} isPushing={isPushing} pushProgress={pushProgress} error={pushError} />

      {/* Sidebar: Hidden on Mobile, Visible on Desktop */}
      <div className="hidden md:flex flex-col w-64 bg-[#F0F1F3] border-r border-gray-200 h-full shrink-0">
        <div className="h-12 flex items-center gap-2 px-5">
           <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm"></div>
           <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm"></div>
           <div className="w-3 h-3 rounded-full bg-green-400 shadow-sm"></div>
        </div>
        <div className="flex-1 px-2 py-4 overflow-y-auto no-scrollbar">
          <SidebarItem icon={Layout} label="Inbox" isActive={false} />
          <SidebarItem icon={Calendar} label="Today" count={notes.length} isActive={true} />
          <SidebarItem icon={CheckCircle2} label="Completed" isActive={false} />
          <SidebarItem icon={Trash2} label="Trash" isActive={false} />
          
          <div className="mt-8 px-3 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Sources</div>
          <SidebarItem icon={FileText} label="Local Notes" />
          <SidebarItem icon={Github} label="GitHub" onClick={() => setIsSettingsOpen(true)} isActive={isSettingsOpen} />
          
          <button onClick={() => setIsCommitOpen(true)} disabled={dirtyNotes.length === 0} className={`w-full flex items-center justify-between px-3 py-2 mt-1 mb-1 rounded-lg text-sm font-medium transition-all duration-200 ${dirtyNotes.length > 0 ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 cursor-pointer' : 'text-gray-400 cursor-default opacity-50'}`}>
              <div className="flex items-center gap-3"><UploadCloud size={18} /><span>Push Changes</span></div>
              {dirtyNotes.length > 0 && <span className="text-xs font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-full">{dirtyNotes.length}</span>}
          </button>
        </div>
        <div className="p-4 border-t border-gray-200/50">
          <button onClick={handleCreateNote} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors text-sm font-medium group">
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300"/><span>New List</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex relative overflow-hidden">
        
        {/* Note List Column */}
        {/* Desktop: Always visible (w-72) */}
        {/* Mobile: Visible ONLY if NO active note (w-full) */}
        <div className={`
            flex flex-col border-r border-gray-200 bg-[#F5F6F8] h-full transition-all duration-300 ease-in-out
            ${activeNoteId ? 'hidden md:flex w-72 shrink-0' : 'flex w-full md:w-72 shrink-0'}
        `}>
            {/* Header */}
            <div className="h-14 md:h-12 flex items-center justify-between px-4 border-b border-gray-200/50 bg-[#F5F6F8] sticky top-0 z-10 backdrop-blur-sm">
                <div className="flex items-center gap-2 md:hidden">
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-white rounded-full shadow-sm text-gray-400 hover:text-blue-500 active:scale-95"><Settings size={18}/></button>
                    <h1 className="text-xl font-bold text-gray-900">Notes</h1>
                </div>
                <span className="hidden md:block text-xs font-bold text-gray-400 uppercase tracking-wider">All Notes</span>
                
                <div className="flex gap-2">
                    <button onClick={() => setIsCommitOpen(true)} disabled={dirtyNotes.length === 0} className={`md:hidden p-2 rounded-full shadow-sm active:scale-95 ${dirtyNotes.length > 0 ? 'bg-blue-500 text-white' : 'bg-white text-gray-300'}`}><UploadCloud size={18}/></button>
                    <button onClick={handleCreateNote} className="p-2 md:p-1 hover:bg-gray-200 rounded-full md:rounded text-gray-500 md:text-gray-400 bg-white md:bg-transparent shadow-sm md:shadow-none active:scale-95"><Plus size={20} /></button>
                </div>
            </div>

            {/* Search (Mobile Only visual tweak) */}
            <div className="px-4 py-2 md:hidden">
                 <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16} />
                    <input type="text" placeholder="Search" className="w-full bg-white/60 pl-9 pr-4 py-2 rounded-lg text-sm placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none shadow-sm" />
                  </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                {notes.length === 0 && <div className="text-center mt-12 opacity-40"><p className="text-sm text-gray-500">No notes yet</p></div>}
                {notes.map(note => (
                  <NoteItem key={note.id} note={note} isActive={activeNoteId === note.id} onClick={(n) => { setActiveNoteId(n.id); setIsPreview(false); }} onDelete={handleDeleteNote} />
                ))}
            </div>
        </div>

        {/* Editor Column */}
        {/* Desktop: Always visible (flex-1) */}
        {/* Mobile: Visible ONLY if active note exists (Fixed overlay) */}
        <div className={`
            flex-col bg-white h-full
            ${activeNoteId ? 'flex w-full md:flex-1 absolute inset-0 md:static z-20' : 'hidden md:flex md:flex-1'}
        `}>
           <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-2 border-b border-gray-100 h-14 md:h-12 shrink-0">
                {/* Mobile Back Button */}
                <button onClick={() => setActiveNoteId(null)} className="md:hidden flex items-center text-blue-500 font-medium -ml-2 active:opacity-50">
                  <ChevronLeft size={24} />
                  <span>Notes</span>
                </button>

                {/* Desktop Last Edited */}
                <div className="hidden md:block text-xs text-gray-400">
                    {activeNote ? `Last edited: ${formatDateReadable(activeNote.updatedAt)}` : ''}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {activeNote && (
                    <>
                      <button onClick={() => setIsPreview(!isPreview)} className={`p-2 rounded-lg transition-all duration-200 ${isPreview ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-800 hover:bg-gray-100'}`} title={isPreview ? "Edit Mode" : "Preview Mode"}>{isPreview ? <PenLine size={18} /> : <Eye size={18} />}</button>
                      <button onClick={() => downloadMarkdown(activeNote.title, activeNote.content)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors active:scale-95"><Download size={18} /></button>
                    </>
                  )}
                </div>
            </div>

            {activeNote ? (
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  <div className="max-w-3xl mx-auto p-6 md:p-12">
                    {!isPreview && <input type="text" value={activeNote.title} onChange={(e) => handleUpdateNote(activeNote.id, { title: e.target.value })} placeholder="New Title" className="w-full text-3xl font-bold text-gray-900 placeholder-gray-300 border-none focus:ring-0 p-0 bg-transparent mb-6" />}
                    {isPreview && <h1 className="text-4xl font-bold text-gray-900 mb-8 pb-4 border-b border-gray-100 anim-slide-up">{activeNote.title || "Untitled"}</h1>}
                    {isPreview ? <MarkdownPreview content={activeNote.content} /> : <textarea value={activeNote.content} onChange={(e) => handleUpdateNote(activeNote.id, { content: e.target.value })} placeholder="Start writing..." className="w-full h-[calc(100vh-200px)] resize-none text-base leading-relaxed text-gray-700 placeholder-gray-300 border-none focus:ring-0 p-0 bg-transparent font-mono" />}
                  </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300"><FileText size={64} strokeWidth={1} className="mb-4 text-gray-200" /><p>Select a note to view</p></div>
            )}
        </div>

      </div>
    </div>
  );
}