import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorker } from '../context/WorkerContext';
import { useSession } from '../context/SessionContext';
import { geminiGenerateReport } from '../lib/gemini';
import { saveWithEvidence } from '../lib/evidenceLocker';
import { t } from '../lib/i18n';
import ViolationForm from '../components/rights/ViolationForm';
import ReportCard from '../components/rights/ReportCard';
import ShareReport from '../components/rights/ShareReport';
import LoadingShield from '../components/shared/LoadingShield';

export default function RightsAdvisor() {
  const { worker } = useWorker();
  const { session, resetSession } = useSession();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [evidenceEntry, setEvidenceEntry] = useState(null);

  const handleFormSubmit = async (formData) => {
    setLoading(true);

    // Context details of the completed session
    const jobData = {
      siteType: session.siteType || 'sewer',
      riskLevel: session.riskLevel || 'medium',
      latitude: session.latitude,
      longitude: session.longitude,
      ...formData,
    };

    try {
      // Step 1: AI Violation Report Generation (Gemini)
      const reportData = await geminiGenerateReport(jobData);
      setReport(reportData);

      // Step 2: Evidence Locker SHA-256 Signatures (Feature D)
      const signedLog = await saveWithEvidence({
        ...jobData,
        reportText: reportData.report,
        hasViolations: reportData.hasViolations,
      });
      setEvidenceEntry(signedLog);
      // Step 3: Save / Update in safaishield_history evidence locker
      const fullRecord = {
        checkCompletedAt: session.checkCompletedAt || Date.now(),
        descentStartedAt: session.descentStartedAt || Date.now() - 15 * 60 * 1000,
        endedAt: Date.now(),
        siteType: session.siteType || jobData.siteType || 'sewer',
        riskLevel: session.riskLevel || jobData.riskLevel || 'medium',
        riskScore: session.riskScore || 55,
        gearProvided: formData.gearProvided || 'no',
        forcedEntry: formData.forcedEntry || 'no',
        employer: formData.employer || session.employer || '',
        hasViolations: reportData.hasViolations,
        reportText: reportData.report,
        evidenceHash: signedLog.evidenceHash,
      };

      try {
        const history = JSON.parse(localStorage.getItem('safaishield_history') || '[]');
        const filtered = history.filter(h => h.checkCompletedAt !== fullRecord.checkCompletedAt);
        filtered.unshift(fullRecord);
        localStorage.setItem('safaishield_history', JSON.stringify(filtered));
      } catch (err) {
        console.error('Failed to save to safaishield_history:', err);
      }

      setStep(2);
    } catch (e) {
      console.error("Failed to generate report:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    resetSession();
    navigate('/history');
  };

  return (
    <div className="page max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-border-custom pb-3">
        <h1 className="text-base font-bold text-text-primary uppercase tracking-wider">
          ⚖️ {t('rights.title', worker.language)}
        </h1>
        {step === 2 && (
          <button
            onClick={handleFinish}
            className="text-xs font-bold text-accent bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20"
          >
            Done & Reset
          </button>
        )}
      </div>

      {loading ? (
        <LoadingShield text={t('rights.generating', worker.language)} />
      ) : step === 1 ? (
        <div className="space-y-4">
          <div className="card bg-night border border-border-custom">
            <h2 className="text-sm font-bold text-text-primary mb-1">
              {t('rights.jobCompleted', worker.language)}
            </h2>
            <p className="text-xs text-muted">
              {t('rights.takesTwoMin', worker.language)}
            </p>
          </div>

          <ViolationForm
            initialData={{
              gearProvided: session.gearProvided || 'no',
              forcedEntry: session.forcedEntry || 'no',
              employer: session.employer || '',
            }}
            onSubmit={handleFormSubmit}
          />
        </div>
      ) : (
        <div className="space-y-6 animate-slide-up">
          {/* Report output */}
          <ReportCard
            reportText={report?.report}
            evidenceHash={evidenceEntry?.evidenceHash}
          />

          {/* Share buttons */}
          <ShareReport
            reportText={report?.report}
            evidenceHash={evidenceEntry?.evidenceHash}
            onSave={handleFinish}
          />
        </div>
      )}
    </div>
  );
}
