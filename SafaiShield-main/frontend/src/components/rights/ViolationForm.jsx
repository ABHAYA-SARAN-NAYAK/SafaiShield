import { useState } from 'react';
import { useWorker } from '../../context/WorkerContext';
import { t } from '../../lib/i18n';
import BigButton from '../shared/BigButton';

export default function ViolationForm({ initialData = {}, onSubmit, isSubmitting = false }) {
  const { worker } = useWorker();
  const [gearProvided, setGearProvided] = useState(initialData.gearProvided || 'no');
  const [forcedEntry, setForcedEntry] = useState(initialData.forcedEntry || 'no');
  const [employer, setEmployer] = useState(initialData.employer || '');
  const [selectedIssues, setSelectedIssues] = useState(initialData.issues || []);

  const issues = [
    { id: 'dizzy', label: t('rights.dizzy', worker.language) },
    { id: 'no_ventilation', label: t('rights.no_ventilation', worker.language) },
    { id: 'no_companion', label: t('rights.no_companion', worker.language) },
    { id: 'not_paid', label: t('rights.not_paid', worker.language) },
    { id: 'all_fine', label: t('rights.all_fine', worker.language) },
  ];

  const handleIssueToggle = (id) => {
    if (id === 'all_fine') {
      setSelectedIssues(['all_fine']);
      return;
    }
    
    let next = selectedIssues.filter(x => x !== 'all_fine');
    if (next.includes(id)) {
      next = next.filter(x => x !== id);
    } else {
      next.push(id);
    }
    setSelectedIssues(next);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      gearProvided,
      forcedEntry,
      employer,
      issues: selectedIssues,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Gear Provided */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-text-primary block">
          {t('rights.gearProvided', worker.language)}
        </label>
        <div className="grid grid-cols-1 gap-2">
          {[
            { value: 'full', label: t('rights.fullGear', worker.language) },
            { value: 'partial', label: t('rights.partialGear', worker.language) },
            { value: 'no', label: t('rights.noGear', worker.language) },
          ].map(opt => (
            <div
              key={opt.value}
              onClick={() => setGearProvided(opt.value)}
              className={`option-card ${gearProvided === opt.value ? 'selected' : ''}`}
            >
              <div className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${
                gearProvided === opt.value ? 'border-accent bg-accent' : 'border-muted'
              }`}>
                {gearProvided === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className="text-sm text-text-primary">{opt.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Forced Entry */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-text-primary block">
          {t('rights.forcedEntry', worker.language)}
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'yes', label: t('check.yes', worker.language) },
            { value: 'no', label: t('check.no', worker.language) },
          ].map(opt => (
            <div
              key={opt.value}
              onClick={() => setForcedEntry(opt.value)}
              className={`option-card justify-center ${forcedEntry === opt.value ? 'selected' : ''}`}
            >
              <span className="text-sm font-semibold">{opt.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Employer Name */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-text-primary block">
          {t('check.employer', worker.language)}
        </label>
        <input
          type="text"
          value={employer}
          onChange={(e) => setEmployer(e.target.value)}
          placeholder={t('check.employer', worker.language)}
          className="input-field"
        />
      </div>

      {/* What went wrong */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-text-primary block">
          {t('rights.whatWentWrong', worker.language)}
        </label>
        <div className="grid grid-cols-1 gap-2">
          {issues.map(issue => (
            <div
              key={issue.id}
              onClick={() => handleIssueToggle(issue.id)}
              className={`option-card ${selectedIssues.includes(issue.id) ? 'selected' : ''}`}
            >
              <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                selectedIssues.includes(issue.id) ? 'border-accent bg-accent' : 'border-muted'
              }`}>
                {selectedIssues.includes(issue.id) && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-text-primary">{issue.label}</span>
            </div>
          ))}
        </div>
      </div>

      <BigButton variant="orange" disabled={isSubmitting} className="w-full">
        {isSubmitting ? t('rights.generating', worker.language) : t('rights.generateReport', worker.language)}
      </BigButton>
    </form>
  );
}
