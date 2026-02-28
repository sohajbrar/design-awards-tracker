'use client'

import { useState, useMemo, useEffect } from 'react'
import awardsData from '../data/awards.json'

const difficultyColors = {
  'Easy': 'badge-easy',
  'Medium': 'badge-medium',
  'Hard': 'badge-hard',
}

const typeIcons = {
  'judging': '⚖️',
  'speaking': '🎤',
  'event': '🎪',
  'competition': '🏆',
}

function parseDeadline(deadline) {
  if (!deadline) return { date: null, isRolling: true }
  
  const lower = deadline.toLowerCase()
  if (lower.includes('rolling') || lower.includes('ongoing') || lower.includes('event-dependent')) {
    return { date: null, isRolling: true }
  }
  
  const monthMap = {
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
    'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
  }
  
  const patterns = [
    /([a-z]+)\s*(\d{1,2})?\s*[-–]?\s*(\d{4})/i,
    /([a-z]+)\s+(\d{4})/i,
    /(\d{4})/,
  ]
  
  for (const pattern of patterns) {
    const match = deadline.match(pattern)
    if (match) {
      if (match[1] && monthMap[match[1].toLowerCase().substring(0, 3)] !== undefined) {
        const month = monthMap[match[1].toLowerCase().substring(0, 3)]
        const day = match[2] ? parseInt(match[2]) : 1
        const year = match[3] ? parseInt(match[3]) : (match[2] && match[2].length === 4 ? parseInt(match[2]) : 2026)
        return { date: new Date(year, month, day), isRolling: false }
      }
    }
  }
  
  const yearMatch = deadline.match(/20\d{2}/)
  if (yearMatch) {
    const quarterMatch = deadline.toLowerCase()
    let month = 0
    if (quarterMatch.includes('early')) month = 2
    else if (quarterMatch.includes('mid')) month = 5
    else if (quarterMatch.includes('late')) month = 9
    return { date: new Date(parseInt(yearMatch[0]), month, 1), isRolling: false }
  }
  
  return { date: null, isRolling: true }
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('All')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedType, setSelectedType] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [sortBy, setSortBy] = useState('deadline')
  const [lastUpdated] = useState(awardsData.lastUpdated)
  
  // Side panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [selectedAward, setSelectedAward] = useState(null)
  const [drafts, setDrafts] = useState({})
  const [userProfile, setUserProfile] = useState({
    name: '',
    years: '',
    expertise: '',
    notableWork: ''
  })

  // Load drafts and profile from localStorage
  useEffect(() => {
    const savedDrafts = localStorage.getItem('awardDrafts')
    const savedProfile = localStorage.getItem('userProfile')
    if (savedDrafts) setDrafts(JSON.parse(savedDrafts))
    if (savedProfile) setUserProfile(JSON.parse(savedProfile))
  }, [])

  // Save drafts to localStorage
  useEffect(() => {
    localStorage.setItem('awardDrafts', JSON.stringify(drafts))
  }, [drafts])

  // Save profile to localStorage
  useEffect(() => {
    localStorage.setItem('userProfile', JSON.stringify(userProfile))
  }, [userProfile])

  const categories = useMemo(() => {
    const cats = [...new Set(awardsData.awards.map(a => a.category))]
    return ['All', ...cats.sort()]
  }, [])

  const difficulties = ['All', 'Easy', 'Medium', 'Hard']
  const types = ['All', 'judging', 'speaking', 'event']
  const statuses = ['All', 'Not started', 'Completed']

  const filteredAwards = useMemo(() => {
    let filtered = awardsData.awards.filter(award => {
      const matchesSearch = award.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           award.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           award.category.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesDifficulty = selectedDifficulty === 'All' || award.difficulty === selectedDifficulty
      const matchesCategory = selectedCategory === 'All' || award.category === selectedCategory
      const matchesType = selectedType === 'All' || award.type === selectedType
      const matchesStatus = selectedStatus === 'All' || award.status === selectedStatus
      
      return matchesSearch && matchesDifficulty && matchesCategory && matchesType && matchesStatus
    })

    if (sortBy === 'deadline') {
      filtered.sort((a, b) => {
        const deadlineA = parseDeadline(a.deadline)
        const deadlineB = parseDeadline(b.deadline)
        
        if (deadlineA.isRolling && deadlineB.isRolling) return 0
        if (deadlineA.isRolling) return 1
        if (deadlineB.isRolling) return -1
        
        return deadlineA.date - deadlineB.date
      })
    } else if (sortBy === 'difficulty') {
      const order = { 'Easy': 1, 'Medium': 2, 'Hard': 3 }
      filtered.sort((a, b) => order[a.difficulty] - order[b.difficulty])
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'category') {
      filtered.sort((a, b) => a.category.localeCompare(b.category))
    }

    return filtered
  }, [searchQuery, selectedDifficulty, selectedCategory, selectedType, selectedStatus, sortBy])

  const stats = useMemo(() => ({
    total: awardsData.awards.length,
    completed: awardsData.awards.filter(a => a.status === 'Completed').length,
    easy: awardsData.awards.filter(a => a.difficulty === 'Easy').length,
    medium: awardsData.awards.filter(a => a.difficulty === 'Medium').length,
    hard: awardsData.awards.filter(a => a.difficulty === 'Hard').length,
    draftsCount: Object.keys(drafts).length,
  }), [drafts])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
    })
  }

  const hasActiveFilters = selectedDifficulty !== 'All' || selectedCategory !== 'All' || 
                           selectedType !== 'All' || selectedStatus !== 'All'

  const clearFilters = () => {
    setSelectedDifficulty('All')
    setSelectedCategory('All')
    setSelectedType('All')
    setSelectedStatus('All')
    setSearchQuery('')
  }

  const openPanel = (award) => {
    setSelectedAward(award)
    setIsPanelOpen(true)
  }

  const saveDraft = (awardId, content) => {
    setDrafts(prev => ({
      ...prev,
      [awardId]: {
        content,
        updatedAt: new Date().toISOString()
      }
    }))
  }

  const deleteDraft = (awardId) => {
    setDrafts(prev => {
      const newDrafts = { ...prev }
      delete newDrafts[awardId]
      return newDrafts
    })
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--background)]">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Design Awards Tracker</h1>
              <p className="text-sm text-[var(--muted)] mt-0.5">
                {stats.total} opportunities · {stats.completed} applied · {stats.draftsCount} drafts
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setSelectedAward(null); setIsPanelOpen(true); }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI Assistant
              </button>
              <div className="text-xs text-[var(--muted)]">
                Updated {formatDate(lastUpdated)}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search awards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Difficulties</option>
            {difficulties.slice(1).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Types</option>
            <option value="judging">⚖️ Judging</option>
            <option value="speaking">🎤 Speaking</option>
            <option value="event">🎪 Event</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Status</option>
            <option value="Not started">Not started</option>
            <option value="Completed">Completed</option>
          </select>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-[var(--muted)]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="deadline">Deadline</option>
              <option value="difficulty">Difficulty</option>
              <option value="name">Name</option>
              <option value="category">Category</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-blue-500 hover:text-blue-600 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-[var(--muted)]">
          {filteredAwards.length} {filteredAwards.length === 1 ? 'result' : 'results'}
        </div>

        {/* Awards List */}
        <div className="space-y-3">
          {filteredAwards.map((award) => (
            <AwardRow 
              key={award.id} 
              award={award} 
              onWriteApplication={() => openPanel(award)}
              hasDraft={!!drafts[award.id]}
            />
          ))}
        </div>

        {filteredAwards.length === 0 && (
          <div className="text-center py-16">
            <div className="text-3xl mb-3">🔍</div>
            <div className="font-medium">No awards found</div>
            <div className="text-sm text-[var(--muted)] mt-1">Try adjusting your filters</div>
          </div>
        )}
      </div>

      {/* AI Side Panel */}
      <AIPanel 
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        award={selectedAward}
        drafts={drafts}
        onSaveDraft={saveDraft}
        onDeleteDraft={deleteDraft}
        userProfile={userProfile}
        setUserProfile={setUserProfile}
        allAwards={awardsData.awards}
        onSelectAward={setSelectedAward}
      />
    </main>
  )
}

function AwardRow({ award, onWriteApplication, hasDraft }) {
  const [copied, setCopied] = useState(false)

  const handleCopyLink = () => {
    navigator.clipboard.writeText(award.link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const deadlineInfo = parseDeadline(award.deadline)
  const isUrgent = deadlineInfo.date && !deadlineInfo.isRolling && 
                   (deadlineInfo.date - new Date()) < 30 * 24 * 60 * 60 * 1000

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
      <div className="text-2xl w-10 text-center flex-shrink-0">
        {typeIcons[award.type] || '🏆'}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium text-sm truncate">{award.name}</h3>
          {award.status === 'Completed' && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex-shrink-0">
              Applied
            </span>
          )}
          {hasDraft && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex-shrink-0">
              Draft
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <span className={`${difficultyColors[award.difficulty]} badge`}>{award.difficulty}</span>
          <span>{award.category}</span>
        </div>
      </div>

      <div className={`text-sm flex-shrink-0 w-32 text-right ${isUrgent ? 'text-red-500 font-medium' : 'text-[var(--muted)]'}`}>
        {award.deadline}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onWriteApplication}
          className="px-3 py-2 border border-blue-500 text-blue-500 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          title="Write application with AI"
        >
          ✨ Write
        </button>
        <a
          href={award.link}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Apply
        </a>
        <button
          onClick={handleCopyLink}
          className="p-2 border border-[var(--border)] rounded-lg text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Copy link"
        >
          {copied ? '✓' : '📋'}
        </button>
      </div>
    </div>
  )
}

function AIPanel({ isOpen, onClose, award, drafts, onSaveDraft, onDeleteDraft, userProfile, setUserProfile, allAwards, onSelectAward }) {
  const [activeTab, setActiveTab] = useState('generate')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [editedContent, setEditedContent] = useState('')

  // Load draft when award changes
  useEffect(() => {
    if (award && drafts[award.id]) {
      setEditedContent(drafts[award.id].content)
      setGeneratedContent(drafts[award.id].content)
    } else {
      setEditedContent('')
      setGeneratedContent('')
    }
  }, [award, drafts])

  const [aiSource, setAiSource] = useState(null)

  const generateApplication = async () => {
    if (!award) return
    
    setIsGenerating(true)
    setAiSource(null)
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          award,
          userProfile,
          customPrompt: customPrompt || null
        })
      })

      const data = await response.json()
      setGeneratedContent(data.content)
      setEditedContent(data.content)
      setAiSource(data.source || 'unknown')
      
      if (data.error) {
        console.log('API Error:', data.error)
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'API request failed')
      }
    } catch (error) {
      console.error('Generation failed:', error)
      setGeneratedContent('Failed to generate. Please try again.')
      setEditedContent('')
    }
    setIsGenerating(false)
  }

  const handleSave = () => {
    if (award && editedContent) {
      onSaveDraft(award.id, editedContent)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(editedContent)
  }

  const draftsWithAwards = Object.entries(drafts).map(([id, draft]) => ({
    ...draft,
    award: allAwards.find(a => a.id === parseInt(id))
  })).filter(d => d.award)

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-[var(--background)] shadow-2xl z-50 flex flex-col">
        {/* Panel Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <span className="text-xl">✨</span>
            <h2 className="font-semibold">AI Application Writer</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'generate' 
                ? 'text-blue-500 border-b-2 border-blue-500' 
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            Generate
          </button>
          <button
            onClick={() => setActiveTab('drafts')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'drafts' 
                ? 'text-blue-500 border-b-2 border-blue-500' 
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            Drafts ({Object.keys(drafts).length})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'profile' 
                ? 'text-blue-500 border-b-2 border-blue-500' 
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            My Profile
          </button>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'generate' && (
            <div className="space-y-4">
              {/* Award Selection */}
              {award ? (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{typeIcons[award.type]}</span>
                    <span className="font-medium text-sm">{award.name}</span>
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    {award.category} · {award.deadline}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-dashed border-[var(--border)] text-center">
                  <p className="text-sm text-[var(--muted)]">
                    Select an award from the list or click "✨ Write" button
                  </p>
                </div>
              )}

              {/* Custom Prompt */}
              <div>
                <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2 block">
                  Custom Instructions (optional)
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="E.g., 'Focus on my UX research experience' or 'Make it more formal'"
                  className="w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={generateApplication}
                disabled={!award || isGenerating}
                className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating with AI...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Application
                  </>
                )}
              </button>

              {/* Generated Content */}
              {editedContent && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                      Generated Application (editable)
                    </label>
                    {aiSource && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        aiSource === 'groq-ai' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {aiSource === 'groq-ai' ? '✨ AI Generated' : '📝 Template'}
                      </span>
                    )}
                  </div>
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm resize-none h-64 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                    >
                      💾 Save Draft
                    </button>
                    <button
                      onClick={handleCopy}
                      className="flex-1 py-2 border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'drafts' && (
            <div className="space-y-3">
              {draftsWithAwards.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">📝</div>
                  <p className="text-sm text-[var(--muted)]">No drafts saved yet</p>
                </div>
              ) : (
                draftsWithAwards.map(({ award: draftAward, content, updatedAt }) => (
                  <div
                    key={draftAward.id}
                    className="p-3 rounded-lg border border-[var(--border)] hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span>{typeIcons[draftAward.type]}</span>
                          <span className="font-medium text-sm">{draftAward.name}</span>
                        </div>
                        <div className="text-xs text-[var(--muted)] mt-1">
                          Saved {new Date(updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--muted)] line-clamp-2 mb-3">{content}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          onSelectAward(draftAward)
                          setActiveTab('generate')
                        }}
                        className="flex-1 py-1.5 text-xs bg-blue-500 text-white rounded font-medium hover:bg-blue-600 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => navigator.clipboard.writeText(content)}
                        className="flex-1 py-1.5 text-xs border border-[var(--border)] rounded font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => onDeleteDraft(draftAward.id)}
                        className="py-1.5 px-3 text-xs text-red-500 border border-red-200 dark:border-red-800 rounded font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted)]">
                Your profile helps the AI generate personalized applications.
              </p>
              
              <div>
                <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2 block">
                  Your Name
                </label>
                <input
                  type="text"
                  value={userProfile.name}
                  onChange={(e) => setUserProfile(p => ({ ...p, name: e.target.value }))}
                  placeholder="John Doe"
                  className="w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2 block">
                  Years of Experience
                </label>
                <input
                  type="text"
                  value={userProfile.years}
                  onChange={(e) => setUserProfile(p => ({ ...p, years: e.target.value }))}
                  placeholder="10+"
                  className="w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2 block">
                  Areas of Expertise
                </label>
                <textarea
                  value={userProfile.expertise}
                  onChange={(e) => setUserProfile(p => ({ ...p, expertise: e.target.value }))}
                  placeholder="UX Design, Product Design, Design Systems, User Research"
                  className="w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2 block">
                  Notable Work & Achievements
                </label>
                <textarea
                  value={userProfile.notableWork}
                  onChange={(e) => setUserProfile(p => ({ ...p, notableWork: e.target.value }))}
                  placeholder="Led design at Google, shipped products used by 10M+ users, speaker at Config 2024"
                  className="w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 text-xs text-[var(--muted)]">
                ✓ Profile auto-saves to your browser
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
